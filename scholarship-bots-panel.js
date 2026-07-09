import { auth, db } from "./firebase-config.js";
import { checkAdminAccess } from "./admin-access.js";
import { getStateLabel, INDIA_STATE_OPTIONS, isKnownStateSlug } from "./states.js";
import { isVerifiedActiveScholarship } from "./scholarship-verification.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { addDoc, collection, getDocs, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const $ = (id) => document.getElementById(id);
const today = new Date().toISOString().slice(0, 10);
const draftDeadline = "2099-12-31";
const PDFJS_URL = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.mjs";
const PDFJS_WORKER_URL = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.mjs";

let currentUser = null;
let existing = [];
let candidates = [];
let adminReady = false;
let pdfJsPromise = null;

const els = {
  email: $("botPanelAdminEmail"),
  locked: $("botPanelLocked"),
  content: $("botPanelContent"),
  coverage: $("botPanelCoverage"),
  linkUrl: $("linkAnalyzerUrl"),
  pdfFile: $("linkPdfFile"),
  fallbackText: $("linkFallbackText"),
  source: $("botPanelSource"),
  url: $("botPanelUrl"),
  input: $("botPanelInput"),
  message: $("botPanelMessage"),
  results: $("botPanelResults"),
  refresh: $("botPanelRefreshBtn"),
  fetchLink: $("linkAnalyzeBtn"),
  analyzePdf: $("linkPdfAnalyzeBtn"),
  analyzePasted: $("linkPastedAnalyzeBtn"),
  analyze: $("botPanelAnalyzeBtn"),
  clear: $("botPanelClearBtn"),
  importActive: $("botPanelImportActiveBtn"),
  importDraft: $("botPanelImportDraftBtn"),
  importSafeDrafts: $("botPanelImportSafeDraftsBtn")
};

onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  els.content?.classList.remove("hidden");
  bindEvents();

  if (!user) {
    show(els.email, "Analyzer ready. Login required only for Firestore import.");
    els.locked?.classList.remove("hidden");
    return;
  }

  try {
    const access = await checkAdminAccess(user);
    if (!access.allowed) {
      show(els.email, `Analyzer ready. Firestore import denied for ${user.email || "this user"}.`);
      els.locked?.classList.remove("hidden");
      return;
    }

    adminReady = true;
    show(els.email, `Admin: ${user.email || "approved admin"} (${access.viaEmail ? "admin email" : "custom claim"})`);
    els.locked?.classList.add("hidden");
    await loadCoverage();
  } catch (error) {
    console.error("Admin check failed", error);
    show(els.email, "Analyzer ready. Admin check failed, so import may not work until rules/login are fixed.");
  }
});

function bindEvents() {
  if (bindEvents.done) return;
  bindEvents.done = true;
  els.refresh?.addEventListener("click", loadCoverage);
  els.fetchLink?.addEventListener("click", analyzeLink);
  els.analyzePdf?.addEventListener("click", analyzeUploadedPdf);
  els.analyzePasted?.addEventListener("click", analyzeFallbackText);
  els.analyze?.addEventListener("click", analyzeGeneratedFormat);
  els.clear?.addEventListener("click", clearWorkspace);
  els.importActive?.addEventListener("click", () => importRecords("active"));
  els.importDraft?.addEventListener("click", () => importRecords("draft"));
  els.importSafeDrafts?.addEventListener("click", () => importRecords("safeDrafts"));
}

async function loadCoverage() {
  if (!adminReady) return setMessage("Login with approved admin email to load Firestore coverage.", true);
  setMessage("Loading Firestore coverage...");
  try {
    const snapshot = await getDocs(collection(db, "scholarships"));
    existing = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const active = existing.filter(isVerifiedActiveScholarship).length;
    const uniqueSources = new Set(existing.map((item) => normalizeUrl(item.sourceUrl || item.link)).filter(Boolean)).size;
    show(els.coverage, `${existing.length} total records • ${active} active verified • ${uniqueSources} unique sources`);
    setMessage("Coverage loaded. Paste a scholarship link or upload an official PDF.");
    if (candidates.length) analyzeGeneratedFormat();
  } catch (error) {
    console.error(error);
    setMessage(`Coverage failed: ${error.message}. If permission-denied, deploy updated Firestore rules.`, true);
  }
}

async function analyzeLink() {
  const url = normalizeUrl(value(els.linkUrl));
  if (!url) return setMessage("Paste a valid official scholarship URL first.", true);

  setValue(els.url, url);
  setValue(els.source, sourceNameFromUrl(url));
  setMessage(isLikelyPdfUrl(url) ? "Trying to fetch and read the official PDF..." : "Trying to fetch and read the official link...");

  try {
    const pageText = await fetchLinkReadableText(url);
    if (isWeakPageText(pageText, url)) throw new Error("weak-or-dynamic-page");

    const format = buildScholarshipFormat({ url, text: pageText, sourceName: sourceNameFromUrl(url), documentType: isLikelyPdfUrl(url) ? "pdf" : "web" });
    setValue(els.input, format);
    setValue(els.fallbackText, pageText.slice(0, 8000));
    analyzeGeneratedFormat();
    setMessage(`Official ${isLikelyPdfUrl(url) ? "PDF" : "link"} read successfully. Guideline fields auto-filled and analyzed.`);
  } catch (error) {
    console.warn("Link fetch/extraction failed", error);
    const starter = buildScholarshipFormat({ url, text: "", sourceName: sourceNameFromUrl(url), weakPage: true });
    setValue(els.input, starter);
    analyzeGeneratedFormat();
    setMessage(getBlockedMessage(url, error), true);
  }
}

