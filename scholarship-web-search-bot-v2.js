// ApplyMate Web Search Bot v2
// Robust search-first workflow for static GitHub Pages.
// Automatic web search may be blocked by CORS/public search services, so this bot always provides manual search-engine links too.

const $ = (id) => document.getElementById(id);
const els = {
  query: $("webSearchQuery"),
  state: $("webSearchState"),
  category: $("webSearchCategory"),
  course: $("webSearchCourse"),
  officialOnly: $("webSearchOfficialOnly"),
  pdfOnly: $("webSearchPdfOnly"),
  search: $("webSearchBtn"),
  pdfSearch: $("webSearchPdfBtn"),
  snippetDraft: $("webSearchSnippetDraftBtn"),
  deepAnalyze: $("webSearchDeepAnalyzeBtn"),
  openEngines: $("webSearchOpenEnginesBtn"),
  status: $("webSearchStatus"),
  results: $("webSearchResults"),
  links: $("webSearchFallbackLinks"),
  bulkUrls: $("linkBulkUrls"),
  analyzeBulk: $("linkBulkAnalyzeBtn"),
  input: $("botPanelInput"),
  analyzeInput: $("botPanelAnalyzeBtn")
};

let searchResults = [];

installSearchBot();

function installSearchBot() {
  if (!els.query || !els.results) return;
  els.search?.addEventListener("click", () => runSearch(false));
  els.pdfSearch?.addEventListener("click", () => runSearch(true));
  els.snippetDraft?.addEventListener("click", generateDraftsFromSelected);
  els.deepAnalyze?.addEventListener("click", deepAnalyzeSelected);
  els.openEngines?.addEventListener("click", openSearchEngines);
  els.query?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") runSearch(false);
  });
  showStatus("Web Search Bot v2 ready. Search official sources, then select results to draft/analyze.");
}

async function runSearch(forcePdf) {
  const search = buildSearchQuery(forcePdf);
  if (!search.base.trim()) return showStatus("Type a scholarship search query first.", true);
  showStatus("Searching public web index for scholarship sources...");
  renderSearchLinks(search.full);
  searchResults = [];
  renderResults();

  const endpoints = [
    { name: "Jina Search", url: `https://s.jina.ai/?q=${encodeURIComponent(search.full)}` },
    { name: "Jina Google mirror", url: `https://r.jina.ai/http://www.google.com/search?q=${encodeURIComponent(search.full)}` },
    { name: "Jina Bing mirror", url: `https://r.jina.ai/http://www.bing.com/search?q=${encodeURIComponent(search.full)}` }
  ];

  const errors = [];
  for (const endpoint of endpoints) {
    try {
      showStatus(`Trying ${endpoint.name}...`);
      const text = await fetchText(endpoint.url);
      const parsed = parseSearchResults(text, search.full).slice(0, 20);
      if (parsed.length) {
        searchResults = parsed;
        renderResults();
        showStatus(`Found ${parsed.length} possible source(s) using ${endpoint.name}. Select good official results.`);
        return;
      }
      errors.push(`${endpoint.name}: no useful results`);
    } catch (error) {
      errors.push(`${endpoint.name}: ${error.message}`);
      console.warn(endpoint.name, error);
    }
  }

  searchResults = fallbackCards(search.full);
  renderResults();
  showStatus(`Automatic search was blocked or empty. Use the Open Google/Bing/DuckDuckGo buttons below. (${errors.join(" | ")})`, true);
}

function buildSearchQuery(forcePdf = false) {
  const base = clean(value(els.query));
  const state = clean(value(els.state));
  const category = clean(value(els.category));
  const course = clean(value(els.course));
  const pdfOnly = forcePdf || Boolean(els.pdfOnly?.checked);
  const parts = [base, state, category, course, "scholarship guidelines notification scheme"];
  if (pdfOnly) parts.push("filetype:pdf");
  if (els.officialOnly?.checked !== false) parts.push("site:gov.in OR site:nic.in OR site:ac.in OR site:scholarships.gov.in OR site:aicte-india.org OR site:ugc.gov.in");
  return { base, full: parts.filter(Boolean).join(" ").replace(/\s+/g, " ").trim() };
}

