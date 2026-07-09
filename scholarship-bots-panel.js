import { auth, db } from "./firebase-config.js";
import { checkAdminAccess } from "./admin-access.js";
import { getStateLabel, INDIA_STATE_OPTIONS, isKnownStateSlug } from "./states.js";
import { isVerifiedActiveScholarship } from "./scholarship-verification.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { addDoc, collection, getDocs, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const $ = (id) => document.getElementById(id);
const today = new Date().toISOString().slice(0, 10);
const draftDeadline = "2099-12-31";

const bots = {
  nsp: { name: "National Scholarship Portal", url: "https://scholarships.gov.in/", state: "National", education: "school, intermediate, degree, engineering, pg", categories: "general, sc, st, obc, ews, minority", gender: "any", hint: "Paste official NSP scheme text or PDF text below." },
  aicte: { name: "AICTE", url: "https://www.aicte-india.org/", state: "National", education: "engineering, diploma, degree, pg", categories: "general, sc, st, obc, ews, minority", gender: "any", hint: "Paste AICTE official scholarship notice text below." },
  ap: { name: "AP Jnanabhumi", url: "https://jnanabhumi.ap.gov.in/", state: "Andhra Pradesh", education: "school, intermediate, degree, engineering, pg", categories: "sc, st, obc, ews, minority, kapu", gender: "any", hint: "Paste AP Jnanabhumi official scholarship details below." },
  tg: { name: "Telangana ePASS", url: "https://telanganaepass.cgg.gov.in/", state: "Telangana", education: "school, intermediate, degree, engineering, pg", categories: "sc, st, obc, ews, minority", gender: "any", hint: "Paste Telangana ePASS official scholarship details below." },
  ugc: { name: "UGC", url: "https://www.ugc.gov.in/", state: "National", education: "degree, pg", categories: "general, sc, st, obc, ews, minority", gender: "any", hint: "Paste UGC official scholarship/fellowship notice text below." }
};

let currentUser = null;
let existing = [];
let candidates = [];
let adminReady = false;

const els = {
  email: $("botPanelAdminEmail"), locked: $("botPanelLocked"), content: $("botPanelContent"), coverage: $("botPanelCoverage"),
  source: $("botPanelSource"), url: $("botPanelUrl"), input: $("botPanelInput"), message: $("botPanelMessage"), results: $("botPanelResults"),
  refresh: $("botPanelRefreshBtn"), analyze: $("botPanelAnalyzeBtn"), clear: $("botPanelClearBtn"),
  importActive: $("botPanelImportActiveBtn"), importDraft: $("botPanelImportDraftBtn"), importSafeDrafts: $("botPanelImportSafeDraftsBtn")
};

onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  if (!user) {
    show(els.email, "Not logged in");
    els.locked?.classList.remove("hidden");
    els.content?.classList.add("hidden");
    return;
  }

  const access = await checkAdminAccess(user);
  if (!access.allowed) {
    show(els.email, `Access denied: ${user.email || "unknown user"}`);
    els.locked?.classList.remove("hidden");
    els.content?.classList.add("hidden");
    return;
  }

  adminReady = true;
  show(els.email, `Admin: ${user.email || "approved admin"} (${access.viaEmail ? "admin email" : "custom claim"})`);
  els.locked?.classList.add("hidden");
  els.content?.classList.remove("hidden");
  bindEvents();
  await loadCoverage();
});

function bindEvents() {
  document.querySelectorAll("[data-bot-source]").forEach((button) => button.addEventListener("click", () => startBot(button.dataset.botSource)));
  els.refresh?.addEventListener("click", loadCoverage);
  els.analyze?.addEventListener("click", analyze);
  els.clear?.addEventListener("click", clearWorkspace);
  els.importActive?.addEventListener("click", () => importRecords("active"));
  els.importDraft?.addEventListener("click", () => importRecords("draft"));
  els.importSafeDrafts?.addEventListener("click", () => importRecords("safeDrafts"));
}

async function loadCoverage() {
  if (!adminReady) return;
  setMessage("Loading Firestore coverage...");
  try {
    const snapshot = await getDocs(collection(db, "scholarships"));
    existing = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const active = existing.filter(isVerifiedActiveScholarship).length;
    const uniqueSources = new Set(existing.map((item) => normalizeUrl(item.sourceUrl || item.link)).filter(Boolean)).size;
    show(els.coverage, `${existing.length} total records • ${active} active verified • ${uniqueSources} unique sources`);
    setMessage("Coverage loaded. Start a bot now.");
    if (candidates.length) analyze();
  } catch (error) {
    console.error(error);
    setMessage(`Coverage failed: ${error.message}. Deploy updated Firestore rules if this says permission-denied.`, true);
  }
}

