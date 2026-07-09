import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const SEEDS_PATH = path.join(ROOT, "data", "scholarship-discovery-seeds.json");
const OUT_JSON = path.join(ROOT, "data", "auto-discovered-scholarships.json");
const OUT_LEGACY = path.join(ROOT, "data", "auto-discovered-scholarships.legacy.txt");
const MAX_RESULTS_PER_SEED = Number(process.env.MAX_RESULTS_PER_SEED || 10);
const OFFICIAL_FILTER = "site:gov.in OR site:nic.in OR site:ac.in OR site:scholarships.gov.in OR site:aicte-india.org OR site:ugc.gov.in";

const seeds = JSON.parse(await fs.readFile(SEEDS_PATH, "utf8"));
const discovered = [];
const errors = [];

for (const seed of seeds) {
  const query = buildQuery(seed);
  console.log(`Searching: ${seed.name} :: ${query}`);
  try {
    const results = await searchWeb(query, seed);
    discovered.push(...results.slice(0, MAX_RESULTS_PER_SEED));
  } catch (error) {
    errors.push({ seed: seed.name, query, error: error.message });
    console.warn(`Search failed for ${seed.name}: ${error.message}`);
  }
}

const unique = dedupe(discovered).sort((a, b) => b.score - a.score).slice(0, 120);
const generatedAt = new Date().toISOString();

const payload = {
  generatedAt,
  generatedBy: "ApplyMate GitHub Actions auto-discovery",
  note: "Review before publishing. Search snippets can be incomplete or stale.",
  total: unique.length,
  errors,
  records: unique
};

await fs.mkdir(path.dirname(OUT_JSON), { recursive: true });
await fs.writeFile(OUT_JSON, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
await fs.writeFile(OUT_LEGACY, unique.map(toLegacyBlock).join("\n---\n"), "utf8");

console.log(`Wrote ${unique.length} records to ${OUT_JSON}`);
if (errors.length) console.log(`Completed with ${errors.length} search error(s).`);

function buildQuery(seed) {
  return [seed.query, seed.state, seed.category, seed.course, "scholarship", "guidelines notification scheme", OFFICIAL_FILTER]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

async function searchWeb(query, seed) {
  const endpoints = [
    { name: "Jina Search", url: `https://s.jina.ai/?q=${encodeURIComponent(query)}` },
    { name: "Jina Google mirror", url: `https://r.jina.ai/http://www.google.com/search?q=${encodeURIComponent(query)}` },
    { name: "Jina Bing mirror", url: `https://r.jina.ai/http://www.bing.com/search?q=${encodeURIComponent(query)}` }
  ];

  const endpointErrors = [];
  for (const endpoint of endpoints) {
    try {
      const text = await fetchText(endpoint.url);
      const parsed = parseSearchResults(text, query, seed, endpoint.name);
      if (parsed.length) return parsed;
      endpointErrors.push(`${endpoint.name}: no useful results`);
    } catch (error) {
      endpointErrors.push(`${endpoint.name}: ${error.message}`);
    }
  }
  throw new Error(endpointErrors.join(" | "));
}

async function fetchText(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);
  try {
    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      headers: {
        "User-Agent": "ApplyMateIndiaScholarshipDiscovery/1.0",
        Accept: "text/plain,text/markdown,text/html,*/*"
      }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

function parseSearchResults(raw, query, seed, source) {
  const text = String(raw || "");
  const output = [];
  const seen = new Set();

  const markdownLink = /\[([^\]]{2,220})\]\((https?:\/\/[^)\s]+)\)/g;
  let match;
  while ((match = markdownLink.exec(text))) {
    addResult(output, seen, match[2], match[1], text.slice(match.index, match.index + 900), query, seed, source);
  }

  const titleUrlBlocks = /Title:\s*(.+?)\nURL Source:\s*(https?:\/\/\S+)([\s\S]*?)(?=\nTitle:|$)/gi;
  while ((match = titleUrlBlocks.exec(text))) {
    addResult(output, seen, match[2], match[1], match[3], query, seed, source);
  }

  const plainUrl = /https?:\/\/[^\s)\]"'<>]+/g;
  while ((match = plainUrl.exec(text))) {
    const url = match[0];
    const before = text.slice(Math.max(0, match.index - 220), match.index);
    const after = text.slice(match.index, Math.min(text.length, match.index + 800));
    addResult(output, seen, url, titleFromUrl(url, before), `${before} ${after}`, query, seed, source);
  }

  return output
    .filter((item) => item.url && !isSearchUtilityUrl(item.url))
    .sort((a, b) => b.score - a.score);
}

