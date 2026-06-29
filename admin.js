import { auth, db } from "./firebase-config.js";

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
  serverTimestamp,
  query,
  orderBy
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
const nationalScholarshipsCount = document.getElementById("nationalScholarshipsCount");
const stateScholarshipsCount = document.getElementById("stateScholarshipsCount");

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
const adminFormMessage = document.getElementById("adminFormMessage");

const adminSearch = document.getElementById("adminSearch");
const adminFilterState = document.getElementById("adminFilterState");
const adminFilterStatus = document.getElementById("adminFilterStatus");
const adminScholarshipCount = document.getElementById("adminScholarshipCount");
const adminScholarshipList = document.getElementById("adminScholarshipList");

const VALID_STATES = ["national", "andhra-pradesh", "telangana"];
const VALID_STATUSES = ["active", "draft", "closed"];
const VALID_DISABILITY_RULES = ["any", "yes", "no"];

const STATE_LABELS = {
  "national": "National",
  "andhra-pradesh": "Andhra Pradesh",
  "telangana": "Telangana"
};

const STATUS_LABELS = {
  active: "✅ Active",
  draft: "📝 Draft",
  closed: "⛔ Closed"
};

let currentAdminUser = null;
let allScholarships = [];
let filteredScholarships = [];
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

  adminSearch?.addEventListener("input", applyAdminFilters);
  adminFilterState?.addEventListener("change", applyAdminFilters);
  adminFilterStatus?.addEventListener("change", applyAdminFilters);
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

  setButtonBusy(saveScholarshipAdminBtn, true, editId ? "Updating..." : "Saving...");

  try {
    if (editId) {
      await updateDoc(doc(db, "scholarships", editId), {
        ...scholarship,
        updatedAt: serverTimestamp(),
        updatedBy: currentAdminUser.email || ""
      });

      showAdminMessage("Scholarship updated successfully.");
    } else {
      await addDoc(collection(db, "scholarships"), {
        ...scholarship,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: currentAdminUser.email || "",
        updatedBy: currentAdminUser.email || ""
      });

      showAdminMessage("Scholarship added successfully.");
    }

    clearScholarshipForm();
    await loadAdminScholarships();
  } catch (error) {
    console.error("Admin scholarship save error:", error);
    showAdminMessage(
      "Could not save scholarship. Check Firestore rules and try again.",
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

  if (!scholarship.link) {
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
    const scholarshipsQuery = query(
      collection(db, "scholarships"),
      orderBy("createdAt", "desc")
    );

    const snapshot = await getDocs(scholarshipsQuery);

    allScholarships = snapshot.docs.map((documentSnapshot) => ({
      id: documentSnapshot.id,
      ...documentSnapshot.data()
    }));

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
      Array.isArray(scholarship.education) ? scholarship.education.join(" ") : "",
      Array.isArray(scholarship.categories) ? scholarship.categories.join(" ") : "",
      Array.isArray(scholarship.genders) ? scholarship.genders.join(" ") : ""
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
  const card = document.createElement("div");
  card.className = "admin-scholarship-card";

  const topRow = document.createElement("div");
  topRow.className = "admin-card-top";

  const badge = document.createElement("span");
  badge.className = getAdminStatusBadgeClass(scholarship.status);
  badge.textContent = STATUS_LABELS[scholarship.status] || "📝 Draft";

  const stateBadge = document.createElement("span");
  stateBadge.className = "admin-state-badge";
  stateBadge.textContent = scholarship.stateLabel || STATE_LABELS[scholarship.state] || "National";

  topRow.append(badge, stateBadge);

  const heading = document.createElement("h3");
  heading.textContent = scholarship.name || "Untitled scholarship";

  const meta = document.createElement("div");
  meta.className = "admin-meta-grid";

  meta.append(
    createMetaItem("Amount", scholarship.amount || "Varies"),
    createMetaItem("Income Limit", `₹${formatIndianNumber(scholarship.maxIncome || 0)}`),
    createMetaItem("Min Marks", scholarship.minPercentage ? `${scholarship.minPercentage}%` : "Not specified"),
    createMetaItem("Deadline", scholarship.deadline || "Check official portal"),
    createMetaItem("Education", formatList(scholarship.education)),
    createMetaItem("Categories", formatList(scholarship.categories)),
    createMetaItem("Gender", formatList(scholarship.genders)),
    createMetaItem("Disability", formatDisability(scholarship.disability)),
    createMetaItem("Source", scholarship.sourceName || "Official Portal")
  );

  const linkParagraph = document.createElement("p");
  linkParagraph.className = "mini-note";

  const safeLink = normalizeHttpUrl(scholarship.link);

  if (safeLink) {
    const link = document.createElement("a");
    link.href = safeLink;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "Open official link";
    linkParagraph.appendChild(link);
  } else {
    linkParagraph.textContent = "Official link missing or invalid.";
  }

  const eligibility = document.createElement("p");
  eligibility.className = "admin-card-note";
  eligibility.textContent = scholarship.eligibilityNote || "No eligibility note added.";

  const actions = document.createElement("div");
  actions.className = "button-row";

  const editButton = document.createElement("button");
  editButton.type = "button";
  editButton.className = "secondary-btn";
  editButton.textContent = "Edit";

  editButton.addEventListener("click", () => {
    fillScholarshipFormForEdit(scholarship);
  });

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "danger-btn";
  deleteButton.textContent = "Delete";

  deleteButton.addEventListener("click", async () => {
    await deleteAdminScholarship(scholarship);
  });

  actions.append(editButton, deleteButton);

  card.append(topRow, heading, meta, linkParagraph, eligibility, actions);

  return card;
}

function createMetaItem(label, value) {
  const item = document.createElement("div");
  item.className = "admin-meta-item";

  const strong = document.createElement("strong");
  strong.textContent = label;

  const span = document.createElement("span");
  span.textContent = value || "Not specified";

  item.append(strong, span);
  return item;
}

function fillScholarshipFormForEdit(scholarship) {
  setElementValue(editingScholarshipId, scholarship.id);
  setElementValue(adminScholarshipName, scholarship.name);
  setElementValue(adminScholarshipState, scholarship.state);
  setElementValue(adminScholarshipStatus, scholarship.status || "active");
  setElementValue(adminScholarshipAmount, scholarship.amount);
  setElementValue(adminScholarshipIncome, scholarship.maxIncome);
  setElementValue(adminScholarshipMinPercentage, scholarship.minPercentage);
  setElementValue(adminScholarshipDeadline, scholarship.deadline);
  setElementValue(adminScholarshipDeadlineDate, scholarship.deadlineDate);
  setElementValue(adminScholarshipLink, scholarship.link);
  setElementValue(adminScholarshipEducation, formatRawList(scholarship.education));
  setElementValue(adminScholarshipCategories, formatRawList(scholarship.categories));
  setElementValue(adminScholarshipGenders, formatRawList(scholarship.genders));
  setElementValue(adminScholarshipDisability, scholarship.disability || "any");
  setElementValue(adminScholarshipEligibility, scholarship.eligibilityNote);
  setElementValue(adminScholarshipIncomeNote, scholarship.incomeNote);
  setElementValue(adminScholarshipPriority, scholarship.priority);
  setElementValue(adminScholarshipSource, scholarship.sourceName);

  if (saveScholarshipAdminBtn) {
    saveScholarshipAdminBtn.textContent = "Update Scholarship";
  }

  showAdminMessage(`Editing: ${scholarship.name}`);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function deleteAdminScholarship(scholarship) {
  if (!currentAdminUser || !isAdminUser(currentAdminUser)) return;

  const confirmed = window.confirm(
    `Delete "${scholarship.name}"? This cannot be undone.`
  );

  if (!confirmed) return;

  try {
    await deleteDoc(doc(db, "scholarships", scholarship.id));
    showAdminMessage("Scholarship deleted successfully.");
    await loadAdminScholarships();
  } catch (error) {
    console.error("Admin scholarship delete error:", error);
    showAdminMessage("Could not delete scholarship. Please try again.", true);
  }
}

function clearScholarshipForm() {
  setElementValue(editingScholarshipId, "");
  setElementValue(adminScholarshipName, "");
  setElementValue(adminScholarshipState, "");
  setElementValue(adminScholarshipStatus, "active");
  setElementValue(adminScholarshipAmount, "");
  setElementValue(adminScholarshipIncome, "");
  setElementValue(adminScholarshipMinPercentage, "");
  setElementValue(adminScholarshipDeadline, "");
  setElementValue(adminScholarshipDeadlineDate, "");
  setElementValue(adminScholarshipLink, "");
  setElementValue(adminScholarshipEducation, "");
  setElementValue(adminScholarshipCategories, "");
  setElementValue(adminScholarshipGenders, "any");
  setElementValue(adminScholarshipDisability, "any");
  setElementValue(adminScholarshipEligibility, "");
  setElementValue(adminScholarshipIncomeNote, "");
  setElementValue(adminScholarshipPriority, "50");
  setElementValue(adminScholarshipSource, "");

  if (saveScholarshipAdminBtn) {
    saveScholarshipAdminBtn.textContent = "Save Scholarship";
  }

  showAdminMessage("");
}

function updateAdminAnalytics() {
  const total = allScholarships.length;
  const active = allScholarships.filter((item) => item.status === "active").length;
  const national = allScholarships.filter((item) => item.state === "national").length;
  const state = allScholarships.filter((item) => item.state !== "national").length;

  setText(totalScholarshipsCount, total);
  setText(activeScholarshipsCount, active);
  setText(nationalScholarshipsCount, national);
  setText(stateScholarshipsCount, state);
}

function parseCsv(value) {
  return String(value || "")
    .split(",")
    .map((item) => normalizeToken(item))
    .filter(Boolean)
    .filter((item, index, array) => array.indexOf(item) === index);
}

function normalizeToken(value) {
  const text = normalizeText(value);

  if (!text) return "";

  if (text === "bc" || text === "b c" || text === "bc/obc" || text === "obc") return "obc";
  if (text === "ews/ebc" || text === "ebc" || text === "ews") return "ews";
  if (text === "post graduation" || text === "postgraduation" || text === "post-graduation") return "pg";
  if (text === "all") return "any";

  return text.replace(/\s+/g, "-");
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

function cleanText(value, maxLength = 500) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function numberOrZero(value) {
  const number = Number(value || 0);

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

  return Math.min(Math.max(number, 0), 100);
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function setElementValue(element, value) {
  if (element) {
    element.value = String(value ?? "");
  }
}

function setText(element, value) {
  if (element) {
    element.textContent = String(value ?? "");
  }
}

function showAdminMessage(message, isError = false) {
  if (!adminFormMessage) return;

  adminFormMessage.textContent = message;
  adminFormMessage.style.color = isError ? "#b42318" : "#067647";
}

function showContainerMessage(container, message) {
  if (!container) return;

  const paragraph = document.createElement("p");
  paragraph.className = "mini-note";
  paragraph.textContent = message;
  container.replaceChildren(paragraph);
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

function formatRawList(items) {
  if (!Array.isArray(items)) {
    return "";
  }

  return items.join(", ");
}

function formatList(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return "Not specified";
  }

  const labels = {
    "andhra-pradesh": "Andhra Pradesh",
    "telangana": "Telangana",
    "national": "National",
    "school": "School",
    "intermediate": "Intermediate",
    "degree": "Degree",
    "engineering": "Engineering",
    "pg": "Post Graduation",
    "general": "General",
    "sc": "SC",
    "st": "ST",
    "bc": "BC",
    "obc": "OBC",
    "ebc": "EBC",
    "ews": "EWS",
    "minority": "Minority",
    "kapu": "Kapu",
    "disabled": "Disabled",
    "any": "Any",
    "male": "Male",
    "female": "Female"
  };

  return items
    .map((item) => labels[String(item || "").trim()] || item)
    .join(", ");
}

function formatDisability(value) {
  const text = normalizeText(value);

  if (text === "yes") return "Only specially abled students";
  if (text === "no") return "Not disability-specific";

  return "Any";
}

function formatIndianNumber(value) {
  const number = Number(value || 0);

  if (!Number.isFinite(number)) {
    return "0";
  }

  return number.toLocaleString("en-IN");
}

function getAdminStatusBadgeClass(status) {
  const classes = ["admin-status-badge"];

  if (status === "active") {
    classes.push("admin-status-active");
  } else if (status === "closed") {
    classes.push("admin-status-closed");
  } else {
    classes.push("admin-status-draft");
  }

  return classes.join(" ");
}