async function analyzeUploadedPdf() {
  const file = els.pdfFile?.files?.[0];
  if (!file) return setMessage("Choose an official PDF file first.", true);
  if (!/\.pdf$/i.test(file.name) && file.type !== "application/pdf") return setMessage("Upload a PDF file only.", true);

  const url = normalizeUrl(value(els.linkUrl) || value(els.url));
  const sourceName = value(els.source) || sourceNameFromUrl(url) || file.name.replace(/\.pdf$/i, " PDF");
  setMessage("Reading uploaded PDF and extracting guideline sections...");

  try {
    const pageText = await pdfToReadableText(await file.arrayBuffer());
    const quality = detectPdfTextQuality(pageText, pageText.split(/\n--- Page \d+ ---\n/g).length);
    if (isWeakPageText(pageText, url)) throw new Error(quality);

    if (url) setValue(els.url, url);
    setValue(els.source, sourceName);
    setValue(els.fallbackText, pageText.slice(0, 12000));
    setValue(els.input, buildScholarshipFormat({ url, text: pageText, sourceName, documentType: "pdf" }));
    analyzeGeneratedFormat();
    setMessage(`PDF analyzed successfully (${quality.replaceAll("_", " ")}). Review the draft before importing.`);
  } catch (error) {
    console.error(error);
    setMessage("Could not read enough text from this PDF. It may be scanned/image-only. Use OCR first, then paste the OCR text in the fallback box.", true);
  }
}

function analyzeFallbackText() {
  const url = normalizeUrl(value(els.linkUrl) || value(els.url));
  const text = value(els.fallbackText);
  if (!text || text.length < 30) return setMessage("Paste official page/PDF text first.", true);
  const sourceName = sourceNameFromUrl(url) || value(els.source) || "Official Portal";
  setValue(els.source, sourceName);
  if (url) setValue(els.url, url);
  const format = buildScholarshipFormat({ url, text, sourceName, pastedText: true });
  setValue(els.input, format);
  analyzeGeneratedFormat();
  setMessage("Official page/PDF guideline text converted into Add Scholarship format and analyzed.");
}

