import { auth, db } from "./firebase-config.js";
import { scholarships as localScholarships } from "./scholarships-data.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const ADMIN_EMAILS = [
  "lastwarrior324@gmail.com",
  "koushikrajcodex@gmail.com"
];

const adminLogoutBtn = document.getElementById("adminLogoutBtn");
const adminEmail = document.getElementById("adminEmail");
const adminLockedSection = document.getElementById("adminLockedSection");
const adminContent = document.getElementById("adminContent");

const refreshAdminBtn = document.getElementById("refreshAdminBtn");
const totalScholarshipsCount = document.getElementById("totalScholarshipsCount");
const activeScholarshipsCount = document.getElementById("activeScholarshipsCount");
const draftScholarshipsCount = document.getElementById("draftScholarshipsCount");
const closedScholarshipsCount = document.getElementById("closedScholarshipsCount");
const nationalScholarshipsCount = document.getElementById("nationalScholarshipsCount");
const stateScholarshipsCount = document.getElementById("stateScholarshipsCount");
const deadlineScholarshipsCount = document.getElementById("deadlineScholarshipsCount");
const firestoreSourceCount = document.getElementById("firestoreSourceCount");

const importLocalScholarshipsBtn = document.getElementById("importLocalScholarshipsBtn");
const exportScholarshipsBtn = document.getElementById("exportScholarshipsBtn");
const clearAdminFiltersBtn = document.getElementById("clearAdminFiltersBtn");
const adminToolMessage = document.getElementById("adminToolMessage");

const editingScholarshipId = document.getElementById("editingScholarshipId");
const adminScholarshipName = document.getElementById("adminScholarshipName");
const adminScholarshipState = document.getElementById("adminScholarshipState");
const adminScholarshipStatus = document.getElementById("adminScholarshipStatus");
const adminScholarshipAmount = document.getElementById("adminScholarshipAmount");
const adminScholarshipIncome = document.getElementById("adminScholarshipIncome");
const adminScholarshipMinPercentage = document.getElementById("adminScholarshipMinPercentage");
const adminScholarshipDeadline = document.getElementById("adminScholarshipDeadline");
const adminScholarshipDeadlineDate = document.getElementById("adminScholarshipDeadlineDate");
const adminScholarshipLink = document.getElementById("adminScholarshipLink");
const adminScholarshipEducation = document.getElementById("adminScholarshipEducation");
const adminScholarshipCategories = document.getElementById("adminScholarshipCategories");
const adminScholarshipGenders = document.getElementById("adminScholarshipGenders");
const adminScholarshipDisability = document.getElementById("adminScholarshipDisability");
const adminScholarshipEligibility = document.getElementById("adminScholarshipEligibility");
const adminScholarshipIncomeNote = document.getElementById("adminScholarshipIncomeNote");
const adminScholarshipPriority = document.getElementById("adminScholarshipPriority");
const adminScholarshipSource = document.getElementById("adminScholarshipSource");

const saveScholarshipAdminBtn = document.getElementById("saveScholarshipAdminBtn");
const clearScholarshipFormBtn = document.getElementById("clearScholarshipFormBtn");
const duplicateFormBtn = document.getElementById("duplicateFormBtn");
const adminFormMessage = document.getElementById("adminFormMessage");
const adminLivePreview = document.getElementById("adminLivePreview");

const adminSearch = document.getElementById("adminSearch");
const adminFilterState = document.getElementById("adminFilterState");
const adminFilterStatus = document.getElementById("adminFilterStatus");
const adminScholarshipCount = document.getElementById("adminScholarshipCount");
const adminScholarshipList = document.getElementById("adminScholarshipList");

const clearActivityLogBtn = document.getElementById("clearActivityLogBtn");
const adminActivityLog = document.getElementById("adminActivityLog");

const VALID_STATES = ["national", "andhra-pradesh", "telangana"];
const VALID_STATUSES = ["active", "draft", "closed"];
const VALID_DISABILITY_RULES = ["any", "yes", "no"];

const STATE_LABELS = {
  national: "National",
  "andhra-pradesh": "Andhra Pradesh",
  telangana: "Telangana"
};

const STATUS_LABELS = {
  active: "✅ Active / Published",
  draft: "📝 Draft",
  closed: "⛔ Closed"
};

const DISABILITY_LABELS = {
  any: "Any",
  yes: "Only specially abled students",
  no: "Not disability-specific"
};

