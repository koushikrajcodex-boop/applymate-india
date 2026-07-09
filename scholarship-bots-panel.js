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
const TESSERACT_URL = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
const BULK_LIMIT = 15;
const OCR_PAGE_LIMIT = 8;

let currentUser = null;
let existing = [];
let candidates = [];
let adminReady = false;
let pdfJsPromise = null;
let tesseractPromise = null;

const els = {
  email: $("botPanelAdminEmail"),
  locked: $("botPanelLocked"),
  content: $("botPanelContent"),
  coverage: $("botPanelCoverage"),
  linkUrl: $("linkAnalyzerUrl"),
  bulkUrls: $("linkBulkUrls"),
  pdfFile: $("linkPdfFile"),
  fallbackText: $("linkFallbackText"),
  source: $("botPanelSource"),
  url: $("botPanelUrl"),
  input: $("botPanelInput"),
  message: $("botPanelMessage"),
  results: $("botPanelResults"),
  refresh: $("botPanelRefreshBtn"),
  fetchLink: $("linkAnalyzeBtn"),
  analyzeBulk: $("linkBulkAnalyzeBtn"),
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
  els.analyzeBulk?.addEventListener("click", analyzeBulkLinks);
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
    show(els.coverage, `${existing.length} total records • ${active} active verified • ${uniqueSources} unique sources • advanced analyzer ready`);
    setMessage("Coverage loaded. Paste a scholarship link, bulk links, upload a PDF, or paste official text.");
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
  setMessage(isLikelyPdfUrl(url) ? "Reading official PDF link..." : "Reading official scholarship page...");

  try {
    const pageText = await fetchLinkReadableText(url);
    const candidate = buildScholarshipCandidate({ url, text: pageText, sourceName: sourceNameFromUrl(url), origin: isLikelyPdfUrl(url) ? "pdf-url" : "web-url" });
    setValue(els.fallbackText, pageText.slice(0, 16000));
    setGeneratedCandidates([candidate]);
    setMessage(`Analyzed ${candidate.documentType}. Review confidence, missing fields, and duplicate/version hints before importing.`);
  } catch (error) {
    console.warn("Link fetch/extraction failed", error);
    const candidate = buildWeakCandidate({ url, sourceName: sourceNameFromUrl(url), reason: getBlockedMessage(url, error) });
    setGeneratedCandidates([candidate]);
    setMessage(getBlockedMessage(url, error), true);
  }
}

async function analyzeBulkLinks() {
  const urls = extractUrls(value(els.bulkUrls)).slice(0, BULK_LIMIT);
  if (!urls.length) return setMessage("Paste one or more official URLs in Bulk Analyze first.", true);

  const analyzed = [];
  setMessage(`Bulk analyzing ${urls.length} links. Blocked links will become review drafts.`);

  for (let index = 0; index < urls.length; index += 1) {
    const url = urls[index];
    setMessage(`Bulk analyzing ${index + 1}/${urls.length}: ${hostLabel(url)}`);
    try {
      const pageText = await fetchLinkReadableText(url);
      analyzed.push(buildScholarshipCandidate({ url, text: pageText, sourceName: sourceNameFromUrl(url), origin: isLikelyPdfUrl(url) ? "pdf-url" : "web-url" }));
    } catch (error) {
      console.warn("Bulk link failed", url, error);
      analyzed.push(buildWeakCandidate({ url, sourceName: sourceNameFromUrl(url), reason: getBlockedMessage(url, error) }));
    }
  }

  setGeneratedCandidates(analyzed);
  setMessage(`Bulk finished. ${analyzed.length} records generated. Publish only the high-confidence ones.`);
}

async function analyzeUploadedPdf() {
  const file = els.pdfFile?.files?.[0];
  if (!file) return setMessage("Choose an official PDF file first.", true);
  if (!/\.pdf$/i.test(file.name) && file.type !== "application/pdf") return setMessage("Upload a PDF file only.", true);

  const url = normalizeUrl(value(els.linkUrl) || value(els.url));
  const sourceName = value(els.source) || sourceNameFromUrl(url) || file.name.replace(/\.pdf$/i, " PDF");
  setMessage("Reading uploaded PDF text...");

  try {
    const arrayBuffer = await file.arrayBuffer();
    let pageText = await pdfToReadableText(arrayBuffer);
    let quality = detectPdfTextQuality(pageText, countPdfPagesFromText(pageText));

    if (quality === "scanned_or_poor_text_pdf" || isWeakPageText(pageText, url)) {
      setMessage("PDF looks scanned/low-text. Trying browser OCR for first pages...");
      const ocrText = await ocrPdfPages(arrayBuffer, OCR_PAGE_LIMIT);
      if (clean(ocrText).length > clean(pageText).length) {
        pageText = cleanGuidelineText(`${pageText}\n\n--- OCR TEXT ---\n${ocrText}`);
        quality = "ocr_text_pdf";
      }
    }

    if (isWeakPageText(pageText, url)) throw new Error(quality);
    if (url) setValue(els.url, url);
    setValue(els.source, sourceName);
    setValue(els.fallbackText, pageText.slice(0, 20000));
    setGeneratedCandidates([buildScholarshipCandidate({ url, text: pageText, sourceName, origin: quality })]);
    setMessage(`PDF analyzed successfully (${quality.replaceAll("_", " ")}). Check confidence and missing fields.`);
  } catch (error) {
    console.error(error);
    setMessage("Could not read enough text from this PDF. Try OCR externally, then paste the text in the fallback box.", true);
  }
}

function analyzeFallbackText() {
  const url = normalizeUrl(value(els.linkUrl) || value(els.url));
  const text = value(els.fallbackText);
  if (!text || text.length < 30) return setMessage("Paste official page/PDF text first.", true);
  const sourceName = value(els.source) || sourceNameFromUrl(url) || "Official Portal";
  setValue(els.source, sourceName);
  if (url) setValue(els.url, url);
  setGeneratedCandidates([buildScholarshipCandidate({ url, text, sourceName, origin: "pasted-text" })]);
  setMessage("Official text analyzed. Guideline sections, summary, confidence, documents, and missing fields are ready.");
}

