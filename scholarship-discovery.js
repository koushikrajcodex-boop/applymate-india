import { auth, db } from "./firebase-config.js";
import { checkAdminAccess } from "./admin-access.js";
import { getStateLabel, INDIA_STATE_OPTIONS, isKnownStateSlug } from "./states.js";
import { isVerifiedActiveScholarship } from "./scholarship-verification.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { addDoc, collection, getDocs, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const $ = (id) => document.getElementById(id);
const STATUSES = Object.freeze(["missing", "duplicate", "invalid"]);
const AUTO_DECISIONS = Object.freeze(["autoActive", "autoDraft", "review", "skipDuplicate", "skipExpired"]);
const DRAFT_PLACEHOLDER_DATE = "2099-12-31";

let currentAdminUser = null;
let isAdmin = false;
let currentAdminAccess = null;
let currentRecords = [];
let analyzedCandidates = [];

const BOT_CONFIGS = {
  nsp: {
    source: "National Scholarship Portal",
    url: "https://scholarships.gov.in/",
    state: "National",
    education: "school, intermediate, degree, engineering, pg",
    categories: "general, sc, st, obc, ews, minority",
    genders: "any",
    hint: "Paste official NSP scheme text, scheme guidelines, or scheme table here."
  },
  aicte: {
    source: "AICTE",
    url: "https://www.aicte-india.org/",
    state: "National",
    education: "engineering, degree, pg",
    categories: "general, sc, st, obc, ews, minority",
    genders: "any",
    hint: "Paste AICTE official Pragati/Saksham/scholarship notification text here."
  },
  ap: {
    source: "AP Jnanabhumi",
    url: "https://jnanabhumi.ap.gov.in/",
    state: "Andhra Pradesh",
    education: "school, intermediate, degree, engineering, pg",
    categories: "sc, st, obc, ews, minority, kapu",
    genders: "any",
    hint: "Paste official Jnanabhumi scheme or fee reimbursement details here."
  },
  tg: {
    source: "Telangana ePASS",
    url: "https://telanganaepass.cgg.gov.in/",
    state: "Telangana",
    education: "school, intermediate, degree, engineering, pg",
    categories: "sc, st, obc, ews, minority",
    genders: "any",
    hint: "Paste official Telangana ePASS scheme/update text here."
  },
  ugc: {
    source: "UGC",
    url: "https://www.ugc.gov.in/",
    state: "National",
    education: "degree, pg",
    categories: "general, sc, st, obc, ews, minority",
    genders: "any",
    hint: "Paste UGC official scholarship/fellowship notification text here."
  }
};

const els = {
  adminEmail: $("discoveryAdminEmail"),
  locked: $("discoveryLocked"),
  content: $("discoveryContent"),
  logoutBtn: $("discoveryLogoutBtn"),
  refreshBtn: $("refreshDiscoveryBtn"),
  defaultSource: $("defaultDiscoverySource"),
  defaultUrl: $("defaultDiscoveryUrl"),
  input: $("discoveryInput"),
  analyzeBtn: $("analyzeDiscoveryBtn"),
  exampleBtn: $("exampleDiscoveryBtn"),
  clearBtn: $("clearDiscoveryBtn"),
  importDraftsBtn: $("importDraftsBtn"),
  importActiveBtn: $("importActiveBtn"),
  importAutoActiveBtn: $("importAutoActiveBtn"),
  importAutoDraftBtn: $("importAutoDraftBtn"),
  loadRadarBtn: $("loadRadarBtn"),
  radarMessage: $("radarMessage"),
  radarAutoActive: $("radarAutoActive"),
  radarAutoDraft: $("radarAutoDraft"),
  radarReview: $("radarReview"),
  radarSkip: $("radarSkip"),
  botNspBtn: $("botNspBtn"),
  botAicteBtn: $("botAicteBtn"),
  botApBtn: $("botApBtn"),
  botTgBtn: $("botTgBtn"),
  botUgcBtn: $("botUgcBtn"),
  message: $("discoveryMessage"),
  candidateSummary: $("candidateSummary"),
  candidateList: $("candidateList"),
  coverageTotal: $("coverageTotal"),
  coverageActive: $("coverageActive"),
  coverageNames: $("coverageNames"),
  coverageSources: $("coverageSources")
};

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.replace("login.html?redirect=scholarship-discovery.html");
    return;
  }

  currentAdminUser = user;

  try {
    currentAdminAccess = await checkAdminAccess(user);
    isAdmin = currentAdminAccess.allowed;
  } catch (error) {
    console.error("Discovery admin access check failed", error);
    window.location.replace("dashboard.html?adminAccess=error");
    return;
  }

  if (!isAdmin) {
    els.locked?.classList.remove("hidden");
    els.content?.classList.add("hidden");
    window.location.replace("dashboard.html?adminAccess=denied");
    return;
  }

  els.locked?.classList.add("hidden");
  els.content?.classList.remove("hidden");
  const via = currentAdminAccess?.viaEmail ? "admin email" : "custom claim";
  show(els.adminEmail, `Admin: ${user.email || "approved admin"} (${via})`);
  setupEvents();
  await loadCoverage();
});

