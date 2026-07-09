import { auth, db } from "./firebase-config.js";
import { isVerifiedActiveScholarship, getOfficialSourceUrl, getLastVerifiedText } from "./scholarship-verification.js";
import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const $ = (id) => document.getElementById(id);
const MAX_COMPARE_ITEMS = 4;

let currentUser = null;
let latestProfile = {};
let availableScholarships = [];
let recommendedScholarships = [];
let filteredRecommendedScholarships = [];
let compareScholarships = [];
let savedScholarshipItems = [];
let applicationItems = [];

const els = {
  userEmail: $("userEmail"),
  logoutBtn: $("logoutBtn"),
  profileName: $("profileName"),
  profileState: $("profileState"),
  profileEducation: $("profileEducation"),
  profileYear: $("profileYear"),
  profileCategory: $("profileCategory"),
  profileGender: $("profileGender"),
  profileDisability: $("profileDisability"),
  profileIncome: $("profileIncome"),
  profilePercentage: $("profilePercentage"),
  saveProfileBtn: $("saveProfileBtn"),
  profileMessage: $("profileMessage"),
  recommendationSummary: $("recommendationSummary"),
  recommendationList: $("recommendationList"),
  recommendationSearch: $("recommendationSearch"),
  filterState: $("filterState"),
  filterEducation: $("filterEducation"),
  filterCategory: $("filterCategory"),
  filterGender: $("filterGender"),
  filterDisability: $("filterDisability"),
  filterDeadline: $("filterDeadline"),
  resetFiltersBtn: $("resetFiltersBtn"),
  recommendationCount: $("recommendationCount"),
  bestMatchBox: $("bestMatchBox"),
  compareList: $("compareList"),
  clearCompareBtn: $("clearCompareBtn"),
  comparisonTableWrap: $("comparisonTableWrap"),
  savedName: $("savedName"),
  savedLink: $("savedLink"),
  addSavedBtn: $("addSavedBtn"),
  savedList: $("savedList"),
  appName: $("appName"),
  appStatus: $("appStatus"),
  appNote: $("appNote"),
  addApplicationBtn: $("addApplicationBtn"),
  applicationList: $("applicationList"),
  notificationToggleBtn: $("notificationToggleBtn"),
  notificationBadge: $("notificationBadge"),
  notificationPanel: $("notificationPanel"),
  notificationList: $("notificationList"),
  markNotificationsReadBtn: $("markNotificationsReadBtn")
};

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.replace("login.html");
    return;
  }

  currentUser = user;
  if (els.userEmail) els.userEmail.textContent = `Logged in as: ${user.email || "student"}`;
  setupEvents();
  await Promise.all([loadProfile(), loadScholarships(), loadSavedScholarships(), loadApplications()]);
  renderRecommendations();
});

function setupEvents() {
  els.logoutBtn?.addEventListener("click", async () => {
    await signOut(auth);
    window.location.replace("login.html");
  });
  els.saveProfileBtn?.addEventListener("click", saveProfile);
  els.addSavedBtn?.addEventListener("click", addSavedScholarship);
  els.addApplicationBtn?.addEventListener("click", addApplication);
  els.resetFiltersBtn?.addEventListener("click", resetFilters);
  els.clearCompareBtn?.addEventListener("click", () => { compareScholarships = []; renderCompare(); });
  [els.recommendationSearch, els.filterState, els.filterEducation, els.filterCategory, els.filterGender, els.filterDisability, els.filterDeadline]
    .forEach((control) => {
      control?.addEventListener("input", applyRecommendationFilters);
      control?.addEventListener("change", applyRecommendationFilters);
    });
  els.notificationToggleBtn?.addEventListener("click", () => els.notificationPanel?.classList.toggle("hidden"));
  els.markNotificationsReadBtn?.addEventListener("click", () => renderNotifications([]));
}

async function loadProfile() {
  const snap = await getDoc(doc(db, "users", currentUser.uid));
  latestProfile = snap.exists() ? snap.data() : { email: currentUser.email || "" };
  set(els.profileName, latestProfile.name || "");
  set(els.profileState, latestProfile.state || "");
  set(els.profileEducation, latestProfile.education || "");
  set(els.profileYear, latestProfile.year || "");
  set(els.profileCategory, latestProfile.category || "");
  set(els.profileGender, latestProfile.gender || "");
  set(els.profileDisability, latestProfile.disability || "any");
  set(els.profileIncome, latestProfile.income || "");
  set(els.profilePercentage, latestProfile.percentage || "");
}

