import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, "data");
const OUT_JSON = path.join(DATA_DIR, "auto-discovered-scholarships.json");
const OUT_LEGACY = path.join(DATA_DIR, "auto-discovered-scholarships.legacy.txt");
const SOURCE_PACK = normalizePack(process.env.SOURCE_PACK || "all");
const MAX_SEARCH_RESULTS = Number(process.env.MAX_SEARCH_RESULTS || 60);
const TODAY_ISO = new Date().toISOString();

const PACK_LABELS = {
  all: "All Packs",
  national: "National Pack",
  engineering: "Engineering Pack",
  ap_tel: "AP + Telangana Pack",
  categories: "SC/ST/OBC/EWS/Minority Pack",
  private_trusted: "Private Trusted Pack",
  girls: "Girls Scholarship Pack"
};

const PORTALS = [
  portal("National Scholarship Portal", "https://scholarships.gov.in/", "Government of India scholarship portal for central and state scholarship schemes. Use NSP for verified scheme listings, OTR, applications, and status checks.", ["all", "national", "categories"], { official: true, state: "National", category: "any", course: "any", score: 96 }),
  portal("AICTE Student Development Schemes", "https://www.aicte-india.org/schemes/students-development-schemes", "AICTE student schemes including Pragati, Saksham and Swanath scholarships for technical education students. Verify current year guidelines on AICTE/NSP.", ["all", "national", "engineering", "girls"], { official: true, state: "National", category: "any", course: "engineering technical", score: 94 }),
  portal("UGC Scholarships and Fellowships", "https://www.ugc.gov.in/", "UGC scholarship and fellowship information for higher education students. Verify active schemes and notifications on UGC and NSP.", ["all", "national"], { official: true, state: "National", category: "any", course: "degree pg", score: 92 }),
  portal("AP Jnanabhumi Scholarships", "https://jnanabhumi.ap.gov.in/", "Andhra Pradesh Jnanabhumi portal for post-matric and related student scholarship services. Verify latest application status and scheme rules on the portal.", ["all", "ap_tel", "categories", "engineering"], { official: true, state: "Andhra Pradesh", category: "SC ST BC minority EBC", course: "post matric degree engineering", score: 94 }),
  portal("Telangana ePASS Scholarships", "https://telanganaepass.cgg.gov.in/", "Telangana ePASS portal for pre-matric, post-matric and overseas scholarship services. Verify application windows and eligibility on the portal.", ["all", "ap_tel", "categories", "engineering"], { official: true, state: "Telangana", category: "SC ST BC EBC minority", course: "post matric degree engineering", score: 94 }),
  portal("MahaDBT Scholarship Portal", "https://mahadbt.maharashtra.gov.in/", "Maharashtra DBT portal for student scholarship schemes. Verify department-wise schemes, eligibility and deadlines on the portal.", ["all", "categories", "national"], { official: true, state: "Maharashtra", category: "any", course: "post matric degree", score: 90 }),
  portal("Karnataka State Scholarship Portal", "https://ssp.postmatric.karnataka.gov.in/", "Karnataka State Scholarship Portal for post-matric scholarships. Verify scheme eligibility, status and deadlines on the portal.", ["all", "categories", "engineering"], { official: true, state: "Karnataka", category: "SC ST OBC minority", course: "post matric degree", score: 90 }),
  portal("Rajasthan SJE Scholarship Portal", "https://sjmsnew.rajasthan.gov.in/", "Rajasthan Social Justice and Empowerment scholarship portal for state scholarship schemes. Verify current session dates and eligibility on official portal.", ["all", "categories"], { official: true, state: "Rajasthan", category: "SC ST OBC EWS", course: "post matric degree", score: 88 }),
  portal("Buddy4Study Scholarship Listings", "https://www.buddy4study.com/scholarships", "Trusted scholarship listing platform with government, corporate, foundation and private scholarship opportunities. Use as discovery source and verify original provider before publishing.", ["all", "private_trusted", "national", "engineering", "girls", "categories"], { trustedPortal: true, state: "National", category: "any", course: "school degree engineering medical pg", score: 82 }),
  portal("Vidyasaarathi Scholarship Portal", "https://www.vidyasaarathi.co.in/Vidyasaarathi/", "NSDL e-Gov Vidyasaarathi portal for corporate and foundation scholarship schemes. Use as discovery source and verify scheme details before publishing.", ["all", "private_trusted", "engineering", "national"], { trustedPortal: true, state: "National", category: "any", course: "degree diploma engineering", score: 82 }),
  portal("Foundation For Excellence Scholarship", "https://ffe.org/scholarships/", "Foundation For Excellence supports academically bright and economically needy students pursuing professional higher education in India. Verify active application cycle on FFE.", ["all", "private_trusted", "engineering"], { trustedPortal: true, state: "National", category: "any", course: "engineering medical professional", score: 80 }),
  portal("HDFC Bank Parivartan ECSS Scholarship", "https://www.hdfcbank.com/personal/resources/learning-centre/pay/hdfc-bank-parivartans-educational-crisis-scholarship-support-ecss", "HDFC Bank Parivartan ECSS scholarship support for students facing financial need/crisis. Verify current application link and deadlines from HDFC/Buddy4Study.", ["all", "private_trusted", "national", "categories"], { trustedPortal: true, state: "National", category: "any", course: "school degree pg", score: 80 }),
  portal("Reliance Foundation Scholarships", "https://scholarships.reliancefoundation.org/", "Reliance Foundation scholarships for undergraduate and postgraduate students. Verify active cycle, eligibility and benefits on official portal.", ["all", "private_trusted", "national", "engineering"], { trustedPortal: true, state: "National", category: "any", course: "degree pg", score: 80 }),
  portal("Tata Trusts Education Grants", "https://www.tatatrusts.org/our-work/individual-grants-programme/education-grants", "Tata Trusts education grants and support programmes. Verify active grant windows and eligibility on Tata Trusts.", ["all", "private_trusted", "national"], { trustedPortal: true, state: "National", category: "any", course: "degree pg", score: 78 }),
  portal("Aditya Birla Scholarship Programme", "https://www.adityabirlascholars.net/", "Aditya Birla Scholarship Programme for selected institutions and students. Verify participating institutes and active process on official site.", ["all", "private_trusted", "engineering"], { trustedPortal: true, state: "National", category: "any", course: "engineering management law", score: 78 }),
  portal("Pragati Scholarship for Girl Students", "https://www.aicte-india.org/schemes/students-development-schemes/Pragati/General-Instructions", "AICTE Pragati is intended for girl students in technical education. Verify latest application route and eligibility on AICTE/NSP.", ["all", "girls", "engineering", "national"], { official: true, state: "National", category: "girls", course: "engineering technical diploma degree", score: 94 }),
  portal("CBSE Single Girl Child Scholarship", "https://www.cbse.gov.in/", "CBSE scholarship information for eligible single girl child students. Verify current notification and application window on CBSE.", ["all", "girls", "national"], { official: true, state: "National", category: "girls", course: "school", score: 88 })
];