function startBot(key) {
  const bot = bots[key];
  if (!bot) return;
  setValue(els.source, bot.name);
  setValue(els.url, bot.url);
  setValue(els.input, `${bot.hint}\n\nScholarship Name\nState ${bot.state}\nEducation ${bot.education}\nCategories ${bot.categories}\nGender ${bot.gender}\nAmount Varies as per official rules\nIncome limit 0\nDeadline date YYYY-MM-DD\nOfficial link ${bot.url}\nSource ${bot.name}\nEligibility Paste official eligibility details here.\nIncome note Paste official income rule here.\n---\nSecond Scholarship...`);
  window.open(bot.url, "_blank", "noopener,noreferrer");
  setMessage(`${bot.name} Bot ready. Paste official data and replace YYYY-MM-DD before analyzing.`);
  els.input?.focus();
}

function analyze() {
  const raw = els.input?.value || "";
  candidates = parse(raw).map(classify);
  render();
  const active = candidates.filter((item) => item.decision === "autoActive").length;
  const draft = candidates.filter((item) => item.decision === "autoDraft").length;
  setMessage(candidates.length ? `Analyzed ${candidates.length}. Auto Active: ${active}. Auto Draft: ${draft}.` : "Paste official data first.", !candidates.length);
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
  return normalize({ name: item.name || item.title || item.scholarshipName || "", state: resolveState(item.state || item.stateLabel || "national"), amount: item.amount || "Varies as per official rules", maxIncome: num(item.maxIncome || item.incomeLimit || item.income || 0), minPercentage: num(item.minPercentage || item.percentage || item.marks || 0), deadline: item.deadline || item.deadlineText || item.lastDate || "Check official portal", deadlineDate: date(item.deadlineDate || item.lastDateDate || item.date || item.lastDate || ""), link, sourceUrl: link, education: list(item.education || item.course || item.courses, ["any"]), categories: list(item.categories || item.category, ["general"]), genders: list(item.genders || item.gender, ["any"]), disability: disability(item.disability), eligibilityNote: clean(item.eligibilityNote || item.eligibility || item.description || "Verify eligibility on official portal before applying."), incomeNote: clean(item.incomeNote || item.incomeRule || "Verify income rules on official portal."), sourceName: clean(item.sourceName || item.source || value(els.source) || "Official Portal"), priority: clamp(num(item.priority || 60), 0, 100) });
}

function fromText(block) {
  const first = block.split("\n").map((x) => x.trim()).filter(Boolean).find((x) => !/paste official|yyyy-mm-dd/i.test(x)) || "";
  const link = normalizeUrl(findUrl(block) || value(els.url));
  return normalize({ name: clean(line(block, "scholarship name") || line(block, "name") || first), state: resolveState(line(block, "state") || block), amount: clean(line(block, "amount") || "Varies as per official rules"), maxIncome: num(line(block, "income limit") || line(block, "income") || 0), minPercentage: num(line(block, "minimum percentage") || line(block, "percentage") || 0), deadline: clean(line(block, "deadline") || line(block, "last date") || "Check official portal"), deadlineDate: date(line(block, "deadline date") || line(block, "last date") || findDate(block)), link, sourceUrl: link, education: list(line(block, "education") || line(block, "course") || line(block, "courses"), ["any"]), categories: list(line(block, "categories") || line(block, "category"), ["general"]), genders: list(line(block, "gender") || line(block, "genders"), ["any"]), disability: disability(line(block, "disability")), eligibilityNote: clean(line(block, "eligibility") || block.slice(0, 700) || "Verify eligibility on official portal before applying."), incomeNote: clean(line(block, "income note") || line(block, "income") || "Verify income rules on official portal."), sourceName: clean(line(block, "source") || value(els.source) || "Official Portal"), priority: 60 });
}

