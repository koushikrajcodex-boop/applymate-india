import { auth, db } from "./firebase-config.js";
import { checkAdminAccess } from "./admin-access.js";
import { getStateLabel, INDIA_STATE_OPTIONS } from "./states.js";
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
const OCR_PAGE_LIMIT = 6;

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
    await loadCoverage({ reanalyze: false });
  } catch (error) {
    console.error(error);
    show(els.email, "Analyzer ready. Admin check failed, so import may not work until rules/login are fixed.");
  }
});

function bindEvents() {
  if (bindEvents.done) return;
  bindEvents.done = true;
  els.refresh?.addEventListener("click", () => loadCoverage({ reanalyze: true }));
  els.fetchLink?.addEventListener("click", analyzeSingleLink);
  els.analyzeBulk?.addEventListener("click", analyzeBulkLinks);
  els.analyzePdf?.addEventListener("click", analyzeUploadedPdfs);
  els.analyzePasted?.addEventListener("click", analyzePastedText);
  els.analyze?.addEventListener("click", analyzeGeneratedFormat);
  els.clear?.addEventListener("click", clearWorkspace);
  els.importActive?.addEventListener("click", () => importRecords("active"));
  els.importDraft?.addEventListener("click", () => importRecords("draft"));
  els.importSafeDrafts?.addEventListener("click", () => importRecords("safeDrafts"));
}

async function loadCoverage({ reanalyze = true } = {}) {
  if (!adminReady) return setMessage("Login with approved admin email to load Firestore coverage.", true);
  setMessage("Loading Firestore coverage...");
  try {
    const snapshot = await getDocs(collection(db, "scholarships"));
    existing = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const active = existing.filter(isVerifiedActiveScholarship).length;
    const uniqueSources = new Set(existing.map((item) => normalizeUrl(item.sourceUrl || item.link)).filter(Boolean)).size;
    show(els.coverage, `${existing.length} total records • ${active} active verified • ${uniqueSources} unique sources • advanced analyzer ready`);
    setMessage("Coverage loaded. Use single link, bulk links, multiple PDFs, or pasted official text.");
    if (reanalyze && candidates.length) analyzeGeneratedFormat();
  } catch (error) {
    console.error(error);
    setMessage(`Coverage failed: ${error.message}. If permission-denied, deploy updated Firestore rules.`, true);
  }
}

async function analyzeSingleLink() {
  const url = normalizeUrl(value(els.linkUrl));
  if (!url) return setMessage("Paste a valid official scholarship URL first.", true);
  setValue(els.url, url);
  setValue(els.source, sourceNameFromUrl(url));
  setMessage(isPdfUrl(url) ? "Reading official PDF link..." : "Reading official scholarship page...");
  try {
    const text = await fetchReadableText(url);
    setValue(els.fallbackText, text.slice(0, 16000));
    setGeneratedCandidates([buildCandidate({ url, text, sourceName: sourceNameFromUrl(url), origin: isPdfUrl(url) ? "pdf-url" : "web-url" })]);
    setMessage("Single source analyzed. Review confidence and import status before import.");
  } catch (error) {
    console.warn(error);
    setGeneratedCandidates([weakCandidate(url, getBlockedMessage(url, error))]);
    setMessage(getBlockedMessage(url, error), true);
  }
}

async function analyzeBulkLinks() {
  const urls = extractUrls(value(els.bulkUrls)).slice(0, BULK_LIMIT);
  if (!urls.length) return setMessage("Paste up to 15 official links in Bulk official URLs first.", true);
  const out = [];
  for (let i = 0; i < urls.length; i += 1) {
    const url = urls[i];
    setMessage(`Bulk analyzing ${i + 1}/${urls.length}: ${hostLabel(url)}`);
    try {
      const text = await fetchReadableText(url);
      out.push(buildCandidate({ url, text, sourceName: sourceNameFromUrl(url), origin: isPdfUrl(url) ? "pdf-url" : "web-url" }));
    } catch (error) {
      console.warn(error);
      out.push(weakCandidate(url, getBlockedMessage(url, error)));
    }
  }
  setGeneratedCandidates(out);
  setMessage(`Bulk finished. ${out.length} records generated. Import status will appear on each card after import.`);
}

async function analyzeUploadedPdfs() {
  const files = Array.from(els.pdfFile?.files || []);
  if (!files.length) return setMessage("Choose one or more official PDF files first.", true);
  const pdfs = files.filter((file) => /\.pdf$/i.test(file.name) || file.type === "application/pdf");
  if (!pdfs.length) return setMessage("Upload PDF files only.", true);
  if (pdfs.length !== files.length) setMessage("Some non-PDF files were skipped.", true);

  const url = normalizeUrl(value(els.linkUrl) || value(els.url));
  const out = [];
  for (let i = 0; i < pdfs.length; i += 1) {
    const file = pdfs[i];
    const sourceName = value(els.source) || sourceNameFromUrl(url) || file.name.replace(/\.pdf$/i, " PDF");
    setMessage(`Reading PDF ${i + 1}/${pdfs.length}: ${file.name}`);
    try {
      const buffer = await file.arrayBuffer();
      let text = await pdfToText(buffer);
      let quality = pdfQuality(text, pageCount(text));
      if (quality === "scanned_or_poor_text_pdf" || isWeakText(text, url)) {
        setMessage(`PDF ${i + 1}/${pdfs.length} looks scanned/low-text. Trying OCR for first pages...`);
        const ocr = await ocrPdf(buffer, OCR_PAGE_LIMIT, `${i + 1}/${pdfs.length}`);
        if (clean(ocr).length > clean(text).length) {
          text = cleanGuidelineText(`${text}\n\n--- OCR TEXT ---\n${ocr}`);
          quality = "ocr_text_pdf";
        }
      }
      if (isWeakText(text, url)) throw new Error("weak-pdf-text");
      out.push(buildCandidate({ url, text, sourceName, origin: quality, fileName: file.name }));
    } catch (error) {
      console.error(error);
      out.push(normalize({
        name: file.name.replace(/\.pdf$/i, " PDF needs OCR/manual review"),
        state: guessState("", url),
        amount: "Varies as per official rules",
        deadline: "Check official portal",
        link: url,
        sourceUrl: url,
        education: ["any"],
        categories: ["general", "sc", "st", "obc", "ews", "minority"],
        genders: ["any"],
        eligibilityNote: "Could not read enough text from this PDF. Try OCR externally, then paste the text.",
        incomeNote: "Needs manual verification.",
        sourceName,
        documentType: "unreadable_pdf",
        sourceType: "pdf-upload-failed",
        fileName: file.name,
        studentSummary: "Not imported yet. PDF text extraction failed."
      }));
    }
  }
  if (out.length) {
    setGeneratedCandidates(out);
    setMessage(`Finished ${out.length} PDF(s). Import status will show on each result after you click import.`);
  }
}

