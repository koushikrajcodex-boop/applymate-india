import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const FEED_PATH = path.join(ROOT, "data", "auto-discovered-scholarships.json");
const REPORT_PATH = path.join(ROOT, "data", "bulk-import-report.json");
const DEFAULT_DRAFT_DEADLINE = "2099-12-31";
const TODAY = new Date().toISOString().slice(0, 10);
const MAX_IMPORT = Math.max(1, Number(process.env.MAX_IMPORT || 100));
const DRY_RUN = process.env.DRY_RUN === "true";
const COLLECTION = process.env.FIRESTORE_COLLECTION || "scholarships";
const SOURCE_PACK = process.env.SOURCE_PACK || "all";
const IMPORT_STATUS = "draft";
let FieldValue = null;

try {
  await main();
} catch (error) {
  await writeReport({
    generatedAt: new Date().toISOString(),
    mode: DRY_RUN ? "dry-run-failed" : "import-failed",
    sourcePack: SOURCE_PACK,
    collection: COLLECTION,
    added: 0,
    skipped: 0,
    failed: 1,
    secretStatus: secretStatus(error),
    explainer: explainFailure(error),
    errors: [{ error: error.message }],
    imported: [],
    skippedRecords: []
  });
  console.error(error);
  process.exit(1);
}

async function main() {
  const feed = await readFeed();
  const normalized = (Array.isArray(feed.records) ? feed.records : [])
    .map(normalizeFeedRecord)
    .filter((x) => x.name && x.link)
    .slice(0, MAX_IMPORT);

  if (!normalized.length) throw new Error("No usable records found in auto-discovery feed. Run discovery first or choose a wider source pack.");

  if (DRY_RUN) {
    await writeReport({
      generatedAt: new Date().toISOString(),
      mode: "dry-run",
      sourcePack: feed.sourcePack || SOURCE_PACK,
      sourcePackLabel: feed.sourcePackLabel || SOURCE_PACK,
      collection: COLLECTION,
      added: 0,
      skipped: 0,
      failed: 0,
      secretStatus: { firebaseServiceAccount: "not-needed-for-dry-run", firebaseProjectId: process.env.FIREBASE_PROJECT_ID ? "present" : "optional" },
      explainer: `Dry run OK. ${normalized.length} records are ready. Run again with dry_run=false to import as drafts.`,
      previewCount: normalized.length,
      preview: normalized.slice(0, 25),
      feedGeneratedAt: feed.generatedAt || "unknown",
      imported: [],
      skippedRecords: [],
      errors: []
    });
    console.log(`Dry run OK. ${normalized.length} record(s) ready.`);
    return;
  }

  const db = await initFirestore();
  const existing = await loadExisting(db);
  const existingKeys = buildExistingKeys(existing);
  const imported = [];
  const skippedRecords = [];
  const errors = [];
  let added = 0;
  let skipped = 0;
  let failed = 0;

  for (const record of normalized) {
    try {
      const duplicate = duplicateReason(record, existingKeys);
      if (duplicate) {
        skipped += 1;
        skippedRecords.push({ name: record.name, link: record.link, reason: duplicate });
        continue;
      }
      const docRef = db.collection(COLLECTION).doc(record.id || stableId(record.link || record.name));
      await docRef.set(toFirestoreRecord(record), { merge: false });
      markExisting(existingKeys, record);
      added += 1;
      imported.push({ id: docRef.id, name: record.name, link: record.link, status: record.status, sourcePack: record.sourcePack });
    } catch (error) {
      failed += 1;
      errors.push({ name: record.name || "unknown", link: record.link || "", error: error.message });
    }
  }

  await writeReport({
    generatedAt: new Date().toISOString(),
    mode: "import",
    sourcePack: feed.sourcePack || SOURCE_PACK,
    sourcePackLabel: feed.sourcePackLabel || SOURCE_PACK,
    collection: COLLECTION,
    added,
    skipped,
    failed,
    secretStatus: { firebaseServiceAccount: "present", firebaseProjectId: process.env.FIREBASE_PROJECT_ID ? "present" : "using-service-account-project" },
    explainer: `Import finished. Added ${added} draft record(s), skipped ${skipped} duplicate(s), failed ${failed}.`,
    feedGeneratedAt: feed.generatedAt || "unknown",
    imported,
    skippedRecords,
    errors
  });

  console.log(`Bulk import finished. Added: ${added}. Skipped: ${skipped}. Failed: ${failed}.`);
  if (failed) process.exitCode = 1;
}