async function fetchText(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(url, {
      method: "GET",
      mode: "cors",
      cache: "no-store",
      signal: controller.signal,
      headers: { Accept: "text/plain,text/markdown,text/html,*/*" }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

function parseSearchResults(raw, query) {
  const text = String(raw || "");
  const output = [];
  const seen = new Set();

  const markdownLink = /\[([^\]]{2,220})\]\((https?:\/\/[^)\s]+)\)/g;
  let match;
  while ((match = markdownLink.exec(text))) {
    addResult(output, seen, match[2], match[1], text.slice(match.index, match.index + 900), query);
  }

  const titleUrlBlocks = /Title:\s*(.+?)\nURL Source:\s*(https?:\/\/\S+)([\s\S]*?)(?=\nTitle:|$)/gi;
  while ((match = titleUrlBlocks.exec(text))) {
    addResult(output, seen, match[2], match[1], match[3], query);
  }

  const plainUrl = /https?:\/\/[^\s)\]"'<>]+/g;
  while ((match = plainUrl.exec(text))) {
    const url = match[0];
    const before = text.slice(Math.max(0, match.index - 220), match.index);
    const after = text.slice(match.index, Math.min(text.length, match.index + 800));
    addResult(output, seen, url, titleFromUrl(url, before), `${before} ${after}`, query);
  }

  return output
    .filter((item) => item.url && !isSearchUtilityUrl(item.url))
    .sort((a, b) => b.score - a.score);
}

function addResult(output, seen, rawUrl, rawTitle, rawSnippet, query) {
  const url = cleanUrl(rawUrl);
  if (!url || seen.has(url) || isSearchUtilityUrl(url)) return;
  const text = `${rawTitle} ${rawSnippet} ${url}`;
  const scholarshipy = /(scholarship|scheme|fellowship|stipend|grant|guideline|notification|post matric|pre matric|merit|tuition)/i.test(text);
  const official = isOfficialUrl(url);
  const pdf = isPdfUrl(url);
  if (!scholarshipy && !official && !pdf) return;
  seen.add(url);
  let score = 20;
  if (official) score += 35;
  if (pdf) score += 15;
  if (scholarshipy) score += 25;
  if (/gov\.in|nic\.in|scholarships\.gov\.in|aicte|ugc/i.test(url)) score += 10;
  if (/login|signin|captcha|javascript|accounts\.google/i.test(url)) score -= 30;
  output.push({
    id: makeId(),
    title: clean(rawTitle || titleFromUrl(url)).slice(0, 180),
    url,
    snippet: clean(rawSnippet || "").replace(/Title:\s*/gi, "").replace(/URL Source:\s*/gi, "").slice(0, 800),
    score: clamp(score, 0, 100),
    official,
    pdf,
    scholarshipy,
    query,
    sourceType: "web_result"
  });
}

function fallbackCards(query) {
  return [
    searchCard("Google", query),
    searchCard("Bing", query),
    searchCard("DuckDuckGo", query)
  ];
}

function searchCard(name, query) {
  const engine = name.toLowerCase().includes("bing") ? "bing" : name.toLowerCase().includes("duck") ? "duck" : "google";
  return {
    id: makeId(),
    title: `Open ${name} search manually`,
    url: searchUrl(engine, query),
    snippet: "Automatic in-page search is blocked or empty. Open this search result page, copy official scholarship/PDF URLs, then paste them into Selected / manual official URLs.",
    score: 50,
    official: false,
    pdf: false,
    scholarshipy: false,
    query,
    sourceType: "manual_search_engine"
  };
}

function renderResults() {
  if (!els.results) return;
  if (!searchResults.length) {
    els.results.innerHTML = "<p class='mini-note'>No search results yet.</p>";
    return;
  }
  els.results.innerHTML = searchResults.map((item, index) => {
    const canDraft = item.sourceType !== "manual_search_engine";
    return `<article class="bot-card">
      <label class="check-row" style="background:#fff"><input type="checkbox" class="web-result-check" data-id="${escapeHtml(item.id)}" ${canDraft && index < 6 ? "checked" : ""} ${canDraft ? "" : "disabled"}/><span><strong>${canDraft ? "Select this source" : "Manual search helper"}</strong><br><span class="mini-note">Score ${item.score}% • ${item.official ? "official-looking" : "unverified"} • ${item.pdf ? "PDF" : "web page"}</span></span></label>
      <h3>${index + 1}. ${escapeHtml(item.title)}</h3>
      <p class="bot-mini"><a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.url)}</a></p>
      <p class="bot-mini">${escapeHtml(item.snippet || "No snippet returned. Open the source if needed.")}</p>
      <div class="button-row"><button type="button" class="secondary-btn web-copy-url" data-url="${escapeHtml(item.url)}">Copy URL</button><a class="secondary-btn" href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">Open</a></div>
    </article>`;
  }).join("");

  document.querySelectorAll(".web-copy-url").forEach((button) => {
    button.addEventListener("click", async () => {
      const url = button.dataset.url || "";
      try {
        await navigator.clipboard.writeText(url);
        showStatus("URL copied. Paste it into Selected / manual official URLs if needed.");
      } catch {
        appendToBulkUrls(url);
        showStatus("Clipboard blocked, so I added the URL to Selected / manual official URLs.");
      }
    });
  });
}