function analyzePastedText() {
  const text = value(els.fallbackText);
  const url = normalizeUrl(value(els.linkUrl) || value(els.url));
  if (!text || text.length < 30) return setMessage("Paste official page/PDF text first.", true);
  const sourceName = value(els.source) || sourceNameFromUrl(url) || "Official Portal";
  setGeneratedCandidates([buildCandidate({ url, text, sourceName, origin: "pasted-text" })]);
  setMessage("Pasted official text analyzed. Import status will appear here after import.");
}

function setGeneratedCandidates(records) {
  const editable = records.map((item) => toEditableJson(classify(item)));
  setValue(els.input, JSON.stringify({ generatedBy: "ApplyMate Advanced Scholarship Analyzer", generatedOn: today, candidates: editable }, null, 2));
  analyzeGeneratedFormat();
}

function syncGeneratedJson() {
  const editable = candidates.map((item) => toEditableJson(item));
  setValue(els.input, JSON.stringify({ generatedBy: "ApplyMate Advanced Scholarship Analyzer", generatedOn: today, candidates: editable }, null, 2));
}

async function fetchReadableText(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 18000);
  try {
    const response = await fetch(url, { method: "GET", mode: "cors", credentials: "omit", cache: "no-store", signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const type = response.headers.get("content-type") || "";
    const finalUrl = response.url || url;
    if (type.includes("application/pdf") || isPdfUrl(finalUrl)) return await pdfToText(await response.arrayBuffer());
    return htmlToText(await response.text());
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

async function pdfToText(buffer) {
  const pdfjsLib = await loadPdfJs();
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
  const pages = [];
  for (let pageNo = 1; pageNo <= pdf.numPages; pageNo += 1) {
    const page = await pdf.getPage(pageNo);
    const content = await page.getTextContent();
    pages.push(`--- Page ${pageNo} ---\n${content.items.map((item) => item.str || "").join(" ")}`);
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
      script.onload = () => window.Tesseract ? resolve(window.Tesseract) : reject(new Error("OCR library did not load"));
      script.onerror = () => reject(new Error("OCR library failed to load"));
      document.head.appendChild(script);
    });
  }
  return tesseractPromise;
}

async function ocrPdf(buffer, maxPages, label = "") {
  const [pdfjsLib, Tesseract] = await Promise.all([loadPdfJs(), loadTesseract()]);
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer.slice(0)) }).promise;
  const texts = [];
  const total = Math.min(pdf.numPages, maxPages);
  for (let pageNo = 1; pageNo <= total; pageNo += 1) {
    setMessage(`OCR ${label ? `${label} ` : ""}page ${pageNo}/${total}...`);
    const page = await pdf.getPage(pageNo);
    const viewport = page.getViewport({ scale: 1.45 });
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { willReadFrequently: true });
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    await page.render({ canvasContext: context, viewport }).promise;
    const result = await Tesseract.recognize(canvas, "eng");
    texts.push(`--- OCR Page ${pageNo} ---\n${result?.data?.text || ""}`);
    canvas.width = 0;
    canvas.height = 0;
  }
  return cleanGuidelineText(texts.join("\n\n"));
}

function htmlToText(html) {
  const doc = new DOMParser().parseFromString(String(html || ""), "text/html");
  doc.querySelectorAll("script,style,noscript,svg,iframe,nav,footer,header,aside").forEach((node) => node.remove());
  const parts = [doc.querySelector("title")?.textContent || "", doc.querySelector('meta[name="description"]')?.getAttribute("content") || "", ...Array.from(doc.querySelectorAll("h1,h2,h3,h4,th,td,p,li,span,strong,article,section")).map((node) => node.textContent || "")];
  return cleanGuidelineText(parts.join("\n")).slice(0, 50000);
}

function buildCandidate({ url, text, sourceName, origin, fileName = "" }) {
  const cleanText = cleanGuidelineText(text || "");
  const sections = splitSections(cleanText);
  const docs = extractDocuments(section(sections, ["procedure_for_applying", "documents_required", "how_to_apply"]) || cleanText);
  const exclusions = extractExclusions(section(sections, ["eligibility_criteria", "eligibility"]) || cleanText);
  const benefit = extractBenefit(cleanText, sections);
  const applicationProcess = extractApplication(cleanText, sections);
  const renewalRules = section(sections, ["duration_and_renewal_of_awards", "duration_and_renewal", "renewal"]).slice(0, 850);
  const name = guessTitle(cleanText, url, fileName);
  const eligibilityNote = buildEligibility(cleanText, sections, docs, exclusions, renewalRules);
  const incomeNote = buildIncomeNote(cleanText, sections);
  return normalize({
    name, state: guessState(cleanText, url), amount: benefit.displayAmount, maxIncome: guessIncome(cleanText, sections), minPercentage: guessPercentage(cleanText),
    deadline: guessDeadlineText(cleanText), deadlineDate: date(findDate(cleanText)), link: url, sourceUrl: url,
    education: guessEducation(cleanText), categories: guessCategories(cleanText), genders: guessGender(cleanText), disability: /disability|disabled|pwd|divyang/i.test(cleanText) ? "yes" : "any",
    eligibilityNote, incomeNote, sourceName: sourceName || sourceNameFromUrl(url) || "Official Portal",
    requiredDocuments: docs, exclusions, studentSummary: studentSummary(name, eligibilityNote, benefit, incomeNote, applicationProcess), benefitDetails: benefit, applicationProcess, renewalRules,
    documentType: detectDocumentType(cleanText, url, origin), sourceType: origin, rawSectionNames: Object.keys(sections), fileName
  });
}

function weakCandidate(url, reason) {
  return normalize({ name: placeholderTitle(url), state: guessState("", url), amount: "Varies as per official rules", deadline: "Check official portal", link: url, sourceUrl: url, education: ["any"], categories: ["general", "sc", "st", "obc", "ews", "minority"], genders: ["any"], disability: "any", eligibilityNote: weakEligibility(url), incomeNote: "Paste exact official income rule from the scheme page/PDF before importing.", sourceName: sourceNameFromUrl(url), studentSummary: reason, documentType: isPdfUrl(url) ? "blocked_pdf" : "blocked_or_dynamic_page", sourceType: "blocked" });
}