function setGeneratedCandidates(records) {
  const editable = records.map((item) => toEditableJson(classify(item)));
  setValue(els.input, JSON.stringify({ generatedBy: "ApplyMate Advanced Scholarship Analyzer", generatedOn: today, candidates: editable }, null, 2));
  analyzeGeneratedFormat();
}

async function fetchLinkReadableText(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 18000);
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

  return cleanGuidelineText(pages.join("\n\n")).slice(0, 80000);
}

async function loadTesseract() {
  if (window.Tesseract) return window.Tesseract;
  if (!tesseractPromise) {
    tesseractPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = TESSERACT_URL;
      script.async = true;
      script.onload = () => window.Tesseract ? resolve(window.Tesseract) : reject(new Error("Tesseract did not load"));
      script.onerror = () => reject(new Error("OCR library failed to load"));
      document.head.appendChild(script);
    });
  }
  return tesseractPromise;
}

async function ocrPdfPages(arrayBuffer, maxPages = OCR_PAGE_LIMIT) {
  const [pdfjsLib, Tesseract] = await Promise.all([loadPdfJs(), loadTesseract()]);
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer.slice(0)) });
  const pdf = await loadingTask.promise;
  const texts = [];
  const pagesToRead = Math.min(pdf.numPages, maxPages);

  for (let pageNumber = 1; pageNumber <= pagesToRead; pageNumber += 1) {
    setMessage(`OCR reading page ${pageNumber}/${pagesToRead}...`);
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1.45 });
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { willReadFrequently: true });
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    await page.render({ canvasContext: context, viewport }).promise;
    const result = await Tesseract.recognize(canvas, "eng");
    texts.push(`--- OCR Page ${pageNumber} ---\n${result?.data?.text || ""}`);
    canvas.width = 0;
    canvas.height = 0;
  }

  return cleanGuidelineText(texts.join("\n\n"));
}

function htmlToReadableText(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(String(html || ""), "text/html");
  doc.querySelectorAll("script,style,noscript,svg,iframe,nav,footer,header,aside").forEach((node) => node.remove());
  const pieces = [
    doc.querySelector("title")?.textContent || "",
    doc.querySelector('meta[name="description"]')?.getAttribute("content") || "",
    ...Array.from(doc.querySelectorAll("h1,h2,h3,h4,th,td,p,li,span,strong,article,section")).map((node) => node.textContent || "")
  ];
  return cleanGuidelineText(pieces.join("\n")).slice(0, 50000);
}

function buildScholarshipCandidate({ url, text, sourceName, origin = "text" }) {
  const preparedText = cleanGuidelineText(text || "");
  const sections = splitGuidelineSections(preparedText);
  const documentType = detectDocumentType(preparedText, url, origin);
  const documents = extractRequiredDocuments(pickSection(sections, ["procedure_for_applying", "documents_required", "how_to_apply"]) || preparedText);
  const exclusions = extractExclusions(pickSection(sections, ["eligibility_criteria"]) || preparedText);
  const benefitDetails = extractBenefitDetails(preparedText, sections);
  const applicationProcess = guessApplicationProcess(preparedText, sections);
  const renewalRules = guessRenewalRules(sections);
  const eligibilityNote = guessEligibility(preparedText, sections, documents, exclusions, renewalRules);
  const incomeNote = guessIncomeNote(preparedText, sections);
  const name = guessTitle(preparedText, url, sections);

  return normalize({
    name,
    state: guessState(preparedText, url),
    amount: benefitDetails.displayAmount,
    maxIncome: guessIncome(preparedText, sections),
    minPercentage: guessPercentage(preparedText),
    deadline: guessDeadlineText(preparedText),
    deadlineDate: guessDeadlineDate(preparedText),
    link: url,
    sourceUrl: url,
    education: guessEducation(preparedText),
    categories: guessCategories(preparedText),
    genders: guessGender(preparedText),
    disability: guessDisability(preparedText),
    eligibilityNote,
    incomeNote,
    sourceName: sourceName || sourceNameFromUrl(url) || "Official Portal",
    requiredDocuments: documents,
    exclusions,
    studentSummary: buildStudentSummary({ name, eligibilityNote, benefitDetails, incomeNote, applicationProcess }),
    benefitDetails,
    applicationProcess,
    renewalRules,
    documentType,
    sourceType: origin,
    rawSectionNames: Object.keys(sections)
  });
}

function buildWeakCandidate({ url, sourceName, reason }) {
  return normalize({
    name: placeholderTitle(url),
    state: guessState("", url),
    amount: "Varies as per official rules",
    maxIncome: 0,
    minPercentage: 0,
    deadline: "Check official portal",
    deadlineDate: "",
    link: url,
    sourceUrl: url,
    education: ["any"],
    categories: ["general", "sc", "st", "obc", "ews", "minority"],
    genders: ["any"],
    disability: "any",
    eligibilityNote: weakEligibilityText(url),
    incomeNote: "Paste exact official income rule from the scheme page/PDF before importing.",
    sourceName: sourceName || sourceNameFromUrl(url) || "Official Portal",
    requiredDocuments: [],
    exclusions: [],
    studentSummary: reason || "Analyzer could not read this source directly. Paste official text or upload the PDF.",
    benefitDetails: { displayAmount: "Varies as per official rules" },
    applicationProcess: "Verify application process on official portal.",
    renewalRules: "Verify renewal rules on official portal.",
    documentType: isLikelyPdfUrl(url) ? "blocked_pdf" : "blocked_or_dynamic_page",
    sourceType: "blocked"
  });
}

