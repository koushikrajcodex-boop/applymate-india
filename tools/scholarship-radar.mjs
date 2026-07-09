import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, "data");
const SOURCES_PATH = path.join(DATA_DIR, "scholarship-sources.json");
const CANDIDATES_PATH = path.join(DATA_DIR, "discovery-candidates.json");
const REPORT_PATH = path.join(DATA_DIR, "radar-report.json");

const TODAY = new Date().toISOString().slice(0, 10);
const WRITE_FIRESTORE = process.argv.includes("--write-firestore") || process.env.RADAR_WRITE_FIRESTORE === "true";
const MAX_LINKS_PER_SOURCE = Number(process.env.RADAR_MAX_LINKS_PER_SOURCE || 18);
const MAX_DETAIL_PAGES_PER_SOURCE = Number(process.env.RADAR_MAX_DETAIL_PAGES_PER_SOURCE || 8);
const DEFAULT_DRAFT_DEADLINE = "2099-12-31";

const STATE_LABELS = new Map([
  ["national", "National"],
  ["andhra-pradesh", "Andhra Pradesh"],
  ["telangana", "Telangana"],
  ["karnataka", "Karnataka"],
  ["maharashtra", "Maharashtra"],
  ["tamil-nadu", "Tamil Nadu"],
  ["kerala", "Kerala"],
  ["delhi", "Delhi"],
  ["uttar-pradesh", "Uttar Pradesh"],
  ["west-bengal", "West Bengal"]
]);

const STATE_ALIASES = new Map([
  ["andhra pradesh", "andhra-pradesh"],
  ["ap", "andhra-pradesh"],
  ["telangana", "telangana"],
  ["karnataka", "karnataka"],
  ["maharashtra", "maharashtra"],
  ["tamil nadu", "tamil-nadu"],
  ["kerala", "kerala"],
  ["delhi", "delhi"],
  ["uttar pradesh", "uttar-pradesh"],
  ["west bengal", "west-bengal"],
  ["national", "national"],
  ["all india", "national"],
  ["central", "national"]
]);

const SCHOLARSHIP_HINTS = /scholarship|fellowship|stipend|financial assistance|fee reimbursement|scheme|pragati|saksham|post matric|pre matric|merit|tuition fee/i;
const BAD_LINK_HINTS = /login|sign in|signin|register|contact|privacy|terms|gallery|tender|career|recruitment|javascript:/i;
const MONTHS = new Map([
  ["jan", "01"], ["january", "01"],
  ["feb", "02"], ["february", "02"],
  ["mar", "03"], ["march", "03"],
  ["apr", "04"], ["april", "04"],
  ["may", "05"],
  ["jun", "06"], ["june", "06"],
  ["jul", "07"], ["july", "07"],
  ["aug", "08"], ["august", "08"],
  ["sep", "09"], ["sept", "09"], ["september", "09"],
  ["oct", "10"], ["october", "10"],
  ["nov", "11"], ["november", "11"],
  ["dec", "12"], ["december", "12"]
]);

async function main() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const config = JSON.parse(await fs.readFile(SOURCES_PATH, "utf8"));
  const publishConfidence = Number(config.publishConfidence || 90);
  const draftConfidence = Number(config.draftConfidence || 70);
  const db = await maybeInitFirestore();
  const existing = db ? await loadExistingScholarships(db) : [];
  const sourceResults = [];
  const rawCandidates = [];

  for (const source of config.sources || []) {
    if (source.enabled === false) continue;
    const result = await scanSource(source);
    sourceResults.push({ source: source.name, ...result.summary });
    rawCandidates.push(...result.candidates);
  }

  const checked = dedupeCandidates(rawCandidates)
    .map((candidate) => autoCheckCandidate(candidate, existing, { publishConfidence, draftConfidence }));

  const firestoreResult = db && WRITE_FIRESTORE
    ? await applyFirestoreActions(db, checked, existing)
    : { enabled: false, reason: WRITE_FIRESTORE ? "Missing FIREBASE_SERVICE_ACCOUNT_JSON secret" : "Dry run only", addedActive: 0, addedDraft: 0, skipped: 0, closedExpired: 0, errors: [] };

  const report = {
    generatedAt: new Date().toISOString(),
    date: TODAY,
    mode: WRITE_FIRESTORE ? "auto-check-and-write" : "dry-run",
    firestore: firestoreResult,
    sourceResults,
    totals: summarize(checked),
    candidates: checked.map(toReportCandidate)
  };

  await fs.writeFile(CANDIDATES_PATH, `${JSON.stringify({ generatedAt: report.generatedAt, candidates: report.candidates }, null, 2)}\n`, "utf8");
  await fs.writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log("Scholarship Radar Pro finished.");
  console.log(JSON.stringify(report.totals, null, 2));
  console.log(JSON.stringify(report.firestore, null, 2));
}