function addResult(output, seen, rawUrl, rawTitle, rawSnippet, query, seed, source) {
  const url = cleanUrl(rawUrl);
  if (!url || seen.has(url) || isSearchUtilityUrl(url)) return;
  const text = `${rawTitle} ${rawSnippet} ${url}`;
  const scholarshipy = /(scholarship|scheme|fellowship|stipend|grant|guideline|notification|post matric|pre matric|merit|tuition|financial assistance)/i.test(text);
  const official = isOfficialUrl(url);
  const pdf = isPdfUrl(url);
  if (!scholarshipy && !official && !pdf) return;
  seen.add(url);

  let score = 20;
  if (official) score += 35;
  if (pdf) score += 15;
  if (scholarshipy) score += 25;
  if (/gov\.in|nic\.in|scholarships\.gov\.in|aicte|ugc/i.test(url)) score += 10;
  if (/login|signin|captcha|javascript|accounts\.google|webcache|translate\.google/i.test(url)) score -= 30;

  const title = clean(rawTitle || titleFromUrl(url)).slice(0, 180);
  const snippet = clean(rawSnippet || "").replace(/Title:\s*/gi, "").replace(/URL Source:\s*/gi, "").slice(0, 900);

  output.push({
    id: hash(`${url}|${title}`),
    title,
    url,
    snippet,
    score: clamp(score, 0, 100),
    official,
    pdf,
    scholarshipy,
    seedName: seed.name,
    seedState: seed.state || "National",
    seedCategory: seed.category || "any",
    seedCourse: seed.course || "any",
    searchQuery: query,
    searchSource: source,
    discoveredAt: new Date().toISOString(),
    status: "review",
    suggestedAction: "verify_official_source_then_import_draft"
  });
}

function dedupe(records) {
  const map = new Map();
  for (const record of records) {
    const key = normalizeUrl(record.url);
    const existing = map.get(key);
    if (!existing || record.score > existing.score) map.set(key, record);
  }
  return [...map.values()];
}

function toLegacyBlock(item) {
  return [
    `Scholarship Name ${cleanTitle(item.title)}`,
    `State ${guessState(`${item.title} ${item.snippet} ${item.url}`)}`,
    `Education ${guessEducation(`${item.title} ${item.snippet}`).join(", ")}`,
    `Categories ${guessCategories(`${item.title} ${item.snippet}`).join(", ")}`,
    "Gender any",
    `Amount ${extractAmount(item.snippet)}`,
    `Income limit ${extractIncome(item.snippet)}`,
    `Deadline date ${extractDate(item.snippet)}`,
    `Official link ${item.url}`,
    `Source ${sourceNameFromUrl(item.url)}`,
    `Eligibility Auto-discovered from official-looking web result. Verify official page/PDF before publishing. Seed: ${item.seedName}. Snippet: ${item.snippet}`,
    `Income note ${extractIncomeNote(item.snippet)}`
  ].join("\n");
}

