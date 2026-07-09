import { auth, db } from "./firebase-config.js";
import { checkAdminAccess } from "./admin-access.js";
import { getStateLabel, INDIA_STATE_OPTIONS, isKnownStateSlug } from "./states.js";
import { isVerifiedActiveScholarship } from "./scholarship-verification.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { addDoc, collection, getDocs, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const $ = (id) => document.getElementById(id);
const TODAY = new Date().toISOString().slice(0, 10);
const DRAFT_DEADLINE = "2099-12-31";

const BOT_CONFIGS = {
  nsp: {
    name: "National Scholarship Portal",
    url: "https://scholarships.gov.in/",
    state: "National",
    education: "school, intermediate, degree, engineering, pg",
    categories: "general, sc, st, obc, ews, minority",
    genders: "any",
    hint: "Paste official NSP scheme text or official PDF text below."
  },
  aicte: {
    name: "AICTE",
    url: "https://www.aicte-india.org/",
    state: "National",
    education: "engineering, diploma, degree, pg",
    categories: "general, sc, st, obc, ews, minority",
    genders: "any",
    hint: "Paste AICTE official Pragati/Saksham/scholarship notice text below."
  },
  ap: {
    name: "AP Jnanabhumi",
    url: "https://jnanabhumi.ap.gov.in/",
    state: "Andhra Pradesh",
    education: "school, intermediate, degree, engineering, pg",
    categories: "sc, st, obc, ews, minority, kapu",
    genders: "any",
    hint: "Paste AP Jnanabhumi official scholarship or fee reimbursement details below."
  },
  tg: {
    name: "Telangana ePASS",
    url: "https://telanganaepass.cgg.gov.in/",
    state: "Telangana",
    education: "school, intermediate, degree, engineering, pg",
    categories: "sc, st, obc, ews, minority",
    genders: "any",
    hint: "Paste Telangana ePASS official scholarship or reimbursement details below."
  },
  ugc: {
    name: "UGC",
    url: "https://www.ugc.gov.in/",
    state: "National",
    education: "degree, pg",
    categories: "general, sc, st, obc, ews, minority",
    genders: "any",
    hint: "Paste UGC official scholarship/fellowship notice text below."
  }
};

let currentUser = null;
let isAdmin = false;
let existingScholarships = [];
let analyzed = [];

const els = {
  section: $("adminBotsSection"),
  coverage: $("adminBotCoverage"),
  source: $("adminBotSource"),
  url: $("adminBotUrl"),
  input: $("adminBotInput"),
  message: $("adminBotMessage"),
  results: $("adminBotResults"),
  analyze: $("adminBotAnalyzeBtn"),
  clear: $("adminBotClearBtn"),
  importAutoActive: $("adminBotImportAutoActiveBtn"),
  importAutoDraft: $("adminBotImportAutoDraftBtn"),
  importAllDrafts: $("adminBotImportAllDraftsBtn"),
  importVerifiedActive: $("adminBotImportVerifiedActiveBtn"),
  refresh: $("adminBotRefreshBtn")
};

onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  if (!user || !els.section) return;

  const access = await checkAdminAccess(user);
  isAdmin = access.allowed;
  if (!isAdmin) return;

  bindEvents();
  await loadExistingScholarships();
});

function bindEvents() {
  document.querySelectorAll("[data-admin-bot]").forEach((button) => {
    button.addEventListener("click", () => startBot(button.dataset.adminBot));
  });
  els.refresh?.addEventListener("click", loadExistingScholarships);
  els.analyze?.addEventListener("click", analyzeInput);
  els.clear?.addEventListener("click", clearBotWorkspace);
  els.importAutoActive?.addEventListener("click", () => importCandidates("autoActive"));
  els.importAutoDraft?.addEventListener("click", () => importCandidates("autoDraft"));
  els.importAllDrafts?.addEventListener("click", () => importCandidates("allDrafts"));
  els.importVerifiedActive?.addEventListener("click", () => importCandidates("verifiedActive"));
}

async function loadExistingScholarships() {
  if (!isAdmin) return;
  setMessage("Loading bot coverage...");
  try {
    const snapshot = await getDocs(collection(db, "scholarships"));
    existingScholarships = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const active = existingScholarships.filter(isVerifiedActiveScholarship).length;
    const sources = new Set(existingScholarships.map((item) => normalizeUrl(item.sourceUrl || item.link)).filter(Boolean)).size;
    setText(els.coverage, `${existingScholarships.length} total • ${active} active verified • ${sources} unique sources`);
    setMessage(`Bot coverage loaded: ${existingScholarships.length} records.`);
    if (analyzed.length) reclassify();
  } catch (error) {
    console.error("Admin bot coverage load failed", error);
    setMessage(`Could not load Firestore: ${error.message}`, true);
  }
}

