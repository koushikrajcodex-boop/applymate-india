import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const SOURCES_PATH = path.join(ROOT, "data", "scholarship-sources.json");
const OUTPUT_PATH = path.join(ROOT, "data", "discovery-candidates.json");
const TODAY = new Date().toISOString().slice(0, 10);

const STATE_ALIASES = new Map([
  ["andhra pradesh", "andhra-pradesh"],
  ["ap", "andhra-pradesh"],
  ["telangana", "telangana"],
  ["national", "national"],
  ["all india", "national"],
  ["central", "national"]
]);

const EDUCATION_KEYWORDS = ["engineering", "degree", "school", "intermediate", "pg", "diploma", "technical", "undergraduate", "postgraduate"];
const CATEGORY_KEYWORDS = ["general", "sc", "st", "obc", "bc", "ews", "ebc", "minority", "kapu", "disabled", "pwd"];
const SCHOLARSHIP_HINTS = /scholarship|fellowship|stipend|financial assistance|fee reimbursement|scheme|pragati|saksham|post matric|pre matric/i;

async function main() {
  await ensureDataFolder();
  const sourceConfig = JSON.parse(await fs.readFile(SOURCES_PATH, "utf8"));
  const candidates = [];

  for (const source of sourceConfig.sources || []) {
    const sourceCandidates = await scanSource(source);
    candidates.push(...sourceCandidates);
  }

  const uniqueCandidates = dedupeCandidates(candidates).map(autoCheckCandidate);
  const output = {
    generatedAt: new Date().toISOString(),
    mode: "github-actions-radar",
    totalCandidates: uniqueCandidates.length,
    autoCheckSummary: summarize(uniqueCandidates),
    candidates: uniqueCandidates
  };

  await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  console.log(`Scholarship Radar generated ${uniqueCandidates.length} candidates.`);
  console.log(output.autoCheckSummary);
}

async function ensureDataFolder() {
  await fs.mkdir(path.join(ROOT, "data"), { recursive: true });
}

async function scanSource(source) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    const response = await fetch(source.url, {
      signal: controller.signal,
      headers: {
        "user-agent": "ApplyMateIndiaScholarshipRadar/1.0 (+https://koushikrajcodex-boop.github.io/applymate-india/)"
      }
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return [makeReviewCandidate(source, `Source returned HTTP ${response.status}`)];
    }

    const html = await response.text();
    return extractCandidates(source, html);
  } catch (error) {
    return [makeReviewCandidate(source, `Could not fetch source: ${error.message}`)];
  }
}

function extractCandidates(source, html) {
  const text = htmlToText(html);
  const links = extractLinks(source.url, html);
  const lines = text.split(/\n+/).map(cleanText).filter(Boolean);
  const candidates = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!SCHOLARSHIP_HINTS.test(line)) continue;
    if (line.length < 8 || line.length > 220) continue;

    const windowText = cleanText(lines.slice(Math.max(0, index - 2), index + 8).join(" "));
    const link = findBestLink(source, links, line, windowText);
    const deadlineDate = findDate(windowText);

    candidates.push({
      name: normalizeNameForRecord(line),
      state: detectState(windowText, source.defaultState || "national"),
      status: "draft",
      amount: findAmount(windowText),
      maxIncome: findIncome(windowText),
      minPercentage: findPercentage(windowText),
      deadline: deadlineDate || findDeadlineText(windowText),
      deadlineDate,
      link,
      sourceUrl: link,
      education: detectEducation(windowText),
      categories: detectCategories(windowText),
      genders: detectGenders(windowText),
      disability: detectDisability(windowText),
      eligibilityNote: windowText.slice(0, 700) || "Verify eligibility on official portal before applying.",
      incomeNote: findIncomeNote(windowText),
      priority: source.trust === "official" ? 70 : 50,
      sourceName: source.name,
      sourceTrust: source.trust || "unknown",
      radarSourceUrl: source.url,
      radarFoundOn: TODAY
    });
  }

  if (!candidates.length) {
    return [makeReviewCandidate(source, "No obvious scholarship text detected. Source may use JavaScript, PDF, or protected content.")];
  }

  return candidates.slice(0, 40);
}

function makeReviewCandidate(source, reason) {
  return {
    name: `${source.name} Manual Review Needed`,
    state: source.defaultState || "national",
    status: "draft",
    amount: "Varies as per official rules",
    maxIncome: 0,
    minPercentage: 0,
    deadline: "Check official portal",
    deadlineDate: "",
    link: source.url,
    sourceUrl: source.url,
    education: ["any"],
    categories: ["general"],
    genders: ["any"],
    disability: "any",
    eligibilityNote: reason,
    incomeNote: "Verify income rules on official portal.",
    priority: 30,
    sourceName: source.name,
    sourceTrust: source.trust || "unknown",
    radarSourceUrl: source.url,
    radarFoundOn: TODAY
  };
}

function autoCheckCandidate(item) {
  const issues = [];
  const warnings = [];
  let confidence = 0;

  if (item.sourceTrust === "official") confidence += 25;
  else warnings.push("Source is not marked official.");

  if (isValidUrl(item.link)) confidence += 15;
  else issues.push("Missing official URL.");

  if (item.name && item.name.length >= 4 && !/manual review needed/i.test(item.name)) confidence += 15;
  else issues.push("Weak or missing scholarship name.");

  if (item.deadlineDate && !isPastDate(item.deadlineDate)) confidence += 15;
  else warnings.push("Missing future deadline date.");

  if (item.education?.length) confidence += 8;
  else issues.push("Missing education list.");

  if (item.categories?.length) confidence += 8;
  else issues.push("Missing category list.");

  if (item.eligibilityNote && item.eligibilityNote.length >= 40) confidence += 8;
  else warnings.push("Eligibility note is short.");

  if (item.incomeNote && item.incomeNote.length >= 20) confidence += 6;
  else warnings.push("Income note is short.");

  let decision = "review";
  if (issues.length) decision = "review";
  else if (confidence >= 90) decision = "autoActive";
  else if (confidence >= 65) decision = "autoDraft";
  else decision = "review";

  if (item.deadlineDate && isPastDate(item.deadlineDate)) decision = "skip";

  return {
    ...item,
    autoCheck: {
      confidence,
      decision,
      issues,
      warnings
    }
  };
}

