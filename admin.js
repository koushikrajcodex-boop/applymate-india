import { auth, db } from "./firebase-config.js";
import {
  getIdTokenResult,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const $ = (id) => document.getElementById(id);
const today = () => new Date().toISOString().slice(0, 10);

const stateLabels = {
  national: "National",
  "andhra-pradesh": "Andhra Pradesh",
  telangana: "Telangana"
};

let currentAdminUser = null;
let isClaimAdmin = false;
let allScholarships = [];
let filteredScholarships = [];
let selectedEditId = "";
let eventsReady = false;

const els = {
  adminEmail: $("adminEmail"),
  adminLockedSection: $("adminLockedSection"),
  adminContent: $("adminContent"),
  adminLogoutBtn: $("adminLogoutBtn"),
  refreshAdminBtn: $("refreshAdminBtn"),
  exportScholarshipsBtn: $("exportScholarshipsBtn"),
  clearAdminFiltersBtn: $("clearAdminFiltersBtn"),
  adminToolMessage: $("adminToolMessage"),
  totalScholarshipsCount: $("totalScholarshipsCount"),
  activeScholarshipsCount: $("activeScholarshipsCount"),
  draftScholarshipsCount: $("draftScholarshipsCount"),
  closedScholarshipsCount: $("closedScholarshipsCount"),
  nationalScholarshipsCount: $("nationalScholarshipsCount"),
  stateScholarshipsCount: $("stateScholarshipsCount"),
  deadlineScholarshipsCount: $("deadlineScholarshipsCount"),
  firestoreSourceCount: $("firestoreSourceCount"),
  editingScholarshipId: $("editingScholarshipId"),
  adminScholarshipName: $("adminScholarshipName"),
  adminScholarshipState: $("adminScholarshipState"),
  adminScholarshipStatus: $("adminScholarshipStatus"),
  adminScholarshipAmount: $("adminScholarshipAmount"),
  adminScholarshipIncome: $("adminScholarshipIncome"),
  adminScholarshipMinPercentage: $("adminScholarshipMinPercentage"),
  adminScholarshipDeadline: $("adminScholarshipDeadline"),
  adminScholarshipDeadlineDate: $("adminScholarshipDeadlineDate"),
  adminScholarshipLink: $("adminScholarshipLink"),
  adminScholarshipEducation: $("adminScholarshipEducation"),
  adminScholarshipCategories: $("adminScholarshipCategories"),
  adminScholarshipGenders: $("adminScholarshipGenders"),
  adminScholarshipDisability: $("adminScholarshipDisability"),
  adminScholarshipEligibility: $("adminScholarshipEligibility"),
  adminScholarshipIncomeNote: $("adminScholarshipIncomeNote"),
  adminScholarshipPriority: $("adminScholarshipPriority"),
  adminScholarshipSource: $("adminScholarshipSource"),
  saveScholarshipAdminBtn: $("saveScholarshipAdminBtn"),
  clearScholarshipFormBtn: $("clearScholarshipFormBtn"),
  duplicateFormBtn: $("duplicateFormBtn"),
  adminFormMessage: $("adminFormMessage"),
  adminLivePreview: $("adminLivePreview"),
  adminSearch: $("adminSearch"),
  adminFilterState: $("adminFilterState"),
  adminFilterStatus: $("adminFilterStatus"),
  adminScholarshipCount: $("adminScholarshipCount"),
  adminScholarshipList: $("adminScholarshipList"),
  clearActivityLogBtn: $("clearActivityLogBtn"),
  adminActivityLog: $("adminActivityLog"),
  bulkAssistantPrompt: $("bulkAssistantPrompt"),
  bulkAssistantPreviewBtn: $("bulkAssistantPreviewBtn"),
  bulkAssistantImportBtn: $("bulkAssistantImportBtn"),
  bulkAssistantExampleBtn: $("bulkAssistantExampleBtn"),
  bulkAssistantClearBtn: $("bulkAssistantClearBtn"),
  bulkAssistantPreview: $("bulkAssistantPreview"),
  bulkAssistantMessage: $("bulkAssistantMessage")
};

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.replace("login.html");
    return;
  }

  currentAdminUser = user;

  try {
    const token = await getIdTokenResult(user, true);
    isClaimAdmin = token?.claims?.admin === true;
  } catch (error) {
    console.error("Admin claim check failed", error);
    window.location.replace("dashboard.html?adminAccess=error");
    return;
  }

  if (!isClaimAdmin) {
    window.location.replace("dashboard.html?adminAccess=denied");
    return;
  }

  showAdminView(user);
  setupEvents();
  renderPreview();
  await loadScholarships();
});