async function fetchLinkReadableText(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url, {
      method: "GET",
      mode: "cors",
      credentials: "omit",
      cache: "no-store",
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const contentType = response.headers.get("content-type") || "";
    const finalUrl = response.url || url;
    if (contentType.includes("application/pdf") || isLikelyPdfUrl(finalUrl)) {
      return await pdfToReadableText(await response.arrayBuffer());
    }

    return htmlToReadableText(await response.text());
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

async function pdfToReadableText(arrayBuffer) {
  const pdfjsLib = await loadPdfJs();
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
  const pdf = await loadingTask.promise;
  const pages = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const text = content.items.map((item) => item.str || "").join(" ");
    pages.push(`--- Page ${pageNumber} ---\n${text}`);
  }

  return cleanGuidelineText(pages.join("\n\n")).slice(0, 60000);
}

function htmlToReadableText(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(String(html || ""), "text/html");
  doc.querySelectorAll("script,style,noscript,svg,iframe,nav,footer,header").forEach((node) => node.remove());
  const pieces = [
    doc.querySelector("title")?.textContent || "",
    doc.querySelector('meta[name="description"]')?.getAttribute("content") || "",
    ...Array.from(doc.querySelectorAll("h1,h2,h3,h4,th,td,p,li,span,strong")).map((node) => node.textContent || "")
  ];
  return cleanGuidelineText(pieces.join("\n")).slice(0, 30000);
}

function isWeakPageText(text, url) {
  const t = clean(text);
  const withoutUrls = t.replace(/https?:\/\/\S+/g, "").trim();
  const scholarshipWords = /(scholarship|scheme|fellowship|eligib|income|deadline|last date|amount|benefit|student|apply|application|notification|guideline)/i.test(withoutUrls);
  const urlCount = (t.match(/https?:\/\//g) || []).length;
  const wordCount = withoutUrls.split(/\s+/).filter(Boolean).length;
  const dynamicNsp = isNspFilterUrl(url) && wordCount < 120;
  return dynamicNsp || wordCount < 45 || !scholarshipWords || urlCount > Math.max(2, wordCount / 10);
}

function detectPdfTextQuality(text, pageCount) {
  const avgCharsPerPage = clean(text).length / Math.max(pageCount || 1, 1);
  if (avgCharsPerPage < 200) return "scanned_or_poor_text_pdf";
  if (avgCharsPerPage < 700) return "low_quality_text_pdf";
  return "digital_text_pdf";
}

function getBlockedMessage(url, error) {
  if (isNspFilterUrl(url)) {
    return "This NSP link is a dynamic/filter page, not a readable individual scheme page. Open the specific scheme/result on NSP, copy the official scheme text/table/PDF text, paste it in the fallback box, then click Analyze Pasted Text.";
  }
  if (isLikelyPdfUrl(url)) {
    return "The PDF link was blocked by the official site/CORS or is scanned. Download the PDF, upload it with Analyze Uploaded PDF, or paste OCR/text into the fallback box.";
  }
  if (String(error?.message || "").includes("scanned")) {
    return "This PDF looks scanned/image-only. Run OCR first, paste the OCR text, then analyze.";
  }
  return "The site blocked direct reading or returned weak/dynamic content. Copy official page/PDF text into the fallback box and click Analyze Pasted Text.";
}

function isNspFilterUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.hostname.includes("scholarships.gov.in") && /scholarshipEligibility|scheme-filter|scheme/i.test(parsed.pathname);
  } catch {
    return false;
  }
}

function isLikelyPdfUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.pathname.toLowerCase().endsWith(".pdf");
  } catch {
    return /\.pdf(?:$|[?#])/i.test(String(url || ""));
  }
}

function buildScholarshipFormat({ url, text, sourceName, weakPage = false }) {
  const preparedText = cleanGuidelineText(text || "");
  const sections = splitGuidelineSections(preparedText);
  const weak = weakPage || isWeakPageText(preparedText || "", url || "");

  const title = weak ? placeholderTitle(url) : guessTitle(preparedText, url, sections);
  const state = weak ? guessState("", url) : guessState(preparedText, url);
  const education = weak ? "any" : guessEducation(preparedText);
  const categories = weak ? "general, sc, st, obc, ews, minority" : guessCategories(preparedText);
  const gender = weak ? "any" : guessGender(preparedText);
  const amount = weak ? "Varies as per official rules" : guessAmount(preparedText, sections);
  const income = weak ? "0" : guessIncome(preparedText, sections);
  const deadlineDate = weak ? "" : guessDeadlineDate(preparedText);
  const eligibility = weak ? weakEligibilityText(url) : guessEligibility(preparedText, sections);
  const incomeNote = weak ? "Paste exact official income rule from the scheme page/PDF before importing." : guessIncomeNote(preparedText, sections);

  return `Scholarship Name ${title}
State ${state}
Education ${education}
Categories ${categories}
Gender ${gender}
Amount ${amount}
Income limit ${income}
Deadline date ${deadlineDate || "YYYY-MM-DD"}
Official link ${url || "https://official-portal.example/scheme"}
Source ${sourceName || "Official Portal"}
Eligibility ${eligibility}
Income note ${incomeNote}`;
}

function placeholderTitle(url) {
  if (isNspFilterUrl(url)) return "NSP specific scheme name needed";
  return `${sourceNameFromUrl(url)} scholarship details needed`;
}

function weakEligibilityText(url) {
  if (isNspFilterUrl(url)) return "This NSP URL is a filter/dynamic page. Paste the selected scheme's official eligibility text or PDF text here before importing.";
  return "Direct link/PDF reading was blocked or weak. Paste official eligibility text from the source before importing.";
}

function cleanGuidelineText(rawText) {
  return String(rawText || "")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/([a-z])- *\n *([a-z])/gi, "$1$2")
    .replace(/([a-z,;:])\n([a-z])/gi, "$1 $2")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\s+:/g, ":")
    .trim();
}

const GUIDELINE_HEADINGS = [
  "OBJECTIVE & SCOPE",
  "OBJECTIVE AND SCOPE",
  "ELIGIBILITY CRITERIA",
  "VALUE OF SCHOLARSHIP",
  "PAYMENT AND MODE OF DISBURSAL OF SCHOLARSHIP",
  "PAYMENT AND MODE OF DISBURSAL",
  "SANCTIONING AUTHORITY",
  "DURATION AND RENEWAL OF AWARDS",
  "DURATION AND RENEWAL",
  "ANNOUNCEMENT OF THE SCHEME",
  "SELECTION OF CANDIDATES",
  "PROCEDURE FOR APPLYING",
  "FUNDING PATTERN OF THE SCHEME",
  "SCREENING COMMITTEE",
  "POWERS",
  "MONITORING AND EVALUATION"
];