function normalize(item) {
  const state = isKnownStateSlug(item.state) ? item.state : "national";
  return { name: clean(item.name).slice(0, 200), state, stateLabel: getStateLabel(state), status: "draft", amount: clean(item.amount).slice(0, 120), maxIncome: num(item.maxIncome), minPercentage: clamp(num(item.minPercentage), 0, 100), deadline: clean(item.deadline || "Check official portal").slice(0, 160), deadlineDate: date(item.deadlineDate), link: normalizeUrl(item.link || item.sourceUrl), sourceUrl: normalizeUrl(item.sourceUrl || item.link), education: list(item.education, ["any"]), categories: list(item.categories, ["general"]), genders: list(item.genders, ["any"]), disability: disability(item.disability), eligibilityNote: clean(item.eligibilityNote).slice(0, 1200), incomeNote: clean(item.incomeNote).slice(0, 800), priority: clamp(num(item.priority || 60), 0, 100), sourceName: clean(item.sourceName || "Official Portal").slice(0, 120), applicationWindow: "open", academicYear: String(new Date().getFullYear()), verifiedOn: today, verificationNote: `Checked through Scholarship Bots Panel on ${today}. Verify official source before publishing widely.`, lastChecked: today };
}

function classify(item) {
  const duplicate = duplicateOf(item);
  const errors = validate(item, true);
  const looseErrors = validate(item, false);
  let score = 0;
  if (!duplicate) score += 12;
  if (isValidUrl(item.link)) score += 16;
  if (item.name.length >= 8) score += 14;
  if (item.deadlineDate && !past(item.deadlineDate)) score += 16;
  if (item.sourceName.length >= 2) score += 8;
  if (item.education.length) score += 8;
  if (item.categories.length) score += 8;
  if (item.eligibilityNote.length >= 60) score += 10;
  if (item.incomeNote.length >= 20) score += 5;
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
  if (!item.name || item.name.length < 4) errors.push("Missing scholarship name.");
  if (!isValidUrl(item.link)) errors.push("Missing valid official link.");
  if (strictDate && !item.deadlineDate) errors.push("Missing YYYY-MM-DD deadline date.");
  if (item.deadlineDate && past(item.deadlineDate)) errors.push("Deadline expired.");
  if (!item.eligibilityNote || item.eligibilityNote.length < 11) errors.push("Eligibility note too short.");
  if (!item.incomeNote || item.incomeNote.length < 6) errors.push("Income note too short.");
  return errors;
}

function render() {
  if (!els.results) return;
  if (!candidates.length) { els.results.innerHTML = "<p class='mini-note'>No results yet.</p>"; return; }
  els.results.innerHTML = candidates.map((item) => `<article class="bot-card"><span class="bot-status ${item.decision === "autoActive" ? "good" : item.decision === "autoDraft" ? "warn" : "bad"}">${escape(item.decision)} • ${item.score}%</span><h3>${escape(item.name)}</h3><p class="bot-mini"><strong>State:</strong> ${escape(item.stateLabel)} • <strong>Deadline:</strong> ${escape(item.deadlineDate || "missing")}</p><p class="bot-mini"><strong>Source:</strong> ${escape(item.sourceName)} ${item.link ? `• <a href="${escape(item.link)}" target="_blank" rel="noopener noreferrer">official link</a>` : ""}</p><p class="bot-mini"><strong>Eligibility:</strong> ${escape(item.eligibilityNote)}</p>${item.duplicateName ? `<p class="bot-mini"><strong>Duplicate:</strong> ${escape(item.duplicateName)}</p>` : ""}${item.errors.length ? `<ul>${item.errors.map((e) => `<li>${escape(e)}</li>`).join("")}</ul>` : "<p class='bot-mini'>Ready.</p>"}</article>`).join("");
}

async function importRecords(mode) {
  if (!adminReady) return setMessage("Admin access required.", true);
  let records = [];
  let status = "draft";
  if (mode === "active") { records = candidates.filter((x) => x.decision === "autoActive"); status = "active"; }
  else if (mode === "draft") records = candidates.filter((x) => x.decision === "autoDraft");
  else records = candidates.filter((x) => ["autoActive", "autoDraft"].includes(x.decision));
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
  return { ...copy, status, deadlineDate: copy.deadlineDate || draftDeadline, deadline: copy.deadlineDate ? copy.deadline : "Needs official deadline verification", applicationWindow: status === "active" ? "open" : "verify", sourceType: "scholarship-bots-panel", verifiedOn: today, lastChecked: today, verificationNote: status === "active" ? `Published from Scholarship Bots Panel on ${today} after official-source check.` : `Saved as draft from Scholarship Bots Panel on ${today} for review.` };
}

function clearWorkspace() { setValue(els.source, ""); setValue(els.url, ""); setValue(els.input, ""); candidates = []; render(); setMessage("Cleared."); }
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
function escape(v) { return String(v || "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;"); }