function showAdminView(user) {
  els.adminLockedSection?.classList.add("hidden");
  els.adminContent?.classList.remove("hidden");
  if (els.adminEmail) els.adminEmail.textContent = `Admin: ${user.email || "custom-claim user"}`;
}

function setupEvents() {
  if (eventsReady) return;
  eventsReady = true;

  els.adminLogoutBtn?.addEventListener("click", async () => {
    setBusy(els.adminLogoutBtn, true, "Logging out...");
    await signOut(auth);
    window.location.replace("login.html");
  });

  els.refreshAdminBtn?.addEventListener("click", loadScholarships);
  els.exportScholarshipsBtn?.addEventListener("click", exportBackup);
  els.clearAdminFiltersBtn?.addEventListener("click", clearFilters);
  els.saveScholarshipAdminBtn?.addEventListener("click", saveScholarship);
  els.clearScholarshipFormBtn?.addEventListener("click", clearForm);
  els.duplicateFormBtn?.addEventListener("click", duplicateForm);
  els.adminSearch?.addEventListener("input", applyFilters);
  els.adminFilterState?.addEventListener("change", applyFilters);
  els.adminFilterStatus?.addEventListener("change", applyFilters);
  els.clearActivityLogBtn?.addEventListener("click", () => {
    if (els.adminActivityLog) els.adminActivityLog.innerHTML = "<p class='mini-note'>No admin activity yet.</p>";
  });

  getFormFields().forEach((field) => {
    field?.addEventListener("input", renderPreview);
    field?.addEventListener("change", renderPreview);
  });

  setupBulkAssistant();
}

async function loadScholarships() {
  if (!isClaimAdmin) return;
  setListMessage("Loading scholarships from Firestore...");

  try {
    const snapshot = await getDocs(collection(db, "scholarships"));
    allScholarships = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
    allScholarships.sort((a, b) => Number(b.priority || 0) - Number(a.priority || 0) || clean(a.name).localeCompare(clean(b.name)));
    updateStats();
    applyFilters();
    showToolMessage(`Loaded ${allScholarships.length} Firestore scholarships.`);
  } catch (error) {
    console.error("Admin load failed", error);
    allScholarships = [];
    updateStats();
    setListMessage("Could not load Firestore scholarships. Confirm rules are deployed and your account has admin custom claim.");
  }
}

async function saveScholarship() {
  if (!isClaimAdmin) return showFormMessage("Admin custom claim required.", true);

  const scholarship = collectForm();
  const validationError = validateForm(scholarship);
  if (validationError) return showFormMessage(validationError, true);

  const duplicate = allScholarships.find((item) => clean(item.name) === clean(scholarship.name) && item.id !== selectedEditId);
  if (duplicate) return showFormMessage(`Duplicate found: ${duplicate.name}. Edit that record instead.`, true);

  setBusy(els.saveScholarshipAdminBtn, true, selectedEditId ? "Updating..." : "Saving...");

  try {
    if (selectedEditId) {
      await updateDoc(doc(db, "scholarships", selectedEditId), {
        ...scholarship,
        updatedAt: serverTimestamp(),
        updatedBy: currentAdminUser.email || currentAdminUser.uid
      });
      showFormMessage("Scholarship updated.");
      addActivity(`Updated ${scholarship.name}`);
    } else {
      await addDoc(collection(db, "scholarships"), {
        ...scholarship,
        sourceType: "admin",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: currentAdminUser.email || currentAdminUser.uid,
        updatedBy: currentAdminUser.email || currentAdminUser.uid
      });
      showFormMessage("Scholarship added.");
      addActivity(`Added ${scholarship.name}`);
    }

    clearForm();
    await loadScholarships();
  } catch (error) {
    console.error("Admin save failed", error);
    showFormMessage("Could not save. Active scholarships require deadline date, source name, official link, and verification date.", true);
  } finally {
    setBusy(els.saveScholarshipAdminBtn, false);
  }
}