function normalize(item) {
  const state = resolveState(item.state || "national");
  return {
    name: clean(item.name).slice(0, 200),
    state,
    stateLabel: getStateLabel(state),
    status: "draft",
    amount: clean(item.amount || "Varies as per official rules").slice(0, 160),
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
    eligibilityNote: clean(item.eligibilityNote).slice(0, 1400),
    incomeNote: clean(item.incomeNote).slice(0, 900),
    priority: clamp(num(item.priority || 60), 0, 100),
    sourceName: clean(item.sourceName || "Official Portal").slice(0, 140),
    requiredDocuments: arrayText(item.requiredDocuments).slice(0, 30),
    exclusions: arrayText(item.exclusions).slice(0, 15),
    studentSummary: clean(item.studentSummary || "").slice(0, 900),
    benefitDetails: item.benefitDetails || {},
    applicationProcess: clean(item.applicationProcess || "").slice(0, 900),
    renewalRules: clean(item.renewalRules || "").slice(0, 900),
    documentType: clean(item.documentType || "scholarship_source"),
    sourceType: clean(item.sourceType || "analyzer"),
    rawSectionNames: arrayText(item.rawSectionNames).slice(0, 30),
    applicationWindow: "open",
    academicYear: String(new Date().getFullYear()),
    verifiedOn: today,
    verificationNote: `Checked through Advanced Scholarship Analyzer on ${today}. Verify official source before publishing widely.`,
    lastChecked: today
  };
}

function classify(item) {
  const enriched = enrichCandidate(item);
  const errors = validate(enriched, true);
  const looseErrors = validate(enriched, false);
  let decision = "review";

  if (enriched.duplicateRisk === "exact" || enriched.duplicateRisk === "same_url") decision = "skipDuplicate";
  else if (enriched.deadlineDate && past(enriched.deadlineDate)) decision = "skipExpired";
  else if (!errors.length && enriched.confidence.overall >= 90 && !enriched.sourceSafety.severity) decision = "autoActive";
  else if (!looseErrors.some((x) => !x.toLowerCase().includes("deadline")) && enriched.confidence.overall >= 68 && isValidUrl(enriched.link)) decision = "autoDraft";
  else decision = "review";

  return { ...enriched, errors, score: enriched.confidence.overall, decision };
}

function enrichCandidate(item) {
  const sourceSafety = assessSourceSafety(item.link);
  const duplicate = duplicateOf(item);
  const versionInfo = findVersionInfo(item, duplicate?.record);
  const missingFields = getMissingFields(item, sourceSafety);
  const confidence = getConfidenceBreakdown(item, missingFields, sourceSafety, duplicate);
  const warnings = buildWarnings(item, missingFields, sourceSafety, duplicate, versionInfo);

  return {
    ...item,
    sourceSafety,
    missingFields,
    confidence,
    warnings,
    duplicateRisk: duplicate?.risk || "low",
    duplicateName: duplicate?.record?.name || "",
    duplicateReason: duplicate?.reason || "",
    versionInfo
  };
}

function validate(item, strictDate) {
  const errors = [];
  if (!item.name || item.name.length < 4 || /YYYY-MM-DD|needed|specific scheme|details needed/i.test(item.name)) errors.push("Scholarship name needs exact official scheme name.");
  if (!isValidUrl(item.link)) errors.push("Missing valid official link.");
  if (strictDate && !item.deadlineDate) errors.push("Missing YYYY-MM-DD deadline date.");
  if (item.deadlineDate && past(item.deadlineDate)) errors.push("Deadline expired.");
  if (!item.eligibilityNote || item.eligibilityNote.length < 40 || /blocked|paste|needed|dynamic|filter/i.test(item.eligibilityNote)) errors.push("Eligibility needs official scheme text.");
  if (!item.incomeNote || item.incomeNote.length < 6 || /paste|needed|blocked/i.test(item.incomeNote)) errors.push("Income note needs official scheme text.");
  if (item.sourceSafety.severity === "high") errors.push("Source domain is suspicious; verify manually before import.");
  return errors;
}

function getMissingFields(item, sourceSafety) {
  const missing = [];
  if (!isValidUrl(item.link)) missing.push("official link");
  if (!item.name || /needed|details needed/i.test(item.name)) missing.push("exact scheme name");
  if (!item.deadlineDate) missing.push("deadline date");
  if (!item.amount || /varies/i.test(item.amount)) missing.push("exact amount");
  if (!item.eligibilityNote || item.eligibilityNote.length < 80 || /paste|blocked|needed/i.test(item.eligibilityNote)) missing.push("detailed eligibility");
  if (!item.incomeNote || /paste|verify income/i.test(item.incomeNote)) missing.push("income rule");
  if (!item.requiredDocuments.length) missing.push("required documents");
  if (sourceSafety.level !== "official") missing.push("official source verification");
  return missing;
}

function getConfidenceBreakdown(item, missingFields, sourceSafety, duplicate) {
  const fieldScores = {
    name: item.name && !/needed|details needed/i.test(item.name) ? 95 : 25,
    source: isValidUrl(item.link) ? (sourceSafety.level === "official" ? 100 : sourceSafety.level === "trusted" ? 82 : 55) : 0,
    eligibility: item.eligibilityNote.length >= 250 ? 95 : item.eligibilityNote.length >= 90 ? 75 : 30,
    amount: item.amount && !/varies/i.test(item.amount) ? 95 : 45,
    deadline: item.deadlineDate ? (past(item.deadlineDate) ? 20 : 95) : 35,
    income: item.incomeNote && !/paste|verify income/i.test(item.incomeNote) ? 85 : item.maxIncome ? 80 : 45,
    documents: item.requiredDocuments.length >= 4 ? 95 : item.requiredDocuments.length ? 70 : 30,
    duplicate: duplicate?.risk === "exact" || duplicate?.risk === "same_url" ? 10 : duplicate?.risk === "possible_update" ? 65 : 95
  };

  let overall = Math.round((fieldScores.name * 1.2 + fieldScores.source * 1.2 + fieldScores.eligibility * 1.4 + fieldScores.amount + fieldScores.deadline * 1.2 + fieldScores.income + fieldScores.documents + fieldScores.duplicate * 0.8) / 8.8);
  overall -= Math.min(20, missingFields.length * 3);
  if (sourceSafety.severity === "high") overall -= 25;
  if (sourceSafety.severity === "medium") overall -= 10;
  overall = clamp(overall, 0, 100);
  return { ...fieldScores, overall };
}

