import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, "data");
const FEED_PATH = path.join(DATA_DIR, "auto-discovered-scholarships.json");
const PUBLIC_PATH = path.join(DATA_DIR, "public-scholarships.json");
const REPORT_PATH = path.join(DATA_DIR, "bulk-import-report.json");
const TODAY = new Date().toISOString().slice(0, 10);
const NOW = new Date().toISOString();
const SOURCE_PACK = process.env.SOURCE_PACK || "all";
const MAX_PUBLIC = Math.max(5, Number(process.env.MAX_PUBLIC || process.env.MAX_IMPORT || 100));
const THRESHOLD = clamp(Number(process.env.AUTO_PUBLISH_THRESHOLD || 85), 70, 100);

try {
  await main();
} catch (error) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(PUBLIC_PATH, JSON.stringify({
    generatedAt: NOW,
    mode: "public-json-failed",
    sourcePack: SOURCE_PACK,
    total: 0,
    records: [],
    errors: [{ error: error.message }]
  }, null, 2) + "\n", "utf8");
  await writePublicReport(0, 0, 1, `Public JSON engine failed: ${error.message}`, []);
  console.error(error);
  process.exit(1);
}

async function main() {
  const feed = JSON.parse(await fs.readFile(FEED_PATH, "utf8"));
  const rawRecords = Array.isArray(feed.records) ? feed.records : [];
  const records = rawRecords
    .map(toPublicRecord)
    .filter((item) => item.name && item.sourceUrl && item.status === "active")
    .sort((a, b) => Number(b.aiConfidence || 0) - Number(a.aiConfidence || 0))
    .slice(0, MAX_PUBLIC);

  const payload = {
    generatedAt: NOW,
    generatedBy: "ApplyMate Secretless Public Scholarship Engine v2",
    mode: "public-json",
    sourcePack: feed.sourcePack || SOURCE_PACK,
    sourcePackLabel: feed.sourcePackLabel || SOURCE_PACK,
    threshold: THRESHOLD,
    note: "Secretless GitHub Actions output. Students must verify every scholarship on the official source before applying.",
    total: records.length,
    records
  };

  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(PUBLIC_PATH, JSON.stringify(payload, null, 2) + "\n", "utf8");
  await writePublicReport(records.length, rawRecords.length - records.length, 0, `Secretless public JSON engine built ${records.length} active record(s). No Firebase secret needed.`, records);
  console.log(`Public scholarship JSON built. Records: ${records.length}.`);
}

async function writePublicReport(added, skipped, failed, explainer, records) {
  const report = {
    generatedAt: NOW,
    mode: "public-json",
    importMode: "secretless_public_json",
    sourcePack: SOURCE_PACK,
    sourcePackLabel: SOURCE_PACK,
    collection: "data/public-scholarships.json",
    added,
    updated: 0,
    skipped,
    failed,
    activeCandidates: added,
    draftCandidates: skipped,
    autoPublishThreshold: THRESHOLD,
    secretStatus: {
      firebaseServiceAccount: "not-needed-public-json-engine",
      firebaseProjectId: "not-needed-public-json-engine"
    },
    explainer,
    imported: records.slice(0, 50).map((item) => ({
      id: item.id,
      name: item.name,
      link: item.link,
      status: item.status,
      sourcePack: item.sourcePack,
      aiConfidence: item.aiConfidence,
      sourceTrust: item.sourceTrust
    })),
    updatedRecords: [],
    skippedRecords: [],
    errors: []
  };
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(REPORT_PATH, JSON.stringify(report, null, 2) + "\n", "utf8");
}