async function maybeInitFirestore() {
  if (!WRITE_FIRESTORE) return null;
  const rawSecret = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!rawSecret) {
    console.warn("FIREBASE_SERVICE_ACCOUNT_JSON is not set. Radar will only write JSON reports.");
    return null;
  }

  const admin = await import("firebase-admin");
  const serviceAccount = JSON.parse(rawSecret);
  if (!admin.apps?.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }
  return admin.firestore();
}

async function loadExistingScholarships(db) {
  const snapshot = await db.collection("scholarships").get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

async function scanSource(source) {
  const startedAt = Date.now();
  const candidates = [];
  const errors = [];

  try {
    const homeHtml = await fetchText(source.url);
    const homeText = htmlToText(homeHtml);
    const links = extractLinks(source.url, homeHtml)
      .filter((link) => isUsefulScholarshipLink(link))
      .slice(0, MAX_LINKS_PER_SOURCE);

    for (let i = 0; i < links.length; i += 1) {
      const link = links[i];
      let detailText = "";
      if (i < MAX_DETAIL_PAGES_PER_SOURCE && sameTrustedDomain(link.href, source)) {
        try {
          detailText = htmlToText(await fetchText(link.href));
        } catch (error) {
          errors.push(`${link.href}: ${error.message}`);
        }
      }

      const context = cleanText(`${link.label}. ${detailText || surroundingText(homeText, link.label)}`);
      candidates.push(buildCandidate(source, link, context));
    }

    if (!candidates.length) {
      candidates.push(makeReviewCandidate(source, "No scholarship-like links found. The source may be JavaScript-heavy or PDF-based."));
    }
  } catch (error) {
    errors.push(error.message);
    candidates.push(makeReviewCandidate(source, `Could not fetch source automatically: ${error.message}`));
  }

  return {
    candidates,
    summary: {
      found: candidates.length,
      errors: errors.length,
      ms: Date.now() - startedAt
    }
  };
}

async function fetchText(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 22000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "user-agent": "ApplyMateIndiaScholarshipRadarPro/2.0 (+https://koushikrajcodex-boop.github.io/applymate-india/)",
        "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
      }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

function buildCandidate(source, link, context) {
  const state = detectState(context, source.state || source.defaultState || "national");
  const date = findDate(context);
  const official = sameTrustedDomain(link.href, source);
  const sourceName = source.name || "Official Portal";
  const rawName = bestName(link.label, context, sourceName);

  return {
    name: rawName,
    state,
    stateLabel: stateLabel(state),
    amount: findAmount(context),
    maxIncome: findIncome(context),
    minPercentage: findPercentage(context),
    deadline: date ? `Apply before ${date}` : findDeadlineText(context),
    deadlineDate: date,
    link: normalizeUrl(link.href || source.url),
    sourceUrl: normalizeUrl(link.href || source.url),
    education: detectEducation(context, source.defaultEducation),
    categories: detectCategories(context, source.defaultCategories),
    genders: detectGenders(context, source.defaultGenders),
    disability: detectDisability(context),
    eligibilityNote: findEligibilityNote(context, sourceName),
    incomeNote: findIncomeNote(context),
    priority: official ? 76 : 45,
    sourceName,
    sourceOfficial: official,
    sourceRootUrl: source.url,
    rawContext: context.slice(0, 1800)
  };
}

function makeReviewCandidate(source, reason) {
  const state = source.state || source.defaultState || "national";
  return {
    name: `${source.name} Manual Review Needed`,
    state,
    stateLabel: stateLabel(state),
    amount: "Varies as per official rules",
    maxIncome: 0,
    minPercentage: 0,
    deadline: "Needs official deadline verification",
    deadlineDate: "",
    link: normalizeUrl(source.url),
    sourceUrl: normalizeUrl(source.url),
    education: source.defaultEducation || ["any"],
    categories: source.defaultCategories || ["general"],
    genders: source.defaultGenders || ["any"],
    disability: "any",
    eligibilityNote: reason,
    incomeNote: "Verify income rules on official portal.",
    priority: 25,
    sourceName: source.name,
    sourceOfficial: Boolean(source.trust === "official"),
    sourceRootUrl: source.url,
    rawContext: reason
  };
}

function autoCheckCandidate(item, existing, thresholds) {
  const issues = [];
  const warnings = [];
  let confidence = 0;
  const duplicate = findDuplicate(item, existing);

  if (duplicate) issues.push(`Duplicate already exists: ${duplicate.name || duplicate.id}`);
  if (item.sourceOfficial) confidence += 22; else issues.push("Source is not official or not trusted.");
  if (isValidUrl(item.link)) confidence += 14; else issues.push("Missing valid official URL.");
  if (item.name && item.name.length >= 6 && !/manual review needed/i.test(item.name)) confidence += 16; else issues.push("Weak scholarship name.");
  if (item.deadlineDate && !isPastDate(item.deadlineDate)) confidence += 16; else warnings.push("Missing future deadline date; draft will use placeholder deadline.");
  if (item.education?.length) confidence += 7; else warnings.push("Education list not detected.");
  if (item.categories?.length) confidence += 7; else warnings.push("Category list not detected.");
  if (item.eligibilityNote && item.eligibilityNote.length >= 60) confidence += 10; else warnings.push("Eligibility note is short.");
  if (item.incomeNote && item.incomeNote.length >= 20) confidence += 5; else warnings.push("Income note is short.");
  if (item.rawContext && item.rawContext.length >= 250) confidence += 3;

  let decision = "review";
  if (duplicate) decision = "skipDuplicate";
  else if (item.deadlineDate && isPastDate(item.deadlineDate)) decision = "skipExpired";
  else if (!issues.length && confidence >= thresholds.publishConfidence && canPublishActive(item)) decision = "autoActive";
  else if (item.sourceOfficial && confidence >= thresholds.draftConfidence) decision = "autoDraft";
  else decision = "review";

  return {
    ...item,
    autoCheck: {
      confidence: Math.min(100, confidence),
      decision,
      duplicateId: duplicate?.id || "",
      duplicateName: duplicate?.name || "",
      issues,
      warnings
    }
  };
}

async function applyFirestoreActions(db, checked, existing) {
  const result = { enabled: true, addedActive: 0, addedDraft: 0, skipped: 0, closedExpired: 0, errors: [] };
  result.closedExpired = await closeExpiredActiveScholarships(db, existing);

  for (const item of checked) {
    try {
      if (item.autoCheck.decision === "autoActive") {
        await db.collection("scholarships").add(toFirestoreRecord(item, "active", db));
        result.addedActive += 1;
      } else if (item.autoCheck.decision === "autoDraft") {
        await db.collection("scholarships").add(toFirestoreRecord(item, "draft", db));
        result.addedDraft += 1;
      } else {
        result.skipped += 1;
      }
    } catch (error) {
      result.errors.push(`${item.name}: ${error.message}`);
    }
  }

  return result;
}

async function closeExpiredActiveScholarships(db, existing) {
  let closed = 0;
  for (const item of existing) {
    if (item.status === "active" && item.deadlineDate && isPastDate(item.deadlineDate)) {
      await db.collection("scholarships").doc(item.id).update({
        status: "closed",
        applicationWindow: "closed",
        updatedAt: serverTimestamp(db),
        updatedBy: "scholarship-radar-pro",
        verificationNote: `Auto-closed by Scholarship Radar Pro on ${TODAY} because deadlineDate passed.`
      });
      closed += 1;
    }
  }
  return closed;
}

function toFirestoreRecord(item, status, db) {
  const actualDate = item.deadlineDate || DEFAULT_DRAFT_DEADLINE;
  const confidence = item.autoCheck?.confidence ?? 0;
  const needsDateReview = !item.deadlineDate;

  return {
    name: cleanText(item.name).slice(0, 200),
    state: item.state || "national",
    stateLabel: item.stateLabel || stateLabel(item.state || "national"),
    status,
    amount: cleanText(item.amount || "Varies as per official rules").slice(0, 120),
    maxIncome: number(item.maxIncome),
    minPercentage: clamp(number(item.minPercentage), 0, 100),
    deadline: needsDateReview ? "Needs official deadline verification" : cleanText(item.deadline || `Apply before ${actualDate}`).slice(0, 160),
    deadlineDate: actualDate,
    link: normalizeUrl(item.link || item.sourceUrl),
    sourceUrl: normalizeUrl(item.sourceUrl || item.link),
    education: sanitizeList(item.education, ["any"], 30),
    categories: sanitizeList(item.categories, ["general"], 30),
    genders: sanitizeList(item.genders, ["any"], 10),
    disability: ["any", "yes", "no"].includes(item.disability) ? item.disability : "any",
    eligibilityNote: cleanText(item.eligibilityNote || "Verify eligibility on official portal before applying.").slice(0, 1200),
    incomeNote: cleanText(item.incomeNote || "Verify income rules on official portal.").slice(0, 800),
    priority: clamp(number(item.priority || 60), 0, 100),
    sourceName: cleanText(item.sourceName || "Official Portal").slice(0, 120),
    applicationWindow: status === "active" ? "open" : "verify",
    academicYear: new Date().getFullYear().toString(),
    verifiedOn: TODAY,
    verificationNote: status === "active"
      ? `Auto-published by Scholarship Radar Pro on ${TODAY}. Confidence ${confidence}%. Official source still needs periodic human audit.`
      : `Auto-added as draft by Scholarship Radar Pro on ${TODAY}. Confidence ${confidence}%. ${needsDateReview ? "Deadline requires review." : "Review before publishing."}`,
    lastChecked: TODAY,
    sourceType: "scholarship-radar-pro",
    createdAt: serverTimestamp(db),
    updatedAt: serverTimestamp(db),
    createdBy: "scholarship-radar-pro",
    updatedBy: "scholarship-radar-pro"
  };
}

function serverTimestamp(db) {
  return db.constructor.FieldValue ? db.constructor.FieldValue.serverTimestamp() : new Date();
}

function canPublishActive(item) {
  return item.sourceOfficial &&
    isValidUrl(item.link) &&
    item.deadlineDate &&
    !isPastDate(item.deadlineDate) &&
    item.name?.length >= 6 &&
    item.eligibilityNote?.length >= 60 &&
    item.incomeNote?.length >= 20;
}

function findDuplicate(candidate, existing) {
  const candidateName = normalizeName(candidate.name);
  const candidateUrl = normalizeUrl(candidate.sourceUrl || candidate.link);
  return existing.find((item) => {
    const sameName = candidateName && normalizeName(item.name) === candidateName;
    const sameUrl = candidateUrl && normalizeUrl(item.sourceUrl || item.link) === candidateUrl;
    return sameName || sameUrl;
  });
}

function dedupeCandidates(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = `${normalizeName(item.name)}|${normalizeUrl(item.link)}`;
    if (!key.trim() || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function summarize(items) {
  return items.reduce((out, item) => {
    const decision = item.autoCheck?.decision || "review";
    out.total += 1;
    out[decision] = (out[decision] || 0) + 1;
    return out;
  }, { total: 0, autoActive: 0, autoDraft: 0, review: 0, skipDuplicate: 0, skipExpired: 0 });
}

function toReportCandidate(item) {
  return {
    name: item.name,
    sourceName: item.sourceName,
    sourceUrl: item.sourceUrl,
    state: item.state,
    deadlineDate: item.deadlineDate || "",
    decision: item.autoCheck.decision,
    confidence: item.autoCheck.confidence,
    issues: item.autoCheck.issues,
    warnings: item.autoCheck.warnings,
    duplicateName: item.autoCheck.duplicateName || "",
    draftWillUsePlaceholderDeadline: item.autoCheck.decision === "autoDraft" && !item.deadlineDate
  };
}

function extractLinks(baseUrl, html) {
  const links = [];
  const rx = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = rx.exec(String(html || "")))) {
    const href = normalizeUrl(resolveUrl(baseUrl, match[1]));
    const label = cleanText(htmlToText(match[2]));
    if (href && label) links.push({ href, label });
  }
  return links;
}

function isUsefulScholarshipLink(link) {
  const text = `${link.label} ${link.href}`;
  return SCHOLARSHIP_HINTS.test(text) && !BAD_LINK_HINTS.test(text) && link.label.length >= 4;
}

function sameTrustedDomain(url, source) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return (source.trustedDomains || [])
      .map((domain) => String(domain).replace(/^www\./, ""))
      .some((domain) => host === domain || host.endsWith(`.${domain}`));
  } catch {
    return false;
  }
}