function buildWarnings(item, missingFields, sourceSafety, duplicate, versionInfo) {
  const warnings = [];
  if (missingFields.length) warnings.push(`Missing: ${missingFields.join(", ")}`);
  if (sourceSafety.message) warnings.push(sourceSafety.message);
  if (duplicate?.risk === "exact" || duplicate?.risk === "same_url") warnings.push(`Duplicate found: ${duplicate.record.name}`);
  if (duplicate?.risk === "possible_update") warnings.push(`Possible updated version of: ${duplicate.record.name}`);
  if (versionInfo?.message) warnings.push(versionInfo.message);
  if (item.deadlineDate && past(item.deadlineDate)) warnings.push("Deadline is expired.");
  if (/scanned|ocr/i.test(item.sourceType)) warnings.push("OCR text can contain mistakes. Review carefully before importing.");
  return warnings;
}

function assessSourceSafety(url) {
  if (!isValidUrl(url)) return { level: "missing", severity: "medium", message: "No official URL found." };
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    const official = /(^|\.)(gov\.in|nic\.in|ac\.in)$/i.test(host) || /scholarships\.gov\.in|aicte-india\.org|ugc\.gov\.in|education\.gov\.in|tribal\.nic\.in|minorityaffairs\.gov\.in/i.test(host);
    const trusted = official || /buddy4study\.com|vidyalakshmi\.co\.in/i.test(host);
    if (parsed.protocol !== "https:") return { level: trusted ? "trusted" : "unknown", severity: "medium", message: "URL is not HTTPS. Verify source before publishing." };
    if (official) return { level: "official", severity: "", message: "Official/trusted government-style source detected." };
    if (trusted) return { level: "trusted", severity: "", message: "Trusted scholarship portal detected, but verify against official source if possible." };
    if (/\.in$|\.org$|\.edu$/.test(host)) return { level: "unknown", severity: "medium", message: "Source is not recognized as official. Keep as draft until verified." };
    return { level: "unknown", severity: "high", message: "Unrecognized domain. Do not auto-publish without manual verification." };
  } catch {
    return { level: "invalid", severity: "high", message: "Invalid URL." };
  }
}

function duplicateOf(item) {
  const n = normName(item.name);
  const u = normalizeUrl(item.link);
  const yearless = stripYear(n);
  let best = null;

  for (const record of existing) {
    const recordUrl = normalizeUrl(record.link || record.sourceUrl);
    const recordName = normName(record.name || record.title || "");
    const recordYearless = stripYear(recordName);

    if (u && recordUrl && u === recordUrl) return { risk: "same_url", record, reason: "Same official URL already exists." };
    if (n && recordName && n === recordName) return { risk: "exact", record, reason: "Same normalized scholarship name already exists." };
    if (yearless && recordYearless && yearless === recordYearless) best = { risk: "possible_update", record, reason: "Same scheme name with different or missing year." };
  }

  return best;
}

function findVersionInfo(item, duplicateRecord) {
  const itemYear = extractYear(`${item.name} ${item.deadlineDate} ${item.academicYear}`);
  const oldYear = duplicateRecord ? extractYear(`${duplicateRecord.name || ""} ${duplicateRecord.deadlineDate || ""} ${duplicateRecord.academicYear || ""}`) : "";
  if (duplicateRecord && itemYear && oldYear && itemYear !== oldYear) {
    return { type: "new_version", message: `Looks like a new ${itemYear} version of existing ${oldYear} record. Prefer updating/versioning, not duplicate publishing.` };
  }
  if (duplicateRecord) return { type: "possible_duplicate", message: "Existing similar scholarship found. Compare before importing." };
  return { type: "new_record", message: "No close duplicate detected." };
}

function analyzeGeneratedFormat() {
  const raw = value(els.input);
  candidates = parse(raw).map(classify);
  render();
  const active = candidates.filter((item) => item.decision === "autoActive").length;
  const draft = candidates.filter((item) => item.decision === "autoDraft").length;
  const review = candidates.filter((item) => item.decision === "review").length;
  setMessage(candidates.length ? `Analyzed ${candidates.length}. Auto Active: ${active}. Auto Draft: ${draft}. Review: ${review}.` : "Generate or paste a format first.", !candidates.length);
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
  const benefit = item.benefit || item.benefitDetails || {};
  const eligibility = item.eligibility || {};
  const amount = item.amount || benefit.displayAmount || (benefit.amount ? `${benefit.amount}${benefit.frequency ? ` ${benefit.frequency}` : ""}` : "");

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
    requiredDocuments: item.requiredDocuments || item.documents || [],
    exclusions: item.exclusions || [],
    studentSummary: item.studentSummary || item.summary || "",
    benefitDetails: benefit,
    applicationProcess: item.applicationProcess || "",
    renewalRules: item.renewalRules || "",
    documentType: item.documentType || "edited_json",
    sourceType: item.sourceType || "edited_json",
    rawSectionNames: item.rawSectionNames || [],
    priority: clamp(num(item.priority || item.confidenceScore || item.score || 60), 0, 100)
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
    eligibilityNote: safeField(line(block, "eligibility") || block.slice(0, 900) || "Verify eligibility on official portal before applying.", "eligibility", link),
    incomeNote: safeField(line(block, "income note") || line(block, "income") || "Verify income rules on official portal.", "income", link),
    sourceName: clean(line(block, "source") || value(els.source) || sourceNameFromUrl(link) || "Official Portal"),
    requiredDocuments: extractRequiredDocuments(block),
    studentSummary: "",
    benefitDetails: { displayAmount: clean(line(block, "amount") || "Varies as per official rules") },
    applicationProcess: "",
    renewalRules: "",
    documentType: "legacy_text_format",
    sourceType: "edited_text",
    priority: 60
  });
}