function collectForm() {
  const state = clean(els.adminScholarshipState?.value || "national") || "national";
  const status = clean(els.adminScholarshipStatus?.value || "draft") || "draft";
  const deadlineDate = value(els.adminScholarshipDeadlineDate);
  const link = normalizeUrl(value(els.adminScholarshipLink));
  const now = today();

  return {
    name: trim(value(els.adminScholarshipName), 200),
    state,
    stateLabel: stateLabels[state] || "National",
    status,
    amount: trim(value(els.adminScholarshipAmount), 120) || "Varies as per official rules",
    maxIncome: number(value(els.adminScholarshipIncome)),
    minPercentage: number(value(els.adminScholarshipMinPercentage)),
    deadline: trim(value(els.adminScholarshipDeadline), 160) || "Check official portal",
    deadlineDate,
    link,
    sourceUrl: link,
    education: list(value(els.adminScholarshipEducation)),
    categories: list(value(els.adminScholarshipCategories)),
    genders: list(value(els.adminScholarshipGenders)).length ? list(value(els.adminScholarshipGenders)) : ["any"],
    disability: clean(value(els.adminScholarshipDisability)) || "any",
    eligibilityNote: trim(value(els.adminScholarshipEligibility), 1200),
    incomeNote: trim(value(els.adminScholarshipIncomeNote), 800),
    priority: clamp(number(value(els.adminScholarshipPriority)), 0, 100),
    sourceName: trim(value(els.adminScholarshipSource), 120) || "Official Portal",
    applicationWindow: status === "closed" ? "closed" : "open",
    academicYear: new Date().getFullYear().toString(),
    verifiedOn: now,
    verificationNote: `Verified by admin on ${now}. Re-check official portal before major student communication.`,
    lastChecked: now
  };
}

function validateForm(item) {
  if (!item.name) return focusMessage(els.adminScholarshipName, "Scholarship name is required.");
  if (!item.deadlineDate) return focusMessage(els.adminScholarshipDeadlineDate, "Deadline date is required for Firestore validation.");
  if (!item.link) return focusMessage(els.adminScholarshipLink, "Official http:// or https:// link is required.");
  if (!item.sourceName) return focusMessage(els.adminScholarshipSource, "Source name is required.");
  if (!item.education.length) return focusMessage(els.adminScholarshipEducation, "Add at least one education level.");
  if (!item.categories.length) return focusMessage(els.adminScholarshipCategories, "Add at least one category.");
  if (!item.genders.length) return focusMessage(els.adminScholarshipGenders, "Add at least one gender value, such as any.");
  if (!item.eligibilityNote || item.eligibilityNote.length < 11) return focusMessage(els.adminScholarshipEligibility, "Eligibility note must be at least 11 characters.");
  if (!item.incomeNote || item.incomeNote.length < 6) return focusMessage(els.adminScholarshipIncomeNote, "Income note must be at least 6 characters.");
  if (!["national", "andhra-pradesh", "telangana"].includes(item.state)) return "Select a valid state.";
  if (!["active", "draft", "closed"].includes(item.status)) return "Select a valid status.";
  if (!["any", "yes", "no"].includes(item.disability)) return "Select a valid disability rule.";
  return "";
}

function applyFilters() {
  const query = clean(els.adminSearch?.value || "");
  const state = clean(els.adminFilterState?.value || "");
  const status = clean(els.adminFilterStatus?.value || "");

  filteredScholarships = allScholarships.filter((item) => {
    const text = clean([item.name, item.stateLabel, item.sourceName, item.status, item.amount, item.eligibilityNote, item.incomeNote].join(" "));
    return (!query || text.includes(query)) && (!state || item.state === state) && (!status || item.status === status);
  });

  renderList();
}