let currentAdminUser = null;
let allScholarships = [];
let filteredScholarships = [];
let sessionActivity = [];
let eventsReady = false;

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.replace("login.html");
    return;
  }

  currentAdminUser = user;

  if (adminEmail) {
    adminEmail.textContent = `Logged in as: ${user.email || "Unknown user"}`;
  }

  if (!isAdminUser(user)) {
    showLockedAdminView();
    return;
  }

  showAdminView();
  setupAdminEvents();
  renderLivePreview();

  await loadAdminScholarships();
});

adminLogoutBtn?.addEventListener("click", async () => {
  setButtonBusy(adminLogoutBtn, true, "Logging out...");

  try {
    await signOut(auth);
    window.location.replace("login.html");
  } catch (error) {
    console.error("Admin logout error:", error);
    setButtonBusy(adminLogoutBtn, false);
    alert("Could not log out. Please try again.");
  }
});

function setupAdminEvents() {
  if (eventsReady) return;
  eventsReady = true;

  refreshAdminBtn?.addEventListener("click", async () => {
    await loadAdminScholarships();
  });

  saveScholarshipAdminBtn?.addEventListener("click", async () => {
    await saveAdminScholarship();
  });

  clearScholarshipFormBtn?.addEventListener("click", () => {
    clearScholarshipForm();
  });

  duplicateFormBtn?.addEventListener("click", () => {
    duplicateCurrentForm();
  });

  importLocalScholarshipsBtn?.addEventListener("click", async () => {
    await importLocalScholarshipData();
  });

  exportScholarshipsBtn?.addEventListener("click", () => {
    exportScholarshipBackup();
  });

  clearAdminFiltersBtn?.addEventListener("click", () => {
    clearAdminFilters();
  });

  clearActivityLogBtn?.addEventListener("click", () => {
    sessionActivity = [];
    renderActivityLog();
  });

  adminSearch?.addEventListener("input", applyAdminFilters);
  adminFilterState?.addEventListener("change", applyAdminFilters);
  adminFilterStatus?.addEventListener("change", applyAdminFilters);

  getFormFields().forEach((field) => {
    field?.addEventListener("input", renderLivePreview);
    field?.addEventListener("change", renderLivePreview);
  });
}

function showAdminView() {
  adminLockedSection?.classList.add("hidden");
  adminContent?.classList.remove("hidden");
}

function showLockedAdminView() {
  adminContent?.classList.add("hidden");
  adminLockedSection?.classList.remove("hidden");

  if (adminEmail) {
    adminEmail.textContent = `Access denied for: ${currentAdminUser?.email || "Unknown user"}`;
  }
}

function isAdminUser(user) {
  const email = normalizeText(user?.email || "");
  return ADMIN_EMAILS.includes(email);
}

async function saveAdminScholarship() {
  if (!currentAdminUser || !isAdminUser(currentAdminUser)) {
    showAdminMessage("You are not allowed to save scholarships.", true);
    return;
  }

  const scholarship = collectScholarshipFormData();
  const validationError = validateScholarship(scholarship);

  if (validationError) {
    showAdminMessage(validationError, true);
    return;
  }

  const editId = editingScholarshipId?.value.trim() || "";
  const duplicate = findDuplicateScholarship(scholarship.name, editId);

  if (duplicate) {
    showAdminMessage(`Duplicate found: "${duplicate.name}" already exists. Edit that scholarship or change the name.`, true);
    return;
  }

  setButtonBusy(saveScholarshipAdminBtn, true, editId ? "Updating..." : "Saving...");

  try {
    if (editId) {
      await updateDoc(doc(db, "scholarships", editId), {
        ...scholarship,
        updatedAt: serverTimestamp(),
        updatedBy: currentAdminUser.email || ""
      });

      showAdminMessage("Scholarship updated successfully.");
      addActivity(`Updated scholarship: ${scholarship.name}`);
    } else {
      await addDoc(collection(db, "scholarships"), {
        ...scholarship,
        sourceType: "admin",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: currentAdminUser.email || "",
        updatedBy: currentAdminUser.email || ""
      });

      showAdminMessage("Scholarship added successfully.");
      addActivity(`Added scholarship: ${scholarship.name}`);
    }

    clearScholarshipForm();
    await loadAdminScholarships();
  } catch (error) {
    console.error("Admin scholarship save error:", error);
    showAdminMessage(
      "Could not save scholarship. Check Firebase Console Firestore rules and try again.",
      true
    );
  } finally {
    setButtonBusy(saveScholarshipAdminBtn, false);
  }
}