function surroundingText(text, label) {
  const clean = cleanText(text);
  const idx = clean.toLowerCase().indexOf(String(label || "").toLowerCase());
  if (idx < 0) return clean.slice(0, 1500);
  return clean.slice(Math.max(0, idx - 700), idx + 1200);
}

function bestName(label, context, sourceName) {
  const cleanLabel = cleanText(label)
    .replace(/^(new|latest|apply online|click here|read more|view details)\s+/i, "")
    .replace(/\s+/g, " ")
    .slice(0, 180);
  if (SCHOLARSHIP_HINTS.test(cleanLabel) && cleanLabel.length >= 6) return cleanLabel;

  const sentence = cleanText(context).split(/[.!?\n]/).find((line) => SCHOLARSHIP_HINTS.test(line) && line.length >= 8 && line.length <= 180);
  return sentence || `${sourceName} Scholarship Update`;
}

function htmlToText(html) {
  return String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>|<\/li>|<\/tr>|<\/h[1-6]>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s+/g, "\n")
    .trim();
}

function detectState(text, fallback) {
  const normalized = normalizeKey(text);
  for (const [label, slug] of STATE_ALIASES.entries()) {
    if (normalized.includes(label)) return slug;
  }
  return fallback || "national";
}

function detectEducation(text, fallback = ["any"]) {
  const t = normalizeKey(text);
  const found = [];
  if (/engineering|technical|diploma|b tech|btech|aicte|polytechnic/.test(t)) found.push("engineering");
  if (/degree|undergraduate|ug|bsc|ba|bcom/.test(t)) found.push("degree");
  if (/intermediate|class 11|class 12|12th|11th/.test(t)) found.push("intermediate");
  if (/school|class [1-9]|10th|ssc|pre matric/.test(t)) found.push("school");
  if (/postgraduate|post graduation|pg|m tech|mtech|masters|msc|phd/.test(t)) found.push("pg");
  return sanitizeList(found.length ? found : fallback, ["any"], 30);
}