function normalize(item) {
  const state = resolveState(item.state || "national");
  return {
    name: clean(item.name).slice(0, 200), state, stateLabel: getStateLabel(state), status: "draft", amount: clean(item.amount || "Varies as per official rules").slice(0, 160),
    maxIncome: num(item.maxIncome), minPercentage: clamp(num(item.minPercentage), 0, 100), deadline: clean(item.deadline || "Check official portal").slice(0, 160), deadlineDate: date(item.deadlineDate),
    link: normalizeUrl(item.link || item.sourceUrl), sourceUrl: normalizeUrl(item.sourceUrl || item.link), education: list(item.education, ["any"]), categories: list(item.categories, ["general"]), genders: list(item.genders, ["any"]), disability: disability(item.disability),
    eligibilityNote: clean(item.eligibilityNote).slice(0, 1400), incomeNote: clean(item.incomeNote).slice(0, 900), sourceName: clean(item.sourceName || "Official Portal").slice(0, 140),
    requiredDocuments: arr(item.requiredDocuments).slice(0, 30), exclusions: arr(item.exclusions).slice(0, 15), studentSummary: clean(item.studentSummary).slice(0, 900), benefitDetails: item.benefitDetails || {}, applicationProcess: clean(item.applicationProcess).slice(0, 900), renewalRules: clean(item.renewalRules).slice(0, 900), documentType: clean(item.documentType || "scholarship_source"), sourceType: clean(item.sourceType || "analyzer"), rawSectionNames: arr(item.rawSectionNames), fileName: clean(item.fileName || ""),
    importStatus: item.importStatus || "not_imported", importMessage: item.importMessage || "Not imported yet", importedAt: item.importedAt || "", importedMode: item.importedMode || "",
    applicationWindow: "open", academicYear: String(new Date().getFullYear()), verifiedOn: today, verificationNote: `Checked through Advanced Scholarship Analyzer on ${today}. Verify official source before publishing widely.`, lastChecked: today
  };
}

function classify(item) {
  const sourceSafety = sourceSafetyCheck(item.link);
  const duplicate = duplicateOf(item);
  const missingFields = missing(item, sourceSafety);
  const confidence = confidenceScore(item, missingFields, sourceSafety, duplicate);
  const versionInfo = versionHint(item, duplicate?.record);
  const warnings = warningsFor(item, missingFields, sourceSafety, duplicate, versionInfo);
  const enriched = { ...item, sourceSafety, missingFields, confidence, warnings, duplicateRisk: duplicate?.risk || "low", duplicateName: duplicate?.record?.name || "", duplicateReason: duplicate?.reason || "", versionInfo };
  const errors = validate(enriched, true);
  const looseErrors = validate(enriched, false);
  let decision = "review";
  if (["exact", "same_url"].includes(enriched.duplicateRisk)) decision = "skipDuplicate";
  else if (enriched.deadlineDate && past(enriched.deadlineDate)) decision = "skipExpired";
  else if (!errors.length && confidence.overall >= 90 && !sourceSafety.severity) decision = "autoActive";
  else if (!looseErrors.some((x) => !x.toLowerCase().includes("deadline")) && confidence.overall >= 68) decision = "autoDraft";
  return { ...enriched, errors, score: confidence.overall, decision };
}

function validate(item, strictDate) {
  const errors = [];
  if (!item.name || /needed|specific scheme|details needed/i.test(item.name)) errors.push("Scholarship name needs exact official scheme name.");
  if (strictDate && !item.deadlineDate) errors.push("Missing YYYY-MM-DD deadline date.");
  if (item.deadlineDate && past(item.deadlineDate)) errors.push("Deadline expired.");
  if (!item.eligibilityNote || item.eligibilityNote.length < 40 || /blocked|paste|needed|dynamic|filter/i.test(item.eligibilityNote)) errors.push("Eligibility needs official scheme text.");
  if (!item.incomeNote || /paste|needed|blocked/i.test(item.incomeNote)) errors.push("Income note needs official scheme text.");
  if (item.sourceSafety.severity === "high") errors.push("Suspicious source domain.");
  return errors;
}

function missing(item, safety) {
  const out = [];
  if (!isValidUrl(item.link)) out.push("official link");
  if (!item.name || /needed/i.test(item.name)) out.push("exact scheme name");
  if (!item.deadlineDate) out.push("deadline date");
  if (!item.amount || /varies/i.test(item.amount)) out.push("exact amount");
  if (!item.eligibilityNote || item.eligibilityNote.length < 80 || /paste|blocked|needed/i.test(item.eligibilityNote)) out.push("detailed eligibility");
  if (!item.incomeNote || /paste|verify income/i.test(item.incomeNote)) out.push("income rule");
  if (!item.requiredDocuments.length) out.push("required documents");
  if (safety.level !== "official") out.push("official source verification");
  return out;
}

function confidenceScore(item, missingFields, safety, duplicate) {
  const score = {
    name: item.name && !/needed/i.test(item.name) ? 95 : 25,
    source: isValidUrl(item.link) ? (safety.level === "official" ? 100 : safety.level === "trusted" ? 82 : 55) : 45,
    eligibility: item.eligibilityNote.length >= 250 ? 95 : item.eligibilityNote.length >= 90 ? 75 : 30,
    amount: item.amount && !/varies/i.test(item.amount) ? 95 : 45,
    deadline: item.deadlineDate ? (past(item.deadlineDate) ? 20 : 95) : 35,
    income: item.incomeNote && !/paste|verify income/i.test(item.incomeNote) ? 85 : item.maxIncome ? 80 : 45,
    documents: item.requiredDocuments.length >= 4 ? 95 : item.requiredDocuments.length ? 70 : 30,
    duplicate: ["exact", "same_url"].includes(duplicate?.risk) ? 10 : duplicate?.risk === "possible_update" ? 65 : 95
  };
  let overall = Math.round((score.name * 1.2 + score.source * 1.2 + score.eligibility * 1.4 + score.amount + score.deadline * 1.2 + score.income + score.documents + score.duplicate * 0.8) / 8.8);
  overall -= Math.min(20, missingFields.length * 3);
  if (safety.severity === "high") overall -= 25;
  if (safety.severity === "medium") overall -= 10;
  return { ...score, overall: clamp(overall, 0, 100) };
}