async function saveProfile() {
  latestProfile = {
    email: currentUser.email || "",
    name: value(els.profileName),
    state: value(els.profileState),
    education: value(els.profileEducation),
    year: value(els.profileYear),
    category: value(els.profileCategory),
    gender: value(els.profileGender),
    disability: value(els.profileDisability) || "any",
    income: Number(value(els.profileIncome) || 0),
    percentage: Number(value(els.profilePercentage) || 0),
    updatedAt: serverTimestamp()
  };

  await setDoc(doc(db, "users", currentUser.uid), latestProfile, { merge: true });
  show(els.profileMessage, "Profile saved. Recommendations refreshed.");
  renderRecommendations();
}

async function loadScholarships() {
  try {
    const snapshot = await getDocs(collection(db, "scholarships"));
    availableScholarships = snapshot.docs.map((item) => ({ id: item.id, ...item.data() })).filter(isVerifiedActiveScholarship);
  } catch (error) {
    console.warn("Dashboard scholarship load failed", error);
    availableScholarships = [];
  }
}

function renderRecommendations() {
  recommendedScholarships = availableScholarships
    .map((item) => scoreScholarship(item, normalizeProfile(latestProfile)))
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);
  applyRecommendationFilters();
  renderBestMatch();
  renderNotifications(recommendedScholarships.filter((item) => daysLeft(item.deadlineDate) <= 10));
}

function scoreScholarship(item, profile) {
  const education = arr(item.education);
  const categories = arr(item.categories);
  const genders = arr(item.genders || item.gender || "any");
  const maxIncome = Number(item.maxIncome || 99999999) || 99999999;
  const minPercentage = Number(item.minPercentage || 0) || 0;

  if (profile.state && item.state !== "national" && item.state !== profile.state) return null;
  if (profile.education && !education.includes(profile.education) && !education.includes("any")) return null;
  if (profile.category && !categories.includes(profile.category) && !categories.includes("any") && !categoryAliases(profile.category).some((x) => categories.includes(x))) return null;
  if (profile.gender && !genders.includes("any") && !genders.includes(profile.gender)) return null;
  if (profile.disability && item.disability && item.disability !== "any" && item.disability !== profile.disability) return null;
  if (profile.income && profile.income > maxIncome && maxIncome < 99999999) return null;
  if (profile.percentage && profile.percentage < minPercentage) return null;

  let score = Number(item.priority || 50);
  if (item.state === profile.state) score += 20;
  if (education.includes(profile.education)) score += 18;
  if (categories.includes(profile.category)) score += 16;
  if (profile.income && profile.income <= maxIncome) score += 10;
  if (daysLeft(item.deadlineDate) <= 15) score += 6;
  return { ...item, score: Math.min(100, Math.round(score)) };
}

function applyRecommendationFilters() {
  const search = clean(value(els.recommendationSearch));
  const state = clean(value(els.filterState));
  const education = clean(value(els.filterEducation));
  const category = clean(value(els.filterCategory));
  const gender = clean(value(els.filterGender));
  const disability = clean(value(els.filterDisability));
  const deadline = clean(value(els.filterDeadline));

  filteredRecommendedScholarships = recommendedScholarships.filter((item) => {
    const text = clean([item.name, item.sourceName, item.amount, item.deadline, item.eligibilityNote, arr(item.education).join(" "), arr(item.categories).join(" ")].join(" "));
    const left = daysLeft(item.deadlineDate);
    return (!search || text.includes(search)) &&
      (!state || item.state === state || item.state === "national") &&
      (!education || arr(item.education).includes(education)) &&
      (!category || arr(item.categories).includes(category)) &&
      (!gender || arr(item.genders).includes("any") || arr(item.genders).includes(gender)) &&
      (!disability || item.disability === "any" || item.disability === disability) &&
      (!deadline || (deadline === "soon" ? left <= 15 : true));
  });

  renderRecommendationList();
}

function renderRecommendationList() {
  show(els.recommendationSummary, `You are eligible for these ${filteredRecommendedScholarships.length} verified scholarships.`);
  show(els.recommendationCount, `${filteredRecommendedScholarships.length} matches from Firestore`);
  if (!els.recommendationList) return;
  if (!filteredRecommendedScholarships.length) {
    els.recommendationList.innerHTML = "<p class='mini-note'>No verified matches yet. Complete your profile or relax filters.</p>";
    return;
  }
  els.recommendationList.innerHTML = filteredRecommendedScholarships.map(card).join("");
  els.recommendationList.querySelectorAll("[data-save]").forEach((button) => button.addEventListener("click", () => saveRecommended(button.dataset.save)));
  els.recommendationList.querySelectorAll("[data-compare]").forEach((button) => button.addEventListener("click", () => addCompare(button.dataset.compare)));
}

