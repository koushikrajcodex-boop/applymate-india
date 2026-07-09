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
const IMPORT_STATUS = ["draft", "review"].includes(String(process.env.IMPORT_STATUS || "draft")) ? String(process.env.IMPORT_STATUS || "draft") : "draft";

const STATE_LABELS = new Map([
  ["national", "National"], ["andhra-pradesh", "Andhra Pradesh"], ["arunachal-pradesh", "Arunachal Pradesh"], ["assam", "Assam"],
  ["bihar", "Bihar"], ["chhattisgarh", "Chhattisgarh"], ["goa", "Goa"], ["gujarat", "Gujarat"], ["haryana", "Haryana"],
  ["himachal-pradesh", "Himachal Pradesh"], ["jharkhand", "Jharkhand"], ["karnataka", "Karnataka"], ["kerala", "Kerala"],
  ["madhya-pradesh", "Madhya Pradesh"], ["maharashtra", "Maharashtra"], ["manipur", "Manipur"], ["meghalaya", "Meghalaya"],
  ["mizoram", "Mizoram"], ["nagaland", "Nagaland"], ["odisha", "Odisha"], ["punjab", "Punjab"], ["rajasthan", "Rajasthan"],
  ["sikkim", "Sikkim"], ["tamil-nadu", "Tamil Nadu"], ["telangana", "Telangana"], ["tripura", "Tripura"],
  ["uttar-pradesh", "Uttar Pradesh"], ["uttarakhand", "Uttarakhand"], ["west-bengal", "West Bengal"],
  ["andaman-and-nicobar-islands", "Andaman and Nicobar Islands"], ["chandigarh", "Chandigarh"],
  ["dadra-and-nagar-haveli-and-daman-and-diu", "Dadra and Nagar Haveli and Daman and Diu"], ["delhi", "Delhi"],
  ["jammu-and-kashmir", "Jammu and Kashmir"], ["ladakh", "Ladakh"], ["lakshadweep", "Lakshadweep"], ["puducherry", "Puducherry"]
]);

const STATE_ALIASES = new Map([...STATE_LABELS.entries()].map(([slug, label]) => [label.toLowerCase(), slug]));
STATE_ALIASES.set("all india", "national");
STATE_ALIASES.set("central", "national");
STATE_ALIASES.set("ap", "andhra-pradesh");
STATE_ALIASES.set("andhra", "andhra-pradesh");
STATE_ALIASES.set("tn", "tamil-nadu");
STATE_ALIASES.set("wb", "west-bengal");
STATE_ALIASES.set("j&k", "jammu-and-kashmir");

let FieldValue = null;

await main();

