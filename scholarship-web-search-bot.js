// ApplyMate Web Search Bot
// Search-first workflow for static GitHub Pages: search official web results, select useful links,
// generate draft records from snippets, then optionally deep-analyze selected URLs/PDFs.

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

bindWebSearchBot();

function bindWebSearchBot() {
  els.search?.addEventListener("click", () => runSearch(false));
  els.pdfSearch?.addEventListener("click", () => runSearch(true));
  els.snippetDraft?.addEventListener("click", generateDraftsFromSelected);
  els.deepAnalyze?.addEventListener("click", deepAnalyzeSelected);
  els.openEngines?.addEventListener("click", openSearchEngines);
  showStatus("Web Search Bot ready. Search official scholarship pages/PDFs first, then select results to draft/analyze.");
}

async function runSearch(forcePdf) {
  const query = buildSearchQuery(forcePdf);
  if (!query.base.trim()) return showStatus("Type what scholarship you want to find first.", true);
  showStatus("Searching web for official scholarship sources...");
  searchResults = [];
  renderResults();
  renderSearchLinks(query.full);

  try {
    const text = await fetchJinaSearch(query.full);
    searchResults = parseSearchResults(text, query.full).slice(0, 20);
    if (!searchResults.length) throw new Error("No parsable search results returned");
    renderResults();
    showStatus(`Found ${searchResults.length} possible sources. Select the best official results, then generate drafts or deep analyze.`);
  } catch (error) {
    console.warn("Web search API failed", error);
    searchResults = fallbackSuggestedResults(query.full);
    renderResults();
    showStatus("Automatic search API was blocked/empty. Use the search engine buttons, or paste URLs into Bulk official URLs.", true);
  }
}

function buildSearchQuery(forcePdf = false) {
  const base = clean(value(els.query));
  const state = clean(value(els.state));
  const category = clean(value(els.category));
  const course = clean(value(els.course));
  const pdfOnly = forcePdf || els.pdfOnly?.checked;
  const parts = [base, state, category, course, "scholarship", "guidelines OR notification OR scheme"];
  if (pdfOnly) parts.push("filetype:pdf");
  if (els.officialOnly?.checked !== false) parts.push("site:gov.in OR site:nic.in OR site:ac.in OR site:scholarships.gov.in OR site:aicte-india.org OR site:ugc.gov.in");
  return { base, full: parts.filter(Boolean).join(" ") };
}