function card(item) {
  const url = getOfficialSourceUrl(item);
  return `<article class="scholarship"><span class="badge">Score ${item.score}%</span><span class="badge">Last verified: ${escapeHtml(getLastVerifiedText(item))}</span><h3>${escapeHtml(item.name)}</h3><p class="info"><strong>Amount:</strong> ${escapeHtml(item.amount || "Varies")}</p><p class="info"><strong>Deadline:</strong> ${escapeHtml(item.deadline || "Check portal")} ${item.deadlineDate ? `(${escapeHtml(item.deadlineDate)})` : ""}</p><p class="info"><strong>Eligibility:</strong> ${escapeHtml(item.eligibilityNote || "Verify on official portal.")}</p><div class="button-row">${url ? `<a class="text-btn" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">Official Link</a>` : ""}<button type="button" class="secondary-btn" data-save="${escapeHtml(item.id)}">Save</button><button type="button" class="secondary-btn" data-compare="${escapeHtml(item.id)}">Compare</button></div></article>`;
}

function renderBestMatch() {
  if (!els.bestMatchBox) return;
  const best = recommendedScholarships[0];
  els.bestMatchBox.innerHTML = best ? `<strong>Best match:</strong> ${escapeHtml(best.name)} • Score ${best.score}% • Last verified: ${escapeHtml(getLastVerifiedText(best))}` : "Complete your profile to see a best match.";
}

async function saveRecommended(id) {
  const item = recommendedScholarships.find((x) => x.id === id);
  if (!item) return;
  await addDoc(collection(db, "users", currentUser.uid, "savedScholarships"), {
    name: item.name,
    link: getOfficialSourceUrl(item),
    deadline: item.deadline || "Check official portal",
    deadlineDate: item.deadlineDate || "",
    source: item.sourceName || "Firestore",
    createdAt: serverTimestamp()
  });
  await loadSavedScholarships();
}

async function addSavedScholarship() {
  const name = value(els.savedName);
  if (!name) return;
  await addDoc(collection(db, "users", currentUser.uid, "savedScholarships"), {
    name,
    link: normalizeUrl(value(els.savedLink)),
    deadline: "Check official portal",
    deadlineDate: "",
    source: "Manual",
    createdAt: serverTimestamp()
  });
  set(els.savedName, ""); set(els.savedLink, "");
  await loadSavedScholarships();
}

async function loadSavedScholarships() {
  const snapshot = await getDocs(query(collection(db, "users", currentUser.uid, "savedScholarships"), orderBy("createdAt", "desc")));
  savedScholarshipItems = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
  renderSaved();
}

function renderSaved() {
  if (!els.savedList) return;
  els.savedList.innerHTML = savedScholarshipItems.length ? savedScholarshipItems.map((item) => `<article class="mini-card"><strong>${escapeHtml(item.name)}</strong><p>${escapeHtml(item.deadline || "Check portal")}</p><div class="button-row">${item.link ? `<a class="text-btn" href="${escapeHtml(item.link)}" target="_blank" rel="noopener noreferrer">Open</a>` : ""}<button class="secondary-btn" data-delete-saved="${escapeHtml(item.id)}">Remove</button></div></article>`).join("") : "<p class='mini-note'>No saved scholarships yet.</p>";
  els.savedList.querySelectorAll("[data-delete-saved]").forEach((button) => button.addEventListener("click", async () => { await deleteDoc(doc(db, "users", currentUser.uid, "savedScholarships", button.dataset.deleteSaved)); await loadSavedScholarships(); }));
}