const SEARCH_QUERIES = [
  q("National scholarships", "student scholarship India guidelines notification", ["all", "national"]),
  q("Engineering scholarships", "engineering student scholarship India AICTE corporate foundation", ["all", "engineering"]),
  q("AP scholarships", "Andhra Pradesh Jnanabhumi scholarship students", ["all", "ap_tel"]),
  q("Telangana scholarships", "Telangana ePASS scholarship students", ["all", "ap_tel"]),
  q("SC ST OBC scholarships", "SC ST OBC post matric scholarship students India", ["all", "categories"]),
  q("Minority scholarships", "minority scholarship students India scheme apply", ["all", "categories"]),
  q("Girls scholarships", "girl students scholarship India engineering school", ["all", "girls"]),
  q("Private trusted scholarships", "Buddy4Study Vidyasaarathi Foundation For Excellence scholarships India", ["all", "private_trusted"])
];

const selectedPortals = PORTALS.filter((item) => SOURCE_PACK === "all" || item.packs.includes(SOURCE_PACK));
const selectedQueries = SEARCH_QUERIES.filter((item) => SOURCE_PACK === "all" || item.packs.includes(SOURCE_PACK));
const errors = [];
let records = selectedPortals.map((item) => toRecord(item, "curated_source_pack"));

for (const item of selectedQueries) {
  try {
    const searchRecords = await searchWeb(item.query, item.name, item.packs);
    records.push(...searchRecords.slice(0, MAX_SEARCH_RESULTS));
  } catch (error) {
    errors.push({ seed: item.name, query: item.query, error: error.message });
  }
}

records = dedupe(records).sort((a, b) => b.score - a.score).slice(0, 180);

