import { auth, db } from "./firebase-config.js";
import { getStateLabel, INDIA_STATE_OPTIONS, isKnownStateSlug } from "./states.js";
import { isVerifiedActiveScholarship } from "./scholarship-verification.js";
import {
  getIdTokenResult,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  addDoc,
  collection,
  getDocs,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const $ = (id) => document.getElementById(id);
const STATUSES = Object.freeze(["missing", "duplicate", "invalid"]);

let currentAdminUser = null;
let isAdmin = false;
let currentRecords = [];
let analyzedCandidates = [];

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
    window.location.replace("login.html");
    return;
  }

  currentAdminUser = user;

  try {
    const token = await getIdTokenResult(user, true);
    isAdmin = token?.claims?.admin === true;
  } catch (error) {
    console.error("Discovery admin claim check failed", error);
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
  if (els.adminEmail) els.adminEmail.textContent = `Admin: ${user.email || "custom-claim user"}`;
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
}

async function loadCoverage() {
  if (!isAdmin) return;
  setMessage("Loading current Firestore scholarships...");

  try {
    const snapshot = await getDocs(collection(db, "scholarships"));
    currentRecords = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
    renderCoverage();
    setMessage(`Loaded ${currentRecords.length} current Firestore records.`);
    if (analyzedCandidates.length) analyzeInput();
  } catch (error) {
    console.error("Discovery coverage load failed", error);
    currentRecords = [];
    renderCoverage();
    setMessage("Could not load current Firestore records. Check admin claim and Firestore rules.", true);
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

function analyzeInput() {
  const raw = els.input?.value || "";
  const candidates = parseCandidates(raw).map((item) => classifyCandidate(item));
  analyzedCandidates = candidates;
  renderCandidates();

  const counts = countByStatus(candidates);
  const total = candidates.length;
  show(els.candidateSummary, total
    ? `Analyzed ${total} candidates: ${counts.missing} missing, ${counts.duplicate} duplicate, ${counts.invalid} invalid.`
    : "No candidates found. Paste official-source text or JSON first."
  );
  setMessage(total ? "Analysis complete. Review cards before importing." : "Paste scholarship source text first.", !total);
}

function parseCandidates(raw) {
  const text = String(raw || "").trim();
  if (!text) return [];

  const json = tryParseJson(text);
  if (json) return normalizeJsonCandidates(Array.isArray(json) ? json : [json]);

  return text
    .split(/\n---+\n/g)
    .map((block) => block.trim())
    .filter(Boolean)
    .map(parseTextBlock);
}

function normalizeJsonCandidates(items) {
  return items
    .filter((item) => item && typeof item === "object")
    .map((item) => {
      const state = resolveStateSlug(item.state || item.stateLabel || "national");
      const link = normalizeUrl(item.sourceUrl || item.link || item.url || value(els.defaultUrl));
      const sourceName = cleanText(item.sourceName || item.source || value(els.defaultSource) || "Official Portal");

      return normalizeCandidate({
        name: item.name || item.title || item.scholarshipName || "",
        state,
        stateLabel: getStateLabel(state),
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
        eligibilityNote: cleanText(item.eligibilityNote || item.eligibility || item.description || "Verify eligibility on official portal before applying."),
        incomeNote: cleanText(item.incomeNote || item.incomeRule || "Verify income rules on official portal."),
        priority: clamp(number(item.priority || 60), 0, 100)
      });
    });
}

function parseTextBlock(block) {
  const first = block.split("\n").map((line) => line.trim()).filter(Boolean)[0] || "";
  const state = resolveStateSlug(findLine(block, "state") || block);
  const link = normalizeUrl(findUrl(block) || value(els.defaultUrl));
  const deadlineDate = normalizeDate(findLine(block, "deadline date") || findLine(block, "last date") || findDate(block));
  const sourceName = cleanText(findLine(block, "source") || value(els.defaultSource) || "Official Portal");

  return normalizeCandidate({
    name: cleanText(findLine(block, "name") || first.replace(/^add\s+/i, "")),
    state,
    stateLabel: getStateLabel(state),
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
    eligibilityNote: cleanText(findLine(block, "eligibility") || "Verify eligibility on official portal before applying."),
    incomeNote: cleanText(findLine(block, "income note") || "Verify income rules on official portal."),
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
    minPercentage: number(item.minPercentage),
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
    verificationNote: `Discovered and verified by admin on ${today()}. Re-check official portal before major student communication.`,
    lastChecked: today()
  };
}

function classifyCandidate(candidate) {
  const issues = validateCandidate(candidate);
  const duplicate = findDuplicate(candidate);
  let status = "missing";
  if (issues.length) status = "invalid";
  else if (duplicate) status = "duplicate";

  return {
    ...candidate,
    discoveryStatus: status,
    discoveryIssues: issues,
    duplicateId: duplicate?.id || "",
    duplicateName: duplicate?.name || ""
  };
}

function validateCandidate(item) {
  const issues = [];
  if (!item.name || item.name.length < 4) issues.push("Missing scholarship name.");
  if (!isKnownStateSlug(item.state)) issues.push("Unknown state.");
  if (!item.sourceName) issues.push("Missing source name.");
  if (!isValidUrl(item.sourceUrl || item.link)) issues.push("Missing valid official source URL.");
  if (!item.deadlineDate) issues.push("Missing YYYY-MM-DD deadline date.");
  if (item.deadlineDate && isPastDate(item.deadlineDate)) issues.push("Deadline date is already expired.");
  if (!item.education.length) issues.push("Missing education list.");
  if (!item.categories.length) issues.push("Missing category list.");
  if (!item.eligibilityNote || item.eligibilityNote.length < 11) issues.push("Eligibility note is too short.");
  if (!item.incomeNote || item.incomeNote.length < 6) issues.push("Income note is too short.");
  return issues;
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
  const issueText = item.discoveryIssues.length
    ? `<ul>${item.discoveryIssues.map((issue) => `<li>${escapeHtml(issue)}</li>`).join("")}</ul>`
    : item.discoveryStatus === "duplicate"
      ? `<p class="mini-note">Already found: ${escapeHtml(item.duplicateName || item.duplicateId)}</p>`
      : `<p class="mini-note">Ready to import.</p>`;

  return `
    <article class="candidate-card">
      <div class="candidate-badges">
        <span class="candidate-badge ${badgeClass}">${escapeHtml(item.discoveryStatus)}</span>
        <span class="candidate-badge">${escapeHtml(item.stateLabel)}</span>
        <span class="candidate-badge">${escapeHtml(item.deadlineDate || "no deadline")}</span>
      </div>
      <h3>${escapeHtml(item.name || "Unnamed scholarship")}</h3>
      <p class="info"><strong>Source:</strong> ${escapeHtml(item.sourceName)} ${item.link ? `• <a href="${escapeHtml(item.link)}" target="_blank" rel="noopener noreferrer">official link</a>` : ""}</p>
      <p class="info"><strong>Education:</strong> ${escapeHtml(item.education.join(", "))} • <strong>Categories:</strong> ${escapeHtml(item.categories.join(", "))}</p>
      <p class="info"><strong>Eligibility:</strong> ${escapeHtml(item.eligibilityNote)}</p>
      ${issueText}
    </article>
  `;
}

async function importCandidates(mode) {
  if (!isAdmin) return;
  if (!analyzedCandidates.length) return setMessage("Analyze candidates before importing.", true);

  const importable = analyzedCandidates.filter((item) => item.discoveryStatus === "missing");
  if (!importable.length) return setMessage("No missing valid scholarships to import.", true);

  const activeOnly = mode === "active";
  const records = importable.filter((item) => !activeOnly || canPublishActive(item));
  if (!records.length) return setMessage("No candidates pass verified-active rules. Import as drafts or fix missing fields.", true);

  setBusy(activeOnly ? els.importActiveBtn : els.importDraftsBtn, true, "Importing...");

  try {
    let imported = 0;
    for (const item of records) {
      await addDoc(collection(db, "scholarships"), {
        ...toFirestoreRecord(item, activeOnly ? "active" : "draft"),
        sourceType: "discovery-assistant",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: currentAdminUser.email || currentAdminUser.uid,
        updatedBy: currentAdminUser.email || currentAdminUser.uid
      });
      imported += 1;
    }

    setMessage(`Imported ${imported} missing scholarships as ${activeOnly ? "verified active" : "draft"} records.`);
    await loadCoverage();
  } catch (error) {
    console.error("Discovery import failed", error);
    setMessage("Import failed. Check Firestore rules and candidate fields.", true);
  } finally {
    setBusy(activeOnly ? els.importActiveBtn : els.importDraftsBtn, false);
  }
}

function toFirestoreRecord(item, status) {
  const clean = { ...item };
  delete clean.discoveryStatus;
  delete clean.discoveryIssues;
  delete clean.duplicateId;
  delete clean.duplicateName;
  return {
    ...clean,
    status,
    applicationWindow: status === "closed" ? "closed" : "open",
    verifiedOn: today(),
    lastChecked: today(),
    verificationNote: status === "active"
      ? `Published through Discovery Assistant on ${today()} after admin official-source review.`
      : `Saved as draft through Discovery Assistant on ${today()} for later review.`
  };
}

function canPublishActive(item) {
  return !validateCandidate(item).length &&
    isValidUrl(item.sourceUrl || item.link) &&
    !isPastDate(item.deadlineDate) &&
    item.sourceName &&
    item.verifiedOn;
}

function useExample() {
  set(els.defaultSource, "Official Portal");
  set(els.defaultUrl, "https://scholarships.gov.in/");
  set(els.input, `AICTE Pragati Scholarship
State National
Education engineering, diploma
Categories general, sc, st, obc, ews, minority
Gender female
Amount ₹50,000 per year
Income limit 800000
Deadline date 2099-12-31
Official link https://www.aicte-india.org/
Source AICTE
Eligibility Girl students pursuing technical education in AICTE approved institutions as per official rules.
Income note Family income rules must be verified on the official notification.
---
Karnataka Student Support Scholarship
State Karnataka
Education degree, engineering
Categories general, obc, ews
Gender any
Amount Varies as per official rules
Income limit 250000
Deadline date 2099-12-31
Official link https://scholarships.gov.in/
Source Official Portal
Eligibility Eligible Karnataka students as per the official scheme notification.
Income note Check official family income limits before applying.`);
  analyzeInput();
}

function clearDiscovery() {
  set(els.input, "");
  set(els.defaultSource, "");
  set(els.defaultUrl, "");
  analyzedCandidates = [];
  renderCandidates();
  show(els.candidateSummary, "Analyze source text to see missing, duplicate, and invalid records.");
  setMessage("");
}

function countByStatus(items) {
  return STATUSES.reduce((out, status) => {
    out[status] = items.filter((item) => item.discoveryStatus === status).length;
    return out;
  }, {});
}

function tryParseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function resolveStateSlug(value) {
  const text = normalizeText(value);
  const slugged = slugText(text);
  const direct = INDIA_STATE_OPTIONS.find((state) => state.slug === slugged || slugText(state.label) === slugged);
  if (direct) return direct.slug;

  const paddedText = ` ${text} ${slugged.replaceAll("-", " ")} `;
  const match = INDIA_STATE_OPTIONS.find((state) => {
    const label = normalizeText(state.label);
    const slugWords = state.slug.replaceAll("-", " ");
    return paddedText.includes(` ${label} `) || paddedText.includes(` ${slugWords} `);
  });

  return match?.slug || "national";
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slugText(value) {
  return normalizeText(value).replace(/\s+/g, "-");
}

function normalizeName(value) {
  return normalizeText(value).replace(/scholarship|scheme|yojana/g, "").replace(/\s+/g, " ").trim();
}

function normalizeDate(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  const iso = text.match(/20\d{2}-[01]\d-[0-3]\d/)?.[0];
  if (iso) return iso;
  const slash = text.match(/([0-3]?\d)[/-]([01]?\d)[/-](20\d{2})/);
  if (slash) {
    const [, day, month, year] = slash;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  return "";
}

function isPastDate(value) {
  if (!value) return false;
  const date = new Date(`${value}T23:59:59`);
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() < Date.now();
}

function findLine(text, label) {
  const rx = new RegExp(`^\\s*${label}\\s*:?\\s*(.+)$`, "im");
  return text.match(rx)?.[1]?.trim() || "";
}

function findDate(text) {
  return text.match(/20\d{2}-[01]\d-[0-3]\d/)?.[0] || text.match(/[0-3]?\d[/-][01]?\d[/-]20\d{2}/)?.[0] || "";
}

function findUrl(text) {
  return text.match(/https?:\/\/\S+/)?.[0]?.replace(/[).,]+$/, "") || "";
}

function listOrDefault(value, fallback) {
  const items = Array.isArray(value)
    ? value.map(cleanSlug).filter(Boolean)
    : String(value || "").split(",").map(cleanSlug).filter(Boolean);
  return items.length ? [...new Set(items)] : fallback;
}

function normalizeDisability(value) {
  const text = cleanSlug(value);
  if (text === "yes" || text.includes("disabled") || text.includes("disability")) return "yes";
  if (text === "no") return "no";
  return "any";
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

function today() {
  return new Date().toISOString().slice(0, 10);
}

function value(element) { return element?.value?.trim() || ""; }
function set(element, value) { if (element) element.value = value ?? ""; }
function show(element, value) { if (element) element.textContent = value || ""; }
function setText(element, value) { if (element) element.textContent = String(value ?? "—"); }
function setMessage(message, danger = false) { if (els.message) { els.message.textContent = message || ""; els.message.style.color = danger ? "#b42318" : ""; } }
function setBusy(button, busy, label) { if (!button) return; button.disabled = busy; if (busy && label) button.dataset.originalText = button.textContent; button.textContent = busy ? label : button.dataset.originalText || button.textContent; }
function escapeHtml(value) { return String(value || "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;"); }