function splitGuidelineSections(text) {
  const headingPattern = GUIDELINE_HEADINGS.map(escapeRegex).join("|");
  const regex = new RegExp(`(?:^|\\n|\\s)(\\d+\\s*\\.?\\s*)?(${headingPattern})\\s*:?\\s*`, "gi");
  const matches = [...String(text || "").matchAll(regex)];
  const sections = {};

  for (let i = 0; i < matches.length; i += 1) {
    const key = sectionKey(matches[i][2]);
    const start = matches[i].index + matches[i][0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index : text.length;
    sections[key] = clean(text.slice(start, end));
  }

  return sections;
}

function sectionKey(heading) {
  return norm(heading).replace(/\s+/g, "_");
}

function pickSection(sections, keys) {
  return keys.map((key) => sections[key]).find(Boolean) || "";
}

function analyzeGeneratedFormat() {
  const raw = value(els.input);
  candidates = parse(raw).map(classify);
  render();
  const active = candidates.filter((item) => item.decision === "autoActive").length;
  const draft = candidates.filter((item) => item.decision === "autoDraft").length;
  setMessage(candidates.length ? `Analyzed ${candidates.length}. Auto Active: ${active}. Auto Draft: ${draft}.` : "Generate or paste a format first.", !candidates.length);
}

function parse(raw) {
  const text = String(raw || "").trim();
  if (!text) return [];
  const json = tryJson(text);
  if (json) return (Array.isArray(json) ? json : json.candidates || [json]).map(fromJson).filter((x) => x.name);
  return text.split(/\n---+\n/g).map((block) => fromText(block.trim())).filter((item) => item.name && !/second scholarship|paste official/i.test(item.name));
}

function fromJson(item) {
  const link = normalizeUrl(item.sourceUrl || item.link || item.url || value(els.url));
  const benefit = item.benefit || {};
  const eligibility = item.eligibility || {};
  const amount = benefit.amount ? `${benefit.amount}${benefit.frequency ? ` ${benefit.frequency}` : ""}` : item.amount;

  return normalize({
    name: safeField(item.name || item.title || item.scholarshipName || item.schemeName || "", "name", link),
    state: resolveState(item.state || item.stateLabel || item.stateOrUT || "national"),
    amount: amount || "Varies as per official rules",
    maxIncome: num(item.maxIncome || item.incomeLimit || item.income || eligibility.incomeLimit || eligibility.incomeRule || 0),
    minPercentage: num(item.minPercentage || item.percentage || item.marks || eligibility.percentageRule || 0),
    deadline: item.deadline || item.deadlineText || item.lastDate || "Check official portal",
    deadlineDate: date(item.deadlineDate || item.lastDateDate || item.date || item.lastDate || ""),
    link,
    sourceUrl: link,
    education: list(item.education || item.course || item.courses || item.courseLevel, ["any"]),
    categories: list(item.categories || item.category || eligibility.categoryRequired, ["general"]),
    genders: list(item.genders || item.gender, ["any"]),
    disability: disability(item.disability || eligibility.disabilityRule),
    eligibilityNote: safeField(item.eligibilityNote || item.eligibility || item.description || eligibility.raw || flattenEligibility(eligibility) || "Verify eligibility on official portal before applying.", "eligibility", link),
    incomeNote: safeField(item.incomeNote || item.incomeRule || eligibility.incomeRule || "Verify income rules on official portal.", "income", link),
    sourceName: clean(item.sourceName || item.source || item.department || value(els.source) || sourceNameFromUrl(link) || "Official Portal"),
    priority: clamp(num(item.priority || item.confidenceScore || 60), 0, 100)
  });
}

function fromText(block) {
  const first = block.split("\n").map((x) => x.trim()).filter(Boolean).find((x) => !/paste official|yyyy-mm-dd/i.test(x)) || "";
  const link = normalizeUrl(line(block, "official link") || line(block, "link") || findUrl(block) || value(els.url));
  const nameRaw = line(block, "scholarship name") || line(block, "name") || first.replace(/^Scholarship Name\s*/i, "");
  return normalize({
    name: safeField(nameRaw, "name", link),
    state: resolveState(line(block, "state") || block),
    amount: clean(line(block, "amount") || "Varies as per official rules"),
    maxIncome: num(line(block, "income limit") || line(block, "income") || 0),
    minPercentage: num(line(block, "minimum percentage") || line(block, "percentage") || 0),
    deadline: clean(line(block, "deadline") || line(block, "last date") || "Check official portal"),
    deadlineDate: date(line(block, "deadline date") || line(block, "last date") || findDate(block)),
    link,
    sourceUrl: link,
    education: list(line(block, "education") || line(block, "course") || line(block, "courses"), ["any"]),
    categories: list(line(block, "categories") || line(block, "category"), ["general"]),
    genders: list(line(block, "gender") || line(block, "genders"), ["any"]),
    disability: disability(line(block, "disability")),
    eligibilityNote: safeField(line(block, "eligibility") || block.slice(0, 700) || "Verify eligibility on official portal before applying.", "eligibility", link),
    incomeNote: safeField(line(block, "income note") || line(block, "income") || "Verify income rules on official portal.", "income", link),
    sourceName: clean(line(block, "source") || value(els.source) || sourceNameFromUrl(link) || "Official Portal"),
    priority: 60
  });
}

function safeField(value, field, link) {
  const text = clean(value);
  if (!text || isOnlyUrl(text) || text === link) {
    if (field === "name") return placeholderTitle(link);
    if (field === "eligibility") return weakEligibilityText(link);
    if (field === "income") return "Paste exact official income rule from the scheme page/PDF before importing.";
  }
  return text.replace(/https?:\/\/\S+/g, "").trim() || (field === "name" ? placeholderTitle(link) : text);
}

function normalize(item) {
  const state = isKnownStateSlug(item.state) ? item.state : "national";
  return {
    name: clean(item.name).slice(0, 200),
    state,
    stateLabel: getStateLabel(state),
    status: "draft",
    amount: clean(item.amount || "Varies as per official rules").slice(0, 120),
    maxIncome: num(item.maxIncome),
    minPercentage: clamp(num(item.minPercentage), 0, 100),
    deadline: clean(item.deadline || "Check official portal").slice(0, 160),
    deadlineDate: date(item.deadlineDate),
    link: normalizeUrl(item.link || item.sourceUrl),
    sourceUrl: normalizeUrl(item.sourceUrl || item.link),
    education: list(item.education, ["any"]),
    categories: list(item.categories, ["general"]),
    genders: list(item.genders, ["any"]),
    disability: disability(item.disability),
    eligibilityNote: clean(item.eligibilityNote).slice(0, 1200),
    incomeNote: clean(item.incomeNote).slice(0, 800),
    priority: clamp(num(item.priority || 60), 0, 100),
    sourceName: clean(item.sourceName || "Official Portal").slice(0, 120),
    applicationWindow: "open",
    academicYear: String(new Date().getFullYear()),
    verifiedOn: today,
    verificationNote: `Checked through Scholarship Link Analyzer on ${today}. Verify official source before publishing widely.`,
    lastChecked: today
  };
}

function classify(item) {
  const duplicate = duplicateOf(item);
  const errors = validate(item, true);
  const looseErrors = validate(item, false);
  let score = 0;
  if (!duplicate) score += 12;
  if (isValidUrl(item.link)) score += 16;
  if (item.name.length >= 8 && !/needed|details needed|specific scheme/i.test(item.name)) score += 14;
  if (item.deadlineDate && !past(item.deadlineDate)) score += 16;
  if (item.sourceName.length >= 2) score += 8;
  if (item.education.length) score += 8;
  if (item.categories.length) score += 8;
  if (item.amount && !/varies/i.test(item.amount)) score += 4;
  if (item.eligibilityNote.length >= 60 && !/blocked|paste|needed|dynamic|filter/i.test(item.eligibilityNote)) score += 10;
  if (item.incomeNote.length >= 20 && !/paste|needed|blocked/i.test(item.incomeNote)) score += 5;
  score -= errors.length * 10;
  score = clamp(Math.round(score), 0, 100);
  let decision = "review";
  if (duplicate) decision = "skipDuplicate";
  else if (item.deadlineDate && past(item.deadlineDate)) decision = "skipExpired";
  else if (!errors.length && score >= 90) decision = "autoActive";
  else if (!looseErrors.some((x) => !x.toLowerCase().includes("deadline")) && score >= 70 && isValidUrl(item.link)) decision = "autoDraft";
  return { ...item, duplicateName: duplicate?.name || "", errors, score, decision };
}

function validate(item, strictDate) {
  const errors = [];
  if (!item.name || item.name.length < 4 || /YYYY-MM-DD|needed|specific scheme|details needed/i.test(item.name)) errors.push("Scholarship name needs exact official scheme name.");
  if (!isValidUrl(item.link)) errors.push("Missing valid official link.");
  if (strictDate && !item.deadlineDate) errors.push("Missing YYYY-MM-DD deadline date.");
  if (item.deadlineDate && past(item.deadlineDate)) errors.push("Deadline expired.");
  if (!item.eligibilityNote || item.eligibilityNote.length < 11 || /blocked|paste|needed|dynamic|filter/i.test(item.eligibilityNote)) errors.push("Eligibility needs official scheme text.");
  if (!item.incomeNote || item.incomeNote.length < 6 || /paste|needed|blocked/i.test(item.incomeNote)) errors.push("Income note needs official scheme text.");
  return errors;
}

function render() {
  if (!els.results) return;
  if (!candidates.length) {
    els.results.innerHTML = "<p class='mini-note'>No results yet.</p>";
    return;
  }
  els.results.innerHTML = candidates.map((item) => `<article class="bot-card"><span class="bot-status ${item.decision === "autoActive" ? "good" : item.decision === "autoDraft" ? "warn" : "bad"}">${escapeHtml(item.decision)} • ${item.score}%</span><h3>${escapeHtml(item.name)}</h3><p class="bot-mini"><strong>State:</strong> ${escapeHtml(item.stateLabel)} • <strong>Deadline:</strong> ${escapeHtml(item.deadlineDate || "missing")}</p><p class="bot-mini"><strong>Amount:</strong> ${escapeHtml(item.amount)} • <strong>Category:</strong> ${escapeHtml(item.categories.join(", "))}</p><p class="bot-mini"><strong>Source:</strong> ${escapeHtml(item.sourceName)} ${item.link ? `• <a href="${escapeHtml(item.link)}" target="_blank" rel="noopener noreferrer">official link</a>` : ""}</p><p class="bot-mini"><strong>Eligibility:</strong> ${escapeHtml(item.eligibilityNote)}</p>${item.duplicateName ? `<p class="bot-mini"><strong>Duplicate:</strong> ${escapeHtml(item.duplicateName)}</p>` : ""}${item.errors.length ? `<ul>${item.errors.map((e) => `<li>${escapeHtml(e)}</li>`).join("")}</ul>` : "<p class='bot-mini'>Ready.</p>"}</article>`).join("");
}

async function importRecords(mode) {
  if (!adminReady) return setMessage("Admin access required for Firestore import. Login with approved admin email.", true);
  let records = [];
  let status = "draft";
  if (mode === "active") {
    records = candidates.filter((x) => x.decision === "autoActive");
    status = "active";
  } else if (mode === "draft") {
    records = candidates.filter((x) => x.decision === "autoDraft");
  } else {
    records = candidates.filter((x) => ["autoActive", "autoDraft"].includes(x.decision));
  }
  if (!records.length) return setMessage("No records match this import mode.", true);
  try {
    setMessage(`Importing ${records.length} records...`);
    for (const item of records) await addDoc(collection(db, "scholarships"), { ...firestoreRecord(item, status), createdAt: serverTimestamp(), updatedAt: serverTimestamp(), createdBy: currentUser.email || currentUser.uid, updatedBy: currentUser.email || currentUser.uid });
    setMessage(`Imported ${records.length} records as ${status}.`);
    await loadCoverage();
  } catch (error) {
    console.error(error);
    setMessage(`Import failed: ${error.message}. If permission-denied, deploy the updated Firestore rules.`, true);
  }
}

function firestoreRecord(item, status) {
  const copy = { ...item };
  ["duplicateName", "errors", "score", "decision"].forEach((key) => delete copy[key]);
  return { ...copy, status, deadlineDate: copy.deadlineDate || draftDeadline, deadline: copy.deadlineDate ? copy.deadline : "Needs official deadline verification", applicationWindow: status === "active" ? "open" : "verify", sourceType: "scholarship-guideline-analyzer", verifiedOn: today, lastChecked: today, verificationNote: status === "active" ? `Published from Scholarship Link Analyzer on ${today} after official-source check.` : `Saved as draft from Scholarship Link Analyzer on ${today} for review.` };
}

function guessTitle(text, url, sections = {}) {
  const header = clean(text).replace(/https?:\/\/\S+/g, " ");
  if (/Additional Scholarship.+OBC.+Andaman.+Nicobar/i.test(header)) {
    return "Additional Scholarship to OBC Students of Andaman and Nicobar Islands";
  }

  const schemeMatch = header.match(/(?:scheme\s+for\s+grant\s+of|regarding\s+scheme\s+for\s+grant\s+of)\s+(.{20,180}?)(?:,|\.|\s+the\s+hon'?ble|\s+for\s+pursuing)/i);
  if (schemeMatch) return titleCase(clean(schemeMatch[1]).replace(/^additional\s+/i, "Additional ").slice(0, 160));

  const objective = pickSection(sections, ["objective_and_scope"]);
  const objectiveHit = objective.match(/(?:objective of the scheme is|scheme is to)\s+(.{20,140}?)(?:\.|,)/i);
  if (objectiveHit && /scholarship|assistance/i.test(objectiveHit[1])) return titleCase(clean(objectiveHit[1]).slice(0, 140));

  const candidates = header.split(/(?<=[.!?])\s+|\n|\|/).map((x) => clean(x)).filter((x) => x.length >= 8 && x.length <= 140);
  const strong = candidates.find((x) => /scholarship|scheme|fellowship|grant|stipend|pragati|saksham|post matric|pre matric/i.test(x) && !/login|home|copyright|official website/i.test(x));
  return strong || placeholderTitle(url);
}

function guessState(text, url) {
  const domain = String(url || "").toLowerCase();
  if (domain.includes("jnanabhumi") || /andhra pradesh|\bap\b/i.test(text)) return "Andhra Pradesh";
  if (domain.includes("telangana") || /telangana/i.test(text)) return "Telangana";
  if (/andaman\s*(?:and|&)\s*nicobar|port blair/i.test(text)) return "Andaman and Nicobar Islands";
  const found = INDIA_STATE_OPTIONS.find((s) => new RegExp(`\\b${escapeRegex(s.label)}\\b`, "i").test(text));
  return found?.label || "National";
}

function guessEducation(text) {
  const t = norm(text);
  const out = [];
  if (/school|class|pre matric|prematric/.test(t)) out.push("school");
  if (/intermediate|senior secondary|10 2|class xii|inter/.test(t)) out.push("intermediate");
  if (/degree|graduation|graduate|under graduate|undergraduate|ug|b a|b sc|b com/.test(t)) out.push("degree");
  if (/engineering|btech|b e |technology|technical|polytechnic|diploma|iti/.test(t)) out.push("engineering");
  if (/post graduate|postgraduate|post graduation|pg|masters|m tech|m phil|ph d|phd|post doctoral/.test(t)) out.push("pg");
  return out.length ? [...new Set(out)].join(", ") : "any";
}

function guessCategories(text) {
  const t = norm(text);
  const out = [];
  if (/general|open category/.test(t)) out.push("general");
  if (/\bsc\b|scheduled caste/.test(t)) out.push("sc");
  if (/\bst\b|scheduled tribe/.test(t)) out.push("st");
  if (/\bobc\b|other backward class|backward class|\bbc\b/.test(t)) out.push("obc");
  if (/ews|economically weaker/.test(t)) out.push("ews");
  if (/minority|muslim|christian|sikh|buddhist|jain|parsi/.test(t)) out.push("minority");
  if (/kapu/.test(t)) out.push("kapu");
  return out.length ? [...new Set(out)].join(", ") : "general, sc, st, obc, ews, minority";
}

function guessGender(text) {
  const t = norm(text);
  if (/girl|female|women|woman/.test(t)) return "female";
  if (/boy|male/.test(t)) return "male";
  return "any";
}

function guessAmount(text, sections = {}) {
  const valueText = [pickSection(sections, ["value_of_scholarship"]), pickSection(sections, ["payment_and_mode_of_disbursal_of_scholarship", "payment_and_mode_of_disbursal"]), text].filter(Boolean).join(" ");
  const amountMatch = valueText.match(/(?:₹|rs\.?)\s*([0-9][0-9,]*(?:\.\d+)?)/i);
  if (!amountMatch) return "Varies as per official rules";

  const amount = `Rs.${amountMatch[1].replace(/,/g, "")}`;
  const frequency = /per\s+month|monthly|p\.m\./i.test(valueText) ? " per month" : /per\s+annum|per\s+year|annually|yearly|p\.a\./i.test(valueText) ? " per year" : "";
  const duration = /ten\s+months|10\s+months/i.test(valueText) ? " for 10 months" : "";
  return `${amount}${frequency}${duration}`;
}

function guessIncome(text, sections = {}) {
  const incomeText = [pickSection(sections, ["eligibility_criteria"]), pickSection(sections, ["procedure_for_applying"]), text].filter(Boolean).join(" ");
  const hit = incomeText.match(/(?:income\s+limit|annual\s+income|family\s+income|max(?:imum)?\s+income)[^₹\d]{0,100}(?:₹|rs\.?\s?)?([0-9][0-9,]{3,})/i);
  return hit ? hit[1].replace(/,/g, "") : "0";
}

function guessDeadlineDate(text) {
  return date(findDate(text));
}

function guessEligibility(text, sections = {}) {
  const eligibility = pickSection(sections, ["eligibility_criteria"]);
  const objective = pickSection(sections, ["objective_and_scope"]);
  const renewal = pickSection(sections, ["duration_and_renewal_of_awards", "duration_and_renewal"]);
  const procedure = pickSection(sections, ["procedure_for_applying"]);
  const docs = extractRequiredDocuments(procedure);
  const exclusions = extractExclusions(eligibility || text);
  const pieces = [];

  if (objective) pieces.push(objective.slice(0, 280));
  if (eligibility) pieces.push(eligibility.slice(0, 650));
  else pieces.push(snippetAround(text, /(eligib|eligible|who can apply|criteria|student)/i, 700) || clean(text).replace(/https?:\/\/\S+/g, "").slice(0, 700));
  if (exclusions.length) pieces.push(`Exclusions: ${exclusions.slice(0, 4).join("; ")}.`);
  if (docs.length) pieces.push(`Required documents: ${docs.slice(0, 8).join("; ")}.`);
  if (renewal) pieces.push(`Renewal: ${renewal.slice(0, 220)}`);

  return clean(pieces.join(" ")).slice(0, 1150) || "Verify eligibility on official portal before applying.";
}

function guessIncomeNote(text, sections = {}) {
  const procedure = pickSection(sections, ["procedure_for_applying"]);
  const eligibility = pickSection(sections, ["eligibility_criteria"]);
  const combined = [eligibility, procedure, text].filter(Boolean).join(" ");
  const incomeSnippet = snippetAround(combined, /(income\s+limit|annual income|family income|max(?:imum)? income)/i, 450);

  if (incomeSnippet && /[0-9][0-9,]{3,}/.test(incomeSnippet)) return incomeSnippet;
  if (/non[-\s]?creamy layer/i.test(combined)) {
    const declaration = /income declaration|pay slip|affidavit/i.test(combined) ? " Income declaration/pay slip is also required as per the guideline." : "";
    return `OBC non-creamy layer requirement found. No numeric income cap was detected in the extracted guideline.${declaration}`;
  }
  if (/income declaration|pay slip|affidavit/i.test(combined)) return "Income declaration/pay slip requirement found, but no numeric income cap was detected in the extracted guideline.";
  return "Verify income rules on official portal.";
}

function extractRequiredDocuments(text) {
  const raw = clean(text);
  if (!raw) return [];
  const candidates = [
    ["Application form", /application form/i],
    ["Passport-size photograph with student signature", /passport[- ]size photograph/i],
    ["Class X/XII/Diploma/Degree certificates", /class\s*x|class\s*xii|diploma|degree/i],
    ["Caste certificate", /caste certificate/i],
    ["Non-creamy layer certificate", /non[-\s]?creamy layer certificate/i],
    ["Income declaration or pay slip", /income declaration|pay slip|affidavit/i],
    ["Previous scholarship acknowledgement for renewal", /acknowledgement.*scholarship|renewal application/i],
    ["Marks statement countersigned by institution", /marks statement|counter signed|countersigned/i],
    ["Aadhaar card", /aadhaar/i],
    ["Bank passbook first page", /bank pass ?book|passbook/i]
  ];
  return candidates.filter(([, regex]) => regex.test(raw)).map(([label]) => label);
}

function extractExclusions(text) {
  const cleanText = clean(text);
  const out = [];
  if (/distance education/i.test(cleanText)) out.push("distance education courses");
  if (/funded by the Central Government|funded by.*State Government|UT Administration/i.test(cleanText)) out.push("courses funded by Central/State/UT government");
  if (/repeating the same stage|different subject\/stream/i.test(cleanText)) out.push("repeating the same education level in another subject/stream");
  if (/another professional course|second professional/i.test(cleanText)) out.push("second professional course after completing one professional course");
  if (/fails in a class for more than one year/i.test(cleanText)) out.push("scholarship stops if student fails for more than one year");
  return out;
}

function flattenEligibility(value) {
  if (!value || typeof value !== "object") return "";
  return Object.entries(value).map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(", ") : val}`).join("; ");
}

function snippetAround(text, regex, len) {
  const cleanText = clean(text).replace(/https?:\/\/\S+/g, "");
  const match = cleanText.search(regex);
  if (match < 0) return "";
  return cleanText.slice(Math.max(0, match - 80), match + len);
}

function sourceNameFromUrl(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    if (host.includes("scholarships.gov.in")) return "National Scholarship Portal";
    if (host.includes("aicte")) return "AICTE";
    if (host.includes("jnanabhumi")) return "AP Jnanabhumi";
    if (host.includes("telanganaepass")) return "Telangana ePASS";
    if (host.includes("ugc")) return "UGC";
    if (host.includes("andaman") || host.includes("and.nic")) return "Andaman and Nicobar Administration";
    return host.split(".").slice(0, 2).join(".");
  } catch {
    return "Official Portal";
  }
}

function clearWorkspace() {
  setValue(els.linkUrl, "");
  setValue(els.fallbackText, "");
  setValue(els.source, "");
  setValue(els.url, "");
  setValue(els.input, "");
  if (els.pdfFile) els.pdfFile.value = "";
  candidates = [];
  render();
  setMessage("Cleared.");
}

function duplicateOf(item) {
  const n = normName(item.name), u = normalizeUrl(item.link);
  return existing.find((s) => (n && normName(s.name) === n) || (u && normalizeUrl(s.link || s.sourceUrl) === u));
}

function resolveState(v) {
  const t = norm(v);
  const found = INDIA_STATE_OPTIONS.find((s) => s.slug === slug(t) || norm(s.label) === t || (` ${t} `).includes(` ${norm(s.label)} `) || (` ${t} `).includes(` ${s.slug.replaceAll("-", " ")} `));
  return found?.slug || "national";
}

function line(text, label) {
  return String(text || "").match(new RegExp(`^\\s*${label}\\s*:?\\s*(.+)$`, "im"))?.[1]?.trim() || "";
}

function findUrl(text) {
  return String(text || "").match(/https?:\/\/\S+/)?.[0]?.replace(/[).,]+$/, "") || "";
}

function findDate(text) {
  return String(text || "").match(/20\d{2}-[01]\d-[0-3]\d/)?.[0] || String(text || "").match(/[0-3]?\d[/-][01]?\d[/-]20\d{2}/)?.[0] || "";
}

function date(v) {
  const s = String(v || "").trim();
  if (!s || /yyyy-mm-dd/i.test(s)) return "";
  const iso = s.match(/20\d{2}-[01]\d-[0-3]\d/)?.[0];
  if (iso) return iso;
  const m = s.match(/([0-3]?\d)[/-]([01]?\d)[/-](20\d{2})/);
  return m ? `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}` : "";
}

function past(v) {
  const d = new Date(`${v}T23:59:59`);
  return !Number.isNaN(d.getTime()) && d.getTime() < Date.now();
}

function list(v, fb) {
  const arr = Array.isArray(v) ? v : String(v || "").split(/[,+]/);
  const out = arr.map((x) => cleanSlug(x)).filter(Boolean);
  return out.length ? [...new Set(out)] : fb;
}

function disability(v) {
  const s = cleanSlug(v);
  if (s === "yes" || s.includes("pwd") || s.includes("disabled") || s.includes("disability")) return "yes";
  if (s === "no") return "no";
  return "any";
}

function normalizeUrl(v) {
  try {
    const u = new URL(String(v || "").trim());
    return ["http:", "https:"].includes(u.protocol) ? u.href : "";
  } catch {
    return "";
  }
}

function isValidUrl(v) {
  return Boolean(normalizeUrl(v));
}

function isOnlyUrl(v) {
  const text = clean(v);
  return /^https?:\/\/\S+$/i.test(text) || /^www\.\S+$/i.test(text);
}

function normName(v) {
  return norm(v).replace(/scholarship|scheme|yojana/g, "").replace(/\s+/g, " ").trim();
}

function norm(v) {
  return String(v || "").toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function slug(v) {
  return norm(v).replace(/\s+/g, "-");
}

function cleanSlug(v) {
  return String(v || "").trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

function clean(v) {
  return String(v || "").replace(/\s+/g, " ").trim();
}

function titleCase(v) {
  return clean(v).replace(/\b[a-z]/g, (char) => char.toUpperCase());
}

function num(v) {
  const n = Number(String(v || "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, Number.isFinite(v) ? v : min));
}

function tryJson(v) {
  try {
    return JSON.parse(v);
  } catch {
    return null;
  }
}

function value(el) {
  return el?.value?.trim() || "";
}

function setValue(el, v) {
  if (el) el.value = v || "";
}

function show(el, v) {
  if (el) el.textContent = v || "";
}

function setMessage(v, bad = false) {
  show(els.message, v);
  if (els.message) els.message.style.color = bad ? "#b42318" : "";
}

function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeHtml(v) {
  return String(v || "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}