const payload = {
  generatedAt: TODAY_ISO,
  generatedBy: "ApplyMate Discovery v2",
  sourcePack: SOURCE_PACK,
  sourcePackLabel: PACK_LABELS[SOURCE_PACK] || SOURCE_PACK,
  note: "Review before publishing. Curated portal entries are discovery drafts; web search snippets can be incomplete or stale.",
  total: records.length,
  curatedPortalCount: selectedPortals.length,
  searchErrorCount: errors.length,
  errors,
  records
};

await fs.mkdir(DATA_DIR, { recursive: true });
await fs.writeFile(OUT_JSON, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
await fs.writeFile(OUT_LEGACY, records.map(toLegacyBlock).join("\n---\n"), "utf8");

console.log(`Discovery v2 complete. Pack: ${payload.sourcePackLabel}. Records: ${records.length}. Search errors: ${errors.length}.`);

function portal(title, url, snippet, packs, extra = {}) { return { title, url, snippet, packs, ...extra }; }
function q(name, query, packs) { return { name, query, packs }; }
function normalizePack(value) {
  const v = String(value || "all").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  if (["all", "national", "engineering", "ap_tel", "categories", "private_trusted", "girls"].includes(v)) return v;
  if (["ap", "telangana", "ap_telangana", "ap_telanganapack"].includes(v)) return "ap_tel";
  if (["private", "trusted", "private_scholarships"].includes(v)) return "private_trusted";
  return "all";
}
async function searchWeb(query, seedName, packs) {
  const fullQuery = `${query} scholarship official trusted India`;
  const endpoints = [
    `https://r.jina.ai/http://www.bing.com/search?q=${encodeURIComponent(fullQuery)}`,
    `https://r.jina.ai/http://www.google.com/search?q=${encodeURIComponent(fullQuery)}`
  ];
  const out = [];
  const endpointErrors = [];
  for (const endpoint of endpoints) {
    try {
      const text = await fetchText(endpoint);
      out.push(...parseSearchText(text, seedName, packs, fullQuery));
      if (out.length) break;
    } catch (error) {
      endpointErrors.push(error.message);
    }
  }
  if (!out.length && endpointErrors.length) throw new Error(endpointErrors.join(" | "));
  return dedupe(out);
}
async function fetchText(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 22000);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { "user-agent": "ApplyMateDiscoveryV2/1.0", accept: "text/plain,text/markdown,text/html,*/*" } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}
function parseSearchText(text, seedName, packs, query) {
  const out = [];
  const seen = new Set();
  const rx = /(?:\[([^\]]{3,180})\]\()?(https?:\/\/[^\s)\]"'<>]+)\)?/g;
  let match;
  while ((match = rx.exec(String(text || "")))) {
    const url = cleanUrl(match[2]);
    if (!url || seen.has(url) || isBadUrl(url)) continue;
    const before = String(text).slice(Math.max(0, match.index - 180), match.index);
    const after = String(text).slice(match.index, match.index + 650);
    const title = clean(match[1] || titleFromUrl(url, before));
    const snippet = clean(`${before} ${after}`).slice(0, 900);
    const scholarshipy = /scholarship|fellowship|grant|stipend|financial assistance|post matric|pre matric|education support/i.test(`${title} ${snippet} ${url}`);
    if (!scholarshipy && !isTrustedUrl(url)) continue;
    seen.add(url);
    out.push({
      id: stableId(`${url}|${title}`), title, url, snippet,
      score: scoreUrl(url, scholarshipy), official: isOfficialUrl(url), trustedPortal: isTrustedUrl(url) && !isOfficialUrl(url), pdf: /\.pdf($|[?#])/i.test(url), scholarshipy,
      seedName, seedState: detectState(`${title} ${snippet} ${url}`), seedCategory: detectCategory(`${title} ${snippet}`), seedCourse: detectCourse(`${title} ${snippet}`),
      sourcePack: SOURCE_PACK, packs, searchQuery: query, searchSource: "web_search_v2", discoveredAt: TODAY_ISO, status: "review", suggestedAction: "verify_source_then_import_draft"
    });
  }
  return out;
}
function toRecord(item, searchSource) {
  return {
    id: stableId(`${item.url}|${item.title}`), title: item.title, url: item.url, snippet: item.snippet, score: item.score || scoreUrl(item.url, true), official: Boolean(item.official), trustedPortal: Boolean(item.trustedPortal), pdf: /\.pdf($|[?#])/i.test(item.url), scholarshipy: true,
    seedName: item.title, seedState: item.state || "National", seedCategory: item.category || "any", seedCourse: item.course || "any", sourcePack: SOURCE_PACK, packs: item.packs,
    searchQuery: "curated source pack", searchSource, discoveredAt: TODAY_ISO, status: "review", suggestedAction: "verify_source_then_import_draft"
  };
}
function scoreUrl(url, scholarshipy) { let score = 30; if (isOfficialUrl(url)) score += 35; if (isTrustedUrl(url)) score += 25; if (/\.pdf($|[?#])/i.test(url)) score += 8; if (scholarshipy) score += 20; return Math.min(100, score); }
function isOfficialUrl(url) { return /gov\.in|nic\.in|ac\.in|scholarships\.gov\.in|aicte-india\.org|ugc\.gov\.in|cbse\.gov\.in/i.test(url); }
function isTrustedUrl(url) { return /gov\.in|nic\.in|ac\.in|scholarships\.gov\.in|aicte-india\.org|ugc\.gov\.in|cbse\.gov\.in|buddy4study\.com|vidyasaarathi\.co\.in|ffe\.org|reliancefoundation|tatatrusts|hdfcbank|adityabirlascholars/i.test(url); }
function isBadUrl(url) { return /google\.com\/search|bing\.com\/search|duckduckgo\.com|r\.jina\.ai|s\.jina\.ai|login|signin|javascript|webcache|translate\.google/i.test(url); }
function cleanUrl(url) { try { const u = new URL(String(url || "").replace(/[).,;]+$/, "")); return ["http:", "https:"].includes(u.protocol) ? u.href : ""; } catch { return ""; } }
function titleFromUrl(url, fallback = "") { try { const u = new URL(url); return clean(fallback).slice(0, 120) || decodeURIComponent(u.pathname.split("/").filter(Boolean).pop() || u.hostname).replace(/[-_]/g, " ").replace(/\.pdf$/i, ""); } catch { return "Scholarship source"; } }
function detectState(text) { const t = String(text || "").toLowerCase(); if (/andhra|jnanabhumi|\bap\b/.test(t)) return "Andhra Pradesh"; if (/telangana|epass/.test(t)) return "Telangana"; if (/karnataka|ssp/.test(t)) return "Karnataka"; if (/maharashtra|mahadbt/.test(t)) return "Maharashtra"; if (/rajasthan|sje/.test(t)) return "Rajasthan"; if (/delhi/.test(t)) return "Delhi"; return "National"; }
function detectCategory(text) { const t = String(text || "").toLowerCase(); const out = []; if (/sc|scheduled caste/.test(t)) out.push("SC"); if (/st|scheduled tribe/.test(t)) out.push("ST"); if (/obc|backward/.test(t)) out.push("OBC"); if (/ews|ebc/.test(t)) out.push("EWS"); if (/minority|muslim|christian|sikh|jain|buddhist/.test(t)) out.push("minority"); if (/girl|women|female/.test(t)) out.push("girls"); return out.join(" ") || "any"; }
function detectCourse(text) { const t = String(text || "").toLowerCase(); const out = []; if (/engineering|technical|aicte|btech|diploma/.test(t)) out.push("engineering"); if (/medical|medicine|nursing/.test(t)) out.push("medical"); if (/school|class|cbse/.test(t)) out.push("school"); if (/degree|undergraduate|graduate/.test(t)) out.push("degree"); if (/pg|postgraduate|masters|phd/.test(t)) out.push("pg"); return out.join(" ") || "any"; }
function dedupe(items) { const map = new Map(); for (const item of items) { const key = cleanUrl(item.url); const old = map.get(key); if (!old || (item.score || 0) > (old.score || 0)) map.set(key, item); } return [...map.values()]; }
function toLegacyBlock(item) { return [`Scholarship Name ${item.title}`, `State ${item.seedState || "National"}`, `Education ${item.seedCourse || "any"}`, `Categories ${item.seedCategory || "any"}`, "Gender any", "Amount Varies as per official rules", "Income limit 0", "Deadline date ", `Official link ${item.url}`, `Source ${item.seedName || "Scholarship Source"}`, `Eligibility Auto-discovered by source pack ${item.sourcePack || SOURCE_PACK}. Verify source before publishing. Snippet: ${item.snippet || ""}`, "Income note Verify income rules on provider/official portal."].join("\n"); }
function stableId(value) { let h = 5381; const s = String(value || ""); for (let i = 0; i < s.length; i += 1) h = ((h << 5) + h) + s.charCodeAt(i); return `auto_${Math.abs(h >>> 0).toString(36)}`; }
function clean(v) { return String(v || "").replace(/\s+/g, " ").trim(); }
