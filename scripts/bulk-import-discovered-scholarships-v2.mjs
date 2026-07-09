import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const FEED_PATH = path.join(ROOT, "data", "auto-discovered-scholarships.json");
const REPORT_PATH = path.join(ROOT, "data", "bulk-import-report.json");
const DEFAULT_DRAFT_DEADLINE = "2099-12-31";
const TODAY = new Date().toISOString().slice(0, 10);
const CURRENT_YEAR = Number(TODAY.slice(0, 4));
const MAX_IMPORT = Math.max(1, Number(process.env.MAX_IMPORT || 100));
const DRY_RUN = process.env.DRY_RUN === "true";
const COLLECTION = process.env.FIRESTORE_COLLECTION || "scholarships";
const SOURCE_PACK = process.env.SOURCE_PACK || "all";
const IMPORT_MODE = normalizeImportMode(process.env.IMPORT_MODE || process.env.AUTO_IMPORT_MODE || "auto_active");
const AUTO_PUBLISH_THRESHOLD = clamp(Number(process.env.AUTO_PUBLISH_THRESHOLD || 90), 75, 100);
let FieldValue = null;

try {
  await main();
} catch (error) {
  await writeReport({
    generatedAt: new Date().toISOString(),
    mode: DRY_RUN ? "dry-run-failed" : "import-failed",
    importMode: IMPORT_MODE,
    sourcePack: SOURCE_PACK,
    collection: COLLECTION,
    added: 0,
    updated: 0,
    skipped: 0,
    failed: 1,
    activeCandidates: 0,
    draftCandidates: 0,
    secretStatus: secretStatus(error),
    explainer: explainFailure(error),
    errors: [{ error: error.message }],
    imported: [],
    updatedRecords: [],
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
    .sort((a, b) => b.aiConfidence - a.aiConfidence)
    .slice(0, MAX_IMPORT);

  if (!normalized.length) throw new Error("No usable records found in auto-discovery feed. Run discovery first or choose a wider source pack.");

  const activeCandidates = normalized.filter((item) => item.status === "active").length;
  const draftCandidates = normalized.length - activeCandidates;

  if (DRY_RUN) {
    await writeReport({
      generatedAt: new Date().toISOString(),
      mode: "dry-run",
      importMode: IMPORT_MODE,
      sourcePack: feed.sourcePack || SOURCE_PACK,
      sourcePackLabel: feed.sourcePackLabel || SOURCE_PACK,
      collection: COLLECTION,
      added: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      activeCandidates,
      draftCandidates,
      autoPublishThreshold: AUTO_PUBLISH_THRESHOLD,
      secretStatus: { firebaseServiceAccount: "not-needed-for-dry-run", firebaseProjectId: process.env.FIREBASE_PROJECT_ID ? "present" : "optional" },
      explainer: `Dry run OK. ${normalized.length} records are ready. ${activeCandidates} can be auto-published safely; ${draftCandidates} will stay as review drafts.`,
      previewCount: normalized.length,
      preview: normalized.slice(0, 30),
      feedGeneratedAt: feed.generatedAt || "unknown",
      imported: [],
      updatedRecords: [],
      skippedRecords: [],
      errors: []
    });
    console.log(`Dry run OK. ${normalized.length} record(s) ready. Auto-active candidates: ${activeCandidates}.`);
    return;
  }

  const db = await initFirestore();
  const existing = await loadExisting(db);
  const existingKeys = buildExistingKeys(existing);
  const imported = [];
  const updatedRecords = [];
  const skippedRecords = [];
  const errors = [];
  let added = 0, updated = 0, skipped = 0, failed = 0;

  for (const record of normalized) {
    try {
      const duplicate = findDuplicate(record, existingKeys);
      if (duplicate) {
        const refreshPayload = toDuplicateRefreshRecord(record, duplicate.record || {});
        await db.collection(COLLECTION).doc(duplicate.id).set(refreshPayload, { merge: true });
        markExisting(existingKeys, { id: duplicate.id, ...duplicate.record, ...refreshPayload });
        updated += 1;
        updatedRecords.push({
          id: duplicate.id,
          name: record.name,
          link: record.link,
          status: refreshPayload.status || duplicate.record?.status || "unchanged",
          reason: duplicate.reason,
          aiConfidence: record.aiConfidence
        });
        continue;
      }

      const docRef = db.collection(COLLECTION).doc(record.id || stableId(record.link || record.name));
      await docRef.set(toFirestoreRecord(record), { merge: false });
      markExisting(existingKeys, { id: docRef.id, ...record });
      added += 1;
      imported.push({ id: docRef.id, name: record.name, link: record.link, status: record.status, sourcePack: record.sourcePack, aiConfidence: record.aiConfidence, sourceTrust: record.sourceTrust });
    } catch (error) {
      failed += 1;
      errors.push({ name: record.name || "unknown", link: record.link || "", error: error.message });
    }
  }

  await writeReport({
    generatedAt: new Date().toISOString(),
    mode: "import",
    importMode: IMPORT_MODE,
    sourcePack: feed.sourcePack || SOURCE_PACK,
    sourcePackLabel: feed.sourcePackLabel || SOURCE_PACK,
    collection: COLLECTION,
    added,
    updated,
    skipped,
    failed,
    activeCandidates,
    draftCandidates,
    autoPublishThreshold: AUTO_PUBLISH_THRESHOLD,
    secretStatus: { firebaseServiceAccount: "present", firebaseProjectId: process.env.FIREBASE_PROJECT_ID ? "present" : "using-service-account-project" },
    explainer: `Import finished. Added ${added}, refreshed ${updated}, skipped ${skipped}, failed ${failed}. Auto-active candidates: ${activeCandidates}; review drafts: ${draftCandidates}.`,
    feedGeneratedAt: feed.generatedAt || "unknown",
    imported,
    updatedRecords,
    skippedRecords,
    errors
  });

  console.log(`Bulk import finished. Added: ${added}. Updated: ${updated}. Skipped: ${skipped}. Failed: ${failed}.`);
  if (failed) process.exitCode = 1;
}

async function readFeed() { return JSON.parse(await fs.readFile(FEED_PATH, "utf8")); }
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
  const rawText = clean([item.snippet, item.description, item.eligibilityNote, item.studentSummary, item.searchQuery, item.title, item.name, url].filter(Boolean).join(" "));
  const deadlineDate = validDate(item.deadlineDate || item.lastDate) || findDeadlineDate(rawText);
  const sourceTrust = item.official ? "official" : item.trustedPortal || isTrustedUrl(url) ? "trusted" : "review";
  const ai = buildAiReview({ item, url, title, sourceName, rawText, deadlineDate, sourceTrust });
  const status = decideImportStatus(ai);
  const id = stableId(`${url}|${title}`);

  return {
    id,
    name: title.slice(0, 200),
    state,
    stateLabel: stateLabel(state),
    status,
    amount: clean(item.amount || extractAmount(rawText) || "Varies as per official rules").slice(0, 160),
    maxIncome: number(item.maxIncome || item.incomeLimit || extractIncome(rawText)),
    minPercentage: number(item.minPercentage || item.percentage),
    deadline: deadlineDate ? `Apply before ${deadlineDate}` : "Needs official deadline verification",
    deadlineDate: deadlineDate || DEFAULT_DRAFT_DEADLINE,
    link: url,
    sourceUrl: url,
    education: list(item.education || item.seedCourse || item.course || detectCourse(rawText), ["any"]),
    categories: list(item.categories || item.seedCategory || item.category || detectCategory(rawText), ["general", "sc", "st", "obc", "ews", "minority"]),
    genders: list(item.genders || item.gender || detectGender(rawText), ["any"]),
    disability: item.disability || detectDisability(rawText),
    eligibilityNote: clean(item.eligibilityNote || item.eligibility || rawText || `Auto-discovered from ${sourceName}. Verify exact eligibility before publishing.`).slice(0, 1400),
    incomeNote: clean(item.incomeNote || item.incomeRule || extractIncomeNote(rawText) || "Verify income rules on provider/official portal."),
    sourceName,
    requiredDocuments: array(item.requiredDocuments),
    exclusions: array(item.exclusions),
    studentSummary: clean(item.studentSummary || `${title}. Source: ${sourceName}. AI confidence ${ai.confidence}%. Review eligibility, amount and deadline before applying.`).slice(0, 900),
    benefitDetails: item.benefitDetails || {},
    applicationProcess: clean(item.applicationProcess || "Verify application process on provider/official portal."),
    renewalRules: clean(item.renewalRules || ""),
    documentType: clean(item.documentType || "ai_auto_discovered_record"),
    sourceType: clean(item.searchSource || item.sourceType || "github-action-ai-auto-import-v2"),
    rawSectionNames: array(item.rawSectionNames),
    fileName: clean(item.fileName || ""),
    applicationWindow: status === "active" ? "open" : "verify",
    academicYear: String(new Date().getFullYear()),
    verifiedOn: TODAY,
    lastChecked: TODAY,
    autoDiscovered: true,
    autoImported: true,
    needsReview: status !== "active",
    sourceTrust,
    sourcePack,
    aiConfidence: ai.confidence,
    aiDecision: ai.decision,
    aiSignals: ai.signals,
    verificationNote: ai.note,
    importBatch: process.env.GITHUB_RUN_ID || `local-${Date.now()}`
  };
}
function buildAiReview({ item, url, title, sourceName, rawText, deadlineDate, sourceTrust }) {
  const text = clean(`${title} ${sourceName} ${rawText} ${url}`);
  const lower = text.toLowerCase();
  const signals = [];
  let score = 0;
  if (normalizeUrl(url)) add(15, "valid official/trusted URL format");
  if (sourceTrust === "official") add(30, "official source domain");
  else if (sourceTrust === "trusted") add(20, "trusted scholarship source domain");
  else add(4, "unverified source domain");
  if (/scholarship|fellowship|grant|stipend|financial assistance|post matric|pre matric|education support/i.test(text)) add(15, "scholarship-related text found");
  if (deadlineDate && deadlineDate !== DEFAULT_DRAFT_DEADLINE) add(18, "real deadline date detected");
  if (deadlineDate && deadlineDate < TODAY) score -= 25;
  if (/apply|application|registration|open|last date|deadline|closing date/i.test(text)) add(10, "application/deadline language found");
  if (/eligibility|eligible|income|category|course|student|class|degree|engineering/i.test(text)) add(8, "eligibility language found");
  if (item.score) add(Math.min(12, Math.max(0, Number(item.score) - 70) / 2), "discovery source score");
  const closed = /closed|expired|last date is over|applications? closed|deadline passed/i.test(lower);
  if (closed) score -= 30;
  const confidence = Math.round(clamp(score, 0, 100));
  const canAutoPublish = Boolean(IMPORT_MODE === "auto_active" && confidence >= AUTO_PUBLISH_THRESHOLD && ["official", "trusted"].includes(sourceTrust) && deadlineDate && deadlineDate !== DEFAULT_DRAFT_DEADLINE && deadlineDate >= TODAY && !closed);
  return {
    confidence,
    canAutoPublish,
    sourceTrust,
    deadlineDate,
    closed,
    signals,
    decision: canAutoPublish ? "auto_publish_active" : "keep_review_draft",
    note: canAutoPublish ? `AI auto-published on ${TODAY}. Confidence ${confidence}%. Signals: ${signals.join("; ")}.` : `AI kept as review draft on ${TODAY}. Confidence ${confidence}%. Reason: ${explainDraft({ confidence, sourceTrust, deadlineDate, closed })}`
  };
  function add(points, signal) { score += points; signals.push(signal); }
}
function explainDraft({ confidence, sourceTrust, deadlineDate, closed }) {
  if (closed) return "source text looks closed/expired";
  if (!deadlineDate || deadlineDate === DEFAULT_DRAFT_DEADLINE) return "real future deadline not detected";
  if (deadlineDate < TODAY) return "deadline is already in the past";
  if (!["official", "trusted"].includes(sourceTrust)) return "source is not trusted enough";
  if (confidence < AUTO_PUBLISH_THRESHOLD) return `confidence below ${AUTO_PUBLISH_THRESHOLD}% threshold`;
  return "manual review preferred";
}
function decideImportStatus(ai) {
  if (IMPORT_MODE === "review_only" || IMPORT_MODE === "safe_draft") return "draft";
  return ai.canAutoPublish ? "active" : "draft";
}
function toFirestoreRecord(record) { return { ...record, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(), createdBy: "github-actions:ai-auto-import-v2", updatedBy: "github-actions:ai-auto-import-v2" }; }
function toDuplicateRefreshRecord(record, existing = {}) {
  const payload = {
    lastChecked: TODAY,
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: "github-actions:ai-auto-import-v2",
    aiConfidence: Math.max(number(existing.aiConfidence), number(record.aiConfidence)),
    aiDecision: record.aiDecision,
    aiSignals: record.aiSignals,
    sourceTrust: record.sourceTrust || existing.sourceTrust || "review",
    verificationNote: record.verificationNote,
    autoDiscovered: true,
    autoImported: true,
    importBatch: record.importBatch
  };
  if (existing.status !== "active" && record.status === "active") {
    Object.assign(payload, { status: "active", applicationWindow: "open", needsReview: false, verifiedOn: TODAY, deadline: record.deadline, deadlineDate: record.deadlineDate, sourceUrl: record.sourceUrl, link: record.link, sourceName: record.sourceName });
  }
  if (!existing.deadlineDate && record.deadlineDate && record.deadlineDate !== DEFAULT_DRAFT_DEADLINE) payload.deadlineDate = record.deadlineDate;
  if (!existing.deadline && record.deadline) payload.deadline = record.deadline;
  if (!existing.sourceUrl && record.sourceUrl) payload.sourceUrl = record.sourceUrl;
  if (!existing.link && record.link) payload.link = record.link;
  if (!existing.sourceName && record.sourceName) payload.sourceName = record.sourceName;
  return payload;
}
function buildExistingKeys(existing) { const keys = { urls: new Map(), names: new Map() }; for (const item of existing) markExisting(keys, item); return keys; }
function markExisting(keys, record) {
  const url = normalizeUrl(record.link || record.sourceUrl || record.url);
  const name = normalizeName(record.name || record.title);
  if (url) keys.urls.set(url, record);
  if (name) keys.names.set(name, record);
}
function findDuplicate(record, keys) {
  const url = normalizeUrl(record.link || record.sourceUrl || record.url);
  const name = normalizeName(record.name || record.title);
  if (url && keys.urls.has(url)) return { id: keys.urls.get(url).id, record: keys.urls.get(url), reason: "same_url_already_exists" };
  if (name && keys.names.has(name)) return { id: keys.names.get(name).id, record: keys.names.get(name), reason: "same_name_already_exists" };
  return null;
}
function secretStatus(error) {
  const msg = error?.message || "";
  return { firebaseServiceAccount: /FIREBASE_SERVICE_ACCOUNT_JSON/.test(msg) ? "missing_or_invalid" : process.env.FIREBASE_SERVICE_ACCOUNT_JSON ? "present" : "unknown", firebaseProjectId: process.env.FIREBASE_PROJECT_ID ? "present" : "optional_or_missing" };
}
function explainFailure(error) {
  const msg = error?.message || "Unknown failure";
  if (/Missing FIREBASE_SERVICE_ACCOUNT_JSON/.test(msg)) return "Firebase service account secret is missing. Add FIREBASE_SERVICE_ACCOUNT_JSON in GitHub Actions secrets, then rerun.";
  if (/not valid JSON|missing project_id|missing client_email|missing private_key/.test(msg)) return "Firebase service account secret exists but is malformed. Paste the full JSON service account key.";
  if (/permission|PERMISSION_DENIED/i.test(msg)) return "Firebase key is present but does not have permission to read/write Firestore scholarships collection.";
  return msg;
}
async function writeReport(report) { await fs.mkdir(path.dirname(REPORT_PATH), { recursive: true }); await fs.writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8"); }
function normalizeImportMode(value) {
  const mode = clean(value).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  if (["auto_active", "safe_draft", "review_only"].includes(mode)) return mode;
  if (["active", "auto", "publish"].includes(mode)) return "auto_active";
  if (["draft", "safe"].includes(mode)) return "safe_draft";
  return "auto_active";
}
function list(value, fallback) {
  if (Array.isArray(value)) { const out = value.map(clean).filter(Boolean).map((x) => x.toLowerCase()); return out.length ? out : fallback; }
  const text = clean(value);
  if (!text || /^any$/i.test(text)) return fallback;
  return text.split(/[,/|;]+|\s+and\s+/i).map((x) => clean(x).toLowerCase()).filter(Boolean);
}
function array(value) { return Array.isArray(value) ? value.map(clean).filter(Boolean) : []; }
function number(value) { const n = Number(String(value || "").replace(/[^0-9.]/g, "")); return Number.isFinite(n) ? Math.max(0, n) : 0; }
function validDate(value) { const s = String(value || "").trim(); return /^20\d{2}-[01]\d-[0-3]\d$/.test(s) ? s : ""; }
function findDeadlineDate(text) {
  const dates = extractCandidateDates(text).filter((date) => date >= TODAY && Number(date.slice(0, 4)) <= CURRENT_YEAR + 3);
  if (dates.length) return dates.sort()[0];
  return "";
}
function extractCandidateDates(text) {
  const out = new Set();
  const s = String(text || "");
  for (const match of s.matchAll(/\b(20\d{2})[-/.]([01]?\d)[-/.]([0-3]?\d)\b/g)) addDate(out, match[1], match[2], match[3]);
  for (const match of s.matchAll(/\b([0-3]?\d)[-/.]([01]?\d)[-/.](20\d{2})\b/g)) addDate(out, match[3], match[2], match[1]);
  const monthNames = "jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?";
  const rx = new RegExp(`\\b([0-3]?\\d)\\s+(${monthNames})\\s*,?\\s*(20\\d{2})\\b`, "gi");
  for (const match of s.matchAll(rx)) addDate(out, match[3], monthNumber(match[2]), match[1]);
  return [...out];
}
function addDate(set, year, month, day) {
  const y = Number(year), m = Number(month), d = Number(day);
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return;
  if (y < CURRENT_YEAR - 1 || y > CURRENT_YEAR + 4 || m < 1 || m > 12 || d < 1 || d > 31) return;
  const iso = `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return;
  if (date.toISOString().slice(0, 10) === iso) set.add(iso);
}
function monthNumber(name) { const key = String(name || "").slice(0, 3).toLowerCase(); return { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 }[key] || 0; }
function extractAmount(text) { const amount = String(text || "").match(/(?:₹|rs\.?)\s*([0-9][0-9,]*(?:\.\d+)?)/i)?.[1]?.replace(/,/g, ""); return amount ? `Rs.${amount}` : ""; }
function extractIncome(text) { return String(text || "").match(/(?:income\s+limit|annual\s+income|family\s+income|max(?:imum)?\s+income|not\s+exceed)[^₹\d]{0,100}(?:₹|rs\.?\s?)?([0-9][0-9,]{3,})/i)?.[1]?.replace(/,/g, "") || 0; }
function extractIncomeNote(text) { const s = clean(text); return /income|financial need|economically needy|non[-\s]?creamy/i.test(s) ? s.slice(0, 500) : ""; }
function normalizeUrl(value) { try { const url = new URL(String(value || "").trim()); url.hash = ""; return ["http:", "https:"].includes(url.protocol) ? url.href : ""; } catch { return ""; } }
function normalizeName(value) { return clean(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\b(20\d{2}|scholarship|scheme|official|apply|online)\b/g, "").replace(/\s+/g, " ").trim(); }
function clean(value) { return String(value || "").replace(/\s+/g, " ").trim(); }
function stateSlug(value) { const key = clean(value).toLowerCase(); const aliases = { national: "national", "all india": "national", "andhra pradesh": "andhra-pradesh", ap: "andhra-pradesh", telangana: "telangana", karnataka: "karnataka", maharashtra: "maharashtra", rajasthan: "rajasthan", delhi: "delhi" }; return aliases[key] || key.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "national"; }
function stateLabel(slug) { return slug.split("-").map((x) => x ? x[0].toUpperCase() + x.slice(1) : "").join(" ") || "National"; }
function sourceNameFromUrl(url) { try { const host = new URL(url).hostname.replace(/^www\./, ""); if (host.includes("scholarships.gov.in")) return "National Scholarship Portal"; if (host.includes("aicte")) return "AICTE"; if (host.includes("jnanabhumi")) return "AP Jnanabhumi"; if (host.includes("telanganaepass")) return "Telangana ePASS"; if (host.includes("ugc")) return "UGC"; return host; } catch { return "Scholarship Source"; } }
function isTrustedUrl(url) { return /gov\.in|nic\.in|ac\.in|scholarships\.gov\.in|aicte-india\.org|ugc\.gov\.in|cbse\.gov\.in|buddy4study\.com|vidyasaarathi\.co\.in|ffe\.org|reliancefoundation|tatatrusts|hdfcbank|adityabirlascholars/i.test(url); }
function detectCategory(text) { const t = String(text || "").toLowerCase(); const out = []; if (/\bsc\b|scheduled caste/.test(t)) out.push("sc"); if (/\bst\b|scheduled tribe/.test(t)) out.push("st"); if (/obc|backward/.test(t)) out.push("obc"); if (/ews|ebc/.test(t)) out.push("ews"); if (/minority|muslim|christian|sikh|jain|buddhist/.test(t)) out.push("minority"); if (/girl|women|female/.test(t)) out.push("girls"); if (/disab|specially abled|pwd/.test(t)) out.push("disabled"); return out.join(",") || "any"; }
function detectCourse(text) { const t = String(text || "").toLowerCase(); const out = []; if (/engineering|technical|aicte|btech|diploma/.test(t)) out.push("engineering"); if (/medical|medicine|nursing/.test(t)) out.push("medical"); if (/school|class|cbse/.test(t)) out.push("school"); if (/degree|undergraduate|graduate/.test(t)) out.push("degree"); if (/pg|postgraduate|masters|phd/.test(t)) out.push("pg"); return out.join(",") || "any"; }
function detectGender(text) { const t = String(text || "").toLowerCase(); if (/girl|women|female/.test(t)) return "female"; return "any"; }
function detectDisability(text) { return /disab|specially abled|pwd|saksham/i.test(text) ? "yes" : "any"; }
function stableId(value) { let h = 5381; const s = String(value || ""); for (let i = 0; i < s.length; i += 1) h = ((h << 5) + h) + s.charCodeAt(i); return `auto_${Math.abs(h >>> 0).toString(36)}`; }
function clamp(value, min, max) { return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min)); }