function renderList() {
  if (els.adminScholarshipCount) els.adminScholarshipCount.textContent = `Showing ${filteredScholarships.length} of ${allScholarships.length} Firestore scholarships.`;
  if (!els.adminScholarshipList) return;

  if (!filteredScholarships.length) {
    setListMessage("No scholarships match this view.");
    return;
  }

  els.adminScholarshipList.innerHTML = filteredScholarships.map((item) => `
    <article class="scholarship admin-list-card">
      <span class="badge">${escapeHtml(item.status || "draft")}</span>
      <span class="badge">Last verified: ${escapeHtml(item.verifiedOn || "not set")}</span>
      <h3>${escapeHtml(item.name || "Unnamed scholarship")}</h3>
      <p class="info"><strong>State:</strong> ${escapeHtml(item.stateLabel || item.state || "National")}</p>
      <p class="info"><strong>Deadline:</strong> ${escapeHtml(item.deadline || "Check portal")} ${item.deadlineDate ? `(${escapeHtml(item.deadlineDate)})` : ""}</p>
      <p class="info"><strong>Source:</strong> ${escapeHtml(item.sourceName || "Official Portal")}</p>
      <p class="info"><strong>Eligibility:</strong> ${escapeHtml(item.eligibilityNote || "")}</p>
      <div class="button-row">
        <button type="button" class="secondary-btn" data-edit="${escapeHtml(item.id)}">Edit</button>
        <button type="button" class="secondary-btn" data-duplicate="${escapeHtml(item.id)}">Duplicate</button>
        <button type="button" class="secondary-btn" data-delete="${escapeHtml(item.id)}">Delete</button>
        ${item.link ? `<a class="text-btn" href="${escapeHtml(item.link)}" target="_blank" rel="noopener noreferrer">Official Link</a>` : ""}
      </div>
    </article>
  `).join("");

  els.adminScholarshipList.querySelectorAll("[data-edit]").forEach((button) => button.addEventListener("click", () => loadIntoForm(button.dataset.edit, false)));
  els.adminScholarshipList.querySelectorAll("[data-duplicate]").forEach((button) => button.addEventListener("click", () => loadIntoForm(button.dataset.duplicate, true)));
  els.adminScholarshipList.querySelectorAll("[data-delete]").forEach((button) => button.addEventListener("click", () => deleteScholarship(button.dataset.delete)));
}