async function fetchJinaSearch(query) {
  const url = `https://s.jina.ai/?q=${encodeURIComponent(query)}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 18000);
  try {
    const response = await fetch(url, {
      method: "GET",
      mode: "cors",
      cache: "no-store",
      signal: controller.signal,
      headers: { Accept: "text/plain, text/markdown, */*" }
    });
    if (!response.ok) throw new Error(`Search HTTP ${response.status}`);
    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

function parseSearchResults(markdown, query) {
  const text = String(markdown || "");
  const found = [];
  const mdLink = /\[([^\]]{2,180})\]\((https?:\/\/[^)\s]+)\)/g;
  let match;
  while ((match = mdLink.exec(text))) {
    const title = clean(match[1]);
    const url = cleanUrl(match[2]);
    if (!url || isSearchEngineUrl(url)) continue;
    const chunk = clean(text.slice(match.index, Math.min(text.length, match.index + 700)));
    found.push(toResult({ title, url, snippet: chunk, query }));
  }

  const rawUrl = /https?:\/\/[^\s)\]]+/g;
  while ((match = rawUrl.exec(text))) {
    const url = cleanUrl(match[0]);
    if (!url || isSearchEngineUrl(url) || found.some((item) => item.url === url)) continue;
    const before = clean(text.slice(Math.max(0, match.index - 160), match.index));
    const after = clean(text.slice(match.index, Math.min(text.length, match.index + 600)));
    found.push(toResult({ title: titleFromUrl(url, before), url, snippet: `${before} ${after}`, query }));
  }

  return found.sort((a, b) => b.score - a.score);
}

function toResult({ title, url, snippet, query }) {
  const official = isOfficialUrl(url);
  const pdf = isPdfUrl(url);
  const scholarshipy = /(scholarship|scheme|fellowship|stipend|grant|guideline|notification|post matric|pre matric|merit)/i.test(`${title} ${snippet} ${url}`);
  let score = 30;
  if (official) score += 35;
  if (pdf) score += 15;
  if (scholarshipy) score += 25;
  if (/gov\.in|nic\.in|scholarships\.gov\.in|aicte|ugc/i.test(url)) score += 10;
  if (/login|signin|captcha|javascript/i.test(url)) score -= 20;
  return {
    id: crypto.randomUUID?.() || String(Math.random()).slice(2),
    title: clean(title || titleFromUrl(url)).slice(0, 180),
    url,
    snippet: clean(snippet || "").slice(0, 700),
    score: Math.max(0, Math.min(100, score)),
    official,
    pdf,
    scholarshipy,
    query
  };
}

function fallbackSuggestedResults(query) {
  return [
    toResult({ title: "Open Google official scholarship search", url: searchUrl("google", query), snippet: "Automatic result parsing was blocked. Open this search and copy useful official URLs back into ApplyMate.", query }),
    toResult({ title: "Open Bing official scholarship search", url: searchUrl("bing", query), snippet: "Automatic result parsing was blocked. Use this to find official scholarship pages/PDFs.", query }),
    toResult({ title: "Open DuckDuckGo official scholarship search", url: searchUrl("duck", query), snippet: "Automatic result parsing was blocked. Use this to find official scholarship pages/PDFs.", query })
  ];
}

function renderResults() {
  if (!els.results) return;
  if (!searchResults.length) {
    els.results.innerHTML = "<p class='mini-note'>No search results yet.</p>";
    return;
  }
  els.results.innerHTML = searchResults.map((item, index) => `
    <article class="bot-card">
      <label class="check-row" style="background:#fff"><input type="checkbox" class="web-result-check" data-id="${escapeHtml(item.id)}" ${index < 5 && item.scholarshipy ? "checked" : ""}/><span><strong>Select this source</strong><br><span class="mini-note">Score ${item.score}% • ${item.official ? "official-looking" : "unverified"} • ${item.pdf ? "PDF" : "web page"}</span></span></label>
      <h3>${index + 1}. ${escapeHtml(item.title)}</h3>
      <p class="bot-mini"><a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.url)}</a></p>
      <p class="bot-mini">${escapeHtml(item.snippet || "No snippet returned. Open the source if needed.")}</p>
      <div class="button-row"><button type="button" class="secondary-btn web-copy-url" data-url="${escapeHtml(item.url)}">Copy URL</button><a class="secondary-btn" href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">Open</a></div>
    </article>`).join("");
  document.querySelectorAll(".web-copy-url").forEach((btn) => btn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(btn.dataset.url || "");
      showStatus("URL copied. Paste it into Bulk official URLs if needed.");
    } catch {
      showStatus("Copy blocked by browser. Manually copy the link.", true);
    }
  }));
}

function selectedResults() {
  const ids = new Set(Array.from(document.querySelectorAll(".web-result-check:checked")).map((box) => box.dataset.id));
  return searchResults.filter((item) => ids.has(item.id));
}

function generateDraftsFromSelected() {
  const selected = selectedResults();
  if (!selected.length) return showStatus("Select at least one search result first.", true);
  const blocks = selected.map(resultToLegacyBlock).join("\n---\n");
  setValue(els.input, blocks);
  els.analyzeInput?.click();
  showStatus(`Generated ${selected.length} draft record(s) from search snippets. These are safer as drafts until verified.`);
}

function deepAnalyzeSelected() {
  const selected = selectedResults();
  if (!selected.length) return showStatus("Select at least one search result first.", true);
  setValue(els.bulkUrls, selected.map((item) => item.url).join("\n"));
  els.analyzeBulk?.click();
  showStatus(`Sent ${selected.length} selected URL(s) to deep analyzer. If a portal blocks it, use snippet drafts or open/download PDF.`);
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

function searchUrl(engine, query) {
  const q = encodeURIComponent(query);
  if (engine === "bing") return `https://www.bing.com/search?q=${q}`;
  if (engine === "duck") return `https://duckduckgo.com/?q=${q}`;
  return `https://www.google.com/search?q=${q}`;
}