function render() {
  if (!els.results) return;
  if (!candidates.length) {
    els.results.innerHTML = "<p class='mini-note'>No results yet.</p>";
    return;
  }
  els.results.innerHTML = candidates.map((item, i) => {
    const statusClass = item.decision === "autoActive" ? "good" : item.decision === "autoDraft" ? "warn" : "bad";
    const importClass = item.importStatus === "imported" ? "good" : item.importStatus === "failed" || item.importStatus === "not_selected" ? "bad" : "warn";
    const c = item.confidence || {};
    return `<article class="bot-card"><span class="bot-status ${statusClass}">${escapeHtml(item.decision)} • ${item.score}%</span><span class="bot-status ${importClass}" style="margin-left:6px">${escapeHtml(item.importStatus.replaceAll("_", " "))}</span><h3>${i + 1}. ${escapeHtml(item.name)}</h3><p class="bot-mini"><strong>Import:</strong> ${escapeHtml(item.importMessage || "Not imported yet")}${item.importedAt ? ` • ${escapeHtml(item.importedAt)}` : ""}</p><p class="bot-mini"><strong>State:</strong> ${escapeHtml(item.stateLabel)} • <strong>Deadline:</strong> ${escapeHtml(item.deadlineDate || "missing")} • <strong>Type:</strong> ${escapeHtml(item.documentType)}</p><p class="bot-mini"><strong>Amount:</strong> ${escapeHtml(item.amount)} • <strong>Category:</strong> ${escapeHtml(item.categories.join(", "))}</p><p class="bot-mini"><strong>Source:</strong> ${escapeHtml(item.sourceName)} ${item.fileName ? `• <strong>File:</strong> ${escapeHtml(item.fileName)}` : ""} ${item.link ? `• <a href="${escapeHtml(item.link)}" target="_blank" rel="noopener noreferrer">official link</a>` : ""}</p><div class="score-grid">${chip("Name", c.name)}${chip("Eligibility", c.eligibility)}${chip("Amount", c.amount)}${chip("Deadline", c.deadline)}${chip("Income", c.income)}${chip("Docs", c.documents)}${chip("Source", c.source)}${chip("Duplicate", c.duplicate)}</div><p class="bot-mini"><strong>Missing:</strong> ${escapeHtml(item.missingFields.length ? item.missingFields.join(", ") : "None critical detected")}</p><p class="bot-mini"><strong>Student summary:</strong> ${escapeHtml(item.studentSummary || "Summary not generated.")}</p><p class="bot-mini"><strong>Eligibility:</strong> ${escapeHtml(item.eligibilityNote)}</p>${item.requiredDocuments.length ? `<p class="bot-mini"><strong>Documents:</strong> ${escapeHtml(item.requiredDocuments.slice(0, 8).join(", "))}</p>` : ""}<p class="bot-mini"><strong>Version/Duplicate:</strong> ${escapeHtml(item.versionInfo?.message || "No version info.")}</p>${item.warnings.length ? `<ul>${item.warnings.slice(0, 6).map((e) => `<li>${escapeHtml(e)}</li>`).join("")}</ul>` : "<p class='bot-mini'>No major warnings.</p>"}</article>`;
  }).join("");
}

function chip(label, score) {
  const value = Number.isFinite(score) ? score : 0;
  return `<span class="score-chip ${value >= 85 ? "good" : value >= 60 ? "warn" : "bad"}">${escapeHtml(label)} ${value}%</span>`;
}

function analyzeGeneratedFormat() {
  const raw = value(els.input);
  candidates = parse(raw).map(classify);
  render();
  const active = candidates.filter((x) => x.decision === "autoActive").length;
  const draft = candidates.filter((x) => x.decision === "autoDraft").length;
  const review = candidates.filter((x) => x.decision === "review").length;
  setMessage(candidates.length ? `Analyzed ${candidates.length}. Auto Active: ${active}. Auto Draft: ${draft}. Review: ${review}.` : "Generate or paste a format first.", !candidates.length);
}

function parse(raw) {
  const text = String(raw || "").trim();
  if (!text) return [];
  const json = tryJson(text);
  if (json) return (Array.isArray(json) ? json : json.candidates || [json]).map(fromJson).filter((x) => x.name);
  return text.split(/\n---+\n/g).map(fromLegacyText).filter((x) => x.name);
}

function fromJson(item) {
  const link = normalizeUrl(item.sourceUrl || item.link || item.url || value(els.url));
  const benefit = item.benefitDetails || item.benefit || {};
  return normalize({ ...item, name: safeField(item.name || item.title || item.scholarshipName || item.schemeName || "", "name", link), state: item.state || item.stateLabel || item.stateOrUT || "national", amount: item.amount || benefit.displayAmount || "Varies as per official rules", maxIncome: item.maxIncome || item.incomeLimit || 0, minPercentage: item.minPercentage || item.percentage || 0, deadline: item.deadline || item.deadlineText || item.lastDate || "Check official portal", deadlineDate: item.deadlineDate || item.lastDate || "", link, sourceUrl: link, education: item.education || item.course || item.courses || item.courseLevel, categories: item.categories || item.category, genders: item.genders || item.gender, eligibilityNote: item.eligibilityNote || item.eligibility || item.description || "Verify eligibility on official portal before applying.", incomeNote: item.incomeNote || item.incomeRule || "Verify income rules on official portal.", sourceName: item.sourceName || item.source || value(els.source) || sourceNameFromUrl(link), benefitDetails: benefit, importStatus: item.importStatus, importMessage: item.importMessage, importedAt: item.importedAt, importedMode: item.importedMode });
}

function fromLegacyText(block) {
  const link = normalizeUrl(line(block, "official link") || line(block, "link") || findUrl(block) || value(els.url));
  return normalize({ name: safeField(line(block, "scholarship name") || line(block, "name") || block.split("\n")[0], "name", link), state: line(block, "state") || block, amount: line(block, "amount") || "Varies as per official rules", maxIncome: line(block, "income limit") || 0, deadline: line(block, "deadline") || "Check official portal", deadlineDate: line(block, "deadline date") || findDate(block), link, sourceUrl: link, education: line(block, "education"), categories: line(block, "categories"), genders: line(block, "gender"), eligibilityNote: line(block, "eligibility") || block.slice(0, 900), incomeNote: line(block, "income note") || "Verify income rules on official portal.", sourceName: line(block, "source") || sourceNameFromUrl(link), requiredDocuments: extractDocuments(block), documentType: "legacy_text_format", sourceType: "edited_text" });
}