function toPublicRecord(item) {
  const url = normalizeUrl(item.url || item.link || item.sourceUrl);
  const rawText = clean([item.title, item.name, item.snippet, item.description, item.seedName, item.searchQuery, url].filter(Boolean).join(" "));
  const sourceTrust = item.official ? "official" : item.trustedPortal || isTrustedUrl(url) ? "trusted" : "review";
  const confidence = scoreRecord(item, url, rawText, sourceTrust);
  const deadlineDate = findDeadlineDate(rawText);
  const safeActive = confidence >= THRESHOLD && ["official", "trusted"].includes(sourceTrust);
  const title = clean(item.title || item.name || sourceNameFromUrl(url));
  const state = stateSlug(item.state || item.seedState || detectState(rawText));

  return {
    id: stableId(`${url}|${title}`),
    name: title.slice(0, 190),
    state,
    stateLabel: stateLabel(state),
    status: safeActive ? "active" : "draft",
    applicationWindow: safeActive ? "open" : "verify",
    amount: extractAmount(rawText) || "Varies as per official rules",
    maxIncome: extractIncome(rawText),
    minPercentage: 0,
    deadline: deadlineDate ? `Apply before ${deadlineDate}` : "Check official portal",
    deadlineDate: deadlineDate || "2099-12-31",
    link: url,
    sourceUrl: url,
    sourceName: clean(item.seedName || sourceNameFromUrl(url)),
    education: list(item.education || item.seedCourse || detectCourse(rawText), ["any"]),
    categories: list(item.categories || item.seedCategory || detectCategory(rawText), ["general", "sc", "st", "obc", "ews", "minority"]),
    genders: list(detectGender(rawText), ["any"]),
    disability: detectDisability(rawText),
    eligibilityNote: rawText.slice(0, 900) || "Verify eligibility on official source.",
    incomeNote: extractIncomeNote(rawText) || "Verify income rules on official source.",
    studentSummary: `${title}. Auto-discovered by ApplyMate public scholarship engine. Verify final details on official source.`,
    sourceType: "secretless-public-json-engine-v2",
    sourceTrust,
    sourcePack: item.sourcePack || SOURCE_PACK,
    aiConfidence: confidence,
    aiDecision: safeActive ? "public_json_active" : "public_json_review_only",
    aiSignals: signalList(item, url, rawText, sourceTrust),
    verifiedOn: TODAY,
    lastChecked: TODAY,
    autoDiscovered: true,
    autoImported: false,
    needsReview: !safeActive,
    verificationNote: `Generated by secretless public JSON engine on ${TODAY}. No Firebase secret required. Always verify on official source.`
  };
}

