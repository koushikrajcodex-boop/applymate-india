import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const REPORT_PATH = path.join(ROOT, "data", "scholarship-ai-tracker-report.json");
const COLLECTION = process.env.FIRESTORE_COLLECTION || "scholarships";
const TODAY = new Date().toISOString().slice(0, 10);
const AUTO_PROMOTE_DRAFTS = process.env.AUTO_PROMOTE_DRAFTS !== "false";
const AUTO_PUBLISH_THRESHOLD = clamp(Number(process.env.AUTO_PUBLISH_THRESHOLD || 90), 75, 100);
let FieldValue = null;

try {
  await main();
} catch (error) {
  await writeReport({
    generatedAt: new Date().toISOString(),
    mode: "tracker-failed",
    collection: COLLECTION,
    checked: 0,
    active: 0,
    promoted: 0,
    expired: 0,
    needsReview: 0,
    failed: 1,
    explainer: explainFailure(error),
    errors: [{ error: error.message }],
    actions: []
  });
  console.error(error);
  process.exit(1);
}

async function main() {
  const db = await initFirestore();
  const snapshot = await db.collection(COLLECTION).get();
  const actions = [];
  const errors = [];
  let checked = 0, active = 0, promoted = 0, expired = 0, needsReview = 0, failed = 0;

  for (const doc of snapshot.docs) {
    checked += 1;
    const record = { id: doc.id, ...doc.data() };

    try {
      const decision = decideTrackingAction(record);
      if (decision.statusAfter === "active") active += 1;
      if (decision.action === "promote") promoted += 1;
      if (decision.action === "expire") expired += 1;
      if (decision.needsReview) needsReview += 1;

      if (decision.write) {
        await doc.ref.set({
          ...decision.write,
          lastChecked: TODAY,
          trackerCheckedOn: TODAY,
          trackerUpdatedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
          updatedBy: "github-actions:ai-tracker-v2"
        }, { merge: true });
      }

      if (decision.action !== "noop") {
        actions.push({
          id: doc.id,
          name: record.name || record.title || "Unnamed scholarship",
          action: decision.action,
          statusBefore: record.status || "unknown",
          statusAfter: decision.statusAfter,
          reason: decision.reason,
          aiConfidence: decision.aiConfidence || record.aiConfidence || 0,
          deadlineDate: normalizeDate(record.deadlineDate)
        });
      }
    } catch (error) {
      failed += 1;
      errors.push({ id: doc.id, name: record.name || record.title || "unknown", error: error.message });
    }
  }

  await writeReport({
    generatedAt: new Date().toISOString(),
    mode: "tracker",
    collection: COLLECTION,
    checked,
    active,
    promoted,
    expired,
    needsReview,
    failed,
    autoPromoteDrafts: AUTO_PROMOTE_DRAFTS,
    autoPublishThreshold: AUTO_PUBLISH_THRESHOLD,
    explainer: `AI tracker checked ${checked} scholarship record(s), promoted ${promoted}, expired ${expired}, flagged ${needsReview} for review, failed ${failed}.`,
    actions: actions.slice(0, 100),
    errors
  });

  console.log(`AI tracker finished. Checked: ${checked}. Promoted: ${promoted}. Expired: ${expired}. Needs review: ${needsReview}. Failed: ${failed}.`);
  if (failed) process.exitCode = 1;
}