async function main() {
  const feed = await readFeed();
  const sourceRecords = Array.isArray(feed.records) ? feed.records : [];
  const normalized = sourceRecords.map(normalizeFeedRecord).filter((x) => x.name && x.link).slice(0, MAX_IMPORT);

  if (!normalized.length) {
    await writeReport({ mode: DRY_RUN ? "dry-run" : "import", collection: COLLECTION, added: 0, skipped: 0, failed: 0, errors: ["No usable records found in auto-discovery feed."], feedGeneratedAt: feed.generatedAt || "unknown" });
    throw new Error("No usable records found in auto-discovery feed. Run discovery first or check data/auto-discovered-scholarships.json.");
  }

  if (DRY_RUN) {
    await writeReport({ mode: "dry-run", collection: COLLECTION, added: 0, skipped: 0, failed: 0, errors: [], feedGeneratedAt: feed.generatedAt || "unknown", previewCount: normalized.length, preview: normalized.slice(0, 25) });
    console.log(`Dry run OK. ${normalized.length} normalized record(s) ready.`);
    return;
  }

  const db = await initFirestore();
  const existing = await loadExisting(db);
  const existingKeys = buildExistingKeys(existing);
  const batchSize = 450;
  let added = 0;
  let skipped = 0;
  let failed = 0;
  const imported = [];
  const skippedRecords = [];
  const errors = [];

  for (let start = 0; start < normalized.length; start += batchSize) {
    const chunk = normalized.slice(start, start + batchSize);
    const batch = db.batch();
    let writes = 0;

    for (const record of chunk) {
      try {
        const duplicate = duplicateReason(record, existingKeys);
        if (duplicate) {
          skipped += 1;
          skippedRecords.push({ name: record.name, link: record.link, reason: duplicate });
          continue;
        }

        const docRef = db.collection(COLLECTION).doc(record.id || stableId(record.link || record.name));
        const payload = toFirestoreRecord(record);
        batch.set(docRef, payload, { merge: false });
        markExisting(existingKeys, record);
        writes += 1;
        added += 1;
        imported.push({ id: docRef.id, name: record.name, link: record.link, status: payload.status });
      } catch (error) {
        failed += 1;
        errors.push({ name: record.name || "unknown", link: record.link || "", error: error.message });
      }
    }

    if (writes) await batch.commit();
  }

  const report = { mode: "import", collection: COLLECTION, added, skipped, failed, errors, imported, skippedRecords, feedGeneratedAt: feed.generatedAt || "unknown", generatedAt: new Date().toISOString() };
  await writeReport(report);
  console.log(`Bulk import finished. Added: ${added}. Skipped: ${skipped}. Failed: ${failed}.`);
  if (failed) process.exitCode = 1;
}

async function readFeed() {
  try {
    return JSON.parse(await fs.readFile(FEED_PATH, "utf8"));
  } catch (error) {
    throw new Error(`Could not read discovery feed at ${FEED_PATH}: ${error.message}`);
  }
}

async function initFirestore() {
  const rawSecret = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!rawSecret) throw new Error("Missing FIREBASE_SERVICE_ACCOUNT_JSON GitHub secret. Add it in repo Settings > Secrets and variables > Actions.");

  const { initializeApp, cert, getApps } = await import("firebase-admin/app");
  const { getFirestore, FieldValue: FirebaseFieldValue } = await import("firebase-admin/firestore");
  const serviceAccount = parseServiceAccount(rawSecret);
  if (!getApps().length) {
    initializeApp({
      credential: cert(serviceAccount),
      projectId: process.env.FIREBASE_PROJECT_ID || serviceAccount.project_id
    });
  }
  FieldValue = FirebaseFieldValue;
  return getFirestore();
}

function parseServiceAccount(raw) {
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(`FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON: ${error.message}`);
  }
  if (parsed.private_key) parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
  for (const key of ["project_id", "client_email", "private_key"]) {
    if (!parsed[key]) throw new Error(`FIREBASE_SERVICE_ACCOUNT_JSON missing ${key}`);
  }
  return parsed;
}