function loadIntoForm(id, duplicate) {
  const item = allScholarships.find((record) => record.id === id);
  if (!item) return;
  selectedEditId = duplicate ? "" : id;
  set(els.editingScholarshipId, selectedEditId);
  set(els.adminScholarshipName, duplicate ? `${item.name || "Scholarship"} Copy` : item.name);
  set(els.adminScholarshipState, item.state || "national");
  set(els.adminScholarshipStatus, item.status || "draft");
  set(els.adminScholarshipAmount, item.amount || "");
  set(els.adminScholarshipIncome, item.maxIncome || "");
  set(els.adminScholarshipMinPercentage, item.minPercentage || "");
  set(els.adminScholarshipDeadline, item.deadline || "");
  set(els.adminScholarshipDeadlineDate, item.deadlineDate || "");
  set(els.adminScholarshipLink, item.sourceUrl || item.link || "");
  set(els.adminScholarshipEducation, arr(item.education).join(", "));
  set(els.adminScholarshipCategories, arr(item.categories).join(", "));
  set(els.adminScholarshipGenders, arr(item.genders).join(", "));
  set(els.adminScholarshipDisability, item.disability || "any");
  set(els.adminScholarshipEligibility, item.eligibilityNote || "");
  set(els.adminScholarshipIncomeNote, item.incomeNote || "");
  set(els.adminScholarshipPriority, item.priority || 50);
  set(els.adminScholarshipSource, item.sourceName || "Official Portal");
  renderPreview();
  showFormMessage(duplicate ? "Duplicated into form. Review and save." : "Loaded for editing.");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function deleteScholarship(id) {
  if (!isClaimAdmin || !id) return;
  const item = allScholarships.find((record) => record.id === id);
  if (!confirm(`Delete ${item?.name || "this scholarship"}?`)) return;
  await deleteDoc(doc(db, "scholarships", id));
  addActivity(`Deleted ${item?.name || id}`);
  await loadScholarships();
}

function clearForm() {
  selectedEditId = "";
  set(els.editingScholarshipId, "");
  getFormFields().forEach((field) => set(field, ""));
  set(els.adminScholarshipState, "national");
  set(els.adminScholarshipStatus, "draft");
  set(els.adminScholarshipDisability, "any");
  set(els.adminScholarshipGenders, "any");
  set(els.adminScholarshipPriority, "50");
  renderPreview();
}

function duplicateForm() {
  selectedEditId = "";
  set(els.editingScholarshipId, "");
  if (els.adminScholarshipName?.value) els.adminScholarshipName.value = `${els.adminScholarshipName.value} Copy`;
  renderPreview();
}

function renderPreview() {
  if (!els.adminLivePreview) return;
  const item = collectForm();
  els.adminLivePreview.innerHTML = `
    <article class="scholarship">
      <span class="badge">${escapeHtml(item.status || "draft")}</span>
      <span class="badge">Last verified: ${escapeHtml(item.verifiedOn)}</span>
      <h3>${escapeHtml(item.name || "Scholarship preview")}</h3>
      <p class="info"><strong>Amount:</strong> ${escapeHtml(item.amount)}</p>
      <p class="info"><strong>Deadline:</strong> ${escapeHtml(item.deadline)} ${item.deadlineDate ? `(${escapeHtml(item.deadlineDate)})` : ""}</p>
      <p class="info"><strong>Source:</strong> ${escapeHtml(item.sourceName)}</p>
      <p class="info"><strong>Eligibility:</strong> ${escapeHtml(item.eligibilityNote || "Add eligibility note")}</p>
    </article>
  `;
}

function updateStats() {
  setText(els.totalScholarshipsCount, allScholarships.length);
  setText(els.activeScholarshipsCount, allScholarships.filter((item) => item.status === "active").length);
  setText(els.draftScholarshipsCount, allScholarships.filter((item) => item.status === "draft").length);
  setText(els.closedScholarshipsCount, allScholarships.filter((item) => item.status === "closed").length);
  setText(els.nationalScholarshipsCount, allScholarships.filter((item) => item.state === "national").length);
  setText(els.stateScholarshipsCount, allScholarships.filter((item) => item.state && item.state !== "national").length);
  setText(els.deadlineScholarshipsCount, allScholarships.filter((item) => item.deadlineDate).length);
  setText(els.firestoreSourceCount, allScholarships.length);
}

function exportBackup() {
  const data = JSON.stringify({ exportedAt: new Date().toISOString(), scholarships: allScholarships }, null, 2);
  const url = URL.createObjectURL(new Blob([data], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "applymate-scholarships-firestore-backup.json";
  a.click();
  URL.revokeObjectURL(url);
}

function clearFilters() {
  set(els.adminSearch, "");
  set(els.adminFilterState, "");
  set(els.adminFilterStatus, "");
  applyFilters();
}

function setupBulkAssistant() {
  els.bulkAssistantExampleBtn?.addEventListener("click", () => {
    set(els.bulkAssistantPrompt, `AICTE Pragati Scholarship\nState national\nEducation engineering\nCategories general, sc, st, obc, ews, minority\nGender female\nAmount ₹50,000 per year\nIncome limit 800000\nDeadline date 2099-12-31\nOfficial link https://www.aicte-india.org/\nSource AICTE\nEligibility For girl students pursuing technical education in AICTE approved institutions.\nIncome note Family income rules should be verified on official portal.`);
  });
  els.bulkAssistantClearBtn?.addEventListener("click", () => {
    set(els.bulkAssistantPrompt, "");
    if (els.bulkAssistantPreview) els.bulkAssistantPreview.innerHTML = "<p class='mini-note'>Bulk preview will appear here.</p>";
  });
  els.bulkAssistantPreviewBtn?.addEventListener("click", previewBulk);
  els.bulkAssistantImportBtn?.addEventListener("click", importBulk);
}

function parseBulk() {
  return String(els.bulkAssistantPrompt?.value || "")
    .split(/\n---+\n/g)
    .map((block) => block.trim())
    .filter(Boolean)
    .map(parseBlock);
}

function parseBlock(block) {
  const lower = block.toLowerCase();
  const first = block.split("\n").map((line) => line.trim()).filter(Boolean)[0] || "Scholarship";
  return {
    ...collectForm(),
    name: first.replace(/^add\s+/i, "").slice(0, 180),
    state: lower.includes("telangana") ? "telangana" : lower.includes("andhra") ? "andhra-pradesh" : "national",
    stateLabel: lower.includes("telangana") ? "Telangana" : lower.includes("andhra") ? "Andhra Pradesh" : "National",
    amount: findLine(block, "amount") || "Varies as per official rules",
    maxIncome: number(findLine(block, "income") || 0),
    deadlineDate: findDate(block) || "2099-12-31",
    link: findUrl(block) || "https://scholarships.gov.in/",
    sourceUrl: findUrl(block) || "https://scholarships.gov.in/",
    sourceName: findLine(block, "source") || "Official Portal",
    education: list(findLine(block, "education")) || ["any"],
    categories: list(findLine(block, "categories")) || ["general"],
    genders: list(findLine(block, "gender")) || ["any"],
    eligibilityNote: findLine(block, "eligibility") || "Verify eligibility on official portal before applying.",
    incomeNote: findLine(block, "income note") || "Verify income rules on official portal."
  };
}

function previewBulk() {
  const records = parseBulk();
  if (!els.bulkAssistantPreview) return;
  if (!records.length) return showBulkMessage("Paste scholarship blocks first.", true);
  els.bulkAssistantPreview.innerHTML = records.map((item) => `<article class="bulk-preview-card"><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.sourceName)} • ${escapeHtml(item.deadlineDate)}</p></article>`).join("");
  showBulkMessage(`Previewed ${records.length} scholarships. Review before import.`);
}

async function importBulk() {
  const records = parseBulk();
  if (!records.length) return showBulkMessage("Nothing to import.", true);
  let imported = 0;
  for (const item of records) {
    if (allScholarships.some((existing) => clean(existing.name) === clean(item.name))) continue;
    const error = validateForm(item);
    if (error) continue;
    await addDoc(collection(db, "scholarships"), {
      ...item,
      sourceType: "bulk-assistant",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: currentAdminUser.email || currentAdminUser.uid,
      updatedBy: currentAdminUser.email || currentAdminUser.uid
    });
    imported += 1;
  }
  showBulkMessage(`Imported ${imported} new scholarships.`);
  await loadScholarships();
}

function getFormFields() {
  return [
    els.adminScholarshipName, els.adminScholarshipState, els.adminScholarshipStatus, els.adminScholarshipAmount,
    els.adminScholarshipIncome, els.adminScholarshipMinPercentage, els.adminScholarshipDeadline,
    els.adminScholarshipDeadlineDate, els.adminScholarshipLink, els.adminScholarshipEducation,
    els.adminScholarshipCategories, els.adminScholarshipGenders, els.adminScholarshipDisability,
    els.adminScholarshipEligibility, els.adminScholarshipIncomeNote, els.adminScholarshipPriority, els.adminScholarshipSource
  ].filter(Boolean);
}

function value(element) { return element?.value?.trim() || ""; }
function set(element, value) { if (element) element.value = value ?? ""; }
function setText(element, value) { if (element) element.textContent = String(value ?? "0"); }
function clean(value) { return String(value || "").toLowerCase().trim(); }
function trim(value, max) { return String(value || "").replace(/\s+/g, " ").trim().slice(0, max); }
function number(value) { const n = Number(String(value || "").replace(/[^0-9.]/g, "")); return Number.isFinite(n) ? n : 0; }
function clamp(value, min, max) { return Math.max(min, Math.min(max, Number.isFinite(value) ? value : min)); }
function list(value) { return String(value || "").split(",").map(clean).filter(Boolean); }
function arr(value) { return Array.isArray(value) ? value.map(clean).filter(Boolean) : list(value); }
function normalizeUrl(value) { try { const url = new URL(String(value || "").trim()); return ["http:", "https:"].includes(url.protocol) ? url.href : ""; } catch { return ""; } }
function focusMessage(element, message) { element?.focus(); return message; }
function setBusy(button, busy, label) { if (!button) return; button.disabled = busy; if (busy && label) button.dataset.originalText = button.textContent; button.textContent = busy ? label : button.dataset.originalText || button.textContent; }
function showFormMessage(message, danger = false) { showMessage(els.adminFormMessage, message, danger); }
function showToolMessage(message, danger = false) { showMessage(els.adminToolMessage, message, danger); }
function showBulkMessage(message, danger = false) { showMessage(els.bulkAssistantMessage, message, danger); }
function showMessage(element, message, danger) { if (!element) return; element.textContent = message || ""; element.style.color = danger ? "#b42318" : ""; }
function setListMessage(message) { if (els.adminScholarshipList) els.adminScholarshipList.innerHTML = `<p class="mini-note">${escapeHtml(message)}</p>`; }
function addActivity(message) { if (els.adminActivityLog) els.adminActivityLog.insertAdjacentHTML("afterbegin", `<p class="mini-note">${new Date().toLocaleTimeString("en-IN")} — ${escapeHtml(message)}</p>`); }
function findLine(text, label) { const rx = new RegExp(`${label}\\s*:?\\s*(.+)`, "i"); return text.match(rx)?.[1]?.trim() || ""; }
function findDate(text) { return text.match(/20\d{2}-\d{2}-\d{2}/)?.[0] || ""; }
function findUrl(text) { return text.match(/https?:\/\/\S+/)?.[0]?.replace(/[).,]+$/, "") || ""; }
function escapeHtml(value) { return String(value || "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;"); }