function startBot(key) {
  const bot = BOT_CONFIGS[key];
  if (!bot) return;

  setValue(els.source, bot.name);
  setValue(els.url, bot.url);
  setValue(els.input, `${bot.hint}\n\nScholarship Name\nState ${bot.state}\nEducation ${bot.education}\nCategories ${bot.categories}\nGender ${bot.genders}\nAmount Varies as per official rules\nIncome limit 0\nDeadline date YYYY-MM-DD\nOfficial link ${bot.url}\nSource ${bot.name}\nEligibility Paste exact eligibility from official source here.\nIncome note Paste exact income rule from official source here.\n---\nSecond Scholarship...`);

  window.open(bot.url, "_blank", "noopener,noreferrer");
  els.input?.focus();
  setMessage(`${bot.name} Bot ready. Paste official text, replace YYYY-MM-DD, then click Analyze + Auto Check.`);
}

function analyzeInput() {
  const raw = els.input?.value || "";
  analyzed = parseCandidates(raw).map(classifyCandidate);
  renderResults();
  const autoActive = analyzed.filter((item) => item.decision === "autoActive").length;
  const autoDraft = analyzed.filter((item) => item.decision === "autoDraft").length;
  setMessage(analyzed.length ? `Analyzed ${analyzed.length}. Auto Active: ${autoActive}. Auto Draft: ${autoDraft}.` : "Paste official scholarship text first.", !analyzed.length);
}

function reclassify() {
  analyzed = analyzed.map(classifyCandidate);
  renderResults();
}

function parseCandidates(raw) {
  const text = String(raw || "").trim();
  if (!text) return [];

  const parsedJson = tryParseJson(text);
  if (parsedJson) {
    const list = Array.isArray(parsedJson) ? parsedJson : parsedJson.candidates || [parsedJson];
    return list.filter(Boolean).map(normalizeJsonCandidate);
  }

  return text
    .split(/\n---+\n/g)
    .map((block) => block.trim())
    .filter(Boolean)
    .map(parseTextCandidate)
    .filter((item) => item.name && !/second scholarship|paste official|bot ready/i.test(item.name));
}

function normalizeJsonCandidate(item) {
  const link = normalizeUrl(item.sourceUrl || item.link || item.url || fieldValue(els.url));
  const state = resolveState(item.state || item.stateLabel || "national");
  return normalizeCandidate({
    name: item.name || item.title || item.scholarshipName || "",
    state,
    amount: item.amount || "Varies as per official rules",
    maxIncome: number(item.maxIncome || item.incomeLimit || item.income || 0),
    minPercentage: number(item.minPercentage || item.percentage || item.marks || 0),
    deadline: item.deadline || item.deadlineText || item.lastDate || "Check official portal",
    deadlineDate: normalizeDate(item.deadlineDate || item.date || item.lastDateDate || item.lastDate || ""),
    link,
    sourceUrl: link,
    education: toList(item.education || item.course || item.courses, ["any"]),
    categories: toList(item.categories || item.category, ["general"]),
    genders: toList(item.genders || item.gender, ["any"]),
    disability: normalizeDisability(item.disability),
    eligibilityNote: cleanText(item.eligibilityNote || item.eligibility || item.description || "Verify eligibility on official portal before applying."),
    incomeNote: cleanText(item.incomeNote || item.incomeRule || "Verify income rules on official portal."),
    sourceName: cleanText(item.sourceName || item.source || fieldValue(els.source) || "Official Portal"),
    priority: clamp(number(item.priority || item.confidence || 60), 0, 100)
  });
}

