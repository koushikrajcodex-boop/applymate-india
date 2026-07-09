// Frontend-only smart fetch patch for ApplyMate analyzer.
// It improves browser fetching without any backend by trying direct fetch, PDF.js URL loading,
// optional public proxy fallback, clipboard paste, open-source helper, and drag/drop PDFs.

const $ = (id) => document.getElementById(id);
const PDFJS_URL = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.mjs";
const PDFJS_WORKER_URL = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.mjs";
const PROXY_SERVICES = [
  { name: "AllOrigins", build: (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}` },
  { name: "CorsProxy", build: (url) => `https://corsproxy.io/?${encodeURIComponent(url)}` }
];
let pdfJsPromise = null;

const els = {
  linkUrl: $("linkAnalyzerUrl"),
  bulkUrls: $("linkBulkUrls"),
  pdfFile: $("linkPdfFile"),
  fallbackText: $("linkFallbackText"),
  tryProxy: $("linkTryProxy"),
  dropZone: $("linkDropZone"),
  dropStatus: $("linkDropStatus"),
  openSource: $("linkOpenSourceBtn"),
  pasteClipboard: $("linkClipboardPasteBtn"),
  fetchLink: $("linkAnalyzeBtn"),
  analyzeBulk: $("linkBulkAnalyzeBtn"),
  analyzePasted: $("linkPastedAnalyzeBtn"),
  analyzeJson: $("botPanelAnalyzeBtn"),
  input: $("botPanelInput"),
  source: $("botPanelSource"),
  url: $("botPanelUrl"),
  message: $("botPanelMessage")
};

installSmartPatch();

function installSmartPatch() {
  replaceButton(els.fetchLink, smartAnalyzeSingle);
  replaceButton(els.analyzeBulk, smartAnalyzeBulk);
  els.openSource?.addEventListener("click", openCurrentSource);
  els.pasteClipboard?.addEventListener("click", pasteFromClipboard);
  setupDropZone();
  setMessage("Smart frontend fetcher loaded. Optional proxy fallback, drag/drop PDFs, and clipboard paste are ready.");
}

function replaceButton(button, handler) {
  if (!button) return;
  const clone = button.cloneNode(true);
  button.parentNode.replaceChild(clone, button);
  clone.addEventListener("click", handler);
}

async function smartAnalyzeSingle() {
  const url = normalizeUrl(value(els.linkUrl));
  if (!url) return setMessage("Paste a valid official scholarship URL first.", true);
  setValue(els.url, url);
  setValue(els.source, sourceNameFromUrl(url));
  setMessage(startMessage(url));
  try {
    const result = await fetchReadableText(url, allowProxy());
    setValue(els.fallbackText, result.text.slice(0, 30000));
    setMessage(`Smart fetch worked using ${result.method}. Now extracting scholarship fields...`);
    els.analyzePasted?.click();
  } catch (error) {
    console.warn("Smart fetch failed", error);
    setMessage(blockedMessage(url), true);
  }
}

async function smartAnalyzeBulk() {
  const urls = extractUrls(value(els.bulkUrls)).slice(0, 15);
  if (!urls.length) return setMessage("Paste up to 15 official links in Bulk official URLs first.", true);
  const blocks = [];
  let ok = 0;
  for (let i = 0; i < urls.length; i += 1) {
    const url = urls[i];
    setMessage(`Smart bulk ${i + 1}/${urls.length}: ${hostLabel(url)}`);
    try {
      const result = await fetchReadableText(url, allowProxy());
      ok += 1;
      blocks.push(legacyBlockFromText(url, result.text, result.method));
    } catch (error) {
      console.warn("Smart bulk failed", url, error);
      blocks.push(legacyBlockedBlock(url));
    }
  }
  setValue(els.input, blocks.join("\n---\n"));
  els.analyzeJson?.click();
  setMessage(`Smart bulk finished. Readable: ${ok}. Blocked/manual review: ${urls.length - ok}.`);
}

async function fetchReadableText(url, proxyAllowed) {
  const errors = [];
  try {
    const text = await fetchDirect(url);
    if (!isWeakText(text, url)) return { text, method: isPdfUrl(url) ? "direct PDF fetch" : "direct page fetch" };
    errors.push(new Error("Direct fetch returned weak text"));
  } catch (error) {
    errors.push(error);
  }

  if (isPdfUrl(url)) {
    try {
      setMessage("Direct fetch failed. Trying PDF.js URL loading...");
      const text = await pdfUrlToText(url);
      if (!isWeakText(text, url)) return { text, method: "PDF.js URL loader" };
      errors.push(new Error("PDF.js URL loader returned weak text"));
    } catch (error) {
      errors.push(error);
    }
  }

  if (proxyAllowed) {
    for (const proxy of PROXY_SERVICES) {
      try {
        setMessage(`Direct fetch blocked. Trying optional public proxy: ${proxy.name}...`);
        const text = await fetchViaProxy(url, proxy);
        if (!isWeakText(text, url)) return { text, method: `public proxy ${proxy.name}` };
        errors.push(new Error(`${proxy.name} returned weak text`));
      } catch (error) {
        errors.push(error);
      }
    }
  }

  throw errors[errors.length - 1] || new Error("Source blocked");
}

async function fetchDirect(url) {
  const response = await timedFetch(url, url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const type = response.headers.get("content-type") || "";
  const finalUrl = response.url || url;
  if (type.includes("application/pdf") || isPdfUrl(finalUrl)) return await pdfBufferToText(await response.arrayBuffer());
  return htmlToText(await response.text());
}

async function fetchViaProxy(originalUrl, proxy) {
  const response = await timedFetch(proxy.build(originalUrl), originalUrl);
  if (!response.ok) throw new Error(`${proxy.name} HTTP ${response.status}`);
  const type = response.headers.get("content-type") || "";
  if (type.includes("application/pdf") || isPdfUrl(originalUrl)) {
    const buffer = await response.arrayBuffer();
    try {
      return await pdfBufferToText(buffer);
    } catch {
      return cleanGuidelineText(new TextDecoder().decode(buffer)).slice(0, 50000);
    }
  }
  return htmlToText(await response.text());
}

async function timedFetch(url, sourceUrl) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 18000);
  try {
    return await fetch(url, {
      method: "GET",
      mode: "cors",
      credentials: "omit",
      cache: "no-store",
      signal: controller.signal,
      headers: { Accept: isPdfUrl(sourceUrl) ? "application/pdf,text/html,text/plain,*/*" : "text/html,text/plain,application/pdf,*/*" }
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function loadPdfJs() {
  if (!pdfJsPromise) {
    pdfJsPromise = import(PDFJS_URL).then((pdfjsLib) => {
      pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
      return pdfjsLib;
    });
  }
  return pdfJsPromise;
}

async function pdfBufferToText(buffer) {
  const pdfjsLib = await loadPdfJs();
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
  return extractPdfText(pdf);
}

async function pdfUrlToText(url) {
  const pdfjsLib = await loadPdfJs();
  const pdf = await pdfjsLib.getDocument({ url, withCredentials: false }).promise;
  return extractPdfText(pdf);
}

async function extractPdfText(pdf) {
  const pages = [];
  for (let pageNo = 1; pageNo <= pdf.numPages; pageNo += 1) {
    const page = await pdf.getPage(pageNo);
    const content = await page.getTextContent();
    pages.push(`--- Page ${pageNo} ---\n${content.items.map((item) => item.str || "").join(" ")}`);
  }
  return cleanGuidelineText(pages.join("\n\n")).slice(0, 80000);
}

function htmlToText(html) {
  const doc = new DOMParser().parseFromString(String(html || ""), "text/html");
  doc.querySelectorAll("script,style,noscript,svg,iframe,nav,footer,header,aside").forEach((node) => node.remove());
  const parts = [
    doc.querySelector("title")?.textContent || "",
    doc.querySelector('meta[name="description"]')?.getAttribute("content") || "",
    ...Array.from(doc.querySelectorAll("h1,h2,h3,h4,th,td,p,li,span,strong,article,section")).map((node) => node.textContent || "")
  ];
  return cleanGuidelineText(parts.join("\n")).slice(0, 50000);
}

function legacyBlockFromText(url, text, method) {
  const cleaned = cleanGuidelineText(text);
  return [
    `Scholarship Name ${guessTitle(cleaned, url)}`,
    `State ${guessState(cleaned, url)}`,
    `Education ${guessEducation(cleaned).join(", ")}`,
    `Categories ${guessCategories(cleaned).join(", ")}`,
    "Gender any",
    `Amount ${extractAmount(cleaned)}`,
    `Income limit ${extractIncome(cleaned)}`,
    `Deadline date ${extractDate(cleaned)}`,
    `Official link ${url}`,
    `Source ${sourceNameFromUrl(url)}`,
    `Eligibility Extracted by ${method}. ${cleaned.slice(0, 1300)}`,
    `Income note ${extractIncomeNote(cleaned)}`
  ].join("\n");
}

function legacyBlockedBlock(url) {
  return [
    `Scholarship Name ${placeholderTitle(url)}`,
    `State ${guessState("", url)}`,
    "Education any",
    "Categories general, sc, st, obc, ews, minority",
    "Gender any",
    "Amount Varies as per official rules",
    "Income limit 0",
    "Deadline date ",
    `Official link ${url}`,
    `Source ${sourceNameFromUrl(url)}`,
    `Eligibility Source blocked by browser/CORS. Open the source, download/upload PDF, or paste copied text.`,
    "Income note Needs manual verification."
  ].join("\n");
}

function setupDropZone() {
  const zone = els.dropZone;
  if (!zone || !els.pdfFile) return;
  ["dragenter", "dragover"].forEach((eventName) => zone.addEventListener(eventName, (event) => {
    event.preventDefault();
    zone.style.borderColor = "#2563eb";
    zone.style.background = "#eff6ff";
  }));
  ["dragleave", "drop"].forEach((eventName) => zone.addEventListener(eventName, (event) => {
    event.preventDefault();
    zone.style.borderColor = "";
    zone.style.background = "";
  }));
  zone.addEventListener("drop", (event) => {
    const files = Array.from(event.dataTransfer?.files || []).filter((file) => /\.pdf$/i.test(file.name) || file.type === "application/pdf");
    if (!files.length) {
      show(els.dropStatus, "No PDF files detected in drop.");
      return;
    }
    const dt = new DataTransfer();
    files.forEach((file) => dt.items.add(file));
    els.pdfFile.files = dt.files;
    show(els.dropStatus, `${files.length} PDF(s) ready. Click Analyze Uploaded PDF(s)/OCR.`);
  });
}

async function pasteFromClipboard() {
  if (!navigator.clipboard?.readText) return setMessage("Clipboard paste is blocked in this browser. Use Ctrl+V into the fallback text box.", true);
  try {
    const text = await navigator.clipboard.readText();
    if (!text || text.trim().length < 10) return setMessage("Clipboard is empty or too short. Copy official page/PDF text first.", true);
    setValue(els.fallbackText, text.trim());
    setMessage("Clipboard text pasted. Click Analyze Pasted Text to extract scholarship details.");
  } catch (error) {
    console.error(error);
    setMessage("Clipboard permission was blocked. Click the fallback text box and press Ctrl+V manually.", true);
  }
}

function openCurrentSource() {
  const url = normalizeUrl(value(els.linkUrl) || value(els.url));
  if (!url) return setMessage("Paste an official source URL first, then click Open Source.", true);
  window.open(url, "_blank", "noopener,noreferrer");
  setMessage("Opened official source. If fetch is blocked, download the PDF and drag/drop or upload it here.");
}

function startMessage(url) {
  return isPdfUrl(url) ? `Reading official PDF${allowProxy() ? " with optional proxy fallback" : ""}...` : `Reading official page${allowProxy() ? " with optional proxy fallback" : ""}...`;
}
function blockedMessage(url) {
  if (isNspFilterUrl(url)) return "NSP filter pages are dynamic. Open a specific scheme, copy text, then use Paste from Clipboard.";
  if (isPdfUrl(url)) return allowProxy() ? "PDF still blocked after fallback. Click Open Source, download it, then drag/drop/upload it." : "PDF blocked by browser/CORS. Tick public proxy fallback, or click Open Source and upload the downloaded PDF.";
  return allowProxy() ? "Source still blocked after fallback. Open it and paste copied text." : "Source blocked by browser/CORS. Tick public proxy fallback, or open it and paste copied text.";
}
function allowProxy() { return Boolean(els.tryProxy?.checked); }
function isWeakText(text, url) { const t = clean(text), noUrls = t.replace(/https?:\/\/\S+/g, ""); const words = noUrls.split(/\s+/).filter(Boolean).length; return (isNspFilterUrl(url) && words < 120) || words < 45 || !/(scholarship|scheme|fellowship|eligib|income|deadline|amount|benefit|student|apply|application|notification|guideline|documents)/i.test(noUrls); }
function isNspFilterUrl(url) { try { const u = new URL(url); return u.hostname.includes("scholarships.gov.in") && /scholarshipEligibility|scheme-filter|scheme/i.test(u.pathname); } catch { return false; } }
function isPdfUrl(url) { try { return new URL(url).pathname.toLowerCase().endsWith(".pdf"); } catch { return /\.pdf(?:$|[?#])/i.test(String(url || "")); } }
function guessTitle(text, url) { if (/Additional Scholarship.+OBC.+Andaman.+Nicobar/i.test(text)) return "Additional Scholarship to OBC Students of Andaman and Nicobar Islands"; const match = clean(text).match(/(?:scheme\s+for\s+grant\s+of|scholarship\s+name|name\s+of\s+the\s+scheme)\s*:?\s*(.{12,150}?)(?:,|\.|\s+for\s+pursuing|\n)/i); if (match) return titleCase(match[1]); const strong = clean(text).split(/\n|\.|\||•/).map(clean).find((x) => x.length >= 8 && x.length <= 140 && /scholarship|scheme|fellowship|grant|stipend/i.test(x) && !/login|copyright|official website|page \d+/i.test(x)); return strong || placeholderTitle(url); }
function guessState(text, url) { const domain = String(url || "").toLowerCase(); if (domain.includes("jnanabhumi") || /andhra pradesh|\bap\b/i.test(text)) return "Andhra Pradesh"; if (domain.includes("telangana") || /telangana/i.test(text)) return "Telangana"; if (/andaman\s*(?:and|&)\s*nicobar|port blair/i.test(text)) return "Andaman and Nicobar Islands"; return INDIA_STATE_OPTIONS?.find?.((s) => new RegExp(`\\b${escapeRegex(s.label)}\\b`, "i").test(text))?.label || "National"; }
function guessEducation(text) { const t = norm(text), out = []; if (/school|class|pre matric/.test(t)) out.push("school"); if (/intermediate|senior secondary|10 2|class xii/.test(t)) out.push("intermediate"); if (/degree|graduation|graduate|undergraduate|ug/.test(t)) out.push("degree"); if (/engineering|btech|technology|polytechnic|diploma|iti/.test(t)) out.push("engineering"); if (/medicine|medical|nursing|pharmacy/.test(t)) out.push("medical"); if (/post graduate|pg|masters|m tech|m phil|phd|post doctoral/.test(t)) out.push("pg"); return out.length ? [...new Set(out)] : ["any"]; }
function guessCategories(text) { const t = norm(text), out = []; if (/general|open category/.test(t)) out.push("general"); if (/\bsc\b|scheduled caste/.test(t)) out.push("sc"); if (/\bst\b|scheduled tribe/.test(t)) out.push("st"); if (/\bobc\b|other backward class|backward class/.test(t)) out.push("obc"); if (/ews|economically weaker/.test(t)) out.push("ews"); if (/minority|muslim|christian|sikh|buddhist|jain|parsi/.test(t)) out.push("minority"); return out.length ? [...new Set(out)] : ["general", "sc", "st", "obc", "ews", "minority"]; }
function extractAmount(text) { const amount = text.match(/(?:₹|rs\.?)\s*([0-9][0-9,]*(?:\.\d+)?)/i)?.[1]?.replace(/,/g, "") || ""; const freq = /per\s+month|monthly|p\.m\./i.test(text) ? " per month" : /per\s+annum|per\s+year|annually|yearly|p\.a\./i.test(text) ? " per year" : ""; return amount ? `Rs.${amount}${freq}` : "Varies as per official rules"; }
function extractIncome(text) { return text.match(/(?:income\s+limit|annual\s+income|family\s+income|max(?:imum)?\s+income|not\s+exceed)[^₹\d]{0,100}(?:₹|rs\.?\s?)?([0-9][0-9,]{3,})/i)?.[1]?.replace(/,/g, "") || "0"; }
function extractIncomeNote(text) { const hit = around(text, /(income\s+limit|annual income|family income|max(?:imum)? income|not exceed)/i, 450); if (hit) return hit; if (/non[-\s]?creamy layer/i.test(text)) return "OBC non-creamy layer rule found. Verify exact income rule from official notification."; return "Verify income rules on official portal."; }
function extractDate(text) { return date(findDate(text)); }
function findDate(text) { return String(text || "").match(/20\d{2}-[01]\d-[0-3]\d/)?.[0] || String(text || "").match(/[0-3]?\d[/-][01]?\d[/-]20\d{2}/)?.[0] || String(text || "").match(/[0-3]?\d\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\s+20\d{2}/i)?.[0] || ""; }
function date(v) { const s = String(v || "").trim(); if (!s) return ""; const iso = s.match(/20\d{2}-[01]\d-[0-3]\d/)?.[0]; if (iso) return iso; const n = s.match(/([0-3]?\d)[/-]([01]?\d)[/-](20\d{2})/); if (n) return `${n[3]}-${n[2].padStart(2, "0")}-${n[1].padStart(2, "0")}`; const m = s.match(/([0-3]?\d)\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\s+(20\d{2})/i); if (!m) return ""; const mm = { jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06", jul: "07", aug: "08", sep: "09", sept: "09", oct: "10", nov: "11", dec: "12" }; return `${m[3]}-${mm[m[2].toLowerCase().slice(0, 4)] || mm[m[2].toLowerCase().slice(0, 3)]}-${m[1].padStart(2, "0")}`; }
function placeholderTitle(url) { return isNspFilterUrl(url) ? "NSP specific scheme name needed" : `${sourceNameFromUrl(url)} scholarship details needed`; }
function sourceNameFromUrl(url) { try { const host = new URL(url).hostname.replace(/^www\./, ""); if (host.includes("scholarships.gov.in")) return "National Scholarship Portal"; if (host.includes("aicte")) return "AICTE"; if (host.includes("jnanabhumi")) return "AP Jnanabhumi"; if (host.includes("telanganaepass")) return "Telangana ePASS"; if (host.includes("ugc")) return "UGC"; if (host.includes("andaman") || host.includes("and.nic")) return "Andaman and Nicobar Administration"; return host.split(".").slice(0, 2).join("."); } catch { return "Official Portal"; } }
function cleanGuidelineText(text) { return String(text || "").replace(/\r/g, "\n").replace(/[ \t]+/g, " ").replace(/([a-z])- *\n *([a-z])/gi, "$1$2").replace(/([a-z,;:])\n([a-z])/gi, "$1 $2").replace(/\n{3,}/g, "\n\n").replace(/\s+:/g, ":").trim(); }
function around(text, regex, len) { const s = clean(text).replace(/https?:\/\/\S+/g, ""), i = s.search(regex); return i < 0 ? "" : s.slice(Math.max(0, i - 100), i + len); }
function extractUrls(text) { return [...new Set(String(text || "").split(/\s+/).map((x) => normalizeUrl(x.replace(/[),.;]+$/, ""))).filter(Boolean))]; }
function normalizeUrl(v) { try { const u = new URL(String(v || "").trim()); return ["http:", "https:"].includes(u.protocol) ? u.href : ""; } catch { return ""; } }
function hostLabel(url) { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return "source"; } }
function value(el) { return el?.value?.trim() || ""; }
function setValue(el, v) { if (el) el.value = v || ""; }
function show(el, v) { if (el) el.textContent = v || ""; }
function setMessage(v, bad = false) { show(els.message, v); if (els.message) els.message.style.color = bad ? "#b42318" : ""; }
function clean(v) { return String(v || "").replace(/\s+/g, " ").trim(); }
function norm(v) { return String(v || "").toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim(); }
function titleCase(v) { return clean(v).replace(/\b[a-z]/g, (x) => x.toUpperCase()); }
function escapeRegex(v) { return String(v || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