function setupEvents() {
  els.logoutBtn?.addEventListener("click", async () => {
    await signOut(auth);
    window.location.replace("login.html");
  });
  els.refreshBtn?.addEventListener("click", loadCoverage);
  els.analyzeBtn?.addEventListener("click", analyzeInput);
  els.exampleBtn?.addEventListener("click", useExample);
  els.clearBtn?.addEventListener("click", clearDiscovery);
  els.importDraftsBtn?.addEventListener("click", () => importCandidates("draft"));
  els.importActiveBtn?.addEventListener("click", () => importCandidates("active"));
  els.importAutoActiveBtn?.addEventListener("click", () => importCandidates("autoActive"));
  els.importAutoDraftBtn?.addEventListener("click", () => importCandidates("autoDraft"));
  els.loadRadarBtn?.addEventListener("click", loadRadarReport);
  els.botNspBtn?.addEventListener("click", () => startBot("nsp"));
  els.botAicteBtn?.addEventListener("click", () => startBot("aicte"));
  els.botApBtn?.addEventListener("click", () => startBot("ap"));
  els.botTgBtn?.addEventListener("click", () => startBot("tg"));
  els.botUgcBtn?.addEventListener("click", () => startBot("ugc"));
}

function startBot(key) {
  const bot = BOT_CONFIGS[key];
  if (!bot) return;
  set(els.defaultSource, bot.source);
  set(els.defaultUrl, bot.url);
  set(els.input, `${bot.hint}\n\nScholarship Name\nState ${bot.state}\nEducation ${bot.education}\nCategories ${bot.categories}\nGender ${bot.genders}\nAmount Varies as per official rules\nIncome limit 0\nDeadline date YYYY-MM-DD\nOfficial link ${bot.url}\nSource ${bot.source}\nEligibility Paste exact official eligibility details here.\nIncome note Paste exact official income rule here.\n---\nSecond scholarship...`);
  setMessage(`${bot.source} Bot ready. Official portal opened in a new tab. Paste official text, replace YYYY-MM-DD, then click Analyze + Auto Check.`);
  window.open(bot.url, "_blank", "noopener,noreferrer");
  els.input?.focus();
}

async function loadCoverage() {
  if (!isAdmin) return;
  setMessage("Loading current Firestore scholarships...");
  try {
    const snapshot = await getDocs(collection(db, "scholarships"));
    currentRecords = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
    renderCoverage();
    setMessage(`Loaded ${currentRecords.length} current Firestore records.`);
    if (analyzedCandidates.length) reclassifyCandidates();
  } catch (error) {
    console.error("Discovery coverage load failed", error);
    currentRecords = [];
    renderCoverage();
    setMessage("Could not load Firestore records. Confirm rules allow your approved admin email.", true);
  }
}

function renderCoverage() {
  const names = new Set(currentRecords.map((item) => normalizeName(item.name)).filter(Boolean));
  const sources = new Set(currentRecords.map((item) => normalizeUrl(item.sourceUrl || item.link)).filter(Boolean));
  setText(els.coverageTotal, currentRecords.length);
  setText(els.coverageActive, currentRecords.filter(isVerifiedActiveScholarship).length);
  setText(els.coverageNames, names.size);
  setText(els.coverageSources, sources.size);
}