function render() {
  if (!els.results) return;
  if (!candidates.length) {
    els.results.innerHTML = "<p class='mini-note'>No results yet.</p>";
    return;
  }

  els.results.innerHTML = candidates.map((item, index) => {
    const statusClass = item.decision === "autoActive" ? "good" : item.decision === "autoDraft" ? "warn" : "bad";
    const missing = item.missingFields.length ? `<p class="bot-mini"><strong>Missing:</strong> ${escapeHtml(item.missingFields.join(", "))}</p>` : "<p class='bot-mini'><strong>Missing:</strong> None critical detected.</p>";
    const docs = item.requiredDocuments.length ? `<p class="bot-mini"><strong>Documents:</strong> ${escapeHtml(item.requiredDocuments.slice(0, 8).join(", "))}</p>` : "";
    const warnings = item.warnings.length ? `<ul>${item.warnings.slice(0, 6).map((e) => `<li>${escapeHtml(e)}</li>`).join("")}</ul>` : "<p class='bot-mini'>No major warnings.</p>";
    const confidence = item.confidence || {};
    return `<article class="bot-card">
      <span class="bot-status ${statusClass}">${escapeHtml(item.decision)} • ${item.score}%</span>
      <h3>${index + 1}. ${escapeHtml(item.name)}</h3>
      <p class="bot-mini"><strong>State:</strong> ${escapeHtml(item.stateLabel)} • <strong>Deadline:</strong> ${escapeHtml(item.deadlineDate || "missing")} • <strong>Type:</strong> ${escapeHtml(item.documentType)}</p>
      <p class="bot-mini"><strong>Amount:</strong> ${escapeHtml(item.amount)} • <strong>Category:</strong> ${escapeHtml(item.categories.join(", "))}</p>
      <p class="bot-mini"><strong>Source:</strong> ${escapeHtml(item.sourceName)} ${item.link ? `• <a href="${escapeHtml(item.link)}" target="_blank" rel="noopener noreferrer">official link</a>` : ""}</p>
      <div class="score-grid">
        ${scoreChip("Name", confidence.name)}${scoreChip("Eligibility", confidence.eligibility)}${scoreChip("Amount", confidence.amount)}${scoreChip("Deadline", confidence.deadline)}${scoreChip("Income", confidence.income)}${scoreChip("Docs", confidence.documents)}${scoreChip("Source", confidence.source)}${scoreChip("Duplicate", confidence.duplicate)}
      </div>
      ${missing}
      <p class="bot-mini"><strong>Student summary:</strong> ${escapeHtml(item.studentSummary || "Summary not generated.")}</p>
      <p class="bot-mini"><strong>Eligibility:</strong> ${escapeHtml(item.eligibilityNote)}</p>
      ${docs}
      <p class="bot-mini"><strong>Version/Duplicate:</strong> ${escapeHtml(item.versionInfo?.message || "No version info.")}</p>
      ${warnings}
    </article>`;
  }).join("");
}

function scoreChip(label, score) {
  const value = Number.isFinite(score) ? score : 0;
  const css = value >= 85 ? "good" : value >= 60 ? "warn" : "bad";
  return `<span class="score-chip ${css}">${escapeHtml(label)} ${value}%</span>`;
}

async function importRecords(mode) {
  if (!adminReady) return setMessage("Admin access required for Firestore import. Login with approved admin email.", true);
  let records = [];
  let status = "draft";

  if (mode === "active") {
    records = candidates.filter((x) => x.decision === "autoActive");
    status = "active";
  } else if (mode === "draft") {
    records = candidates.filter((x) => ["autoDraft", "review"].includes(x.decision) && !["skipDuplicate", "skipExpired"].includes(x.decision));
  } else {
    records = candidates.filter((x) => ["autoActive", "autoDraft", "review"].includes(x.decision));
  }

  if (!records.length) return setMessage("No records match this import mode.", true);
  try {
    setMessage(`Importing ${records.length} records...`);
    for (const item of records) await addDoc(collection(db, "scholarships"), { ...firestoreRecord(item, status), createdAt: serverTimestamp(), updatedAt: serverTimestamp(), createdBy: currentUser.email || currentUser.uid, updatedBy: currentUser.email || currentUser.uid });
    setMessage(`Imported ${records.length} records as ${status}.`);
    await loadCoverage();
  } catch (error) {
    console.error(error);
    setMessage(`Import failed: ${error.message}. If permission-denied, deploy updated Firestore rules.`, true);
  }
}

function firestoreRecord(item, status) {
  const copy = { ...item };
  ["duplicateName", "duplicateReason", "errors", "score", "decision"].forEach((key) => delete copy[key]);
  return {
    ...copy,
    status,
    deadlineDate: copy.deadlineDate || draftDeadline,
    deadline: copy.deadlineDate ? copy.deadline : "Needs official deadline verification",
    applicationWindow: status === "active" ? "open" : "verify",
    sourceType: "advanced-scholarship-analyzer",
    verifiedOn: today,
    lastChecked: today,
    verificationNote: status === "active" ? `Published from Advanced Scholarship Analyzer on ${today} after official-source check.` : `Saved as draft from Advanced Scholarship Analyzer on ${today} for review. Missing: ${(copy.missingFields || []).join(", ") || "none"}.`
  };
}

function toEditableJson(item) {
  return {
    name: item.name,
    state: item.state,
    stateLabel: item.stateLabel,
    amount: item.amount,
    maxIncome: item.maxIncome,
    minPercentage: item.minPercentage,
    deadline: item.deadline,
    deadlineDate: item.deadlineDate,
    link: item.link,
    sourceUrl: item.sourceUrl,
    education: item.education,
    categories: item.categories,
    genders: item.genders,
    disability: item.disability,
    eligibilityNote: item.eligibilityNote,
    incomeNote: item.incomeNote,
    sourceName: item.sourceName,
    requiredDocuments: item.requiredDocuments,
    exclusions: item.exclusions,
    studentSummary: item.studentSummary,
    benefitDetails: item.benefitDetails,
    applicationProcess: item.applicationProcess,
    renewalRules: item.renewalRules,
    documentType: item.documentType,
    sourceType: item.sourceType,
    rawSectionNames: item.rawSectionNames,
    confidence: item.confidence,
    missingFields: item.missingFields,
    sourceSafety: item.sourceSafety,
    duplicateRisk: item.duplicateRisk,
    versionInfo: item.versionInfo
  };
}