function parseTextCandidate(block) {
  const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
  const firstLine = lines.find((line) => !/paste official|bot ready|yyyy-mm-dd/i.test(line)) || "";
  const link = normalizeUrl(findUrl(block) || fieldValue(els.url));
  const state = resolveState(lineValue(block, "state") || block);
  const deadlineDate = normalizeDate(lineValue(block, "deadline date") || lineValue(block, "last date") || findDate(block));

  return normalizeCandidate({
    name: cleanText(lineValue(block, "name") || lineValue(block, "scholarship name") || firstLine),
    state,
    amount: cleanText(lineValue(block, "amount") || "Varies as per official rules"),
    maxIncome: number(lineValue(block, "income limit") || lineValue(block, "income") || 0),
    minPercentage: number(lineValue(block, "minimum percentage") || lineValue(block, "percentage") || 0),
    deadline: cleanText(lineValue(block, "deadline") || lineValue(block, "last date") || deadlineDate || "Check official portal"),
    deadlineDate,
    link,
    sourceUrl: link,
    education: toList(lineValue(block, "education") || lineValue(block, "course") || lineValue(block, "courses"), ["any"]),
    categories: toList(lineValue(block, "categories") || lineValue(block, "category"), ["general"]),
    genders: toList(lineValue(block, "gender") || lineValue(block, "genders"), ["any"]),
    disability: normalizeDisability(lineValue(block, "disability")),
    eligibilityNote: cleanText(lineValue(block, "eligibility") || block.slice(0, 700) || "Verify eligibility on official portal before applying."),
    incomeNote: cleanText(lineValue(block, "income note") || lineValue(block, "income") || "Verify income rules on official portal."),
    sourceName: cleanText(lineValue(block, "source") || fieldValue(els.source) || "Official Portal"),
    priority: 60
  });
}

function normalizeCandidate(item) {
  const state = isKnownStateSlug(item.state) ? item.state : "national";
  const link = normalizeUrl(item.link || item.sourceUrl || fieldValue(els.url));
  return {
    name: cleanText(item.name).slice(0, 200),
    state,
    stateLabel: getStateLabel(state),
    status: "draft",
    amount: cleanText(item.amount || "Varies as per official rules").slice(0, 120),
    maxIncome: number(item.maxIncome),
    minPercentage: clamp(number(item.minPercentage), 0, 100),
    deadline: cleanText(item.deadline || "Check official portal").slice(0, 160),
    deadlineDate: normalizeDate(item.deadlineDate),
    link,
    sourceUrl: link,
    education: toList(item.education, ["any"]),
    categories: toList(item.categories, ["general"]),
    genders: toList(item.genders, ["any"]),
    disability: normalizeDisability(item.disability),
    eligibilityNote: cleanText(item.eligibilityNote || "Verify eligibility on official portal before applying.").slice(0, 1200),
    incomeNote: cleanText(item.incomeNote || "Verify income rules on official portal.").slice(0, 800),
    priority: clamp(number(item.priority || 60), 0, 100),
    sourceName: cleanText(item.sourceName || fieldValue(els.source) || "Official Portal").slice(0, 120),
    applicationWindow: "open",
    academicYear: String(new Date().getFullYear()),
    verifiedOn: TODAY,
    verificationNote: `Checked through Admin Panel Bots on ${TODAY}. Verify official source before major student communication.`,
    lastChecked: TODAY
  };
}

function classifyCandidate(item) {
  const duplicate = findDuplicate(item);
  const errors = validateCandidate(item, true);
  const warnings = validateCandidate(item, false).filter((warning) => !errors.includes(warning));
  const confidence = scoreCandidate(item, duplicate, errors, warnings);

  let decision = "review";
  if (duplicate) decision = "skipDuplicate";
  else if (item.deadlineDate && isPastDate(item.deadlineDate)) decision = "skipExpired";
  else if (!errors.length && confidence >= 90 && canPublishActive(item)) decision = "autoActive";
  else if (!errors.some((error) => !error.toLowerCase().includes("deadline")) && confidence >= 70 && isValidUrl(item.link)) decision = "autoDraft";

  return {
    ...item,
    duplicateId: duplicate?.id || "",
    duplicateName: duplicate?.name || "",
    errors,
    warnings,
    confidence,
    decision
  };
}

function validateCandidate(item, strictDeadline) {
  const issues = [];
  if (!item.name || item.name.length < 4) issues.push("Missing scholarship name.");
  if (!isKnownStateSlug(item.state)) issues.push("Unknown state.");
  if (!isValidUrl(item.link)) issues.push("Missing valid official link.");
  if (strictDeadline && !item.deadlineDate) issues.push("Missing YYYY-MM-DD deadline date.");
  if (item.deadlineDate && isPastDate(item.deadlineDate)) issues.push("Deadline is already expired.");
  if (!item.sourceName || item.sourceName.length < 2) issues.push("Missing source name.");
  if (!item.education.length) issues.push("Missing education list.");
  if (!item.categories.length) issues.push("Missing category list.");
  if (!item.eligibilityNote || item.eligibilityNote.length < 11) issues.push("Eligibility note too short.");
  if (!item.incomeNote || item.incomeNote.length < 6) issues.push("Income note too short.");
  return issues;
}