async function loadExisting(db) {
  const snapshot = await db.collection(COLLECTION).get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

function buildExistingKeys(existing) {
  const keys = { urls: new Set(), names: new Set() };
  for (const item of existing) markExisting(keys, item);
  return keys;
}

function markExisting(keys, record) {
  const url = normalizeUrl(record.link || record.sourceUrl || record.url);
  const name = normalizeName(record.name || record.title);
  if (url) keys.urls.add(url);
  if (name) keys.names.add(name);
}

function duplicateReason(record, keys) {
  const url = normalizeUrl(record.link || record.sourceUrl || record.url);
  const name = normalizeName(record.name || record.title);
  if (url && keys.urls.has(url)) return "same_url_already_exists";
  if (name && keys.names.has(name)) return "same_name_already_exists";
  return "";
}

function normalizeFeedRecord(item) {
  const url = normalizeUrl(item.url || item.link || item.sourceUrl);
  const title = clean(item.name || item.title || item.scholarshipName || item.schemeName || sourceNameFromUrl(url));
  const state = stateSlug(item.state || item.seedState || item.stateLabel || item.region || "National");
  const sourceName = clean(item.sourceName || item.seedName || sourceNameFromUrl(url));
  const trusted = Boolean(item.official || item.trustedPortal || isTrustedUrl(url));
  const education = list(item.education || item.seedCourse || item.course || item.courses, ["any"]);
  const categories = list(item.categories || item.seedCategory || item.category, ["general", "sc", "st", "obc", "ews", "minority"]);
  const snippet = clean(item.snippet || item.description || item.eligibilityNote || item.eligibility || "");
  const deadlineDate = validDate(item.deadlineDate || item.lastDate || findDate(snippet)) || "";
  const amount = clean(item.amount || extractAmount(snippet) || "Varies as per official rules");
  const sourceTrust = item.official ? "official" : item.trustedPortal || trusted ? "trusted" : "review";
  const id = stableId(`${url}|${title}`);

  return {
    id,
    name: title.slice(0, 200),
    state,
    stateLabel: STATE_LABELS.get(state) || "National",
    status: IMPORT_STATUS,
    amount: amount.slice(0, 160),
    maxIncome: number(item.maxIncome || item.incomeLimit || extractIncome(snippet)),
    minPercentage: clamp(number(item.minPercentage || item.percentage), 0, 100),
    deadline: deadlineDate ? `Apply before ${deadlineDate}` : "Needs official deadline verification",
    deadlineDate: deadlineDate || DEFAULT_DRAFT_DEADLINE,
    link: url,
    sourceUrl: url,
    education,
    categories,
    genders: list(item.genders || item.gender, ["any"]),
    disability: item.disability || "any",
    eligibilityNote: buildEligibilityNote(item, snippet, sourceName),
    incomeNote: clean(item.incomeNote || item.incomeRule || extractIncomeNote(snippet) || "Verify income rules on provider/official portal."),
    sourceName,
    requiredDocuments: array(item.requiredDocuments).slice(0, 30),
    exclusions: array(item.exclusions).slice(0, 15),
    studentSummary: clean(item.studentSummary || `${title}. Source: ${sourceName}. Review eligibility, amount, deadline and original provider page before publishing.`).slice(0, 900),
    benefitDetails: item.benefitDetails || {},
    applicationProcess: clean(item.applicationProcess || "Verify application process on provider/official portal."),
    renewalRules: clean(item.renewalRules || ""),
    documentType: clean(item.documentType || "auto_discovered_portal_record"),
    sourceType: clean(item.searchSource || item.sourceType || "github-action-auto-import"),
    rawSectionNames: array(item.rawSectionNames),
    fileName: clean(item.fileName || ""),
    applicationWindow: "verify",
    academicYear: String(new Date().getFullYear()),
    verifiedOn: TODAY,
    lastChecked: TODAY,
    autoDiscovered: true,
    autoImported: true,
    needsReview: true,
    sourceTrust,
    verificationNote: `Auto-imported as ${IMPORT_STATUS} by GitHub Action on ${TODAY}. Review provider/official source before marking active.`,
    importBatch: process.env.GITHUB_RUN_ID || `local-${Date.now()}`
  };
}

function toFirestoreRecord(record) {
  return {
    ...record,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    createdBy: "github-actions:auto-bulk-import",
    updatedBy: "github-actions:auto-bulk-import"
  };
}

function buildEligibilityNote(item, snippet, sourceName) {
  const base = clean(item.eligibilityNote || item.eligibility || item.description || snippet);
  const note = base || `Auto-discovered from ${sourceName}. Verify exact eligibility, income limit, documents, deadline and application process before publishing.`;
  return note.slice(0, 1400);
}

function list(value, fallback) {
  if (Array.isArray(value)) return value.map(clean).filter(Boolean).length ? value.map(clean).filter(Boolean) : fallback;
  const text = clean(value);
  if (!text || /^any$/i.test(text)) return fallback;
  return text.split(/[,/|;]+|\s+and\s+/i).map((x) => clean(x).toLowerCase()).filter(Boolean);
}
function array(value) { return Array.isArray(value) ? value.map(clean).filter(Boolean) : []; }
function number(value) { const n = Number(String(value || "").replace(/[^0-9.]/g, "")); return Number.isFinite(n) ? n : 0; }
function clamp(value, min, max) { return Math.max(min, Math.min(max, Number(value) || 0)); }
function validDate(value) { const s = String(value || "").trim(); return /^20\d{2}-[01]\d-[0-3]\d$/.test(s) ? s : ""; }
function findDate(text) { return String(text || "").match(/20\d{2}-[01]\d-[0-3]\d/)?.[0] || ""; }
function extractAmount(text) { const amount = String(text || "").match(/(?:₹|rs\.?)\s*([0-9][0-9,]*(?:\.\d+)?)/i)?.[1]?.replace(/,/g, ""); return amount ? `Rs.${amount}` : ""; }
function extractIncome(text) { return String(text || "").match(/(?:income\s+limit|annual\s+income|family\s+income|max(?:imum)?\s+income|not\s+exceed)[^₹\d]{0,100}(?:₹|rs\.?\s?)?([0-9][0-9,]{3,})/i)?.[1]?.replace(/,/g, "") || 0; }
function extractIncomeNote(text) { const s = clean(text); if (/income|financial need|economically needy|non[-\s]?creamy/i.test(s)) return s.slice(0, 500); return ""; }
function normalizeUrl(value) { try { const url = new URL(String(value || "").trim()); if (!["http:", "https:"].includes(url.protocol)) return ""; return url.href; } catch { return ""; } }
function normalizeName(value) { return clean(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\b(20\d{2}|scholarship|scheme|official|apply|online)\b/g, "").replace(/\s+/g, " ").trim(); }
function clean(value) { return String(value || "").replace(/\s+/g, " ").trim(); }
function stateSlug(value) { const key = clean(value).toLowerCase(); if (!key) return "national"; if (STATE_LABELS.has(key)) return key; if (STATE_ALIASES.has(key)) return STATE_ALIASES.get(key); const slug = key.replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""); return STATE_LABELS.has(slug) ? slug : "national"; }
function sourceNameFromUrl(url) { try { const host = new URL(url).hostname.replace(/^www\./, ""); if (host.includes("scholarships.gov.in")) return "National Scholarship Portal"; if (host.includes("aicte")) return "AICTE"; if (host.includes("jnanabhumi")) return "AP Jnanabhumi"; if (host.includes("telanganaepass")) return "Telangana ePASS"; if (host.includes("ugc")) return "UGC"; if (host.includes("buddy4study")) return "Buddy4Study"; if (host.includes("vidyasaarathi")) return "Vidyasaarathi"; if (host.includes("ffe.org")) return "Foundation For Excellence"; if (host.includes("reliancefoundation")) return "Reliance Foundation"; if (host.includes("tatatrusts")) return "Tata Trusts"; if (host.includes("hdfcbank")) return "HDFC Bank"; if (host.includes("adityabirlascholars")) return "Aditya Birla Scholars"; return host.split(".").slice(0, 2).join("."); } catch { return "Official Portal"; } }
function isTrustedUrl(url) { return /gov\.in|nic\.in|ac\.in|scholarships\.gov\.in|aicte-india\.org|ugc\.gov\.in|buddy4study\.com|vidyasaarathi\.co\.in|ffe\.org|reliancefoundation|tatatrusts|hdfcbank|adityabirlascholars/i.test(url); }
function stableId(value) { let h = 5381; const s = String(value || ""); for (let i = 0; i < s.length; i += 1) h = ((h << 5) + h) + s.charCodeAt(i); return `auto_${Math.abs(h >>> 0).toString(36)}`; }
async function writeReport(report) { await fs.mkdir(path.dirname(REPORT_PATH), { recursive: true }); await fs.writeFile(REPORT_PATH, `${JSON.stringify({ ...report, generatedAt: report.generatedAt || new Date().toISOString() }, null, 2)}\n`, "utf8"); }