function detectCategories(text, fallback = ["general"]) {
  const t = normalizeKey(text);
  const found = [];
  if (/\bsc\b|scheduled caste/.test(t)) found.push("sc");
  if (/\bst\b|scheduled tribe/.test(t)) found.push("st");
  if (/obc|\bbc\b|backward class/.test(t)) found.push("obc");
  if (/ews|ebc/.test(t)) found.push("ews");
  if (/minority|muslim|christian|sikh|buddhist|jain|parsi/.test(t)) found.push("minority");
  if (/kapu/.test(t)) found.push("kapu");
  if (/general|open category/.test(t)) found.push("general");
  return sanitizeList(found.length ? found : fallback, ["general"], 30);
}

function detectGenders(text, fallback = ["any"]) {
  const t = normalizeKey(text);
  if (/girl|female|women|woman|daughter|pragati/.test(t)) return ["female"];
  if (/boy|male|men|man|son/.test(t)) return ["male"];
  return sanitizeList(fallback, ["any"], 10);
}

function detectDisability(text) {
  const t = normalizeKey(text);
  if (/disabled|disability|pwd|specially abled|saksham/.test(t)) return "yes";
  if (/not disabled|no disability/.test(t)) return "no";
  return "any";
}

function findAmount(text) {
  return text.match(/(?:₹|Rs\.?|INR)\s?[0-9,]+(?:\s?(?:per year|p\.a\.|annually|month|semester))?/i)?.[0] || "Varies as per official rules";
}