async function addApplication() {
  const name = value(els.appName);
  if (!name) return;
  await addDoc(collection(db, "users", currentUser.uid, "applications"), {
    name,
    status: value(els.appStatus) || "Not Applied",
    note: value(els.appNote),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  set(els.appName, ""); set(els.appNote, "");
  await loadApplications();
}

async function loadApplications() {
  const snapshot = await getDocs(query(collection(db, "users", currentUser.uid, "applications"), orderBy("updatedAt", "desc")));
  applicationItems = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
  renderApplications();
}

function renderApplications() {
  if (!els.applicationList) return;
  els.applicationList.innerHTML = applicationItems.length ? applicationItems.map((item) => `<article class="mini-card"><strong>${escapeHtml(item.name)}</strong><p>${escapeHtml(item.status)} — ${escapeHtml(item.note || "No note")}</p><div class="button-row"><button class="secondary-btn" data-next-status="${escapeHtml(item.id)}">Next Status</button><button class="secondary-btn" data-delete-app="${escapeHtml(item.id)}">Remove</button></div></article>`).join("") : "<p class='mini-note'>No applications tracked yet.</p>";
  els.applicationList.querySelectorAll("[data-delete-app]").forEach((button) => button.addEventListener("click", async () => { await deleteDoc(doc(db, "users", currentUser.uid, "applications", button.dataset.deleteApp)); await loadApplications(); }));
  els.applicationList.querySelectorAll("[data-next-status]").forEach((button) => button.addEventListener("click", () => nextStatus(button.dataset.nextStatus)));
}

async function nextStatus(id) {
  const statuses = ["Not Applied", "Applied", "Under Review", "Approved", "Rejected"];
  const item = applicationItems.find((x) => x.id === id);
  if (!item) return;
  const next = statuses[(statuses.indexOf(item.status) + 1) % statuses.length];
  await updateDoc(doc(db, "users", currentUser.uid, "applications", id), { status: next, updatedAt: serverTimestamp() });
  await loadApplications();
}

function addCompare(id) {
  const item = recommendedScholarships.find((x) => x.id === id);
  if (!item || compareScholarships.some((x) => x.id === id)) return;
  if (compareScholarships.length >= MAX_COMPARE_ITEMS) return alert(`Compare up to ${MAX_COMPARE_ITEMS} scholarships.`);
  compareScholarships.push(item);
  renderCompare();
}

function renderCompare() {
  if (els.compareList) els.compareList.innerHTML = compareScholarships.length ? compareScholarships.map((item) => `<span class="badge">${escapeHtml(item.name)}</span>`).join(" ") : "<p class='mini-note'>No scholarships selected for comparison.</p>";
  if (!els.comparisonTableWrap) return;
  els.comparisonTableWrap.innerHTML = compareScholarships.length ? `<table class="compare-table"><tr><th>Name</th><th>Amount</th><th>Deadline</th><th>Verified</th></tr>${compareScholarships.map((item) => `<tr><td>${escapeHtml(item.name)}</td><td>${escapeHtml(item.amount || "Varies")}</td><td>${escapeHtml(item.deadline || "Check portal")}</td><td>${escapeHtml(getLastVerifiedText(item))}</td></tr>`).join("")}</table>` : "";
}

function renderNotifications(items) {
  if (els.notificationBadge) els.notificationBadge.textContent = String(items.length || 0);
  if (els.notificationList) els.notificationList.innerHTML = items.length ? items.map((item) => `<p>⏳ ${escapeHtml(item.name)} closes in ${daysLeft(item.deadlineDate)} days.</p>`).join("") : "<p class='mini-note'>No urgent scholarship notifications.</p>";
}

function resetFilters() {
  [els.recommendationSearch, els.filterState, els.filterEducation, els.filterCategory, els.filterGender, els.filterDisability, els.filterDeadline].forEach((el) => set(el, ""));
  applyRecommendationFilters();
}

function normalizeProfile(profile) {
  return {
    state: slug(profile.state), education: educationSlug(profile.education), category: categorySlug(profile.category), gender: genderSlug(profile.gender), disability: disabilitySlug(profile.disability), income: Number(profile.income || 0), percentage: Number(profile.percentage || 0)
  };
}
function arr(value) { return Array.isArray(value) ? value.map(slug).filter(Boolean) : String(value || "").split(",").map(slug).filter(Boolean); }
function slug(value) { return String(value || "").trim().toLowerCase().replace(/\s+/g, "-"); }
function educationSlug(value) { const t = slug(value); if (t.includes("engineer")) return "engineering"; if (t.includes("inter")) return "intermediate"; if (t.includes("degree")) return "degree"; if (t.includes("pg") || t.includes("post")) return "pg"; if (t.includes("school")) return "school"; return t; }
function categorySlug(value) { const t = slug(value); if (t.includes("obc") || t === "bc") return "obc"; if (t.includes("ews") || t.includes("ebc")) return "ews"; return t; }
function genderSlug(value) { const t = slug(value); if (t.includes("female")) return "female"; if (t.includes("male")) return "male"; return "any"; }
function disabilitySlug(value) { const t = slug(value); return t === "yes" || t === "no" ? t : "any"; }
function categoryAliases(category) { return { obc: ["bc", "ebc"], ews: ["ebc"], disabled: ["disability"] }[category] || []; }
function daysLeft(dateText) { if (!dateText) return Infinity; const date = new Date(`${dateText}T00:00:00`); if (Number.isNaN(date.getTime())) return Infinity; const today = new Date(); today.setHours(0,0,0,0); return Math.round((date.getTime() - today.getTime()) / 86400000); }
function value(el) { return el?.value?.trim() || ""; }
function set(el, v) { if (el) el.value = v ?? ""; }
function show(el, text) { if (el) el.textContent = text || ""; }
function clean(v) { return String(v || "").trim().toLowerCase(); }
function normalizeUrl(value) { try { const url = new URL(String(value || "").trim()); return ["http:", "https:"].includes(url.protocol) ? url.href : ""; } catch { return ""; } }
function escapeHtml(value) { return String(value || "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;"); }