function scoreCandidate(item, duplicate, errors, warnings) {
  let score = 0;
  if (!duplicate) score += 12;
  if (isValidUrl(item.link)) score += 16;
  if (item.name?.length >= 8) score += 14;
  if (item.deadlineDate && !isPastDate(item.deadlineDate)) score += 16;
  if (item.sourceName?.length >= 2) score += 8;
  if (item.education?.length) score += 8;
  if (item.categories?.length) score += 8;
  if (item.eligibilityNote?.length >= 60) score += 10;
  if (item.incomeNote?.length >= 20) score += 5;
  if (/official|nsp|aicte|jnanabhumi|epass|ugc|portal/i.test(item.sourceName)) score += 3;
  score -= errors.length * 10;
  score -= warnings.length * 2;
  return clamp(Math.round(score), 0, 100);
}

function findDuplicate(item) {
  const name = normalizeName(item.name);
  const link = normalizeUrl(item.link || item.sourceUrl);
  return existingScholarships.find((scholarship) => {
    const sameName = name && normalizeName(scholarship.name) === name;
    const sameUrl = link && normalizeUrl(scholarship.link || scholarship.sourceUrl) === link;
    return sameName || sameUrl;
  });
}

function renderResults() {
  if (!els.results) return;
  if (!analyzed.length) {
    els.results.innerHTML = "<p class='mini-note'>No bot results yet.</p>";
    return;
  }

  els.results.innerHTML = analyzed.map((item) => {
    const decisionClass = item.decision === "autoActive" ? "success" : item.decision === "autoDraft" ? "warning" : "danger";
    const issueList = item.errors.length
      ? `<ul>${item.errors.map((error) => `<li>${escapeHtml(error)}</li>`).join("")}</ul>`
      : item.duplicateName
        ? `<p class="mini-note">Duplicate: ${escapeHtml(item.duplicateName)}</p>`
        : `<p class="mini-note">Ready for ${escapeHtml(item.decision)}.</p>`;
    return `
      <article class="admin-tool-card">
        <span class="tagline ${decisionClass}">${escapeHtml(item.decision)} • ${item.confidence}%</span>
        <h3>${escapeHtml(item.name || "Unnamed scholarship")}</h3>
        <p class="mini-note"><strong>State:</strong> ${escapeHtml(item.stateLabel)} • <strong>Deadline:</strong> ${escapeHtml(item.deadlineDate || "missing")}</p>
        <p class="mini-note"><strong>Source:</strong> ${escapeHtml(item.sourceName)} ${item.link ? `• <a href="${escapeHtml(item.link)}" target="_blank" rel="noopener noreferrer">official link</a>` : ""}</p>
        <p class="mini-note"><strong>Eligibility:</strong> ${escapeHtml(item.eligibilityNote)}</p>
        ${issueList}
      </article>`;
  }).join("");
}

async function importCandidates(mode) {
  if (!isAdmin) return setMessage("Admin access required.", true);
  if (!analyzed.length) return setMessage("Analyze candidates first.", true);

  let records = [];
  let targetStatus = "draft";

  if (mode === "autoActive") {
    records = analyzed.filter((item) => item.decision === "autoActive");
    targetStatus = "active";
  } else if (mode === "autoDraft") {
    records = analyzed.filter((item) => item.decision === "autoDraft");
  } else if (mode === "verifiedActive") {
    records = analyzed.filter((item) => canPublishActive(item) && !item.duplicateId);
    targetStatus = "active";
  } else {
    records = analyzed.filter((item) => !item.duplicateId && !item.decision.startsWith("skip") && item.decision !== "review");
  }

  if (!records.length) return setMessage("No candidates match this import mode.", true);

  try {
    setMessage(`Importing ${records.length} records...`);
    for (const item of records) {
      await addDoc(collection(db, "scholarships"), {
        ...toFirestoreRecord(item, targetStatus),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: currentUser.email || currentUser.uid,
        updatedBy: currentUser.email || currentUser.uid
      });
    }
    setMessage(`Imported ${records.length} scholarship records as ${targetStatus}.`);
    await loadExistingScholarships();
  } catch (error) {
    console.error("Admin bot import failed", error);
    setMessage(`Import failed: ${error.message}`, true);
  }
}