function findIncome(text) {
  const lakh = text.match(/(?:income|family income|annual income)[^0-9]{0,50}([0-9]+(?:\.[0-9]+)?)\s?(?:lakh|lakhs|lac|lacs)/i);
  if (lakh) return Math.round(Number(lakh[1]) * 100000);
  const rupees = text.match(/(?:income|family income|annual income)[^0-9]{0,50}(?:₹|Rs\.?|INR)?\s?([0-9,]{5,9})/i);
  return rupees ? number(rupees[1]) : 0;
}

function findPercentage(text) {
  const match = text.match(/(?:minimum|marks|percentage|score)[^0-9]{0,35}([0-9]+(?:\.[0-9]+)?)\s?%/i);
  return match ? clamp(Number(match[1]), 0, 100) : 0;
}

function findDeadlineText(text) {
  const match = text.match(/(?:last date|deadline|closing date|apply by).{0,150}/i)?.[0];
  return cleanText(match || "Needs official deadline verification").slice(0, 160);
}

function findEligibilityNote(text, sourceName) {
  const match = text.match(/(?:eligibility|eligible|who can apply).{0,550}/i)?.[0];
  const note = cleanText(match || text).slice(0, 700);
  return note.length >= 40 ? note : `Verify eligibility on ${sourceName} official portal before applying.`;
}