function detectDocumentType(text, url, origin) {
  if (/blocked/i.test(origin)) return "blocked_source";
  if (/ocr/i.test(origin)) return "ocr_pdf_guideline";
  if (isLikelyPdfUrl(url) || /pdf/i.test(origin)) return isGuidelineText(text) ? "pdf_guideline_notification" : "pdf_scholarship_source";
  if (/notification|guideline|eligibility criteria|procedure for applying/i.test(text)) return "guideline_notification";
  if (/application form/i.test(text) && /signature|passport|certificate/i.test(text)) return "application_form";
  return "scholarship_web_page";
}

function isGuidelineText(text) {
  return /(objective\s*(?:and|&)\s*scope|eligibility criteria|value of scholarship|procedure for applying|duration and renewal)/i.test(text);
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
  "OBJECTIVE & SCOPE", "OBJECTIVE AND SCOPE", "OBJECTIVE", "SCOPE",
  "ELIGIBILITY CRITERIA", "ELIGIBILITY", "WHO CAN APPLY",
  "VALUE OF SCHOLARSHIP", "BENEFITS", "AMOUNT", "SCHOLARSHIP AMOUNT",
  "PAYMENT AND MODE OF DISBURSAL OF SCHOLARSHIP", "PAYMENT AND MODE OF DISBURSAL", "DISBURSAL",
  "SANCTIONING AUTHORITY", "DURATION AND RENEWAL OF AWARDS", "DURATION AND RENEWAL", "RENEWAL",
  "ANNOUNCEMENT OF THE SCHEME", "IMPORTANT DATES", "SELECTION OF CANDIDATES", "SELECTION PROCESS",
  "PROCEDURE FOR APPLYING", "HOW TO APPLY", "DOCUMENTS REQUIRED", "REQUIRED DOCUMENTS",
  "FUNDING PATTERN OF THE SCHEME", "SCREENING COMMITTEE", "POWERS", "MONITORING AND EVALUATION"
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
    const body = clean(text.slice(start, end));
    if (body.length > (sections[key] || "").length) sections[key] = body;
  }

  return sections;
}

function sectionKey(heading) {
  return norm(heading).replace(/\s+/g, "_");
}

function pickSection(sections, keys) {
  return keys.map((key) => sections[key]).find(Boolean) || "";
}