function collectScholarshipFormData() {
  const state = normalizeText(adminScholarshipState?.value || "");
  const status = normalizeText(adminScholarshipStatus?.value || "active");
  const disability = normalizeText(adminScholarshipDisability?.value || "any");

  const maxIncome = numberOrZero(adminScholarshipIncome?.value);
  const minPercentage = numberOrZero(adminScholarshipMinPercentage?.value);
  const priority = numberOrDefault(adminScholarshipPriority?.value, 50);

  const education = parseCsv(adminScholarshipEducation?.value);
  const categories = parseCsv(adminScholarshipCategories?.value);
  const genders = parseCsv(adminScholarshipGenders?.value);

  return {
    name: cleanText(adminScholarshipName?.value, 200),
    state,
    stateLabel: STATE_LABELS[state] || "National",
    status,
    amount: cleanText(adminScholarshipAmount?.value, 120) || "Varies as per official rules",
    maxIncome,
    minPercentage,
    deadline: cleanText(adminScholarshipDeadline?.value, 160) || "Check official portal",
    deadlineDate: cleanText(adminScholarshipDeadlineDate?.value, 30),
    link: normalizeHttpUrl(adminScholarshipLink?.value),
    education,
    categories,
    genders,
    disability,
    eligibilityNote: cleanText(adminScholarshipEligibility?.value, 1200),
    incomeNote: cleanText(adminScholarshipIncomeNote?.value, 800),
    priority,
    sourceName: cleanText(adminScholarshipSource?.value, 120) || "Official Portal"
  };
}

function validateScholarship(scholarship) {
  if (!scholarship.name) {
    adminScholarshipName?.focus();
    return "Scholarship name is required.";
  }

  if (!VALID_STATES.includes(scholarship.state)) {
    adminScholarshipState?.focus();
    return "Select a valid state.";
  }

  if (!VALID_STATUSES.includes(scholarship.status)) {
    adminScholarshipStatus?.focus();
    return "Select a valid status.";
  }

  if (!VALID_DISABILITY_RULES.includes(scholarship.disability)) {
    adminScholarshipDisability?.focus();
    return "Select a valid disability rule.";
  }

  const rawLink = adminScholarshipLink?.value.trim() || "";
  if (rawLink && !scholarship.link) {
    adminScholarshipLink?.focus();
    return "Enter a valid official http:// or https:// link.";
  }

  if (scholarship.education.length === 0) {
    adminScholarshipEducation?.focus();
    return "Add at least one education level.";
  }

  if (scholarship.categories.length === 0) {
    adminScholarshipCategories?.focus();
    return "Add at least one category.";
  }

  if (scholarship.genders.length === 0) {
    adminScholarshipGenders?.focus();
    return "Add at least one gender value. Example: any";
  }

  if (scholarship.maxIncome < 0) {
    adminScholarshipIncome?.focus();
    return "Income limit cannot be negative.";
  }

  if (scholarship.minPercentage < 0 || scholarship.minPercentage > 100) {
    adminScholarshipMinPercentage?.focus();
    return "Minimum percentage must be between 0 and 100.";
  }

  if (scholarship.priority < 0 || scholarship.priority > 100) {
    adminScholarshipPriority?.focus();
    return "Priority score must be between 0 and 100.";
  }

  return "";
}

async function loadAdminScholarships() {
  if (!currentAdminUser || !isAdminUser(currentAdminUser)) return;

  showContainerMessage(adminScholarshipList, "Loading scholarships...");

  try {
    const snapshot = await getDocs(collection(db, "scholarships"));

    allScholarships = snapshot.docs
      .map((documentSnapshot) => ({
        id: documentSnapshot.id,
        ...documentSnapshot.data()
      }))
      .sort((a, b) => {
        const firstPriority = Number(a.priority || 0);
        const secondPriority = Number(b.priority || 0);

        if (secondPriority !== firstPriority) {
          return secondPriority - firstPriority;
        }

        return normalizeText(a.name).localeCompare(normalizeText(b.name));
      });

    updateAdminAnalytics();
    applyAdminFilters();
  } catch (error) {
    console.error("Admin scholarship load error:", error);
    allScholarships = [];
    filteredScholarships = [];
    updateAdminAnalytics();
    showContainerMessage(
      adminScholarshipList,
      "Could not load scholarships. Firestore rules may need to be updated."
    );
  }
}