async function readFeed() {
  return JSON.parse(await fs.readFile(FEED_PATH, "utf8"));
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
async function loadExisting(db) {
  const snapshot = await db.collection(COLLECTION).get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}
function normalizeFeedRecord(item) {
  const url = normalizeUrl(item.url || item.link || item.sourceUrl);
  const title = clean(item.name || item.title || sourceNameFromUrl(url));
  const sourcePack = item.sourcePack || SOURCE_PACK;
  const state = stateSlug(item.state || item.seedState || "National");
  const sourceName = clean(item.sourceName || item.seedName || sourceNameFromUrl(url));
  const snippet = clean(item.snippet || item.description || item.eligibilityNote || "");
  const deadlineDate = validDate(item.deadlineDate || item.lastDate || findDate(snippet));
  const id = stableId(`${url}|${title}`);
  return {
    id,
    name: title.slice(0, 200),
    state,
    stateLabel: stateLabel(state),
    status: IMPORT_STATUS,
    amount: clean(item.amount || extractAmount(snippet) || "Varies as per official rules").slice(0, 160),
    maxIncome: number(item.maxIncome || item.incomeLimit || extractIncome(snippet)),
    minPercentage: number(item.minPercentage || item.percentage),
    deadline: deadlineDate ? `Apply before ${deadlineDate}` : "Needs official deadline verification",
    deadlineDate: deadlineDate || DEFAULT_DRAFT_DEADLINE,
    link: url,
    sourceUrl: url,
    education: list(item.education || item.seedCourse || item.course, ["any"]),
    categories: list(item.categories || item.seedCategory || item.category, ["general", "sc", "st", "obc", "ews", "minority"]),
    genders: list(item.genders || item.gender, ["any"]),
    disability: item.disability || "any",
    eligibilityNote: clean(item.eligibilityNote || item.eligibility || snippet || `Auto-discovered from ${sourceName}. Verify exact eligibility before publishing.`).slice(0, 1400),
    incomeNote: clean(item.incomeNote || item.incomeRule || extractIncomeNote(snippet) || "Verify income rules on provider/official portal."),
    sourceName,
    requiredDocuments: array(item.requiredDocuments),
    exclusions: array(item.exclusions),
    studentSummary: clean(item.studentSummary || `${title}. Source: ${sourceName}. Review eligibility, amount and deadline before marking active.`).slice(0, 900),
    benefitDetails: item.benefitDetails || {},
    applicationProcess: clean(item.applicationProcess || "Verify application process on provider/official portal."),
    renewalRules: clean(item.renewalRules || ""),
    documentType: clean(item.documentType || "auto_discovered_source_pack_record"),
    sourceType: clean(item.searchSource || item.sourceType || "github-action-bulk-import-v2"),
    rawSectionNames: array(item.rawSectionNames),
    fileName: clean(item.fileName || ""),
    applicationWindow: "verify",
    academicYear: String(new Date().getFullYear()),
    verifiedOn: TODAY,
    lastChecked: TODAY,
    autoDiscovered: true,
    autoImported: true,
    needsReview: true,
    sourceTrust: item.official ? "official" : item.trustedPortal || isTrustedUrl(url) ? "trusted" : "review",
    sourcePack,
    verificationNote: `Auto-imported as draft by GitHub Action on ${TODAY}. Review source before marking active.`,
    importBatch: process.env.GITHUB_RUN_ID || `local-${Date.now()}`
  };
}
function toFirestoreRecord(record) { return { ...record, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(), createdBy: "github-actions:auto-bulk-import-v2", updatedBy: "github-actions:auto-bulk-import-v2" }; }
function buildExistingKeys(existing) { const keys = { urls: new Set(), names: new Set() }; for (const item of existing) markExisting(keys, item); return keys; }
function markExisting(keys, record) { const url = normalizeUrl(record.link || record.sourceUrl || record.url); const name = normalizeName(record.name || record.title); if (url) keys.urls.add(url); if (name) keys.names.add(name); }
function duplicateReason(record, keys) { const url = normalizeUrl(record.link || record.sourceUrl || record.url); const name = normalizeName(record.name || record.title); if (url && keys.urls.has(url)) return "same_url_already_exists"; if (name && keys.names.has(name)) return "same_name_already_exists"; return ""; }
function secretStatus(error) { const msg = error?.message || ""; return { firebaseServiceAccount: /FIREBASE_SERVICE_ACCOUNT_JSON/.test(msg) ? "missing_or_invalid" : process.env.FIREBASE_SERVICE_ACCOUNT_JSON ? "present" : "unknown", firebaseProjectId: process.env.FIREBASE_PROJECT_ID ? "present" : "optional_or_missing" }; }
function explainFailure(error) { const msg = error?.message || "Unknown failure"; if (/Missing FIREBASE_SERVICE_ACCOUNT_JSON/.test(msg)) return "Firebase service account secret is missing. Add FIREBASE_SERVICE_ACCOUNT_JSON in GitHub Actions secrets, then rerun."; if (/not valid JSON|missing project_id|missing client_email|missing private_key/.test(msg)) return "Firebase service account secret exists but is malformed. Paste the full JSON service account key."; if (/permission|PERMISSION_DENIED/i.test(msg)) return "Firebase key is present but does not have permission to read/write Firestore scholarships collection."; return msg; }
async function writeReport(report) { await fs.mkdir(path.dirname(REPORT_PATH), { recursive: true }); await fs.writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8"); }
function list(value, fallback) { if (Array.isArray(value)) return value.map(clean).filter(Boolean).length ? value.map(clean).filter(Boolean) : fallback; const text = clean(value); if (!text || /^any$/i.test(text)) return fallback; return text.split(/[,/|;]+|\s+and\s+/i).map((x) => clean(x).toLowerCase()).filter(Boolean); }
function array(value) { return Array.isArray(value) ? value.map(clean).filter(Boolean) : []; }
function number(value) { const n = Number(String(value || "").replace(/[^0-9.]/g, "")); return Number.isFinite(n) ? Math.max(0, n) : 0; }
function validDate(value) { const s = String(value || "").trim(); return /^20\d{2}-[01]\d-[0-3]\d$/.test(s) ? s : ""; }
function findDate(text) { return String(text || "").match(/20\d{2}-[01]\d-[0-3]\d/)?.[0] || ""; }
function extractAmount(text) { const amount = String(text || "").match(/(?:₹|rs\.?)\s*([0-9][0-9,]*(?:\.\d+)?)/i)?.[1]?.replace(/,/g, ""); return amount ? `Rs.${amount}` : ""; }
function extractIncome(text) { return String(text || "").match(/(?:income\s+limit|annual\s+income|family\s+income|max(?:imum)?\s+income|not\s+exceed)[^₹\d]{0,100}(?:₹|rs\.?\s?)?([0-9][0-9,]{3,})/i)?.[1]?.replace(/,/g, "") || 0; }
function extractIncomeNote(text) { const s = clean(text); return /income|financial need|economically needy|non[-\s]?creamy/i.test(s) ? s.slice(0, 500) : ""; }
function normalizeUrl(value) { try { const url = new URL(String(value || "").trim()); return ["http:", "https:"].includes(url.protocol) ? url.href : ""; } catch { return ""; } }
function normalizeName(value) { return clean(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\b(20\d{2}|scholarship|scheme|official|apply|online)\b/g, "").replace(/\s+/g, " ").trim(); }
function clean(value) { return String(value || "").replace(/\s+/g, " ").trim(); }
function stateSlug(value) { const key = clean(value).toLowerCase(); const aliases = { "national": "national", "all india": "national", "andhra pradesh": "andhra-pradesh", "ap": "andhra-pradesh", "telangana": "telangana", "karnataka": "karnataka", "maharashtra": "maharashtra", "rajasthan": "rajasthan", "delhi": "delhi" }; return aliases[key] || key.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "national"; }
function stateLabel(slug) { return slug.split("-").map((x) => x ? x[0].toUpperCase() + x.slice(1) : "").join(" ") || "National"; }
function sourceNameFromUrl(url) { try { const host = new URL(url).hostname.replace(/^www\./, ""); if (host.includes("scholarships.gov.in")) return "National Scholarship Portal"; if (host.includes("aicte")) return "AICTE"; if (host.includes("jnanabhumi")) return "AP Jnanabhumi"; if (host.includes("telanganaepass")) return "Telangana ePASS"; if (host.includes("ugc")) return "UGC"; if (host.includes("buddy4study")) return "Buddy4Study"; if (host.includes("vidyasaarathi")) return "Vidyasaarathi"; if (host.includes("ffe.org")) return "Foundation For Excellence"; return host.split(".").slice(0, 2).join("."); } catch { return "Scholarship Source"; } }
function isTrustedUrl(url) { return /gov\.in|nic\.in|ac\.in|scholarships\.gov\.in|aicte-india\.org|ugc\.gov\.in|buddy4study\.com|vidyasaarathi\.co\.in|ffe\.org|reliancefoundation|tatatrusts|hdfcbank|adityabirlascholars/i.test(url); }
function stableId(value) { let h = 5381; const s = String(value || ""); for (let i = 0; i < s.length; i += 1) h = ((h << 5) + h) + s.charCodeAt(i); return `auto_${Math.abs(h >>> 0).toString(36)}`; }