function summarize(items) {
  return items.reduce((summary, item) => {
    const decision = item.autoCheck?.decision || "review";
    summary[decision] = (summary[decision] || 0) + 1;
    return summary;
  }, { autoActive: 0, autoDraft: 0, review: 0, skip: 0 });
}

function dedupeCandidates(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = `${normalizeKey(item.name)}|${normalizeUrl(item.link)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
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

function extractLinks(baseUrl, html) {
  const links = [];
  const rx = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = rx.exec(html))) {
    const href = normalizeUrl(resolveUrl(baseUrl, match[1]));
    const label = htmlToText(match[2]);
    if (href) links.push({ href, label: cleanText(label) });
  }
  return links;
}

function findBestLink(source, links, title, context) {
  const words = normalizeKey(`${title} ${context}`).split(" ").filter((word) => word.length > 4);
  const ranked = links
    .map((link) => ({
      ...link,
      score: words.filter((word) => normalizeKey(`${link.label} ${link.href}`).includes(word)).length
    }))
    .sort((a, b) => b.score - a.score);

  return ranked[0]?.score > 0 ? ranked[0].href : source.url;
}

function resolveUrl(baseUrl, href) {
  try {
    return new URL(href, baseUrl).href;
  } catch {
    return "";
  }
}

function normalizeNameForRecord(value) {
  return cleanText(value)
    .replace(/^(new|latest|apply online|click here|read more)\s+/i, "")
    .slice(0, 180);
}

function detectState(text, fallback) {
  const normalized = normalizeKey(text);
  for (const [label, slug] of STATE_ALIASES.entries()) {
    if (normalized.includes(label)) return slug;
  }
  return fallback || "national";
}

function detectEducation(text) {
  const normalized = normalizeKey(text);
  const found = EDUCATION_KEYWORDS.filter((keyword) => normalized.includes(keyword)).map((keyword) => {
    if (keyword === "technical" || keyword === "diploma") return "engineering";
    if (keyword === "undergraduate") return "degree";
    if (keyword === "postgraduate") return "pg";
    return keyword;
  });
  return [...new Set(found.length ? found : ["any"])];
}

function detectCategories(text) {
  const normalized = normalizeKey(text);
  const found = CATEGORY_KEYWORDS.filter((keyword) => normalized.includes(keyword)).map((keyword) => {
    if (keyword === "bc") return "obc";
    if (keyword === "ebc") return "ews";
    if (keyword === "pwd") return "disabled";
    return keyword;
  });
  return [...new Set(found.length ? found : ["general"] )];
}

function detectGenders(text) {
  const normalized = normalizeKey(text);
  if (/girl|female|women|woman/.test(normalized)) return ["female"];
  if (/boy|male|men|man/.test(normalized)) return ["male"];
  return ["any"];
}

function detectDisability(text) {
  const normalized = normalizeKey(text);
  if (/disabled|disability|pwd|specially abled|saksham/.test(normalized)) return "yes";
  return "any";
}

function findAmount(text) {
  return text.match(/(?:₹|Rs\.?|INR)\s?[0-9,]+(?:\s?(?:per year|p\.a\.|annually|month|semester))?/i)?.[0] || "Varies as per official rules";
}

function findIncome(text) {
  const lakh = text.match(/(?:income|family income|annual income)[^0-9]{0,40}([0-9]+(?:\.[0-9]+)?)\s?(?:lakh|lakhs|lac|lacs)/i);
  if (lakh) return Math.round(Number(lakh[1]) * 100000);
  const rupees = text.match(/(?:income|family income|annual income)[^0-9]{0,40}(?:₹|Rs\.?|INR)?\s?([0-9,]{5,9})/i);
  return rupees ? number(rupees[1]) : 0;
}

function findPercentage(text) {
  const match = text.match(/(?:minimum|marks|percentage|score)[^0-9]{0,30}([0-9]+(?:\.[0-9]+)?)\s?%/i);
  return match ? clamp(Number(match[1]), 0, 100) : 0;
}

function findIncomeNote(text) {
  const match = text.match(/(?:income|family income|annual income).{0,180}/i)?.[0];
  return match ? cleanText(match).slice(0, 250) : "Verify income rules on official portal.";
}

function findDeadlineText(text) {
  const match = text.match(/(?:last date|deadline|closing date|apply by).{0,140}/i)?.[0];
  return match ? cleanText(match).slice(0, 160) : "Check official portal";
}

function findDate(text) {
  const iso = text.match(/20\d{2}-[01]\d-[0-3]\d/)?.[0];
  if (iso) return iso;

  const slash = text.match(/([0-3]?\d)[/-]([01]?\d)[/-](20\d{2})/);
  if (slash) {
    const [, day, month, year] = slash;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  return "";
}

function isPastDate(value) {
  if (!value) return false;
  const date = new Date(`${value}T23:59:59`);
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() < Date.now();
}

function isValidUrl(value) {
  return Boolean(normalizeUrl(value));
}

function normalizeUrl(value) {
  try {
    const url = new URL(String(value || "").trim());
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

function normalizeKey(value) {
  return String(value || "").toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
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