function findIncomeNote(text) {
  const match = text.match(/(?:income|family income|annual income).{0,220}/i)?.[0];
  return match ? cleanText(match).slice(0, 250) : "Verify income rules on official portal.";
}

function findDate(text) {
  const iso = text.match(/20\d{2}-[01]\d-[0-3]\d/)?.[0];
  if (iso) return iso;

  const slash = text.match(/\b([0-3]?\d)[/-]([01]?\d)[/-](20\d{2})\b/);
  if (slash) return `${slash[3]}-${slash[2].padStart(2, "0")}-${slash[1].padStart(2, "0")}`;

  const monthFirst = text.match(/\b(january|february|march|april|may|june|july|august|september|sept|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\s+([0-3]?\d),?\s+(20\d{2})\b/i);
  if (monthFirst) return `${monthFirst[3]}-${MONTHS.get(monthFirst[1].toLowerCase())}-${monthFirst[2].padStart(2, "0")}`;

  const dayFirst = text.match(/\b([0-3]?\d)\s+(january|february|march|april|may|june|july|august|september|sept|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec),?\s+(20\d{2})\b/i);
  if (dayFirst) return `${dayFirst[3]}-${MONTHS.get(dayFirst[2].toLowerCase())}-${dayFirst[1].padStart(2, "0")}`;

  return "";
}

function isPastDate(value) {
  if (!value) return false;
  const date = new Date(`${value}T23:59:59Z`);
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() < Date.now();
}

function resolveUrl(baseUrl, href) {
  try { return new URL(href, baseUrl).href; } catch { return ""; }
}

function normalizeUrl(value) {
  try {
    const url = new URL(String(value || "").trim());
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

function isValidUrl(value) {
  return Boolean(normalizeUrl(value));
}

function normalizeName(value) {
  return normalizeKey(value).replace(/\b(scholarship|scheme|yojana|program|programme)\b/g, "").replace(/\s+/g, " ").trim();
}

function normalizeKey(value) {
  return String(value || "").toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function stateLabel(slug) {
  return STATE_LABELS.get(slug) || slug.split("-").map((x) => x.charAt(0).toUpperCase() + x.slice(1)).join(" ");
}

function sanitizeList(value, fallback, max) {
  const items = Array.isArray(value) ? value : String(value || "").split(",");
  const cleaned = items.map((x) => normalizeKey(x).replace(/\s+/g, "-")).filter(Boolean);
  return [...new Set(cleaned.length ? cleaned : fallback)].slice(0, max);
}

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function number(value) {
  const n = Number(String(value || "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