async function initFirestore() {
  const rawSecret = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!rawSecret) throw new Error("Missing FIREBASE_SERVICE_ACCOUNT_JSON GitHub secret. Add it in repo Settings > Secrets and variables > Actions.");
  const { initializeApp, cert, getApps } = await import("firebase-admin/app");
  const { getFirestore, FieldValue: FirebaseFieldValue } = await import("firebase-admin/firestore");
  const serviceAccount = parseServiceAccount(rawSecret);
  if (!getApps().length) initializeApp({ credential: cert(serviceAccount), projectId: process.env.FIREBASE_PROJECT_ID || serviceAccount.project_id });
  FieldValue = FirebaseFieldValue;
  return getFirestore();
}
function parseServiceAccount(raw) {
  let parsed;
  try { parsed = JSON.parse(raw); } catch (error) { throw new Error(`FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON: ${error.message}`); }
  if (parsed.private_key) parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
  for (const key of ["project_id", "client_email", "private_key"]) if (!parsed[key]) throw new Error(`FIREBASE_SERVICE_ACCOUNT_JSON missing ${key}`);
  return parsed;
}
function decideTrackingAction(record) {
  const currentStatus = clean(record.status || "draft").toLowerCase();
  const deadlineDate = normalizeDate(record.deadlineDate);
  const sourceUrl = normalizeUrl(record.sourceUrl || record.link || record.url);
  const sourceName = clean(record.sourceName || "");
  const confidence = Number(record.aiConfidence || 0);
  const trust = clean(record.sourceTrust || inferTrust(sourceUrl)).toLowerCase();
  const hasGoodSource = Boolean(sourceUrl && sourceName && ["official", "trusted"].includes(trust));
  const hasRealDeadline = Boolean(deadlineDate && deadlineDate !== "2099-12-31");
  const isExpired = hasRealDeadline && deadlineDate < TODAY;

  if (currentStatus === "active" && isExpired) {
    return {
      action: "expire",
      statusAfter: "closed",
      needsReview: true,
      reason: `Deadline ${deadlineDate} has passed. Marked closed automatically.`,
      write: {
        status: "closed",
        applicationWindow: "closed",
        needsReview: true,
        trackerReason: `Expired by AI tracker on ${TODAY}. Deadline: ${deadlineDate}.`,
        verificationNote: appendNote(record.verificationNote, `AI tracker closed this scholarship on ${TODAY} because the deadline passed.`)
      }
    };
  }

  if (currentStatus === "active") {
    const review = !hasGoodSource || !hasRealDeadline;
    return {
      action: review ? "flag" : "noop",
      statusAfter: "active",
      needsReview: review,
      reason: review ? missingReason({ hasGoodSource, hasRealDeadline }) : "Active scholarship checked and still valid.",
      write: review ? { needsReview: true, trackerReason: missingReason({ hasGoodSource, hasRealDeadline }), aiTrackerStatus: "active_needs_review" } : { needsReview: false, aiTrackerStatus: "active_checked" }
    };
  }

  const canPromote = Boolean(AUTO_PROMOTE_DRAFTS && ["draft", "review", "verify", "needs_review"].includes(currentStatus) && hasGoodSource && hasRealDeadline && !isExpired && confidence >= AUTO_PUBLISH_THRESHOLD);

  if (canPromote) {
    return {
      action: "promote",
      statusAfter: "active",
      needsReview: false,
      aiConfidence: confidence,
      reason: `AI confidence ${confidence}% with trusted source and future deadline ${deadlineDate}.`,
      write: {
        status: "active",
        applicationWindow: "open",
        needsReview: false,
        verifiedOn: TODAY,
        sourceTrust: trust,
        aiDecision: "tracker_auto_promote_active",
        trackerReason: `Promoted by AI tracker on ${TODAY}.`,
        verificationNote: appendNote(record.verificationNote, `AI tracker auto-promoted this record on ${TODAY} after source/deadline checks.`)
      }
    };
  }

  return {
    action: "flag",
    statusAfter: currentStatus || "draft",
    needsReview: true,
    aiConfidence: confidence,
    reason: missingReason({ hasGoodSource, hasRealDeadline, confidence }),
    write: { needsReview: true, aiTrackerStatus: "draft_needs_review", trackerReason: missingReason({ hasGoodSource, hasRealDeadline, confidence }) }
  };
}
function missingReason({ hasGoodSource, hasRealDeadline, confidence }) {
  const reasons = [];
  if (!hasGoodSource) reasons.push("missing trusted source URL/source name");
  if (!hasRealDeadline) reasons.push("missing real deadline date");
  if (typeof confidence === "number" && confidence < AUTO_PUBLISH_THRESHOLD) reasons.push(`AI confidence below ${AUTO_PUBLISH_THRESHOLD}%`);
  return reasons.length ? reasons.join("; ") : "manual review required";
}
function appendNote(oldNote, newNote) { const old = clean(oldNote); return old ? `${old}\n${newNote}` : newNote; }
function explainFailure(error) {
  const msg = error?.message || "Unknown failure";
  if (/Missing FIREBASE_SERVICE_ACCOUNT_JSON/.test(msg)) return "Firebase service account secret is missing. Add FIREBASE_SERVICE_ACCOUNT_JSON in GitHub Actions secrets, then rerun.";
  if (/not valid JSON|missing project_id|missing client_email|missing private_key/.test(msg)) return "Firebase service account secret exists but is malformed. Paste the full JSON service account key.";
  if (/permission|PERMISSION_DENIED/i.test(msg)) return "Firebase key is present but does not have permission to read/write Firestore scholarships collection.";
  return msg;
}
async function writeReport(report) { await fs.mkdir(path.dirname(REPORT_PATH), { recursive: true }); await fs.writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8"); }
function normalizeDate(value) { const s = String(value || "").trim(); return /^20\d{2}-[01]\d-[0-3]\d$/.test(s) ? s : ""; }
function normalizeUrl(value) { try { const url = new URL(String(value || "").trim()); url.hash = ""; return ["http:", "https:"].includes(url.protocol) ? url.href : ""; } catch { return ""; } }
function inferTrust(url) {
  if (/gov\.in|nic\.in|ac\.in|scholarships\.gov\.in|aicte-india\.org|ugc\.gov\.in|cbse\.gov\.in/i.test(url)) return "official";
  if (/buddy4study\.com|vidyasaarathi\.co\.in|ffe\.org|reliancefoundation|tatatrusts|hdfcbank|adityabirlascholars/i.test(url)) return "trusted";
  return "review";
}
function clean(value) { return String(value || "").replace(/\s+/g, " ").trim(); }
function clamp(value, min, max) { return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min)); }