function toFirestoreRecord(item, status) {
  const clean = { ...item };
  ["duplicateId", "duplicateName", "errors", "warnings", "confidence", "decision"].forEach((key) => delete clean[key]);
  const deadlineDate = clean.deadlineDate || DRAFT_DEADLINE;
  return {
    ...clean,
    status,
    deadlineDate,
    deadline: clean.deadlineDate ? clean.deadline : "Needs official deadline verification",
    applicationWindow: status === "active" ? "open" : "verify",
    sourceType: "admin-panel-bot",
    verifiedOn: TODAY,
    lastChecked: TODAY,
    verificationNote: status === "active"
      ? `Published through Admin Panel Bot on ${TODAY} after official-source check.`
      : `Saved as draft through Admin Panel Bot on ${TODAY} for review.`
  };
}

function canPublishActive(item) {
  return !validateCandidate(item, true).length && isValidUrl(item.link) && Boolean(item.deadlineDate) && !isPastDate(item.deadlineDate);
}

function clearBotWorkspace() {
  setValue(els.input, "");
  setValue(els.source, "");
  setValue(els.url, "");
  analyzed = [];
  renderResults();
  setMessage("Bot workspace cleared.");
}

function resolveState(value) {
  const text = normalizeText(value);
  const direct = INDIA_STATE_OPTIONS.find((state) => state.slug === slugText(text) || normalizeText(state.label) === text);
  if (direct) return direct.slug;
  const padded = ` ${text} `;
  const found = INDIA_STATE_OPTIONS.find((state) => padded.includes(` ${normalizeText(state.label)} `) || padded.includes(` ${state.slug.replaceAll("-", " ")} `));
  return found?.slug || "national";
}

function lineValue(text, label) {
  const match = String(text || "").match(new RegExp(`^\\s*${label}\\s*:?\\s*(.+)$`, "im"));
  return match?.[1]?.trim() || "";
}

function findUrl(text) {
  return String(text || "").match(/https?:\/\/\S+/)?.[0]?.replace(/[).,]+$/, "") || "";
}

function findDate(text) {
  return String(text || "").match(/20\d{2}-[01]\d-[0-3]\d/)?.[0] || String(text || "").match(/[0-3]?\d[/-][01]?\d[/-]20\d{2}/)?.[0] || "";
}

function normalizeDate(value) {
  const text = String(value || "").trim();
  if (!text || /yyyy-mm-dd/i.test(text)) return "";
  const iso = text.match(/20\d{2}-[01]\d-[0-3]\d/)?.[0];
  if (iso) return iso;
  const slash = text.match(/([0-3]?\d)[/-]([01]?\d)[/-](20\d{2})/);
  if (!slash) return "";
  return `${slash[3]}-${slash[2].padStart(2, "0")}-${slash[1].padStart(2, "0")}`;
}

function isPastDate(value) {
  if (!value) return false;
  const date = new Date(`${value}T23:59:59`);
  return !Number.isNaN(date.getTime()) && date.getTime() < Date.now();
}

function toList(value, fallback) {
  const items = Array.isArray(value)
    ? value
    : String(value || "").split(/[,+]/);
  const cleaned = items.map((item) => cleanSlug(item)).filter(Boolean);
  return cleaned.length ? [...new Set(cleaned)] : fallback;
}

function normalizeDisability(value) {
  const text = cleanSlug(value);
  if (text === "yes" || text.includes("pwd") || text.includes("disabled") || text.includes("disability")) return "yes";
  if (text === "no") return "no";
  return "any";
}

function normalizeUrl(value) {
  try {
    const url = new URL(String(value || "").trim());
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

function isValidUrl(value) {
  return Boolean(normalizeUrl(value));
}

function normalizeName(value) {
  return normalizeText(value).replace(/scholarship|scheme|yojana/g, "").replace(/\s+/g, " ").trim();
}

function normalizeText(value) {
  return String(value || "").toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function slugText(value) {
  return normalizeText(value).replace(/\s+/g, "-");
}

function cleanSlug(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
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

function tryParseJson(text) {
  try { return JSON.parse(text); } catch { return null; }
}

function fieldValue(element) {
  return element?.value?.trim() || "";
}

function setValue(element, value) {
  if (element) element.value = value || "";
}

function setText(element, value) {
  if (element) element.textContent = value || "";
}

function setMessage(message, isError = false) {
  if (!els.message) return;
  els.message.textContent = message || "";
  els.message.style.color = isError ? "#b42318" : "";
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