function selectedResults() {
  const ids = new Set(Array.from(document.querySelectorAll(".web-result-check:checked")).map((box) => box.dataset.id));
  return searchResults.filter((item) => ids.has(item.id) && item.sourceType !== "manual_search_engine");
}

function generateDraftsFromSelected() {
  const selected = selectedResults();
  if (!selected.length) return showStatus("Select at least one real source result first. Manual search helper cards cannot be drafted.", true);
  const blocks = selected.map(resultToLegacyBlock).join("\n---\n");
  setValue(els.input, blocks);
  els.analyzeInput?.click();
  showStatus(`Generated ${selected.length} draft record(s) from search snippets. Import as Draft/Review after checking.`);
}

function deepAnalyzeSelected() {
  const selected = selectedResults();
  if (!selected.length) return showStatus("Select at least one real source result first.", true);
  const urls = selected.map((item) => item.url).join("\n");
  setValue(els.bulkUrls, urls);
  els.analyzeBulk?.click();
  showStatus(`Sent ${selected.length} URL(s) to deep analyzer. If blocked, generate snippet drafts or upload PDFs.`);
}

function resultToLegacyBlock(item) {
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
    `Eligibility Draft generated from web search result snippet. Verify official page/PDF before publishing. Snippet: ${item.snippet}`,
    `Income note ${extractIncomeNote(item.snippet)}`
  ].join("\n");
}

function openSearchEngines() {
  const query = buildSearchQuery(false).full;
  if (!query.trim()) return showStatus("Type search terms first.", true);
  renderSearchLinks(query);
  ["google", "bing", "duck"].forEach((engine) => window.open(searchUrl(engine, query), "_blank", "noopener,noreferrer"));
  showStatus("Opened search engines. Copy official scholarship/PDF URLs back into ApplyMate if needed.");
}

function renderSearchLinks(query) {
  if (!els.links) return;
  els.links.innerHTML = [
    ["Google", searchUrl("google", query)],
    ["Bing", searchUrl("bing", query)],
    ["DuckDuckGo", searchUrl("duck", query)]
  ].map(([name, url]) => `<a class="secondary-btn" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">Open ${name}</a>`).join(" ");
}

function appendToBulkUrls(url) {
  if (!els.bulkUrls || !url) return;
  const current = value(els.bulkUrls);
  if (current.includes(url)) return;
  setValue(els.bulkUrls, current ? `${current}\n${url}` : url);
}

function searchUrl(engine, query) {
  const q = encodeURIComponent(query);
  if (engine === "bing") return `https://www.bing.com/search?q=${q}`;
  if (engine === "duck") return `https://duckduckgo.com/?q=${q}`;
  return `https://www.google.com/search?q=${q}`;
}

function normalizeUrl(v) {
  try {
    const url = new URL(String(v || "").trim());
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}
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
function makeId() { return `r_${Date.now()}_${Math.random().toString(36).slice(2)}`; }
function clamp(value, min, max) { return Math.max(min, Math.min(max, Number(value) || 0)); }
function value(el) { return el?.value?.trim() || ""; }
function setValue(el, v) { if (el) el.value = v || ""; }
function showStatus(message, bad = false) { if (els.status) { els.status.textContent = message; els.status.style.color = bad ? "#b42318" : ""; } }
function clean(v) { return String(v || "").replace(/\s+/g, " ").trim(); }
function norm(v) { return String(v || "").toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim(); }
function escapeHtml(v) { return String(v || "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;"); }