async function loadRadarReport() {
  setRadarMessage("Loading radar report...");
  try {
    const response = await fetch(`data/radar-report.json?t=${Date.now()}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const report = await response.json();
    const totals = report.totals || {};
    setText(els.radarAutoActive, totals.autoActive || 0);
    setText(els.radarAutoDraft, totals.autoDraft || 0);
    setText(els.radarReview, totals.review || 0);
    setText(els.radarSkip, Number(totals.skipDuplicate || 0) + Number(totals.skipExpired || 0));
    setRadarMessage(`Radar generated ${totals.total || 0} candidates at ${report.generatedAt || "unknown time"}. Use manual bots for fast fixes/imports.`);
  } catch (error) {
    console.error("Radar report load failed", error);
    setRadarMessage("Could not load radar report yet. Run GitHub Action once or use manual bots now.", true);
  }
}

function analyzeInput() {
  const raw = els.input?.value || "";
  analyzedCandidates = parseCandidates(raw).map((item) => classifyCandidate(item));
  renderCandidates();
  renderSummary();
  setMessage(analyzedCandidates.length ? "Auto check complete. Review the badges, then import auto-safe records." : "Paste official scholarship text first.", !analyzedCandidates.length);
}

function reclassifyCandidates() {
  analyzedCandidates = analyzedCandidates.map((item) => classifyCandidate(item));
  renderCandidates();
  renderSummary();
}

function parseCandidates(raw) {
  const text = String(raw || "").trim();
  if (!text) return [];
  const json = tryParseJson(text);
  if (json) return normalizeJsonCandidates(Array.isArray(json) ? json : json.candidates || [json]);
  return text.split(/\n---+\n/g).map((block) => block.trim()).filter(Boolean).map(parseTextBlock);
}

function normalizeJsonCandidates(items) {
  return items.filter((item) => item && typeof item === "object").map((item) => {
    const state = resolveStateSlug(item.state || item.stateLabel || "national");
    const link = normalizeUrl(item.sourceUrl || item.link || item.url || value(els.defaultUrl));
    const sourceName = cleanText(item.sourceName || item.source || value(els.defaultSource) || "Official Portal");
    return normalizeCandidate({
      name: item.name || item.title || item.scholarshipName || "",
      state,
      amount: item.amount || "Varies as per official rules",
      maxIncome: number(item.maxIncome || item.incomeLimit || item.income || 0),
      minPercentage: number(item.minPercentage || item.percentage || item.marks || 0),
      deadline: item.deadline || item.deadlineText || item.lastDate || "Check official portal",
      deadlineDate: normalizeDate(item.deadlineDate || item.lastDateDate || item.date || ""),
      link,
      sourceUrl: link,
      sourceName,
      education: listOrDefault(item.education || item.course || item.courses, ["any"]),
      categories: listOrDefault(item.categories || item.category, ["general"]),
      genders: listOrDefault(item.genders || item.gender, ["any"]),
      disability: normalizeDisability(item.disability),
      eligibilityNote: cleanText(item.eligibilityNote || item.eligibility || item.description || item.warnings?.join(" ") || "Verify eligibility on official portal before applying."),
      incomeNote: cleanText(item.incomeNote || item.incomeRule || "Verify income rules on official portal."),
      priority: clamp(number(item.priority || item.confidence || 60), 0, 100)
    });
  });
}

function parseTextBlock(block) {
  const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
  const first = lines.find((line) => !/bot ready|paste official|second scholarship/i.test(line)) || "";
  const state = resolveStateSlug(findLine(block, "state") || block);
  const link = normalizeUrl(findUrl(block) || value(els.defaultUrl));
  const deadlineDate = normalizeDate(findLine(block, "deadline date") || findLine(block, "last date") || findDate(block));
  const sourceName = cleanText(findLine(block, "source") || value(els.defaultSource) || "Official Portal");
  return normalizeCandidate({
    name: cleanText(findLine(block, "name") || first.replace(/^add\s+/i, "")),
    state,
    amount: cleanText(findLine(block, "amount") || "Varies as per official rules"),
    maxIncome: number(findLine(block, "income limit") || findLine(block, "income") || 0),
    minPercentage: number(findLine(block, "minimum percentage") || findLine(block, "percentage") || 0),
    deadline: cleanText(findLine(block, "deadline") || findLine(block, "last date") || deadlineDate || "Check official portal"),
    deadlineDate,
    link,
    sourceUrl: link,
    sourceName,
    education: listOrDefault(findLine(block, "education") || findLine(block, "course") || findLine(block, "courses"), ["any"]),
    categories: listOrDefault(findLine(block, "categories") || findLine(block, "category"), ["general"]),
    genders: listOrDefault(findLine(block, "gender") || findLine(block, "genders"), ["any"]),
    disability: normalizeDisability(findLine(block, "disability")),
    eligibilityNote: cleanText(findLine(block, "eligibility") || block.slice(0, 650) || "Verify eligibility on official portal before applying."),
    incomeNote: cleanText(findLine(block, "income note") || findLine(block, "income") || "Verify income rules on official portal."),
    priority: 60
  });
}

function normalizeCandidate(item) {
  const state = isKnownStateSlug(item.state) ? item.state : "national";
  const link = normalizeUrl(item.link || item.sourceUrl);
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
    education: listOrDefault(item.education, ["any"]),
    categories: listOrDefault(item.categories, ["general"]),
    genders: listOrDefault(item.genders, ["any"]),
    disability: normalizeDisability(item.disability),
    eligibilityNote: cleanText(item.eligibilityNote || "Verify eligibility on official portal before applying.").slice(0, 1200),
    incomeNote: cleanText(item.incomeNote || "Verify income rules on official portal.").slice(0, 800),
    priority: clamp(number(item.priority || 60), 0, 100),
    sourceName: cleanText(item.sourceName || "Official Portal").slice(0, 120),
    applicationWindow: "open",
    academicYear: new Date().getFullYear().toString(),
    verifiedOn: today(),
    verificationNote: `Checked through Admin Bot Console on ${today()}. Re-check official portal before major student communication.`,
    lastChecked: today()
  };
}

function classifyCandidate(candidate) {
  const duplicate = findDuplicate(candidate);
  const issues = validateCandidate(candidate, { strictDate: true });
  const warnings = validateCandidate(candidate, { strictDate: false }).filter((issue) => !issues.includes(issue));
  let discoveryStatus = "missing";
  if (duplicate) discoveryStatus = "duplicate";
  else if (issues.some((issue) => !issue.includes("deadline"))) discoveryStatus = "invalid";

  const confidence = scoreConfidence(candidate, duplicate, issues, warnings);
  let autoDecision = "review";
  if (duplicate) autoDecision = "skipDuplicate";
  else if (candidate.deadlineDate && isPastDate(candidate.deadlineDate)) autoDecision = "skipExpired";
  else if (discoveryStatus === "missing" && confidence >= 90 && canPublishActive(candidate)) autoDecision = "autoActive";
  else if (discoveryStatus === "missing" && confidence >= 70 && isValidUrl(candidate.sourceUrl || candidate.link)) autoDecision = "autoDraft";

  return {
    ...candidate,
    discoveryStatus,
    discoveryIssues: issues,
    discoveryWarnings: warnings,
    autoDecision,
    confidence,
    duplicateId: duplicate?.id || "",
    duplicateName: duplicate?.name || ""
  };
}

function validateCandidate(item, options = {}) {
  const strictDate = options.strictDate !== false;
  const issues = [];
  if (!item.name || item.name.length < 4 || /second scholarship|paste official|yyyy-mm-dd/i.test(item.name)) issues.push("Missing scholarship name.");
  if (!isKnownStateSlug(item.state)) issues.push("Unknown state.");
  if (!item.sourceName) issues.push("Missing source name.");
  if (!isValidUrl(item.sourceUrl || item.link)) issues.push("Missing valid official source URL.");
  if (!item.deadlineDate && strictDate) issues.push("Missing YYYY-MM-DD deadline date.");
  if (item.deadlineDate && isPastDate(item.deadlineDate)) issues.push("Deadline date is already expired.");
  if (!item.education.length) issues.push("Missing education list.");
  if (!item.categories.length) issues.push("Missing category list.");
  if (!item.eligibilityNote || item.eligibilityNote.length < 11) issues.push("Eligibility note is too short.");
  if (!item.incomeNote || item.incomeNote.length < 6) issues.push("Income note is too short.");
  return issues;
}

function scoreConfidence(item, duplicate, issues, warnings) {
  let score = 0;
  if (!duplicate) score += 12;
  if (isValidUrl(item.link)) score += 16;
  if (item.name && item.name.length >= 8) score += 16;
  if (item.deadlineDate && !isPastDate(item.deadlineDate)) score += 16;
  if (item.education?.length) score += 8;
  if (item.categories?.length) score += 8;
  if (item.eligibilityNote?.length >= 60) score += 12;
  if (item.incomeNote?.length >= 20) score += 6;
  if (/official|portal|nsp|aicte|jnanabhumi|epass|ugc/i.test(item.sourceName)) score += 6;
  score -= issues.length * 12;
  score -= warnings.length * 2;
  return clamp(Math.round(score), 0, 100);
}

function findDuplicate(candidate) {
  const candidateName = normalizeName(candidate.name);
  const candidateUrl = normalizeUrl(candidate.sourceUrl || candidate.link);
  return currentRecords.find((item) => {
    const sameName = candidateName && normalizeName(item.name) === candidateName;
    const sameUrl = candidateUrl && normalizeUrl(item.sourceUrl || item.link) === candidateUrl;
    return sameName || sameUrl;
  });
}

function renderCandidates() {
  if (!els.candidateList) return;
  if (!analyzedCandidates.length) {
    els.candidateList.innerHTML = "<p class='mini-note'>No candidates analyzed yet.</p>";
    return;
  }
  els.candidateList.innerHTML = analyzedCandidates.map(candidateCard).join("");
}

function candidateCard(item) {
  const badgeClass = item.discoveryStatus === "missing" ? "ok" : item.discoveryStatus === "duplicate" ? "warn" : "bad";
  const decisionClass = item.autoDecision === "autoActive" ? "ok" : item.autoDecision === "autoDraft" ? "warn" : item.autoDecision.startsWith("skip") ? "skip" : "bad";
  const issueText = item.discoveryIssues.length
    ? `<ul>${item.discoveryIssues.map((issue) => `<li>${escapeHtml(issue)}</li>`).join("")}</ul>`
    : item.discoveryStatus === "duplicate"
      ? `<p class="mini-note">Already found: ${escapeHtml(item.duplicateName || item.duplicateId)}</p>`
      : `<p class="mini-note">Ready for ${item.autoDecision === "autoActive" ? "safe active import" : item.autoDecision === "autoDraft" ? "draft import" : "review"}.</p>`;
  const warnText = item.discoveryWarnings?.length ? `<p class="mini-note"><strong>Warnings:</strong> ${escapeHtml(item.discoveryWarnings.join(" "))}</p>` : "";
  return `
    <article class="candidate-card">
      <div class="candidate-badges">
        <span class="candidate-badge ${badgeClass}">${escapeHtml(item.discoveryStatus)}</span>
        <span class="candidate-badge ${decisionClass}">${escapeHtml(item.autoDecision)} • ${escapeHtml(String(item.confidence))}%</span>
        <span class="candidate-badge">${escapeHtml(item.stateLabel)}</span>
        <span class="candidate-badge">${escapeHtml(item.deadlineDate || "no deadline")}</span>
      </div>
      <h3>${escapeHtml(item.name || "Unnamed scholarship")}</h3>
      <p class="info"><strong>Source:</strong> ${escapeHtml(item.sourceName)} ${item.link ? `• <a href="${escapeHtml(item.link)}" target="_blank" rel="noopener noreferrer">official link</a>` : ""}</p>
      <p class="info"><strong>Education:</strong> ${escapeHtml(item.education.join(", "))} • <strong>Categories:</strong> ${escapeHtml(item.categories.join(", "))}</p>
      <p class="info"><strong>Eligibility:</strong> ${escapeHtml(item.eligibilityNote)}</p>
      ${issueText}${warnText}
    </article>`;
}

function renderSummary() {
  const total = analyzedCandidates.length;
  const statusCounts = countBy(STATUSES, (status) => analyzedCandidates.filter((item) => item.discoveryStatus === status).length);
  const autoCounts = countBy(AUTO_DECISIONS, (status) => analyzedCandidates.filter((item) => item.autoDecision === status).length);
  show(els.candidateSummary, total ? `Analyzed ${total}: ${statusCounts.missing} missing, ${statusCounts.duplicate} duplicate, ${statusCounts.invalid} invalid. Auto: ${autoCounts.autoActive} active, ${autoCounts.autoDraft} drafts, ${autoCounts.review} review.` : "No candidates found.");
}

async function importCandidates(mode) {
  if (!isAdmin) return setMessage("Admin access required.", true);
  if (!analyzedCandidates.length) return setMessage("Analyze candidates before importing.", true);

  let records = [];
  let status = "draft";
  if (mode === "autoActive") {
    records = analyzedCandidates.filter((item) => item.autoDecision === "autoActive");
    status = "active";
  } else if (mode === "autoDraft") {
    records = analyzedCandidates.filter((item) => item.autoDecision === "autoDraft");
  } else if (mode === "active") {
    records = analyzedCandidates.filter((item) => item.discoveryStatus === "missing" && canPublishActive(item));
    status = "active";
  } else {
    records = analyzedCandidates.filter((item) => item.discoveryStatus === "missing" && !item.autoDecision.startsWith("skip") && item.autoDecision !== "review");
  }

  if (!records.length) return setMessage("No candidates match this import mode.", true);
  const busyBtn = mode === "autoActive" ? els.importAutoActiveBtn : mode === "autoDraft" ? els.importAutoDraftBtn : status === "active" ? els.importActiveBtn : els.importDraftsBtn;
  setBusy(busyBtn, true, "Importing...");

  try {
    let imported = 0;
    for (const item of records) {
      await addDoc(collection(db, "scholarships"), {
        ...toFirestoreRecord(item, status),
        sourceType: "admin-manual-bot",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: currentAdminUser.email || currentAdminUser.uid,
        updatedBy: currentAdminUser.email || currentAdminUser.uid
      });
      imported += 1;
    }
    setMessage(`Imported ${imported} scholarship records as ${status}.`);
    await loadCoverage();
  } catch (error) {
    console.error("Bot import failed", error);
    setMessage(`Import failed: ${error.message || "Check Firestore rules and candidate fields."}`, true);
  } finally {
    setBusy(busyBtn, false);
  }
}

function toFirestoreRecord(item, status) {
  const clean = { ...item };
  ["discoveryStatus", "discoveryIssues", "discoveryWarnings", "autoDecision", "confidence", "duplicateId", "duplicateName"].forEach((field) => delete clean[field]);
  const deadlineDate = status === "draft" && !clean.deadlineDate ? DRAFT_PLACEHOLDER_DATE : clean.deadlineDate;
  return {
    ...clean,
    status,
    deadlineDate,
    deadline: clean.deadlineDate ? clean.deadline : "Needs official deadline verification",
    applicationWindow: status === "active" ? "open" : "verify",
    verifiedOn: today(),
    lastChecked: today(),
    verificationNote: status === "active" ? `Published through Admin Bot Console on ${today()} after official-source check.` : `Saved as draft through Admin Bot Console on ${today()} for review.`
  };
}

function canPublishActive(item) {
  return !validateCandidate(item, { strictDate: true }).length && isValidUrl(item.sourceUrl || item.link) && !isPastDate(item.deadlineDate) && item.sourceName && item.verifiedOn;
}

function useExample() {
  set(els.defaultSource, "AICTE");
  set(els.defaultUrl, "https://www.aicte-india.org/");
  set(els.input, `AICTE Pragati Scholarship\nState National\nEducation engineering, diploma\nCategories general, sc, st, obc, ews, minority\nGender female\nAmount ₹50,000 per year\nIncome limit 800000\nDeadline date 2099-12-31\nOfficial link https://www.aicte-india.org/\nSource AICTE\nEligibility Girl students pursuing technical education in AICTE approved institutions as per official rules.\nIncome note Family income rules must be verified on the official notification.`);
  analyzeInput();
}

function clearDiscovery() {
  set(els.input, "");
  set(els.defaultSource, "");
  set(els.defaultUrl, "");
  analyzedCandidates = [];
  renderCandidates();
  show(els.candidateSummary, "Start a source bot or paste official text to see auto-safe, draft, duplicate, and invalid records.");
  setMessage("");
}

function countBy(keys, fn) { return keys.reduce((out, key) => ({ ...out, [key]: fn(key) }), {}); }
function tryParseJson(text) { try { return JSON.parse(text); } catch { return null; } }

function resolveStateSlug(value) {
  const text = normalizeText(value);
  const slugged = slugText(text);
  const direct = INDIA_STATE_OPTIONS.find((state) => state.slug === slugged || slugText(state.label) === slugged);
  if (direct) return direct.slug;
  const padded = ` ${text} ${slugged.replaceAll("-", " ")} `;
  const match = INDIA_STATE_OPTIONS.find((state) => padded.includes(` ${normalizeText(state.label)} `) || padded.includes(` ${state.slug.replaceAll("-", " ")} `));
  return match?.slug || "national";
}

function normalizeText(value) { return String(value || "").toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim(); }
function slugText(value) { return normalizeText(value).replace(/\s+/g, "-"); }
function normalizeName(value) { return normalizeText(value).replace(/scholarship|scheme|yojana/g, "").replace(/\s+/g, " ").trim(); }
function normalizeDate(value) { const text = String(value || "").trim(); if (!text || /yyyy-mm-dd/i.test(text)) return ""; const iso = text.match(/20\d{2}-[01]\d-[0-3]\d/)?.[0]; if (iso) return iso; const slash = text.match(/([0-3]?\d)[/-]([01]?\d)[/-](20\d{2})/); return slash ? `${slash[3]}-${slash[2].padStart(2, "0")}-${slash[1].padStart(2, "0")}` : ""; }
function isPastDate(value) { if (!value) return false; const date = new Date(`${value}T23:59:59`); return !Number.isNaN(date.getTime()) && date.getTime() < Date.now(); }
function findLine(text, label) { const rx = new RegExp(`^\\s*${label}\\s*:?\\s*(.+)$`, "im"); return text.match(rx)?.[1]?.trim() || ""; }
function findDate(text) { return text.match(/20\d{2}-[01]\d-[0-3]\d/)?.[0] || text.match(/[0-3]?\d[/-][01]?\d[/-]20\d{2}/)?.[0] || ""; }
function findUrl(text) { return text.match(/https?:\/\/\S+/)?.[0]?.replace(/[).,]+$/, "") || ""; }
function listOrDefault(value, fallback) { const items = Array.isArray(value) ? value.map(cleanSlug).filter(Boolean) : String(value || "").split(",").map(cleanSlug).filter(Boolean); return items.length ? [...new Set(items)] : fallback; }
function normalizeDisability(value) { const text = cleanSlug(value); if (text === "yes" || text.includes("disabled") || text.includes("disability") || text.includes("pwd")) return "yes"; if (text === "no") return "no"; return "any"; }
function cleanSlug(value) { return String(value || "").trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""); }
function cleanText(value) { return String(value || "").replace(/\s+/g, " ").trim(); }
function number(value) { const n = Number(String(value || "").replace(/[^0-9.]/g, "")); return Number.isFinite(n) ? n : 0; }
function clamp(value, min, max) { return Math.max(min, Math.min(max, Number.isFinite(value) ? value : min)); }
function normalizeUrl(value) { try { const url = new URL(String(value || "").trim()); return ["http:", "https:"].includes(url.protocol) ? url.href : ""; } catch { return ""; } }
function isValidUrl(value) { return Boolean(normalizeUrl(value)); }
function today() { return new Date().toISOString().slice(0, 10); }
function value(element) { return element?.value?.trim() || ""; }
function set(element, value) { if (element) element.value = value ?? ""; }
function show(element, value) { if (element) element.textContent = value || ""; }
function setText(element, value) { if (element) element.textContent = String(value ?? "—"); }
function setMessage(message, danger = false) { if (els.message) { els.message.textContent = message || ""; els.message.style.color = danger ? "#b42318" : ""; } }
function setRadarMessage(message, danger = false) { if (els.radarMessage) { els.radarMessage.textContent = message || ""; els.radarMessage.style.color = danger ? "#b42318" : ""; } }
function setBusy(button, busy, label) { if (!button) return; if (busy && !button.dataset.originalText) button.dataset.originalText = button.textContent; button.disabled = busy; button.textContent = busy ? label : button.dataset.originalText || button.textContent; }
function escapeHtml(value) { return String(value || "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;"); }