function guessTitle(text, url, sections = {}) {
  const header = clean(text).replace(/https?:\/\/\S+/g, " ");
  if (/Additional Scholarship.+OBC.+Andaman.+Nicobar/i.test(header)) return "Additional Scholarship to OBC Students of Andaman and Nicobar Islands";

  const schemePatterns = [
    /(?:scheme\s+for\s+grant\s+of|regarding\s+scheme\s+for\s+grant\s+of)\s+(.{20,190}?)(?:,|\.|\s+the\s+hon'?ble|\s+for\s+pursuing)/i,
    /(?:name\s+of\s+the\s+scheme|scholarship\s+name)\s*:?\s*(.{8,140})/i,
    /(?:notification|guidelines?)\s+(?:for|regarding)\s+(.{20,160}?)(?:,|\.)/i
  ];
  for (const pattern of schemePatterns) {
    const match = header.match(pattern);
    if (match) return titleCase(clean(match[1]).slice(0, 170));
  }

  const candidates = header.split(/\n|\.|\||•/).map((x) => clean(x)).filter((x) => x.length >= 8 && x.length <= 150);
  const strong = candidates.find((x) => /scholarship|scheme|fellowship|grant|stipend|pragati|saksham|post matric|pre matric/i.test(x) && !/login|home|copyright|official website|page \d+/i.test(x));
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
  if (/medicine|medical|mbbs|nursing|pharmacy|para medical/.test(t)) out.push("medical");
  if (/post graduate|postgraduate|post graduation|pg|masters|m tech|m phil|ph d|phd|post doctoral/.test(t)) out.push("pg");
  return out.length ? [...new Set(out)] : ["any"];
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
  return out.length ? [...new Set(out)] : ["general", "sc", "st", "obc", "ews", "minority"];
}

function guessGender(text) {
  const t = norm(text);
  if (/girl|female|women|woman/.test(t)) return ["female"];
  if (/boy|male/.test(t) && !/female/.test(t)) return ["male"];
  return ["any"];
}

function guessDisability(text) {
  if (/disability|disabled|divyang|pwd|person with disability/i.test(text)) return "yes";
  return "any";
}

function extractBenefitDetails(text, sections = {}) {
  const valueText = [pickSection(sections, ["value_of_scholarship", "benefits", "amount", "scholarship_amount"]), pickSection(sections, ["payment_and_mode_of_disbursal_of_scholarship", "payment_and_mode_of_disbursal", "disbursal"]), text].filter(Boolean).join(" ");
  const moneyMatches = [...valueText.matchAll(/(?:₹|rs\.?)\s*([0-9][0-9,]*(?:\.\d+)?)/gi)].map((m) => m[1].replace(/,/g, ""));
  const firstAmount = moneyMatches[0] || "";
  const frequency = /per\s+month|monthly|p\.m\./i.test(valueText) ? "per month" : /per\s+annum|per\s+year|annually|yearly|p\.a\./i.test(valueText) ? "per year" : "";
  const duration = /ten\s+months|10\s+months/i.test(valueText) ? "10 months" : /([0-9]+)\s+months/i.test(valueText)?.[0] || "";
  const includesTuition = /tuition fee|course fee|hostel|maintenance|book grant/i.test(valueText);
  const displayAmount = firstAmount ? `Rs.${firstAmount}${frequency ? ` ${frequency}` : ""}${duration ? ` for ${duration}` : ""}` : includesTuition ? "Fee/maintenance benefits as per official rules" : "Varies as per official rules";
  return { amount: firstAmount ? Number(firstAmount) : null, frequency, duration, displayAmount, raw: clean(valueText).slice(0, 900) };
}

function guessIncome(text, sections = {}) {
  const incomeText = [pickSection(sections, ["eligibility_criteria", "eligibility"]), pickSection(sections, ["procedure_for_applying", "documents_required"]), text].filter(Boolean).join(" ");
  const hit = incomeText.match(/(?:income\s+limit|annual\s+income|family\s+income|max(?:imum)?\s+income|not\s+exceed)[^₹\d]{0,100}(?:₹|rs\.?\s?)?([0-9][0-9,]{3,})/i);
  return hit ? hit[1].replace(/,/g, "") : "0";
}

function guessPercentage(text) {
  const hit = text.match(/(?:minimum|at least|secured|marks|percentage)[^0-9]{0,60}([0-9]{2}(?:\.\d+)?)\s*%/i);
  return hit ? hit[1] : 0;
}\n
function guessDeadlineDate(text) {
  return date(findDate(text));
}

function guessDeadlineText(text) {
  const around = snippetAround(text, /(deadline|last date|closing date|apply before|extended)/i, 220);
  return around || "Check official portal";
}

function guessEligibility(text, sections = {}, documents = [], exclusions = [], renewalRules = "") {
  const eligibility = pickSection(sections, ["eligibility_criteria", "eligibility", "who_can_apply"]);
  const objective = pickSection(sections, ["objective_and_scope", "objective"]);
  const pieces = [];
  if (objective) pieces.push(`Objective: ${objective.slice(0, 280)}`);
  if (eligibility) pieces.push(`Eligibility: ${eligibility.slice(0, 780)}`);
  else pieces.push(snippetAround(text, /(eligib|eligible|who can apply|criteria|student)/i, 780) || clean(text).replace(/https?:\/\/\S+/g, "").slice(0, 780));
  if (exclusions.length) pieces.push(`Exclusions: ${exclusions.slice(0, 5).join("; ")}.`);
  if (documents.length) pieces.push(`Documents: ${documents.slice(0, 10).join("; ")}.`);
  if (renewalRules) pieces.push(`Renewal: ${renewalRules.slice(0, 220)}`);
  return clean(pieces.join(" ")).slice(0, 1350) || "Verify eligibility on official portal before applying.";
}

function guessIncomeNote(text, sections = {}) {
  const procedure = pickSection(sections, ["procedure_for_applying", "documents_required"]);
  const eligibility = pickSection(sections, ["eligibility_criteria", "eligibility"]);
  const combined = [eligibility, procedure, text].filter(Boolean).join(" ");
  const incomeSnippet = snippetAround(combined, /(income\s+limit|annual income|family income|max(?:imum)? income|not exceed)/i, 500);
  if (incomeSnippet && /[0-9][0-9,]{3,}/.test(incomeSnippet)) return incomeSnippet;
  if (/non[-\s]?creamy layer/i.test(combined)) {
    const declaration = /income declaration|pay slip|affidavit/i.test(combined) ? " Income declaration/pay slip is also required as per guideline." : "";
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
    ["Passport-size photograph", /passport[- ]size photograph|photo/i],
    ["Class X/XII/Diploma/Degree certificates", /class\s*x|class\s*xii|marks memo|diploma|degree|qualifying examination/i],
    ["Caste certificate", /caste certificate/i],
    ["Non-creamy layer certificate", /non[-\s]?creamy layer certificate/i],
    ["Income certificate/declaration/pay slip", /income certificate|income declaration|pay slip|affidavit/i],
    ["Previous scholarship acknowledgement for renewal", /acknowledgement.*scholarship|renewal application/i],
    ["Marks statement countersigned by institution", /marks statement|counter signed|countersigned/i],
    ["Aadhaar card", /aadhaar/i],
    ["Bank passbook first page", /bank pass ?book|passbook|bank account/i],
    ["Bonafide certificate", /bonafide|bona fide/i],
    ["Disability certificate", /disability certificate|pwd certificate/i]
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
  if (/not eligible/i.test(cleanText)) out.push("some applicants are marked not eligible in official rules");
  return out;
}

function guessApplicationProcess(text, sections = {}) {
  const procedure = pickSection(sections, ["procedure_for_applying", "how_to_apply"]);
  const announcement = pickSection(sections, ["announcement_of_the_scheme", "important_dates"]);
  const source = procedure || snippetAround(text, /(apply online|application form|submit|portal|head of institution)/i, 650);
  const pieces = [];
  if (/apply online/i.test(source)) pieces.push("Apply online through the official scholarship portal when available.");
  if (/head of (the )?institution/i.test(source)) pieces.push("Submit through the Head of Institution as required by the guideline.");
  if (/Director|Department/i.test(source)) pieces.push(clean(source).slice(0, 450));
  if (announcement) pieces.push(`Announcement/date note: ${announcement.slice(0, 180)}`);
  return clean(pieces.join(" ")) || clean(source).slice(0, 700) || "Verify application process on official portal.";
}

function guessRenewalRules(sections = {}) {
  return clean(pickSection(sections, ["duration_and_renewal_of_awards", "duration_and_renewal", "renewal"])).slice(0, 850);
}

function buildStudentSummary({ name, eligibilityNote, benefitDetails, incomeNote, applicationProcess }) {
  const benefit = benefitDetails?.displayAmount && !/varies/i.test(benefitDetails.displayAmount) ? `Benefit: ${benefitDetails.displayAmount}.` : "Benefit amount should be verified from the official rules.";
  const category = /obc/i.test(eligibilityNote) ? "Main target appears to be OBC students." : /sc/i.test(eligibilityNote) ? "Main target appears to include SC students." : /st/i.test(eligibilityNote) ? "Main target appears to include ST students." : "Check category rules carefully.";
  const income = incomeNote && !/verify income/i.test(incomeNote) ? `Income note: ${incomeNote.slice(0, 180)}` : "Income rule needs manual verification.";
  const apply = applicationProcess ? `Apply: ${applicationProcess.slice(0, 180)}` : "Application steps need manual verification.";
  return clean(`${name}. ${category} ${benefit} ${income} ${apply}`).slice(0, 850);
}

function isWeakPageText(text, url) {
  const t = clean(text);
  const withoutUrls = t.replace(/https?:\/\/\S+/g, "").trim();
  const scholarshipWords = /(scholarship|scheme|fellowship|eligib|income|deadline|last date|amount|benefit|student|apply|application|notification|guideline|documents)/i.test(withoutUrls);
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
  if (isNspFilterUrl(url)) return "This NSP link is a dynamic/filter page. Open the specific scheme/result, copy official scheme text/PDF text, then use Analyze Pasted Text.";
  if (isLikelyPdfUrl(url)) return "The PDF link was blocked by the official site/CORS or is scanned. Download the PDF and use Analyze Uploaded PDF/OCR.";
  if (String(error?.message || "").includes("scanned")) return "This PDF looks scanned/image-only. The uploaded PDF OCR option may help; otherwise paste OCR text.";
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

function placeholderTitle(url) {
  if (isNspFilterUrl(url)) return "NSP specific scheme name needed";
  const source = sourceNameFromUrl(url);
  return source && source !== "Official Portal" ? `${source} scholarship details needed` : "Scholarship details needed";
}

function weakEligibilityText(url) {
  if (isNspFilterUrl(url)) return "This NSP URL is a filter/dynamic page. Paste the selected scheme's official eligibility text or PDF text here before importing.";
  return "Direct link/PDF reading was blocked or weak. Paste official eligibility text from the source before importing.";
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

function flattenEligibility(value) {
  if (!value || typeof value !== "object") return "";
  return Object.entries(value).map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(", ") : val}`).join("; ");
}

function snippetAround(text, regex, len) {
  const cleanText = clean(text).replace(/https?:\/\/\S+/g, "");
  const match = cleanText.search(regex);
  if (match < 0) return "";
  return cleanText.slice(Math.max(0, match - 100), match + len);
}

function clearWorkspace() {
  setValue(els.linkUrl, "");
  setValue(els.bulkUrls, "");
  setValue(els.fallbackText, "");
  setValue(els.source, "");
  setValue(els.url, "");
  setValue(els.input, "");
  if (els.pdfFile) els.pdfFile.value = "";
  candidates = [];
  render();
  setMessage("Cleared.");
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

function extractUrls(text) {
  return [...new Set(String(text || "").split(/\s+/).map((x) => normalizeUrl(x.replace(/[),.;]+$/, ""))).filter(Boolean))];
}

function findDate(text) {
  return String(text || "").match(/20\d{2}-[01]\d-[0-3]\d/)?.[0] || String(text || "").match(/[0-3]?\d[/-][01]?\d[/-]20\d{2}/)?.[0] || String(text || "").match(/[0-3]?\d\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\s+20\d{2}/i)?.[0] || "";
}

function date(v) {
  const s = String(v || "").trim();
  if (!s || /yyyy-mm-dd/i.test(s)) return "";
  const iso = s.match(/20\d{2}-[01]\d-[0-3]\d/)?.[0];
  if (iso) return iso;
  const numeric = s.match(/([0-3]?\d)[/-]([01]?\d)[/-](20\d{2})/);
  if (numeric) return `${numeric[3]}-${numeric[2].padStart(2, "0")}-${numeric[1].padStart(2, "0")}`;
  const monthMatch = s.match(/([0-3]?\d)\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\s+(20\d{2})/i);
  if (monthMatch) {
    const months = { jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06", jul: "07", aug: "08", sep: "09", sept: "09", oct: "10", nov: "11", dec: "12" };
    return `${monthMatch[3]}-${months[monthMatch[2].toLowerCase().slice(0, 4)] || months[monthMatch[2].toLowerCase().slice(0, 3)]}-${monthMatch[1].padStart(2, "0")}`;
  }
  return "";
}

function past(v) {
  const d = new Date(`${v}T23:59:59`);
  return !Number.isNaN(d.getTime()) && d.getTime() < Date.now();
}

function extractYear(v) {
  return String(v || "").match(/20\d{2}/)?.[0] || "";
}

function stripYear(v) {
  return norm(v).replace(/20\d{2}/g, "").replace(/\b\d{2}\s*\d{2}\b/g, "").replace(/\s+/g, " ").trim();
}

function list(v, fb) {
  const arr = Array.isArray(v) ? v : String(v || "").split(/[,+]/);
  const out = arr.map((x) => cleanSlug(x)).filter(Boolean);
  return out.length ? [...new Set(out)] : fb;
}

function arrayText(v) {
  if (Array.isArray(v)) return v.map(clean).filter(Boolean);
  return String(v || "").split(/[\n;]+/).map(clean).filter(Boolean);
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

function safeField(value, field, link) {
  const text = clean(value);
  if (!text || isOnlyUrl(text) || text === link) {
    if (field === "name") return placeholderTitle(link);
    if (field === "eligibility") return weakEligibilityText(link);
    if (field === "income") return "Paste exact official income rule from the scheme page/PDF before importing.";
  }
  return text.replace(/https?:\/\/\S+/g, "").trim() || (field === "name" ? placeholderTitle(link) : text);
}

function countPdfPagesFromText(text) {
  return Math.max(1, (String(text || "").match(/--- Page \d+ ---/g) || []).length);
}

function hostLabel(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "source";
  }
}

function normName(v) {
  return norm(v).replace(/scholarship|scheme|yojana|guidelines?|notification/g, "").replace(/\s+/g, " ").trim();
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