async function importRecords(mode) {
  if (!adminReady) return setMessage("Admin access required for Firestore import. Login with approved admin email.", true);
  let records = [];
  let status = "draft";
  const importTime = new Date().toLocaleString();

  candidates.forEach((item) => {
    item.importStatus = "not_selected";
    item.importMessage = "Not selected for this import action.";
  });

  if (mode === "active") {
    records = candidates.filter((x) => x.decision === "autoActive");
    status = "active";
    candidates.filter((x) => x.decision !== "autoActive").forEach((item) => {
      item.importMessage = item.deadlineDate ? `Not imported as active: decision is ${item.decision}. Use Draft/Review if needed.` : "Not imported as active: missing deadline. Use Import Draft/Review.";
    });
  } else if (mode === "draft") {
    records = candidates.filter((x) => ["autoDraft", "review"].includes(x.decision));
    candidates.filter((x) => !["autoDraft", "review"].includes(x.decision)).forEach((item) => {
      item.importMessage = `Not imported: ${item.decision === "skipDuplicate" ? "duplicate detected" : item.decision === "skipExpired" ? "deadline expired" : `decision is ${item.decision}`}.`;
    });
  } else {
    records = candidates.filter((x) => ["autoActive", "autoDraft", "review"].includes(x.decision));
    candidates.filter((x) => !["autoActive", "autoDraft", "review"].includes(x.decision)).forEach((item) => {
      item.importMessage = `Not imported: ${item.decision === "skipDuplicate" ? "duplicate detected" : item.decision === "skipExpired" ? "deadline expired" : `decision is ${item.decision}`}.`;
    });
  }

  if (!records.length) {
    syncGeneratedJson();
    render();
    return setMessage("Nothing imported. Check each card's Import line for the reason.", true);
  }

  let imported = 0;
  let failed = 0;
  for (const item of records) {
    try {
      item.importStatus = "importing";
      item.importMessage = `Importing as ${status}...`;
      render();
      await addDoc(collection(db, "scholarships"), { ...firestoreRecord(item, status), createdAt: serverTimestamp(), updatedAt: serverTimestamp(), createdBy: currentUser.email || currentUser.uid, updatedBy: currentUser.email || currentUser.uid });
      imported += 1;
      item.importStatus = "imported";
      item.importedAt = importTime;
      item.importedMode = status;
      item.importMessage = `Imported successfully as ${status}.`;
    } catch (error) {
      failed += 1;
      console.error(error);
      item.importStatus = "failed";
      item.importMessage = `Import failed: ${error.message}`;
    }
    render();
  }

  syncGeneratedJson();
  await loadCoverage({ reanalyze: false });
  render();
  setMessage(`Import finished. Imported: ${imported}. Failed: ${failed}. Not selected: ${candidates.length - records.length}.`, failed > 0);
}

function firestoreRecord(item, status) {
  const copy = { ...item };
  ["duplicateName", "duplicateReason", "errors", "score", "decision", "importStatus", "importMessage", "importedAt", "importedMode"].forEach((key) => delete copy[key]);
  return { ...copy, status, deadlineDate: copy.deadlineDate || draftDeadline, deadline: copy.deadlineDate ? copy.deadline : "Needs official deadline verification", applicationWindow: status === "active" ? "open" : "verify", sourceType: "advanced-scholarship-analyzer", verifiedOn: today, lastChecked: today, verificationNote: status === "active" ? `Published from Advanced Scholarship Analyzer on ${today}.` : `Saved as draft from Advanced Scholarship Analyzer on ${today}. Missing: ${(copy.missingFields || []).join(", ") || "none"}.` };
}

function toEditableJson(item) {
  return { name: item.name, state: item.state, stateLabel: item.stateLabel, amount: item.amount, maxIncome: item.maxIncome, minPercentage: item.minPercentage, deadline: item.deadline, deadlineDate: item.deadlineDate, link: item.link, sourceUrl: item.sourceUrl, education: item.education, categories: item.categories, genders: item.genders, disability: item.disability, eligibilityNote: item.eligibilityNote, incomeNote: item.incomeNote, sourceName: item.sourceName, requiredDocuments: item.requiredDocuments, exclusions: item.exclusions, studentSummary: item.studentSummary, benefitDetails: item.benefitDetails, applicationProcess: item.applicationProcess, renewalRules: item.renewalRules, documentType: item.documentType, sourceType: item.sourceType, rawSectionNames: item.rawSectionNames, fileName: item.fileName, confidence: item.confidence, missingFields: item.missingFields, sourceSafety: item.sourceSafety, duplicateRisk: item.duplicateRisk, versionInfo: item.versionInfo, importStatus: item.importStatus, importMessage: item.importMessage, importedAt: item.importedAt, importedMode: item.importedMode };
}

const HEADINGS = ["OBJECTIVE & SCOPE", "OBJECTIVE AND SCOPE", "OBJECTIVE", "ELIGIBILITY CRITERIA", "ELIGIBILITY", "WHO CAN APPLY", "VALUE OF SCHOLARSHIP", "BENEFITS", "AMOUNT", "SCHOLARSHIP AMOUNT", "PAYMENT AND MODE OF DISBURSAL OF SCHOLARSHIP", "PAYMENT AND MODE OF DISBURSAL", "DISBURSAL", "DURATION AND RENEWAL OF AWARDS", "DURATION AND RENEWAL", "RENEWAL", "ANNOUNCEMENT OF THE SCHEME", "IMPORTANT DATES", "SELECTION OF CANDIDATES", "SELECTION PROCESS", "PROCEDURE FOR APPLYING", "HOW TO APPLY", "DOCUMENTS REQUIRED", "REQUIRED DOCUMENTS"];