function updateAdminAnalytics() {
  const total = allScholarships.length;
  const active = allScholarships.filter((item) => item.status === "active").length;
  const draft = allScholarships.filter((item) => item.status === "draft").length;
  const closed = allScholarships.filter((item) => item.status === "closed").length;
  const national = allScholarships.filter((item) => item.state === "national").length;
  const stateLevel = allScholarships.filter((item) => item.state && item.state !== "national").length;
  const withDeadline = allScholarships.filter((item) => item.deadlineDate).length;
  const firestoreItems = allScholarships.filter((item) => item.sourceType === "admin" || item.sourceType === "local-import").length;

  setText(totalScholarshipsCount, total);
  setText(activeScholarshipsCount, active);
  setText(draftScholarshipsCount, draft);
  setText(closedScholarshipsCount, closed);
  setText(nationalScholarshipsCount, national);
  setText(stateScholarshipsCount, stateLevel);
  setText(deadlineScholarshipsCount, withDeadline);
  setText(firestoreSourceCount, firestoreItems);
}

function applyAdminFilters() {
  const searchText = normalizeText(adminSearch?.value || "");
  const stateValue = normalizeText(adminFilterState?.value || "");
  const statusValue = normalizeText(adminFilterStatus?.value || "");

  filteredScholarships = allScholarships.filter((scholarship) => {
    const searchableText = normalizeText([
      scholarship.name,
      scholarship.state,
      scholarship.stateLabel,
      scholarship.status,
      scholarship.amount,
      scholarship.deadline,
      scholarship.sourceName,
      scholarship.eligibilityNote,
      scholarship.incomeNote,
      arrayToText(scholarship.education),
      arrayToText(scholarship.categories),
      arrayToText(scholarship.genders)
    ].join(" "));

    const searchMatch = !searchText || searchableText.includes(searchText);
    const stateMatch = !stateValue || scholarship.state === stateValue;
    const statusMatch = !statusValue || scholarship.status === statusValue;

    return searchMatch && stateMatch && statusMatch;
  });

  renderAdminScholarshipList();
}

function renderAdminScholarshipList() {
  if (!adminScholarshipList) return;

  adminScholarshipList.replaceChildren();

  if (adminScholarshipCount) {
    adminScholarshipCount.textContent =
      `Showing ${filteredScholarships.length} of ${allScholarships.length} scholarships.`;
  }

  if (filteredScholarships.length === 0) {
    showContainerMessage(adminScholarshipList, "No scholarships found.");
    return;
  }

  filteredScholarships.forEach((scholarship) => {
    adminScholarshipList.appendChild(createAdminScholarshipCard(scholarship));
  });
}

