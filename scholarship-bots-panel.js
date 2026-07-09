import { auth, db } from "./firebase-config.js";
import { checkAdminAccess } from "./admin-access.js";
import { getStateLabel, INDIA_STATE_OPTIONS, isKnownStateSlug } from "./states.js";
import { isVerifiedActiveScholarship } from "./scholarship-verification.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { addDoc, collection, getDocs, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const $ = (id) => document.getElementById(id);
const today = new Date().toISOString().slice(0, 10);
const draftDeadline = "2099-12-31";

let currentUser = null;
let existing = [];
let candidates = [];
let adminReady = false;

const els = {
  email: $("botPanelAdminEmail"),
  locked: $("botPanelLocked"),
  content: $("botPanelContent"),
  coverage: $("botPanelCoverage"),
  linkUrl: $("linkAnalyzerUrl"),
  fallbackText: $("linkFallbackText"),
  source: $("botPanelSource"),
  url: $("botPanelUrl"),
  input: $("botPanelInput"),
  message: $("botPanelMessage"),
  results: $("botPanelResults"),
  refresh: $("botPanelRefreshBtn"),
  fetchLink: $("linkAnalyzeBtn"),
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
    setMessage("Coverage loaded. Paste a scholarship link now.");
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
  setMessage("Trying to fetch and read the official link...");

  try {
    const html = await fetchLinkHtml(url);
    const pageText = htmlToReadableText(html);
    if (isWeakPageText(pageText, url)) throw new Error("weak-or-dynamic-page");

    const format = buildScholarshipFormat({ url, text: pageText, sourceName: sourceNameFromUrl(url) });
    setValue(els.input, format);
    setValue(els.fallbackText, pageText.slice(0, 4000));
    analyzeGeneratedFormat();
    setMessage("Link read successfully. Format auto-filled and analyzed.");
  } catch (error) {
    console.warn("Link fetch/extraction failed", error);
    const starter = buildScholarshipFormat({ url, text: "", sourceName: sourceNameFromUrl(url), weakPage: true });
    setValue(els.input, starter);
    analyzeGeneratedFormat();
    setMessage(getBlockedMessage(url), true);
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
  setMessage("Pasted official text converted into Add Scholarship format and analyzed.");
}

async function fetchLinkHtml(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(url, {
      method: "GET",
      mode: "cors",
      credentials: "omit",
      cache: "no-store",
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
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
  return clean(pieces.join("\n")).slice(0, 16000);
}

function isWeakPageText(text, url) {
  const t = clean(text);
  const withoutUrls = t.replace(/https?:\/\/\S+/g, "").trim();
  const scholarshipWords = /(scholarship|scheme|fellowship|eligib|income|deadline|last date|amount|benefit|student|apply|application)/i.test(withoutUrls);
  const urlCount = (t.match(/https?:\/\//g) || []).length;
  const wordCount = withoutUrls.split(/\s+/).filter(Boolean).length;
  const dynamicNsp = isNspFilterUrl(url) && wordCount < 120;
  return dynamicNsp || wordCount < 45 || !scholarshipWords || urlCount > Math.max(2, wordCount / 10);
}

function getBlockedMessage(url) {
  if (isNspFilterUrl(url)) {
    return "This NSP link is a dynamic/filter page, not a readable individual scheme page. Open the specific scheme/result on NSP, copy the official scheme text/table/PDF text, paste it in the fallback box, then click Analyze Pasted Text.";
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

function buildScholarshipFormat({ url, text, sourceName, weakPage = false }) {
  const weak = weakPage || isWeakPageText(text || "", url || "");
  const title = weak ? placeholderTitle(url) : guessTitle(text, url);
  const state = weak ? guessState("", url) : guessState(text, url);
  const education = weak ? "any" : guessEducation(text);
  const categories = weak ? "general, sc, st, obc, ews, minority" : guessCategories(text);
  const gender = weak ? "any" : guessGender(text);
  const amount = weak ? "Varies as per official rules" : guessAmount(text);
  const income = weak ? "0" : guessIncome(text);
  const deadlineDate = weak ? "" : guessDeadlineDate(text);
  const eligibility = weak ? weakEligibilityText(url) : guessEligibility(text);
  const incomeNote = weak ? "Paste exact official income rule from the scheme page/PDF before importing." : guessIncomeNote(text);

  return `Scholarship Name ${title}\nState ${state}\nEducation ${education}\nCategories ${categories}\nGender ${gender}\nAmount ${amount}\nIncome limit ${income}\nDeadline date ${deadlineDate || "YYYY-MM-DD"}\nOfficial link ${url || "https://official-portal.example/scheme"}\nSource ${sourceName || "Official Portal"}\nEligibility ${eligibility}\nIncome note ${incomeNote}`;
}

function placeholderTitle(url) {
  if (isNspFilterUrl(url)) return "NSP specific scheme name needed";
  return `${sourceNameFromUrl(url)} scholarship details needed`;
}

function weakEligibilityText(url) {
  if (isNspFilterUrl(url)) return "This NSP URL is a filter/dynamic page. Paste the selected scheme's official eligibility text or PDF text here before importing.";
  return "Direct link reading was blocked or weak. Paste official eligibility text from the source before importing.";
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
  return normalize({
    name: safeField(item.name || item.title || item.scholarshipName || "", "name", link),
    state: resolveState(item.state || item.stateLabel || "national"),
    amount: item.amount || "Varies as per official rules",
    maxIncome: num(item.maxIncome || item.incomeLimit || item.income || 0),
    minPercentage: num(item.minPercentage || item.percentage || item.marks || 0),
    deadline: item.deadline || item.deadlineText || item.lastDate || "Check official portal",
    deadlineDate: date(item.deadlineDate || item.lastDateDate || item.date || item.lastDate || ""),
    link,
    sourceUrl: link,
    education: list(item.education || item.course || item.courses, ["any"]),
    categories: list(item.categories || item.category, ["general"]),
    genders: list(item.genders || item.gender, ["any"]),
    disability: disability(item.disability),
    eligibilityNote: safeField(item.eligibilityNote || item.eligibility || item.description || "Verify eligibility on official portal before applying.", "eligibility", link),
    incomeNote: safeField(item.incomeNote || item.incomeRule || "Verify income rules on official portal.", "income", link),
    sourceName: clean(item.sourceName || item.source || value(els.source) || sourceNameFromUrl(link) || "Official Portal"),
    priority: clamp(num(item.priority || 60), 0, 100)
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
  els.results.innerHTML = candidates.map((item) => `<article class="bot-card"><span class="bot-status ${item.decision === "autoActive" ? "good" : item.decision === "autoDraft" ? "warn" : "bad"}">${escapeHtml(item.decision)} • ${item.score}%</span><h3>${escapeHtml(item.name)}</h3><p class="bot-mini"><strong>State:</strong> ${escapeHtml(item.stateLabel)} • <strong>Deadline:</strong> ${escapeHtml(item.deadlineDate || "missing")}</p><p class="bot-mini"><strong>Source:</strong> ${escapeHtml(item.sourceName)} ${item.link ? `• <a href="${escapeHtml(item.link)}" target="_blank" rel="noopener noreferrer">official link</a>` : ""}</p><p class="bot-mini"><strong>Eligibility:</strong> ${escapeHtml(item.eligibilityNote)}</p>${item.duplicateName ? `<p class="bot-mini"><strong>Duplicate:</strong> ${escapeHtml(item.duplicateName)}</p>` : ""}${item.errors.length ? `<ul>${item.errors.map((e) => `<li>${escapeHtml(e)}</li>`).join("")}</ul>` : "<p class='bot-mini'>Ready.</p>"}</article>`).join("");
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
  return { ...copy, status, deadlineDate: copy.deadlineDate || draftDeadline, deadline: copy.deadlineDate ? copy.deadline : "Needs official deadline verification", applicationWindow: status === "active" ? "open" : "verify", sourceType: "scholarship-link-analyzer", verifiedOn: today, lastChecked: today, verificationNote: status === "active" ? `Published from Scholarship Link Analyzer on ${today} after official-source check.` : `Saved as draft from Scholarship Link Analyzer on ${today} for review.` };
}

function guessTitle(text, url) {
  const cleanText = clean(text).replace(/https?:\/\/\S+/g, " ");
  const candidates = cleanText.split(/(?<=[.!?])\s+|\n|\|/).map((x) => clean(x)).filter((x) => x.length >= 8 && x.length <= 140);
  const strong = candidates.find((x) => /scholarship|scheme|fellowship|grant|stipend|pragati|saksham|post matric|pre matric/i.test(x) && !/login|home|copyright|official website/i.test(x));
  return strong || placeholderTitle(url);
}
function guessState(text, url) { const domain = String(url || "").toLowerCase(); if (domain.includes("jnanabhumi") || /andhra pradesh|\bap\b/i.test(text)) return "Andhra Pradesh"; if (domain.includes("telangana") || /telangana/i.test(text)) return "Telangana"; const found = INDIA_STATE_OPTIONS.find((s) => new RegExp(`\\b${escapeRegex(s.label)}\\b`, "i").test(text)); return found?.label || "National"; }
function guessEducation(text) { const t = norm(text); const out = []; if (/school|class|pre matric|prematric/.test(t)) out.push("school"); if (/intermediate|inter/.test(t)) out.push("intermediate"); if (/degree|under graduate|undergraduate|ug/.test(t)) out.push("degree"); if (/engineering|btech|b e |technical|diploma/.test(t)) out.push("engineering"); if (/post graduate|postgraduate|pg|masters|m tech/.test(t)) out.push("pg"); return out.length ? [...new Set(out)].join(", ") : "any"; }
function guessCategories(text) { const t = norm(text); const out = []; if (/general|open category/.test(t)) out.push("general"); if (/\bsc\b|scheduled caste/.test(t)) out.push("sc"); if (/\bst\b|scheduled tribe/.test(t)) out.push("st"); if (/\bobc\b|backward class|\bbc\b/.test(t)) out.push("obc"); if (/ews|economically weaker/.test(t)) out.push("ews"); if (/minority|muslim|christian|sikh|buddhist|jain|parsi/.test(t)) out.push("minority"); if (/kapu/.test(t)) out.push("kapu"); return out.length ? [...new Set(out)].join(", ") : "general, sc, st, obc, ews, minority"; }
function guessGender(text) { const t = norm(text); if (/girl|female|women|woman/.test(t)) return "female"; if (/boy|male/.test(t)) return "male"; return "any"; }
function guessAmount(text) { return text.match(/₹\s?[0-9][0-9,]*(?:\s?(?:per year|p\.a\.|annually|yearly))?/i)?.[0] || text.match(/rs\.?\s?[0-9][0-9,]*/i)?.[0] || "Varies as per official rules"; }
function guessIncome(text) { const hit = text.match(/(?:income|annual income|family income)[^₹\d]{0,100}(?:₹|rs\.?\s?)?([0-9][0-9,]{3,})/i); return hit ? hit[1].replace(/,/g, "") : "0"; }
function guessDeadlineDate(text) { return date(findDate(text)); }
function guessEligibility(text) { return snippetAround(text, /(eligib|eligible|who can apply|criteria|student)/i, 700) || clean(text).replace(/https?:\/\/\S+/g, "").slice(0, 700) || "Verify eligibility on official portal before applying."; }
function guessIncomeNote(text) { return snippetAround(text, /(income|annual income|family income)/i, 450) || "Verify income rules on official portal."; }
function snippetAround(text, regex, len) { const cleanText = clean(text).replace(/https?:\/\/\S+/g, ""); const match = cleanText.search(regex); if (match < 0) return ""; return cleanText.slice(Math.max(0, match - 80), match + len); }
function sourceNameFromUrl(url) { try { const host = new URL(url).hostname.replace(/^www\./, ""); if (host.includes("scholarships.gov.in")) return "National Scholarship Portal"; if (host.includes("aicte")) return "AICTE"; if (host.includes("jnanabhumi")) return "AP Jnanabhumi"; if (host.includes("telanganaepass")) return "Telangana ePASS"; if (host.includes("ugc")) return "UGC"; return host.split(".").slice(0, 2).join("."); } catch { return "Official Portal"; } }
function clearWorkspace() { setValue(els.linkUrl, ""); setValue(els.fallbackText, ""); setValue(els.source, ""); setValue(els.url, ""); setValue(els.input, ""); candidates = []; render(); setMessage("Cleared."); }
function duplicateOf(item) { const n = normName(item.name), u = normalizeUrl(item.link); return existing.find((s) => (n && normName(s.name) === n) || (u && normalizeUrl(s.link || s.sourceUrl) === u)); }
function resolveState(v) { const t = norm(v); const found = INDIA_STATE_OPTIONS.find((s) => s.slug === slug(t) || norm(s.label) === t || (` ${t} `).includes(` ${norm(s.label)} `) || (` ${t} `).includes(` ${s.slug.replaceAll("-", " ")} `)); return found?.slug || "national"; }
function line(text, label) { return String(text || "").match(new RegExp(`^\\s*${label}\\s*:?\\s*(.+)$`, "im"))?.[1]?.trim() || ""; }
function findUrl(text) { return String(text || "").match(/https?:\/\/\S+/)?.[0]?.replace(/[).,]+$/, "") || ""; }
function findDate(text) { return String(text || "").match(/20\d{2}-[01]\d-[0-3]\d/)?.[0] || String(text || "").match(/[0-3]?\d[/-][01]?\d[/-]20\d{2}/)?.[0] || ""; }
function date(v) { const s = String(v || "").trim(); if (!s || /yyyy-mm-dd/i.test(s)) return ""; const iso = s.match(/20\d{2}-[01]\d-[0-3]\d/)?.[0]; if (iso) return iso; const m = s.match(/([0-3]?\d)[/-]([01]?\d)[/-](20\d{2})/); return m ? `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}` : ""; }
function past(v) { const d = new Date(`${v}T23:59:59`); return !Number.isNaN(d.getTime()) && d.getTime() < Date.now(); }
function list(v, fb) { const arr = Array.isArray(v) ? v : String(v || "").split(/[,+]/); const out = arr.map((x) => cleanSlug(x)).filter(Boolean); return out.length ? [...new Set(out)] : fb; }
function disability(v) { const s = cleanSlug(v); if (s === "yes" || s.includes("pwd") || s.includes("disabled") || s.includes("disability")) return "yes"; if (s === "no") return "no"; return "any"; }
function normalizeUrl(v) { try { const u = new URL(String(v || "").trim()); return ["http:", "https:"].includes(u.protocol) ? u.href : ""; } catch { return ""; } }
function isValidUrl(v) { return Boolean(normalizeUrl(v)); }
function isOnlyUrl(v) { const text = clean(v); return /^https?:\/\/\S+$/i.test(text) || /^www\.\S+$/i.test(text); }
function normName(v) { return norm(v).replace(/scholarship|scheme|yojana/g, "").replace(/\s+/g, " ").trim(); }
function norm(v) { return String(v || "").toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim(); }
function slug(v) { return norm(v).replace(/\s+/g, "-"); }
function cleanSlug(v) { return String(v || "").trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""); }
function clean(v) { return String(v || "").replace(/\s+/g, " ").trim(); }
function num(v) { const n = Number(String(v || "").replace(/[^0-9.]/g, "")); return Number.isFinite(n) ? n : 0; }
function clamp(v, min, max) { return Math.max(min, Math.min(max, Number.isFinite(v) ? v : min)); }
function tryJson(v) { try { return JSON.parse(v); } catch { return null; } }
function value(el) { return el?.value?.trim() || ""; }
function setValue(el, v) { if (el) el.value = v || ""; }
function show(el, v) { if (el) el.textContent = v || ""; }
function setMessage(v, bad = false) { show(els.message, v); if (els.message) els.message.style.color = bad ? "#b42318" : ""; }
function escapeRegex(value) { return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
function escapeHtml(v) { return String(v || "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;"); }