function scoreRecord(item, url, text, sourceTrust) {
  let score = 0;
  if (url) score += 15;
  if (sourceTrust === "official") score += 35;
  else if (sourceTrust === "trusted") score += 25;
  if (/scholarship|fellowship|grant|stipend|financial assistance|post matric|pre matric|education support/i.test(text)) score += 20;
  if (/apply|application|registration|deadline|last date|eligible|eligibility|income/i.test(text)) score += 12;
  if (Number(item.score)) score += Math.min(18, Math.max(0, Number(item.score) - 65) / 2);
  if (/closed|expired|deadline passed|applications closed/i.test(text)) score -= 35;
  return Math.round(clamp(score, 0, 100));
}
function signalList(item, url, text, sourceTrust) {
  const out = [];
  if (url) out.push("valid_url");
  out.push(`source_trust_${sourceTrust}`);
  if (/scholarship|fellowship|grant|stipend/i.test(text)) out.push("scholarship_text");
  if (/apply|application|registration|deadline|last date/i.test(text)) out.push("application_language");
  if (Number(item.score)) out.push(`discovery_score_${item.score}`);
  return out;
}
function findDeadlineDate(text) {
  const year = new Date().getFullYear();
  const dates = [];
  for (const match of String(text || "").matchAll(/\b(20\d{2})[-/.]([01]?\d)[-/.]([0-3]?\d)\b/g)) addDate(dates, match[1], match[2], match[3]);
  for (const match of String(text || "").matchAll(/\b([0-3]?\d)[-/.]([01]?\d)[-/.](20\d{2})\b/g)) addDate(dates, match[3], match[2], match[1]);
  return dates.filter((date) => date >= TODAY && Number(date.slice(0, 4)) <= year + 3).sort()[0] || "";
}
function addDate(out, y, m, d) {
  const iso = `${String(Number(y)).padStart(4, "0")}-${String(Number(m)).padStart(2, "0")}-${String(Number(d)).padStart(2, "0")}`;
  const date = new Date(`${iso}T00:00:00Z`);
  if (!Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === iso) out.push(iso);
}
function normalizeUrl(value) { try { const url = new URL(String(value || "").trim()); url.hash = ""; return ["http:", "https:"].includes(url.protocol) ? url.href : ""; } catch { return ""; } }
function isTrustedUrl(url) { return /gov\.in|nic\.in|ac\.in|scholarships\.gov\.in|aicte-india\.org|ugc\.gov\.in|cbse\.gov\.in|buddy4study\.com|vidyasaarathi\.co\.in|ffe\.org|reliancefoundation|tatatrusts|hdfcbank|adityabirlascholars/i.test(url); }
function sourceNameFromUrl(url) { try { const host = new URL(url).hostname.replace(/^www\./, ""); if (host.includes("scholarships.gov.in")) return "National Scholarship Portal"; if (host.includes("aicte")) return "AICTE"; if (host.includes("jnanabhumi")) return "AP Jnanabhumi"; if (host.includes("telanganaepass")) return "Telangana ePASS"; if (host.includes("ugc")) return "UGC"; return host; } catch { return "Scholarship Source"; } }
function detectState(text) { const t = String(text || "").toLowerCase(); if (/andhra|jnanabhumi|\bap\b/.test(t)) return "Andhra Pradesh"; if (/telangana|epass/.test(t)) return "Telangana"; if (/karnataka|ssp/.test(t)) return "Karnataka"; if (/maharashtra|mahadbt/.test(t)) return "Maharashtra"; if (/rajasthan|sje/.test(t)) return "Rajasthan"; return "National"; }
function stateSlug(value) { const key = clean(value).toLowerCase(); const aliases = { national: "national", "all india": "national", "andhra pradesh": "andhra-pradesh", ap: "andhra-pradesh", telangana: "telangana", karnataka: "karnataka", maharashtra: "maharashtra", rajasthan: "rajasthan" }; return aliases[key] || key.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "national"; }
function stateLabel(slug) { return String(slug || "national").split("-").map((x) => x ? x[0].toUpperCase() + x.slice(1) : "").join(" "); }
function list(value, fallback) { if (Array.isArray(value)) return value.map(clean).filter(Boolean).map((x) => x.toLowerCase()); const text = clean(value); if (!text || /^any$/i.test(text)) return fallback; return text.split(/[,/|;]+|\s+and\s+/i).map((x) => clean(x).toLowerCase()).filter(Boolean); }
function detectCategory(text) { const t = String(text || "").toLowerCase(); const out = []; if (/\bsc\b|scheduled caste/.test(t)) out.push("sc"); if (/\bst\b|scheduled tribe/.test(t)) out.push("st"); if (/obc|backward/.test(t)) out.push("obc"); if (/ews|ebc/.test(t)) out.push("ews"); if (/minority|muslim|christian|sikh|jain|buddhist/.test(t)) out.push("minority"); if (/girl|women|female/.test(t)) out.push("girls"); if (/disab|specially abled|pwd/.test(t)) out.push("disabled"); return out.join(",") || "any"; }
function detectCourse(text) { const t = String(text || "").toLowerCase(); const out = []; if (/engineering|technical|aicte|btech|diploma/.test(t)) out.push("engineering"); if (/medical|medicine|nursing/.test(t)) out.push("medical"); if (/school|class|cbse/.test(t)) out.push("school"); if (/degree|undergraduate|graduate/.test(t)) out.push("degree"); if (/pg|postgraduate|masters|phd/.test(t)) out.push("pg"); return out.join(",") || "any"; }
function detectGender(text) { return /girl|women|female/i.test(text) ? "female" : "any"; }
function detectDisability(text) { return /disab|specially abled|pwd|saksham/i.test(text) ? "yes" : "any"; }
function extractAmount(text) { const amount = String(text || "").match(/(?:₹|rs\.?)\s*([0-9][0-9,]*(?:\.\d+)?)/i)?.[1]?.replace(/,/g, ""); return amount ? `Rs.${amount}` : ""; }
function extractIncome(text) { return Number(String(text || "").match(/(?:income\s+limit|annual\s+income|family\s+income|max(?:imum)?\s+income|not\s+exceed)[^₹\d]{0,100}(?:₹|rs\.?\s?)?([0-9][0-9,]{3,})/i)?.[1]?.replace(/,/g, "") || 0); }
function extractIncomeNote(text) { const s = clean(text); return /income|financial need|economically needy|non[-\s]?creamy/i.test(s) ? s.slice(0, 500) : ""; }
function stableId(value) { let h = 5381; const s = String(value || ""); for (let i = 0; i < s.length; i += 1) h = ((h << 5) + h) + s.charCodeAt(i); return `public_${Math.abs(h >>> 0).toString(36)}`; }
function clean(value) { return String(value || "").replace(/\s+/g, " ").trim(); }
function clamp(value, min, max) { return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min)); }