function createAdminScholarshipCard(scholarship) {
  const card = document.createElement("article");
  card.className = "admin-scholarship-card";

  const top = document.createElement("div");
  top.className = "admin-card-top";

  const statusBadge = document.createElement("span");
  statusBadge.className = `admin-status-badge admin-status-${scholarship.status || "draft"}`;
  statusBadge.textContent = STATUS_LABELS[scholarship.status] || scholarship.status || "Draft";

  const stateBadge = document.createElement("span");
  stateBadge.className = "admin-state-badge";
  stateBadge.textContent = scholarship.stateLabel || STATE_LABELS[scholarship.state] || "National";

  const priorityBadge = document.createElement("span");
  priorityBadge.className = "admin-priority-badge";
  priorityBadge.textContent = `Priority ${Number(scholarship.priority || 0)}`;

  top.append(statusBadge, stateBadge, priorityBadge);

  const title = document.createElement("h3");
  title.textContent = scholarship.name || "Untitled Scholarship";

  const metaGrid = document.createElement("div");
  metaGrid.className = "admin-meta-grid";

  [
    ["Amount", scholarship.amount || "Varies"],
    ["Income Limit", `₹${formatIndianNumber(scholarship.maxIncome)}`],
    ["Min Marks", Number(scholarship.minPercentage || 0) > 0 ? `${scholarship.minPercentage}%` : "Not listed"],
    ["Deadline", scholarship.deadline || "Check official portal"],
    ["Deadline Date", scholarship.deadlineDate || "Not added"],
    ["Source", scholarship.sourceName || "Official Portal"],
    ["Education", arrayToText(scholarship.education) || "Not added"],
    ["Categories", arrayToText(scholarship.categories) || "Not added"],
    ["Genders", arrayToText(scholarship.genders) || "Not added"],
    ["Disability", DISABILITY_LABELS[scholarship.disability] || scholarship.disability || "Any"],
    ["Created By", scholarship.createdBy || "Not available"],
    ["Updated By", scholarship.updatedBy || "Not available"]
  ].forEach(([label, value]) => {
    const item = document.createElement("div");
    item.className = "admin-meta-item";

    const strong = document.createElement("strong");
    strong.textContent = label;

    const span = document.createElement("span");
    span.textContent = value;

    item.append(strong, span);
    metaGrid.appendChild(item);
  });

  const note = document.createElement("div");
  note.className = "admin-card-note";
  note.textContent = scholarship.eligibilityNote || "No eligibility note added.";

  const actions = document.createElement("div");
  actions.className = "button-row admin-actions";

  const editButton = document.createElement("button");
  editButton.type = "button";
  editButton.className = "secondary-btn";
  editButton.textContent = "Edit";
  editButton.addEventListener("click", () => {
    fillScholarshipFormForEdit(scholarship);
  });

  const duplicateButton = document.createElement("button");
  duplicateButton.type = "button";
  duplicateButton.className = "secondary-btn";
  duplicateButton.textContent = "Duplicate";
  duplicateButton.addEventListener("click", () => {
    fillScholarshipFormForEdit({
      ...scholarship,
      id: "",
      name: `${scholarship.name || "Scholarship"} Copy`
    });
    if (editingScholarshipId) editingScholarshipId.value = "";
    showAdminMessage("Duplicated into form. Change the name and save.");
  });

  const markActiveButton = document.createElement("button");
  markActiveButton.type = "button";
  markActiveButton.className = "secondary-btn";
  markActiveButton.textContent = "Mark Active";
  markActiveButton.addEventListener("click", async () => {
    await updateScholarshipStatus(scholarship, "active");
  });

  const markDraftButton = document.createElement("button");
  markDraftButton.type = "button";
  markDraftButton.className = "secondary-btn";
  markDraftButton.textContent = "Mark Draft";
  markDraftButton.addEventListener("click", async () => {
    await updateScholarshipStatus(scholarship, "draft");
  });

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "secondary-btn";
  closeButton.textContent = "Close";
  closeButton.addEventListener("click", async () => {
    await updateScholarshipStatus(scholarship, "closed");
  });

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "danger-btn";
  deleteButton.textContent = "Delete";
  deleteButton.addEventListener("click", async () => {
    await deleteAdminScholarship(scholarship);
  });

  actions.append(editButton, duplicateButton, markActiveButton, markDraftButton, closeButton, deleteButton);

  card.append(top, title, metaGrid, note, actions);

  return card;
}