function isOfficialUrl(url) {
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    return /(^|\.)(gov\.in|nic\.in|ac\.in)$/.test(host) || /scholarships\.gov\.in|aicte-india\.org|ugc\.gov\.in|education\.gov\.in|tribal\.nic\.in|minorityaffairs\.gov\.in/.test(host);
  } catch {
    return false;
  }
}
function isPdfUrl(url) { try { return new URL(url).pathname.toLowerCase().endsWith(".pdf"); } catch { return /\.pdf(?:$|[?#])/i.test(String(url || "")); } }
function isSearchEngineUrl(url) { return /google\.com\/search|bing\.com\/search|duckduckgo\.com|s\.jina\.ai/.test(url); }
function cleanUrl(url) { return String(url || "").replace(/[).,;]+$/, "").trim(); }
function cleanTitle(title) { return clean(title).replace(/\s*-\s*(PDF|Official|Notification).*$/i, "").slice(0, 160) || "Scholarship details needed"; }
function titleFromUrl(url, fallback = "") { try { const u = new URL(url); const last = decodeURIComponent(u.pathname.split("/").filter(Boolean).pop() || u.hostname); return clean(fallback) || clean(last.replace(/[-_]/g, " ").replace(/\.pdf$/i, "")); } catch { return clean(fallback) || "Scholarship result"; } }
function sourceNameFromUrl(url) { try { const host = new URL(url).hostname.replace(/^www\./, ""); if (host.includes("scholarships.gov.in")) return "National Scholarship Portal"; if (host.includes("aicte")) return "AICTE"; if (host.includes("jnanabhumi")) return "AP Jnanabhumi"; if (host.includes("telanganaepass")) return "Telangana ePASS"; if (host.includes("ugc")) return "UGC"; if (host.includes("andaman") || host.includes("and.nic")) return "Andaman and Nicobar Administration"; return host.split(".").slice(0, 2).join("."); } catch { return "Official Portal"; } }
function guessState(text) { const t = String(text || "").toLowerCase(); if (/andhra pradesh|jnanabhumi|\bap\b/.test(t)) return "Andhra Pradesh"; if (/telangana|epass/.test(t)) return "Telangana"; if (/andaman|nicobar|port blair/.test(t)) return "Andaman and Nicobar Islands"; if (/karnataka/.test(t)) return "Karnataka"; if (/tamil nadu/.test(t)) return "Tamil Nadu"; if (/kerala/.test(t)) return "Kerala"; if (/maharashtra/.test(t)) return "Maharashtra"; if (/odisha|orissa/.test(t)) return "Odisha"; if (/west bengal/.test(t)) return "West Bengal"; return "National"; }
function guessEducation(text) { const t = norm(text), out = []; if (/school|class|pre matric/.test(t)) out.push("school"); if (/intermediate|senior secondary|10 2|class xii/.test(t)) out.push("intermediate"); if (/degree|graduation|graduate|undergraduate|ug/.test(t)) out.push("degree"); if (/engineering|btech|technology|polytechnic|diploma|iti/.test(t)) out.push("engineering"); if (/medicine|medical|nursing|pharmacy/.test(t)) out.push("medical"); if (/post graduate|pg|masters|m tech|m phil|phd|post doctoral/.test(t)) out.push("pg"); return out.length ? [...new Set(out)] : ["any"]; }
function guessCategories(text) { const t = norm(text), out = []; if (/general|open category/.test(t)) out.push("general"); if (/\bsc\b|scheduled caste/.test(t)) out.push("sc"); if (/\bst\b|scheduled tribe/.test(t)) out.push("st"); if (/\bobc\b|other backward class|backward class/.test(t)) out.push("obc"); if (/ews|economically weaker/.test(t)) out.push("ews"); if (/minority|muslim|christian|sikh|buddhist|jain|parsi/.test(t)) out.push("minority"); return out.length ? [...new Set(out)] : ["general", "sc", "st", "obc", "ews", "minority"]; }
function extractAmount(text) { const amount = String(text || "").match(/(?:₹|rs\.?)\s*([0-9][0-9,]*(?:\.\d+)?)/i)?.[1]?.replace(/,/g, "") || ""; const freq = /per\s+month|monthly|p\.m\./i.test(text) ? " per month" : /per\s+annum|per\s+year|annually|yearly|p\.a\./i.test(text) ? " per year" : ""; return amount ? `Rs.${amount}${freq}` : "Varies as per official rules"; }
function extractIncome(text) { return String(text || "").match(/(?:income\s+limit|annual\s+income|family\s+income|max(?:imum)?\s+income|not\s+exceed)[^₹\d]{0,100}(?:₹|rs\.?\s?)?([0-9][0-9,]{3,})/i)?.[1]?.replace(/,/g, "") || "0"; }
function extractIncomeNote(text) { const hit = around(text, /(income\s+limit|annual income|family income|max(?:imum)? income|not exceed)/i, 350); if (hit) return hit; if (/non[-\s]?creamy layer/i.test(text)) return "OBC non-creamy layer rule found. Verify exact income rule from official notification."; return "Verify income rules on official portal."; }
function extractDate(text) { return date(findDate(text)); }
function findDate(text) { return String(text || "").match(/20\d{2}-[01]\d-[0-3]\d/)?.[0] || String(text || "").match(/[0-3]?\d[/-][01]?\d[/-]20\d{2}/)?.[0] || String(text || "").match(/[0-3]?\d\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\s+20\d{2}/i)?.[0] || ""; }
function date(v) { const s = String(v || "").trim(); if (!s) return ""; const iso = s.match(/20\d{2}-[01]\d-[0-3]\d/)?.[0]; if (iso) return iso; const n = s.match(/([0-3]?\d)[/-]([01]?\d)[/-](20\d{2})/); if (n) return `${n[3]}-${n[2].padStart(2, "0")}-${n[1].padStart(2, "0")}`; const m = s.match(/([0-3]?\d)\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\s+(20\d{2})/i); if (!m) return ""; const mm = { jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06", jul: "07", aug: "08", sep: "09", sept: "09", oct: "10", nov: "11", dec: "12" }; return `${m[3]}-${mm[m[2].toLowerCase().slice(0, 4)] || mm[m[2].toLowerCase().slice(0, 3)]}-${m[1].padStart(2, "0")}`; }
function around(text, regex, len) { const s = clean(text).replace(/https?:\/\/\S+/g, ""), i = s.search(regex); return i < 0 ? "" : s.slice(Math.max(0, i - 100), i + len); }
function value(el) { return el?.value?.trim() || ""; }
function setValue(el, v) { if (el) el.value = v || ""; }
function showStatus(message, bad = false) { if (els.status) { els.status.textContent = message; els.status.style.color = bad ? "#b42318" : ""; } }
function clean(v) { return String(v || "").replace(/\s+/g, " ").trim(); }
function norm(v) { return String(v || "").toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim(); }
function escapeHtml(v) { return String(v || "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;"); }