function hash(value) {
  let h = 5381;
  for (let i = 0; i < value.length; i += 1) h = ((h << 5) + h) + value.charCodeAt(i);
  return `auto_${Math.abs(h >>> 0).toString(36)}`;
}
function normalizeUrl(v) { try { const url = new URL(String(v || "").trim()); return ["http:", "https:"].includes(url.protocol) ? url.href : ""; } catch { return ""; } }
function cleanUrl(url) { return normalizeUrl(String(url || "").replace(/[).,;]+$/, "").trim()); }
function isOfficialUrl(url) { try { const host = new URL(url).hostname.toLowerCase().replace(/^www\./, ""); return /(^|\.)(gov\.in|nic\.in|ac\.in)$/.test(host) || /scholarships\.gov\.in|aicte-india\.org|ugc\.gov\.in|education\.gov\.in|tribal\.nic\.in|minorityaffairs\.gov\.in/.test(host); } catch { return false; } }
function isPdfUrl(url) { try { return new URL(url).pathname.toLowerCase().endsWith(".pdf"); } catch { return /\.pdf(?:$|[?#])/i.test(String(url || "")); } }
function isSearchUtilityUrl(url) { return /google\.com\/search|bing\.com\/search|duckduckgo\.com|s\.jina\.ai|r\.jina\.ai|webcache|translate\.google/.test(url); }
function cleanTitle(title) { return clean(title).replace(/\s*-\s*(PDF|Official|Notification).*$/i, "").slice(0, 160) || "Scholarship details needed"; }
function titleFromUrl(url, fallback = "") { try { const u = new URL(url); const last = decodeURIComponent(u.pathname.split("/").filter(Boolean).pop() || u.hostname); return clean(fallback).slice(0, 140) || clean(last.replace(/[-_]/g, " ").replace(/\.pdf$/i, "")); } catch { return clean(fallback) || "Scholarship result"; } }
function sourceNameFromUrl(url) { try { const host = new URL(url).hostname.replace(/^www\./, ""); if (host.includes("scholarships.gov.in")) return "National Scholarship Portal"; if (host.includes("aicte")) return "AICTE"; if (host.includes("jnanabhumi")) return "AP Jnanabhumi"; if (host.includes("telanganaepass")) return "Telangana ePASS"; if (host.includes("ugc")) return "UGC"; if (host.includes("andaman") || host.includes("and.nic")) return "Andaman and Nicobar Administration"; return host.split(".").slice(0, 2).join("."); } catch { return "Official Portal"; } }
function guessState(text) { const t = String(text || "").toLowerCase(); if (/andhra pradesh|jnanabhumi|\bap\b/.test(t)) return "Andhra Pradesh"; if (/telangana|epass/.test(t)) return "Telangana"; if (/andaman|nicobar|port blair/.test(t)) return "Andaman and Nicobar Islands"; if (/karnataka/.test(t)) return "Karnataka"; if (/tamil nadu/.test(t)) return "Tamil Nadu"; if (/kerala/.test(t)) return "Kerala"; if (/maharashtra/.test(t)) return "Maharashtra"; if (/odisha|orissa/.test(t)) return "Odisha"; if (/west bengal/.test(t)) return "West Bengal"; return "National"; }
function guessEducation(text) { const t = norm(text); const out = []; if (/school|class|pre matric/.test(t)) out.push("school"); if (/intermediate|senior secondary|10 2|class xii/.test(t)) out.push("intermediate"); if (/degree|graduation|graduate|undergraduate|ug/.test(t)) out.push("degree"); if (/engineering|btech|technology|polytechnic|diploma|iti/.test(t)) out.push("engineering"); if (/medicine|medical|nursing|pharmacy/.test(t)) out.push("medical"); if (/post graduate|pg|masters|m tech|m phil|phd|post doctoral/.test(t)) out.push("pg"); return out.length ? [...new Set(out)] : ["any"]; }
function guessCategories(text) { const t = norm(text); const out = []; if (/general|open category/.test(t)) out.push("general"); if (/\bsc\b|scheduled caste/.test(t)) out.push("sc"); if (/\bst\b|scheduled tribe/.test(t)) out.push("st"); if (/\bobc\b|other backward class|backward class/.test(t)) out.push("obc"); if (/ews|economically weaker/.test(t)) out.push("ews"); if (/minority|muslim|christian|sikh|buddhist|jain|parsi/.test(t)) out.push("minority"); return out.length ? [...new Set(out)] : ["general", "sc", "st", "obc", "ews", "minority"]; }
function extractAmount(text) { const amount = String(text || "").match(/(?:₹|rs\.?)\s*([0-9][0-9,]*(?:\.\d+)?)/i)?.[1]?.replace(/,/g, "") || ""; const freq = /per\s+month|monthly|p\.m\./i.test(text) ? " per month" : /per\s+annum|per\s+year|annually|yearly|p\.a\./i.test(text) ? " per year" : ""; return amount ? `Rs.${amount}${freq}` : "Varies as per official rules"; }
function extractIncome(text) { return String(text || "").match(/(?:income\s+limit|annual\s+income|family\s+income|max(?:imum)?\s+income|not\s+exceed)[^₹\d]{0,100}(?:₹|rs\.?\s?)?([0-9][0-9,]{3,})/i)?.[1]?.replace(/,/g, "") || "0"; }
function extractIncomeNote(text) { const hit = around(text, /(income\s+limit|annual income|family income|max(?:imum)? income|not exceed)/i, 350); if (hit) return hit; if (/non[-\s]?creamy layer/i.test(text)) return "OBC non-creamy layer rule found. Verify exact income rule from official notification."; return "Verify income rules on official portal."; }
function extractDate(text) { return date(findDate(text)); }
function findDate(text) { return String(text || "").match(/20\d{2}-[01]\d-[0-3]\d/)?.[0] || String(text || "").match(/[0-3]?\d[/-][01]?\d[/-]20\d{2}/)?.[0] || String(text || "").match(/[0-3]?\d\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\s+20\d{2}/i)?.[0] || ""; }
function date(v) { const s = String(v || "").trim(); if (!s) return ""; const iso = s.match(/20\d{2}-[01]\d-[0-3]\d/)?.[0]; if (iso) return iso; const n = s.match(/([0-3]?\d)[/-]([01]?\d)[/-](20\d{2})/); if (n) return `${n[3]}-${n[2].padStart(2, "0")}-${n[1].padStart(2, "0")}`; const m = s.match(/([0-3]?\d)\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\s+(20\d{2})/i); if (!m) return ""; const mm = { jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06", jul: "07", aug: "08", sep: "09", sept: "09", oct: "10", nov: "11", dec: "12" }; return `${m[3]}-${mm[m[2].toLowerCase().slice(0, 4)] || mm[m[2].toLowerCase().slice(0, 3)]}-${m[1].padStart(2, "0")}`; }
function around(text, regex, len) { const s = clean(text).replace(/https?:\/\/\S+/g, ""); const i = s.search(regex); return i < 0 ? "" : s.slice(Math.max(0, i - 100), i + len); }
function clamp(value, min, max) { return Math.max(min, Math.min(max, Number(value) || 0)); }
function clean(v) { return String(v || "").replace(/\s+/g, " ").trim(); }
function norm(v) { return String(v || "").toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim(); }