function fillScholarshipFormForEdit(scholarship) {
  setValue(editingScholarshipId, scholarship.id || "");
  setValue(adminScholarshipName, scholarship.name || "");
  setValue(adminScholarshipState, scholarship.state || "");
  setValue(adminScholarshipStatus, scholarship.status || "active");
  setValue(adminScholarshipAmount, scholarship.amount || "");
  setValue(adminScholarshipIncome, scholarship.maxIncome ?? "");
  setValue(adminScholarshipMinPercentage, scholarship.minPercentage ?? "");
  setValue(adminScholarshipDeadline, scholarship.deadline || "");
  setValue(adminScholarshipDeadlineDate, scholarship.deadlineDate || "");
  setValue(adminScholarshipLink, scholarship.link || "");
  setValue(adminScholarshipEducation, arrayToText(scholarship.education));
  setValue(adminScholarshipCategories, arrayToText(scholarship.categories));
  setValue(adminScholarshipGenders, arrayToText(scholarship.genders));
  setValue(adminScholarshipDisability, scholarship.disability || "any");
  setValue(adminScholarshipEligibility, scholarship.eligibilityNote || "");
  setValue(adminScholarshipIncomeNote, scholarship.incomeNote || "");
  setValue(adminScholarshipPriority, scholarship.priority ?? "");
  setValue(adminScholarshipSource, scholarship.sourceName || "");

  showAdminMessage(
    scholarship.id
      ? `Editing "${scholarship.name}".`
      : `Duplicated "${scholarship.name}" into form.`
  );

  renderLivePreview();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function clearScholarshipForm() {
  setValue(editingScholarshipId, "");
  setValue(adminScholarshipName, "");
  setValue(adminScholarshipState, "");
  setValue(adminScholarshipStatus, "active");
  setValue(adminScholarshipAmount, "");
  setValue(adminScholarshipIncome, "");
  setValue(adminScholarshipMinPercentage, "");
  setValue(adminScholarshipDeadline, "");
  setValue(adminScholarshipDeadlineDate, "");
  setValue(adminScholarshipLink, "");
  setValue(adminScholarshipEducation, "");
  setValue(adminScholarshipCategories, "");
  setValue(adminScholarshipGenders, "");
  setValue(adminScholarshipDisability, "any");
  setValue(adminScholarshipEligibility, "");
  setValue(adminScholarshipIncomeNote, "");
  setValue(adminScholarshipPriority, "");
  setValue(adminScholarshipSource, "");

  showAdminMessage("");
  renderLivePreview();
}

function duplicateCurrentForm() {
  const currentName = adminScholarshipName?.value.trim() || "";

  if (!currentName) {
    showAdminMessage("Enter or edit a scholarship first, then duplicate it.", true);
    return;
  }

  setValue(editingScholarshipId, "");
  setValue(adminScholarshipName, `${currentName} Copy`);
  showAdminMessage("Current form duplicated. Change the name and save as new scholarship.");
  renderLivePreview();
}

async function updateScholarshipStatus(scholarship, status) {
  if (!scholarship?.id || !VALID_STATUSES.includes(status)) return;

  if (scholarship.status === status) {
    showAdminMessage(`Scholarship is already ${status}.`);
    return;
  }

  try {
    await updateDoc(doc(db, "scholarships", scholarship.id), {
      status,
      updatedAt: serverTimestamp(),
      updatedBy: currentAdminUser.email || ""
    });

    addActivity(`Changed "${scholarship.name}" status to ${status}.`);
    showAdminMessage(`Status updated to ${status}.`);
    await loadAdminScholarships();
  } catch (error) {
    console.error("Status update error:", error);
    showAdminMessage("Could not update status. Check Firestore rules.", true);
  }
}

async function deleteAdminScholarship(scholarship) {
  if (!scholarship?.id) return;

  const firstConfirm = window.confirm(`Delete "${scholarship.name}"?`);
  if (!firstConfirm) return;

  const secondConfirm = window.confirm("This will permanently remove the scholarship from Firestore. Continue?");
  if (!secondConfirm) return;

  try {
    await deleteDoc(doc(db, "scholarships", scholarship.id));

    addActivity(`Deleted scholarship: ${scholarship.name}`);
    showAdminMessage("Scholarship deleted successfully.");
    await loadAdminScholarships();
  } catch (error) {
    console.error("Admin scholarship delete error:", error);
    showAdminMessage("Could not delete scholarship. Check Firestore rules.", true);
  }
}

async function importLocalScholarshipData() {
  if (!currentAdminUser || !isAdminUser(currentAdminUser)) {
    showToolMessage("You are not allowed to import scholarships.", true);
    return;
  }

  if (!Array.isArray(localScholarships) || localScholarships.length === 0) {
    showToolMessage("No local scholarship data found.", true);
    return;
  }

  const confirmed = window.confirm(
    `Import ${localScholarships.length} local scholarships into Firestore? Duplicate names will be skipped.`
  );

  if (!confirmed) return;

  setButtonBusy(importLocalScholarshipsBtn, true, "Importing...");

  let imported = 0;
  let skipped = 0;
  let failed = 0;

  try {
    const existingNames = new Set(
      allScholarships.map((scholarship) => normalizeText(scholarship.name))
    );

    for (const localScholarship of localScholarships) {
      const normalized = normalizeScholarshipForFirestore(localScholarship);
      const normalizedName = normalizeText(normalized.name);

      if (!normalizedName || existingNames.has(normalizedName)) {
        skipped += 1;
        continue;
      }

      try {
        await addDoc(collection(db, "scholarships"), {
          ...normalized,
          sourceType: "local-import",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          createdBy: currentAdminUser.email || "",
          updatedBy: currentAdminUser.email || ""
        });

        existingNames.add(normalizedName);
        imported += 1;
      } catch (error) {
        console.error("Single scholarship import failed:", error);
        failed += 1;
      }
    }

    addActivity(`Imported ${imported} local scholarships. Skipped ${skipped}. Failed ${failed}.`);
    showToolMessage(`Import completed. Imported: ${imported}, skipped: ${skipped}, failed: ${failed}.`);
    await loadAdminScholarships();
  } catch (error) {
    console.error("Local import error:", error);
    showToolMessage("Import failed. Check Firestore rules and try again.", true);
  } finally {
    setButtonBusy(importLocalScholarshipsBtn, false);
  }
}

function normalizeScholarshipForFirestore(item) {
  const state = normalizeState(item.state || "national");
  const status = VALID_STATUSES.includes(normalizeText(item.status)) ? normalizeText(item.status) : "active";
  const disability = VALID_DISABILITY_RULES.includes(normalizeText(item.disability)) ? normalizeText(item.disability) : "any";

  return {
    name: cleanText(item.name, 200),
    state,
    stateLabel: item.stateLabel || STATE_LABELS[state] || "National",
    status,
    amount: cleanText(item.amount, 120) || "Varies as per official rules",
    maxIncome: numberOrZero(item.maxIncome),
    minPercentage: numberOrZero(item.minPercentage),
    deadline: cleanText(item.deadline, 160) || "Check official portal",
    deadlineDate: cleanText(item.deadlineDate, 30),
    link: normalizeHttpUrl(item.link || ""),
    education: normalizeArrayInput(item.education),
    categories: normalizeArrayInput(item.categories),
    genders: normalizeArrayInput(item.genders).length ? normalizeArrayInput(item.genders) : ["any"],
    disability,
    eligibilityNote: cleanText(item.eligibilityNote, 1200),
    incomeNote: cleanText(item.incomeNote, 800),
    priority: numberOrDefault(item.priority, 50),
    sourceName: cleanText(item.sourceName, 120) || "Official Portal"
  };
}

function exportScholarshipBackup() {
  if (!allScholarships.length) {
    showToolMessage("No scholarships available to export.", true);
    return;
  }

  const safeData = allScholarships.map((scholarship) => ({
    id: scholarship.id,
    name: scholarship.name || "",
    state: scholarship.state || "",
    stateLabel: scholarship.stateLabel || "",
    status: scholarship.status || "",
    amount: scholarship.amount || "",
    maxIncome: scholarship.maxIncome || 0,
    minPercentage: scholarship.minPercentage || 0,
    deadline: scholarship.deadline || "",
    deadlineDate: scholarship.deadlineDate || "",
    link: scholarship.link || "",
    education: normalizeArrayInput(scholarship.education),
    categories: normalizeArrayInput(scholarship.categories),
    genders: normalizeArrayInput(scholarship.genders),
    disability: scholarship.disability || "any",
    eligibilityNote: scholarship.eligibilityNote || "",
    incomeNote: scholarship.incomeNote || "",
    priority: scholarship.priority || 50,
    sourceName: scholarship.sourceName || "",
    sourceType: scholarship.sourceType || ""
  }));

  const fileContent = JSON.stringify(safeData, null, 2);
  const blob = new Blob([fileContent], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `applymate-scholarships-backup-${getTodayString()}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);

  addActivity(`Exported ${safeData.length} scholarships as JSON.`);
  showToolMessage(`Exported ${safeData.length} scholarships.`);
}

function clearAdminFilters() {
  setValue(adminSearch, "");
  setValue(adminFilterState, "");
  setValue(adminFilterStatus, "");
  applyAdminFilters();
  showToolMessage("Filters cleared.");
}

function findDuplicateScholarship(name, ignoreId = "") {
  const normalizedName = normalizeText(name);

  return allScholarships.find((scholarship) => {
    return (
      normalizeText(scholarship.name) === normalizedName &&
      String(scholarship.id || "") !== String(ignoreId || "")
    );
  });
}

function renderLivePreview() {
  if (!adminLivePreview) return;

  const scholarship = collectScholarshipFormData();

  adminLivePreview.replaceChildren();

  const card = document.createElement("article");
  card.className = "admin-preview-card";

  const status = document.createElement("span");
  status.className = `admin-status-badge admin-status-${scholarship.status || "draft"}`;
  status.textContent = STATUS_LABELS[scholarship.status] || "Draft";

  const state = document.createElement("span");
  state.className = "admin-state-badge";
  state.textContent = scholarship.stateLabel || "State not selected";

  const title = document.createElement("h3");
  title.textContent = scholarship.name || "Scholarship name preview";

  const summary = document.createElement("p");
  summary.className = "mini-note";
  summary.textContent =
    scholarship.eligibilityNote || "Eligibility note preview will appear here.";

  const meta = document.createElement("div");
  meta.className = "admin-preview-meta";

  [
    ["Amount", scholarship.amount],
    ["Income", `₹${formatIndianNumber(scholarship.maxIncome)}`],
    ["Deadline", scholarship.deadline],
    ["Education", arrayToText(scholarship.education) || "Not added"],
    ["Categories", arrayToText(scholarship.categories) || "Not added"],
    ["Priority", String(scholarship.priority)]
  ].forEach(([label, value]) => {
    const item = document.createElement("p");
    item.innerHTML = `<strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}`;
    meta.appendChild(item);
  });

  card.append(status, state, title, summary, meta);
  adminLivePreview.appendChild(card);
}

function addActivity(message) {
  sessionActivity.unshift({
    message,
    time: new Date().toLocaleString("en-IN")
  });

  sessionActivity = sessionActivity.slice(0, 20);
  renderActivityLog();
}

function renderActivityLog() {
  if (!adminActivityLog) return;

  adminActivityLog.replaceChildren();

  if (sessionActivity.length === 0) {
    showContainerMessage(adminActivityLog, "No admin activity yet.");
    return;
  }

  sessionActivity.forEach((activity) => {
    const item = document.createElement("div");
    item.className = "admin-activity-item";

    const message = document.createElement("strong");
    message.textContent = activity.message;

    const time = document.createElement("span");
    time.textContent = activity.time;

    item.append(message, time);
    adminActivityLog.appendChild(item);
  });
}

function getFormFields() {
  return [
    adminScholarshipName,
    adminScholarshipState,
    adminScholarshipStatus,
    adminScholarshipAmount,
    adminScholarshipIncome,
    adminScholarshipMinPercentage,
    adminScholarshipDeadline,
    adminScholarshipDeadlineDate,
    adminScholarshipLink,
    adminScholarshipEducation,
    adminScholarshipCategories,
    adminScholarshipGenders,
    adminScholarshipDisability,
    adminScholarshipEligibility,
    adminScholarshipIncomeNote,
    adminScholarshipPriority,
    adminScholarshipSource
  ];
}

function normalizeState(value) {
  const text = normalizeText(value);

  if (text.includes("andhra")) return "andhra-pradesh";
  if (text.includes("telangana")) return "telangana";
  if (text.includes("national") || text.includes("india")) return "national";

  return VALID_STATES.includes(text) ? text : "national";
}

function parseCsv(value) {
  return String(value || "")
    .split(",")
    .map((item) => normalizeText(item))
    .filter(Boolean);
}

function normalizeArrayInput(value) {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeText(item)).filter(Boolean);
  }

  return parseCsv(value);
}

function arrayToText(value) {
  if (!Array.isArray(value)) return "";
  return value.join(", ");
}

function cleanText(value, maxLength = 500) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeHttpUrl(value) {
  const text = String(value || "").trim();

  if (!text) return "";

  try {
    const url = new URL(text);

    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return "";
    }

    return url.href;
  } catch {
    return "";
  }
}

function numberOrZero(value) {
  const number = Number(value);

  if (!Number.isFinite(number) || number < 0) {
    return 0;
  }

  return number;
}

function numberOrDefault(value, fallback) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return fallback;
  }

  return Math.max(0, Math.min(number, 100));
}

function setValue(element, value) {
  if (element) {
    element.value = String(value ?? "");
  }
}

function setText(element, value) {
  if (element) {
    element.textContent = String(value ?? "");
  }
}

function setButtonBusy(button, busy, busyText = "Working...") {
  if (!button) return;

  if (busy) {
    button.dataset.originalText = button.textContent;
    button.textContent = busyText;
    button.disabled = true;
    return;
  }

  button.textContent = button.dataset.originalText || button.textContent;
  button.disabled = false;
  delete button.dataset.originalText;
}

function showAdminMessage(message, isError = false) {
  if (!adminFormMessage) return;

  adminFormMessage.textContent = message;
  adminFormMessage.style.color = isError ? "#b42318" : "#067647";
}

function showToolMessage(message, isError = false) {
  if (!adminToolMessage) return;

  adminToolMessage.textContent = message;
  adminToolMessage.style.color = isError ? "#b42318" : "#067647";
}

function showContainerMessage(container, message) {
  if (!container) return;

  const paragraph = document.createElement("p");
  paragraph.className = "mini-note";
  paragraph.textContent = message;
  container.replaceChildren(paragraph);
}

function formatIndianNumber(value) {
  const number = Number(value || 0);

  if (!Number.isFinite(number)) {
    return "0";
  }

  return number.toLocaleString("en-IN");
}

function getTodayString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