function splitSections(text) {
  const regex = new RegExp(`(?:^|\\n|\\s)(\\d+\\s*\\.?\\s*)?(${HEADINGS.map(escapeRegex).join("|")})\\s*:?\\s*`, "gi");
  const matches = [...String(text || "").matchAll(regex)];
  const sections = {};
  for (let i = 0; i < matches.length; i += 1) {
    const key = norm(matches[i][2]).replace(/\s+/g, "_");
    const start = matches[i].index + matches[i][0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index : text.length;
    const body = clean(text.slice(start, end));
    if (body.length > (sections[key] || "").length) sections[key] = body;
  }
  return sections;
}
function section(sections, keys) { return keys.map((key) => sections[key]).find(Boolean) || ""; }
function detectDocumentType(text, url, origin) { if (/blocked/i.test(origin)) return "blocked_source"; if (/ocr/i.test(origin)) return "ocr_pdf_guideline"; if (isPdfUrl(url) || /pdf/i.test(origin)) return /eligibility criteria|procedure for applying|value of scholarship/i.test(text) ? "pdf_guideline_notification" : "pdf_scholarship_source"; return /notification|guideline|eligibility criteria|procedure for applying/i.test(text) ? "guideline_notification" : "scholarship_web_page"; }
function cleanGuidelineText(text) { return String(text || "").replace(/\r/g, "\n").replace(/[ \t]+/g, " ").replace(/([a-z])- *\n *([a-z])/gi, "$1$2").replace(/([a-z,;:])\n([a-z])/gi, "$1 $2").replace(/\n{3,}/g, "\n\n").replace(/\s+:/g, ":").trim(); }
function guessTitle(text, url, fileName = "") { if (/Additional Scholarship.+OBC.+Andaman.+Nicobar/i.test(text)) return "Additional Scholarship to OBC Students of Andaman and Nicobar Islands"; const match = clean(text).match(/(?:scheme\s+for\s+grant\s+of|scholarship\s+name|name\s+of\s+the\s+scheme)\s*:?\s*(.{12,170}?)(?:,|\.|\s+for\s+pursuing|\n)/i); if (match) return titleCase(match[1]); const strong = clean(text).split(/\n|\.|\||•/).map(clean).find((x) => x.length >= 8 && x.length <= 150 && /scholarship|scheme|fellowship|grant|stipend/i.test(x) && !/login|copyright|official website|page \d+/i.test(x)); return strong || (fileName ? fileName.replace(/\.pdf$/i, " scholarship details") : placeholderTitle(url)); }
function guessState(text, url) { const domain = String(url || "").toLowerCase(); if (domain.includes("jnanabhumi") || /andhra pradesh|\bap\b/i.test(text)) return "Andhra Pradesh"; if (domain.includes("telangana") || /telangana/i.test(text)) return "Telangana"; if (/andaman\s*(?:and|&)\s*nicobar|port blair/i.test(text)) return "Andaman and Nicobar Islands"; return INDIA_STATE_OPTIONS.find((s) => new RegExp(`\\b${escapeRegex(s.label)}\\b`, "i").test(text))?.label || "National"; }
function guessEducation(text) { const t = norm(text), out = []; if (/school|class|pre matric/.test(t)) out.push("school"); if (/intermediate|senior secondary|10 2|class xii/.test(t)) out.push("intermediate"); if (/degree|graduation|graduate|undergraduate|ug/.test(t)) out.push("degree"); if (/engineering|btech|technology|polytechnic|diploma|iti/.test(t)) out.push("engineering"); if (/medicine|medical|nursing|pharmacy/.test(t)) out.push("medical"); if (/post graduate|pg|masters|m tech|m phil|phd|post doctoral/.test(t)) out.push("pg"); return out.length ? [...new Set(out)] : ["any"]; }
function guessCategories(text) { const t = norm(text), out = []; if (/general|open category/.test(t)) out.push("general"); if (/\bsc\b|scheduled caste/.test(t)) out.push("sc"); if (/\bst\b|scheduled tribe/.test(t)) out.push("st"); if (/\bobc\b|other backward class|backward class/.test(t)) out.push("obc"); if (/ews|economically weaker/.test(t)) out.push("ews"); if (/minority|muslim|christian|sikh|buddhist|jain|parsi/.test(t)) out.push("minority"); return out.length ? [...new Set(out)] : ["general", "sc", "st", "obc", "ews", "minority"]; }
function guessGender(text) { const t = norm(text); if (/girl|female|women|woman/.test(t)) return ["female"]; if (/boy|male/.test(t) && !/female/.test(t)) return ["male"]; return ["any"]; }
function extractBenefit(text, sections) { const raw = [section(sections, ["value_of_scholarship", "benefits", "amount", "scholarship_amount"]), section(sections, ["payment_and_mode_of_disbursal_of_scholarship", "payment_and_mode_of_disbursal", "disbursal"]), text].filter(Boolean).join(" "); const amount = raw.match(/(?:₹|rs\.?)\s*([0-9][0-9,]*(?:\.\d+)?)/i)?.[1]?.replace(/,/g, "") || ""; const freq = /per\s+month|monthly|p\.m\./i.test(raw) ? "per month" : /per\s+annum|per\s+year|annually|yearly|p\.a\./i.test(raw) ? "per year" : ""; const duration = /ten\s+months|10\s+months/i.test(raw) ? "10 months" : raw.match(/([0-9]+)\s+months/i)?.[0] || ""; return { amount: amount ? Number(amount) : null, frequency: freq, duration, displayAmount: amount ? `Rs.${amount}${freq ? ` ${freq}` : ""}${duration ? ` for ${duration}` : ""}` : "Varies as per official rules", raw: clean(raw).slice(0, 900) }; }
function guessIncome(text, sections) { const raw = [section(sections, ["eligibility_criteria", "eligibility"]), section(sections, ["procedure_for_applying", "documents_required"]), text].join(" "); return raw.match(/(?:income\s+limit|annual\s+income|family\s+income|max(?:imum)?\s+income|not\s+exceed)[^₹\d]{0,100}(?:₹|rs\.?\s?)?([0-9][0-9,]{3,})/i)?.[1]?.replace(/,/g, "") || "0"; }
function guessPercentage(text) { return text.match(/(?:minimum|at least|secured|marks|percentage)[^0-9]{0,60}([0-9]{2}(?:\.\d+)?)\s*%/i)?.[1] || 0; }
function guessDeadlineText(text) { return around(text, /(deadline|last date|closing date|apply before|extended)/i, 220) || "Check official portal"; }
function buildEligibility(text, sections, docs, exclusions, renewal) { const eligibility = section(sections, ["eligibility_criteria", "eligibility", "who_can_apply"]); const objective = section(sections, ["objective_and_scope", "objective"]); const parts = []; if (objective) parts.push(`Objective: ${objective.slice(0, 250)}`); parts.push(eligibility ? `Eligibility: ${eligibility.slice(0, 780)}` : around(text, /(eligib|eligible|who can apply|criteria|student)/i, 780) || clean(text).slice(0, 780)); if (exclusions.length) parts.push(`Exclusions: ${exclusions.slice(0, 5).join("; ")}.`); if (docs.length) parts.push(`Documents: ${docs.slice(0, 10).join("; ")}.`); if (renewal) parts.push(`Renewal: ${renewal.slice(0, 220)}`); return clean(parts.join(" ")).slice(0, 1350); }
function buildIncomeNote(text, sections) { const raw = [section(sections, ["eligibility_criteria", "eligibility"]), section(sections, ["procedure_for_applying", "documents_required"]), text].join(" "); const hit = around(raw, /(income\s+limit|annual income|family income|max(?:imum)? income|not exceed)/i, 500); if (hit && /[0-9][0-9,]{3,}/.test(hit)) return hit; if (/non[-\s]?creamy layer/i.test(raw)) return `OBC non-creamy layer requirement found. No numeric income cap was detected.${/income declaration|pay slip|affidavit/i.test(raw) ? " Income declaration/pay slip is also required." : ""}`; return /income declaration|pay slip|affidavit/i.test(raw) ? "Income declaration/pay slip requirement found, but no numeric income cap was detected." : "Verify income rules on official portal."; }
function extractDocuments(text) { const raw = clean(text); const docs = [["Application form", /application form/i], ["Passport-size photograph", /passport[- ]size photograph|photo/i], ["Class X/XII/Diploma/Degree certificates", /class\s*x|class\s*xii|marks memo|diploma|degree|qualifying examination/i], ["Caste certificate", /caste certificate/i], ["Non-creamy layer certificate", /non[-\s]?creamy layer certificate/i], ["Income certificate/declaration/pay slip", /income certificate|income declaration|pay slip|affidavit/i], ["Previous scholarship acknowledgement for renewal", /acknowledgement.*scholarship|renewal application/i], ["Marks statement countersigned by institution", /marks statement|counter signed|countersigned/i], ["Aadhaar card", /aadhaar/i], ["Bank passbook first page", /bank pass ?book|passbook|bank account/i], ["Bonafide certificate", /bonafide|bona fide/i], ["Disability certificate", /disability certificate|pwd certificate/i]]; return docs.filter(([, rx]) => rx.test(raw)).map(([name]) => name); }
function extractExclusions(text) { const raw = clean(text), out = []; if (/distance education/i.test(raw)) out.push("distance education courses"); if (/funded by the Central Government|funded by.*State Government|UT Administration/i.test(raw)) out.push("courses funded by Central/State/UT government"); if (/repeating the same stage|different subject\/stream/i.test(raw)) out.push("repeating same education level in another subject/stream"); if (/another professional course|second professional/i.test(raw)) out.push("second professional course after completing one professional course"); if (/fails in a class for more than one year/i.test(raw)) out.push("scholarship stops if student fails for more than one year"); return out; }
function extractApplication(text, sections) { const raw = section(sections, ["procedure_for_applying", "how_to_apply"]) || around(text, /(apply online|application form|submit|portal|head of institution)/i, 650); const parts = []; if (/apply online/i.test(raw)) parts.push("Apply online through the official portal when available."); if (/head of (the )?institution/i.test(raw)) parts.push("Submit through Head of Institution as required."); if (raw) parts.push(clean(raw).slice(0, 450)); return clean(parts.join(" ")) || "Verify application process on official portal."; }
function studentSummary(name, eligibility, benefit, income, apply) { const category = /obc/i.test(eligibility) ? "Main target appears to be OBC students." : /sc/i.test(eligibility) ? "Main target appears to include SC students." : /st/i.test(eligibility) ? "Main target appears to include ST students." : "Check category rules carefully."; return clean(`${name}. ${category} Benefit: ${benefit.displayAmount}. Income note: ${income.slice(0, 180)} Apply: ${apply.slice(0, 180)}`).slice(0, 850); }
function sourceSafetyCheck(url) { if (!isValidUrl(url)) return { level: "missing", severity: "medium", message: "No official URL found." }; try { const u = new URL(url), host = u.hostname.toLowerCase().replace(/^www\./, ""); const official = /(^|\.)(gov\.in|nic\.in|ac\.in)$/i.test(host) || /scholarships\.gov\.in|aicte-india\.org|ugc\.gov\.in|education\.gov\.in|tribal\.nic\.in|minorityaffairs\.gov\.in/i.test(host); const trusted = official || /buddy4study\.com|vidyalakshmi\.co\.in/i.test(host); if (u.protocol !== "https:") return { level: trusted ? "trusted" : "unknown", severity: "medium", message: "URL is not HTTPS. Verify before publishing." }; if (official) return { level: "official", severity: "", message: "Official/trusted government-style source detected." }; if (trusted) return { level: "trusted", severity: "", message: "Trusted scholarship portal detected; verify official source if possible." }; return { level: "unknown", severity: /\.in$|\.org$|\.edu$/.test(host) ? "medium" : "high", message: "Source is not recognized as official. Keep as draft until verified." }; } catch { return { level: "invalid", severity: "high", message: "Invalid URL." }; } }
function duplicateOf(item) { const n = normName(item.name), u = normalizeUrl(item.link), yearless = stripYear(n); let best = null; for (const record of existing) { const ru = normalizeUrl(record.link || record.sourceUrl), rn = normName(record.name || record.title || ""), rYearless = stripYear(rn); if (u && ru && u === ru) return { risk: "same_url", record, reason: "Same official URL already exists." }; if (n && rn && n === rn) return { risk: "exact", record, reason: "Same normalized name already exists." }; if (yearless && rYearless && yearless === rYearless) best = { risk: "possible_update", record, reason: "Same scheme name with different/missing year." }; } return best; }
function versionHint(item, record) { const y = yearOf(`${item.name} ${item.deadlineDate} ${item.academicYear}`), old = record ? yearOf(`${record.name || ""} ${record.deadlineDate || ""} ${record.academicYear || ""}`) : ""; if (record && y && old && y !== old) return { type: "new_version", message: `Looks like a new ${y} version of existing ${old} record. Prefer updating/versioning, not duplicate publishing.` }; if (record) return { type: "possible_duplicate", message: "Existing similar scholarship found. Compare before importing." }; return { type: "new_record", message: "No close duplicate detected." }; }
function warningsFor(item, missingFields, safety, duplicate, versionInfo) { const out = []; if (missingFields.length) out.push(`Missing: ${missingFields.join(", ")}`); if (safety.message) out.push(safety.message); if (duplicate?.record) out.push(`${duplicate.risk === "possible_update" ? "Possible update of" : "Duplicate found"}: ${duplicate.record.name}`); if (versionInfo?.message) out.push(versionInfo.message); if (item.deadlineDate && past(item.deadlineDate)) out.push("Deadline is expired."); if (/ocr/i.test(item.sourceType)) out.push("OCR text can contain mistakes. Review carefully."); return out; }
function isWeakText(text, url) { const t = clean(text), noUrls = t.replace(/https?:\/\/\S+/g, ""); const words = noUrls.split(/\s+/).filter(Boolean).length; return (isNspFilterUrl(url) && words < 120) || words < 45 || !/(scholarship|scheme|fellowship|eligib|income|deadline|amount|benefit|student|apply|application|notification|guideline|documents)/i.test(noUrls); }
function getBlockedMessage(url) { if (isNspFilterUrl(url)) return "This NSP link is dynamic/filter-only. Open the specific scheme, copy official text/PDF text, then analyze pasted text."; if (isPdfUrl(url)) return "PDF link was blocked by site/CORS or is scanned. Download it and use Analyze Uploaded PDF/OCR."; return "Site blocked reading or returned weak content. Paste official page/PDF text in fallback and analyze."; }
function isNspFilterUrl(url) { try { const u = new URL(url); return u.hostname.includes("scholarships.gov.in") && /scholarshipEligibility|scheme-filter|scheme/i.test(u.pathname); } catch { return false; } }
function isPdfUrl(url) { try { return new URL(url).pathname.toLowerCase().endsWith(".pdf"); } catch { return /\.pdf(?:$|[?#])/i.test(String(url || "")); } }
function placeholderTitle(url) { return isNspFilterUrl(url) ? "NSP specific scheme name needed" : `${sourceNameFromUrl(url)} scholarship details needed`; }
function weakEligibility(url) { return isNspFilterUrl(url) ? "This NSP URL is a filter/dynamic page. Paste the selected scheme's official eligibility text or PDF text here before importing." : "Direct link/PDF reading was blocked or weak. Paste official eligibility text from source before importing."; }
function sourceNameFromUrl(url) { try { const host = new URL(url).hostname.replace(/^www\./, ""); if (host.includes("scholarships.gov.in")) return "National Scholarship Portal"; if (host.includes("aicte")) return "AICTE"; if (host.includes("jnanabhumi")) return "AP Jnanabhumi"; if (host.includes("telanganaepass")) return "Telangana ePASS"; if (host.includes("ugc")) return "UGC"; if (host.includes("andaman") || host.includes("and.nic")) return "Andaman and Nicobar Administration"; return host.split(".").slice(0, 2).join("."); } catch { return "Official Portal"; } }
function pdfQuality(text, pages) { const avg = clean(text).length / Math.max(pages || 1, 1); return avg < 200 ? "scanned_or_poor_text_pdf" : avg < 700 ? "low_quality_text_pdf" : "digital_text_pdf"; }
function pageCount(text) { return Math.max(1, (String(text || "").match(/--- Page \d+ ---/g) || []).length); }
function around(text, regex, len) { const s = clean(text).replace(/https?:\/\/\S+/g, ""), i = s.search(regex); return i < 0 ? "" : s.slice(Math.max(0, i - 100), i + len); }
function clearWorkspace() { [els.linkUrl, els.bulkUrls, els.fallbackText, els.source, els.url, els.input].forEach((el) => setValue(el, "")); if (els.pdfFile) els.pdfFile.value = ""; candidates = []; render(); setMessage("Cleared."); }
function resolveState(v) { const t = norm(v); return INDIA_STATE_OPTIONS.find((s) => s.slug === slug(t) || norm(s.label) === t || (` ${t} `).includes(` ${norm(s.label)} `) || (` ${t} `).includes(` ${s.slug.replaceAll("-", " ")} `))?.slug || "national"; }
function line(text, label) { return String(text || "").match(new RegExp(`^\\s*${label}\\s*:?\\s*(.+)$`, "im"))?.[1]?.trim() || ""; }
function findUrl(text) { return String(text || "").match(/https?:\/\/\S+/)?.[0]?.replace(/[).,]+$/, "") || ""; }
function extractUrls(text) { return [...new Set(String(text || "").split(/\s+/).map((x) => normalizeUrl(x.replace(/[),.;]+$/, ""))).filter(Boolean))]; }
function findDate(text) { return String(text || "").match(/20\d{2}-[01]\d-[0-3]\d/)?.[0] || String(text || "").match(/[0-3]?\d[/-][01]?\d[/-]20\d{2}/)?.[0] || String(text || "").match(/[0-3]?\d\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\s+20\d{2}/i)?.[0] || ""; }
function date(v) { const s = String(v || "").trim(); if (!s || /yyyy-mm-dd/i.test(s)) return ""; const iso = s.match(/20\d{2}-[01]\d-[0-3]\d/)?.[0]; if (iso) return iso; const n = s.match(/([0-3]?\d)[/-]([01]?\d)[/-](20\d{2})/); if (n) return `${n[3]}-${n[2].padStart(2, "0")}-${n[1].padStart(2, "0")}`; const m = s.match(/([0-3]?\d)\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\s+(20\d{2})/i); if (!m) return ""; const mm = { jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06", jul: "07", aug: "08", sep: "09", sept: "09", oct: "10", nov: "11", dec: "12" }; return `${m[3]}-${mm[m[2].toLowerCase().slice(0, 4)] || mm[m[2].toLowerCase().slice(0, 3)]}-${m[1].padStart(2, "0")}`; }
function past(v) { const d = new Date(`${v}T23:59:59`); return !Number.isNaN(d.getTime()) && d.getTime() < Date.now(); }
function yearOf(v) { return String(v || "").match(/20\d{2}/)?.[0] || ""; }
function stripYear(v) { return norm(v).replace(/20\d{2}/g, "").replace(/\s+/g, " ").trim(); }
function list(v, fb) { const a = Array.isArray(v) ? v : String(v || "").split(/[,+]/); const out = a.map(cleanSlug).filter(Boolean); return out.length ? [...new Set(out)] : fb; }
function arr(v) { return Array.isArray(v) ? v.map(clean).filter(Boolean) : String(v || "").split(/[\n;]+/).map(clean).filter(Boolean); }
function disability(v) { const s = cleanSlug(v); if (s === "yes" || s.includes("pwd") || s.includes("disabled") || s.includes("disability")) return "yes"; if (s === "no") return "no"; return "any"; }
function normalizeUrl(v) { try { const u = new URL(String(v || "").trim()); return ["http:", "https:"].includes(u.protocol) ? u.href : ""; } catch { return ""; } }
function isValidUrl(v) { return Boolean(normalizeUrl(v)); }
function safeField(value, field, link) { const text = clean(value); if (!text || /^https?:\/\/\S+$/i.test(text) || text === link) { if (field === "name") return placeholderTitle(link); if (field === "eligibility") return weakEligibility(link); if (field === "income") return "Paste exact official income rule from the scheme page/PDF before importing."; } return text.replace(/https?:\/\/\S+/g, "").trim() || (field === "name" ? placeholderTitle(link) : text); }
function hostLabel(url) { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return "source"; } }
function normName(v) { return norm(v).replace(/scholarship|scheme|yojana|guidelines?|notification/g, "").replace(/\s+/g, " ").trim(); }
function norm(v) { return String(v || "").toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim(); }
function slug(v) { return norm(v).replace(/\s+/g, "-"); }
function cleanSlug(v) { return String(v || "").trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""); }
function clean(v) { return String(v || "").replace(/\s+/g, " ").trim(); }
function titleCase(v) { return clean(v).replace(/\b[a-z]/g, (x) => x.toUpperCase()); }
function num(v) { const n = Number(String(v || "").replace(/[^0-9.]/g, "")); return Number.isFinite(n) ? n : 0; }
function clamp(v, min, max) { return Math.max(min, Math.min(max, Number.isFinite(v) ? v : min)); }
function tryJson(v) { try { return JSON.parse(v); } catch { return null; } }
function value(el) { return el?.value?.trim() || ""; }
function setValue(el, v) { if (el) el.value = v || ""; }
function show(el, v) { if (el) el.textContent = v || ""; }
function setMessage(v, bad = false) { show(els.message, v); if (els.message) els.message.style.color = bad ? "#b42318" : ""; }
function escapeRegex(v) { return String(v || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
function escapeHtml(v) { return String(v || "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;"); }
