/* =====================================================
   ApplyMate India - Phase 2 app.js
   Works for login.html and dashboard.html
===================================================== */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

/* =====================================================
   FIREBASE CONFIG
   Paste your exact working Firebase config here.
   Keep your apiKey same.
===================================================== */

const firebaseConfig = {
  apiKey: "AIzaSyC5nxqTok1IkAPJn4CYrs_kK4OCmpqp5WI",
  authDomain: "PASTE_YOUR_AUTH_DOMAIN_HERE",
  projectId: "PASTE_YOUR_PROJECT_ID_HERE",
  storageBucket: "PASTE_YOUR_STORAGE_BUCKET_HERE",
  messagingSenderId: "PASTE_YOUR_MESSAGING_SENDER_ID_HERE",
  appId: "PASTE_YOUR_APP_ID_HERE"
};

/* =====================================================
   INIT
===================================================== */

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/* =====================================================
   GLOBAL STATE
===================================================== */

let currentUser = null;
let userProfile = null;
let scholarships = [];
let applicationsByScholarship = new Map();
let favorites = new Set();
let activeView = "eligible";

const STATUS_OPTIONS = [
  { value: "Not Applied", label: "🟢 Not Applied" },
  { value: "Applied", label: "🟡 Applied" },
  { value: "Under Review", label: "🔵 Under Review" },
  { value: "Approved", label: "✅ Approved" },
  { value: "Rejected", label: "❌ Rejected" }
];

const SAMPLE_SCHOLARSHIPS = [
  {
    title: "Andhra Pradesh Post-Matric Scholarship - Jnanabhumi",
    amount: "As per government rules",
    deadline: "Check official portal",
    state: "Andhra Pradesh",
    course: "Intermediate, Degree, Engineering, Post Graduation",
    category: "SC, ST, BC / OBC, Minority, EWS / EBC, Kapu",
    gender: "All",
    maxIncome: 200000,
    minPercentage: 35,
    disabilityAllowed: "All",
    documentsRequired: [
      "Aadhaar",
      "Income Certificate",
      "Caste Certificate",
      "Bonafide Certificate",
      "Marks Memo",
      "Bank Passbook"
    ],
    applyLink: "https://jnanabhumi.ap.gov.in/"
  },
  {
    title: "Telangana ePASS Post-Matric Scholarship",
    amount: "As per government rules",
    deadline: "Check official portal",
    state: "Telangana",
    course: "Intermediate, Degree, Engineering, Post Graduation",
    category: "SC, ST, BC / OBC, Minority, EWS / EBC",
    gender: "All",
    maxIncome: 200000,
    minPercentage: 35,
    disabilityAllowed: "All",
    documentsRequired: [
      "Aadhaar",
      "Income Certificate",
      "Caste Certificate",
      "Bonafide Certificate",
      "Marks Memo",
      "Bank Passbook"
    ],
    applyLink: "https://telanganaepass.cgg.gov.in/"
  },
  {
    title: "Central Sector Scholarship for College Students",
    amount: "₹10,000 - ₹20,000",
    deadline: "Check NSP",
    state: "National",
    course: "Degree, Engineering, Post Graduation",
    category: "General, SC, ST, BC / OBC, Minority, EWS / EBC",
    gender: "All",
    maxIncome: 800000,
    minPercentage: 80,
    disabilityAllowed: "All",
    documentsRequired: [
      "Aadhaar",
      "Class 12 Marks Memo",
      "Income Certificate",
      "Bonafide Certificate",
      "Bank Passbook"
    ],
    applyLink: "https://scholarships.gov.in/"
  },
  {
    title: "Scholarship for Students with Disabilities",
    amount: "As per scheme rules",
    deadline: "Check NSP",
    state: "National",
    course: "School, Intermediate, Degree, Engineering, Post Graduation",
    category: "General, SC, ST, BC / OBC, Minority, EWS / EBC",
    gender: "All",
    maxIncome: 250000,
    minPercentage: 40,
    disabilityAllowed: "Yes",
    documentsRequired: [
      "Aadhaar",
      "Disability Certificate",
      "Income Certificate",
      "Bonafide Certificate",
      "Marks Memo",
      "Bank Passbook"
    ],
    applyLink: "https://scholarships.gov.in/"
  },
  {
    title: "Girl Student Merit Scholarship",
    amount: "₹5,000 - ₹25,000",
    deadline: "Check official portal",
    state: "National",
    course: "Intermediate, Degree, Engineering",
    category: "General, SC, ST, BC / OBC, Minority, EWS / EBC",
    gender: "Female",
    maxIncome: 300000,
    minPercentage: 75,
    disabilityAllowed: "All",
    documentsRequired: [
      "Aadhaar",
      "Income Certificate",
      "Bonafide Certificate",
      "Marks Memo",
      "Bank Passbook"
    ],
    applyLink: "https://scholarships.gov.in/"
  }
];

/* =====================================================
   DOM HELPERS
===================================================== */

const $ = (id) => document.getElementById(id);

const page = {
  isLogin: Boolean($("loginForm") || $("registerForm")),
  isDashboard: Boolean($("scholarshipsGrid") || $("profileForm"))
};

const dom = {
  loginForm: $("loginForm"),
  registerForm: $("registerForm"),
  authMessage: $("authMessage"),

  logoutBtn: $("logoutBtn"),
  dashboardMessage: $("dashboardMessage"),
  greeting: $("greeting"),
  recommendationCount: $("recommendationCount"),
  savedCount: $("savedCount"),
  profileStatus: $("profileStatus"),
  profileSummary: $("profileSummary"),
  profileForm: $("profileForm"),

  scholarshipsGrid: $("scholarshipsGrid"),
  emptyState: $("emptyState"),
  filterForm: $("filterForm"),
  clearFiltersBtn: $("clearFiltersBtn"),
  seedScholarshipsBtn: $("seedScholarshipsBtn"),
  tabButtons: document.querySelectorAll(".tab-btn"),

  searchInput: $("searchInput"),
  filterState: $("filterState"),
  filterCourse: $("filterCourse"),
  filterCategory: $("filterCategory"),
  filterGender: $("filterGender"),
  filterDisability: $("filterDisability"),
  filterIncome: $("filterIncome"),
  filterPercentage: $("filterPercentage")
};

function showMessage(target, message, type = "info") {
  if (!target) return;
  target.textContent = message;
  target.className = `message ${type}`;
  target.hidden = false;
}

function hideMessage(target) {
  if (!target) return;
  target.textContent = "";
  target.hidden = true;
}

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalize(value) {
  return String(value ?? "").trim().toLowerCase();
}

function toNumber(value) {
  const number = Number(String(value ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(number) ? number : 0;
}

function isOpenValue(value) {
  const clean = normalize(value);
  return (
    !clean ||
    clean === "all" ||
    clean === "any" ||
    clean === "everyone" ||
    clean === "national / other" ||
    clean === "national" ||
    clean === "na" ||
    clean === "n/a"
  );
}

function splitValues(value) {
  if (Array.isArray(value)) {
    return value.map(normalize).filter(Boolean);
  }

  return String(value ?? "")
    .split(",")
    .map((item) => normalize(item))
    .filter(Boolean);
}

function titleCase(value) {
  return String(value ?? "")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatIncome(value) {
  const number = toNumber(value);
  if (!number) return "No limit";
  return `₹${number.toLocaleString("en-IN")}`;
}

function formatDeadline(value) {
  if (!value) return "No deadline added";

  if (typeof value?.toDate === "function") {
    return value.toDate().toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  }

  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) {
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  }

  return String(value);
}

/* =====================================================
   AUTH
===================================================== */

if (dom.loginForm) {
  dom.loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    hideMessage(dom.authMessage);

    const email = $("loginEmail").value.trim();
    const password = $("loginPassword").value;

    try {
      await signInWithEmailAndPassword(auth, email, password);
      window.location.href = "dashboard.html";
    } catch (error) {
      showMessage(dom.authMessage, getAuthErrorMessage(error), "error");
    }
  });
}

if (dom.registerForm) {
  dom.registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    hideMessage(dom.authMessage);

    const email = $("registerEmail").value.trim();
    const password = $("registerPassword").value;
    const profileData = getProfileDataFromForm("register");

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);

      await updateProfile(userCredential.user, {
        displayName: profileData.name
      });

      await setDoc(
        doc(db, "users", userCredential.user.uid),
        {
          ...profileData,
          email,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );

      window.location.href = "dashboard.html";
    } catch (error) {
      showMessage(dom.authMessage, getAuthErrorMessage(error), "error");
    }
  });
}

if (dom.logoutBtn) {
  dom.logoutBtn.addEventListener("click", async () => {
    await signOut(auth);
    window.location.href = "login.html";
  });
}

onAuthStateChanged(auth, async (user) => {
  currentUser = user;

  if (page.isDashboard && !user) {
    window.location.href = "login.html";
    return;
  }

  if (page.isLogin && user) {
    // User is already logged in. Keep login page usable but show message.
    showMessage(dom.authMessage, "You are already logged in. Opening dashboard...", "success");
    setTimeout(() => {
      window.location.href = "dashboard.html";
    }, 700);
    return;
  }

  if (page.isDashboard && user) {
    await loadDashboardData();
  }
});

function getAuthErrorMessage(error) {
  const code = error?.code || "";

  if (code.includes("auth/invalid-email")) return "Please enter a valid email address.";
  if (code.includes("auth/email-already-in-use")) return "This email is already registered. Try login.";
  if (code.includes("auth/weak-password")) return "Password should be at least 6 characters.";
  if (code.includes("auth/invalid-credential")) return "Incorrect email or password.";
  if (code.includes("auth/user-not-found")) return "No account found with this email.";
  if (code.includes("auth/wrong-password")) return "Incorrect password.";
  if (code.includes("auth/network-request-failed")) return "Network error. Check your internet.";

  return error?.message || "Something went wrong.";
}

/* =====================================================
   PROFILE
===================================================== */

function getProfileDataFromForm(prefix) {
  return {
    name: $(`${prefix}Name`)?.value.trim() || "",
    state: $(`${prefix}State`)?.value || "",
    course: $(`${prefix}Course`)?.value || "",
    category: $(`${prefix}Category`)?.value || "",
    gender: $(`${prefix}Gender`)?.value || "",
    disability: $(`${prefix}Disability`)?.value || "No",
    income: toNumber($(`${prefix}Income`)?.value || 0),
    percentage: toNumber($(`${prefix}Percentage`)?.value || 0)
  };
}

if (dom.profileForm) {
  dom.profileForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!currentUser) return;

    const profileData = getProfileDataFromForm("profile");

    try {
      await setDoc(
        doc(db, "users", currentUser.uid),
        {
          ...profileData,
          email: currentUser.email,
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );

      userProfile = {
        ...userProfile,
        ...profileData,
        email: currentUser.email
      };

      showMessage(dom.dashboardMessage, "Profile saved. Recommendations refreshed.", "success");
      renderDashboard();
    } catch (error) {
      showMessage(dom.dashboardMessage, `Profile save failed: ${error.message}`, "error");
    }
  });
}

async function loadUserProfile() {
  const ref = doc(db, "users", currentUser.uid);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    return {
      id: snap.id,
      ...snap.data()
    };
  }

  const fallbackProfile = {
    name: currentUser.displayName || "Student",
    email: currentUser.email || "",
    state: "",
    course: "",
    category: "",
    gender: "",
    disability: "No",
    income: 0,
    percentage: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  await setDoc(ref, fallbackProfile, { merge: true });

  return {
    id: currentUser.uid,
    ...fallbackProfile
  };
}

function fillProfileForm() {
  if (!userProfile) return;

  setValue("profileName", userProfile.name);
  setValue("profileState", userProfile.state);
  setValue("profileCourse", userProfile.course);
  setValue("profileCategory", userProfile.category);
  setValue("profileGender", userProfile.gender);
  setValue("profileDisability", userProfile.disability || "No");
  setValue("profileIncome", userProfile.income);
  setValue("profilePercentage", userProfile.percentage);
}

function setValue(id, value) {
  const element = $(id);
  if (element) element.value = value ?? "";
}

function isProfileComplete(profile) {
  return Boolean(
    profile?.name &&
    profile?.state &&
    profile?.course &&
    profile?.category &&
    profile?.gender &&
    profile?.disability &&
    toNumber(profile?.income) > 0 &&
    toNumber(profile?.percentage) > 0
  );
}

/* =====================================================
   LOAD FIRESTORE DATA
===================================================== */

async function loadDashboardData() {
  showMessage(dom.dashboardMessage, "Loading dashboard...", "info");

  try {
    userProfile = await loadUserProfile();

    const scholarshipSnap = await getDocs(collection(db, "scholarships"));

    scholarships = scholarshipSnap.docs.map((item) => ({
      id: item.id,
      ...item.data()
    }));

    const applicationsSnap = await getDocs(
      query(collection(db, "applications"), where("userId", "==", currentUser.uid))
    );

    applicationsByScholarship = new Map();

    applicationsSnap.forEach((item) => {
      const data = item.data();
      applicationsByScholarship.set(data.scholarshipId, {
        id: item.id,
        ...data
      });
    });

    const favoritesSnap = await getDocs(
      query(collection(db, "favorites"), where("userId", "==", currentUser.uid))
    );

    favorites = new Set();

    favoritesSnap.forEach((item) => {
      const data = item.data();
      if (data.scholarshipId) favorites.add(data.scholarshipId);
    });

    renderDashboard();
    hideMessage(dom.dashboardMessage);
  } catch (error) {
    showMessage(dom.dashboardMessage, `Failed to load dashboard: ${error.message}`, "error");
  }
}

/* =====================================================
   ELIGIBILITY ENGINE
===================================================== */

function fieldMatches(profileValue, scholarshipValue) {
  if (isOpenValue(scholarshipValue)) return true;

  const userValue = normalize(profileValue);
  const scholarshipValues = splitValues(scholarshipValue);

  if (scholarshipValues.includes(userValue)) return true;

  // Treat National scholarships as available for all states.
  if (scholarshipValues.includes("national")) return true;

  return false;
}

function disabilityMatches(profileDisability, scholarshipDisability) {
  if (isOpenValue(scholarshipDisability)) return true;

  const userHasDisability = normalize(profileDisability) === "yes";

  if (typeof scholarshipDisability === "boolean") {
    return scholarshipDisability ? userHasDisability : !userHasDisability;
  }

  const value = normalize(scholarshipDisability);

  if (["yes", "true", "disabled", "pwd", "disability"].includes(value)) {
    return userHasDisability;
  }

  if (["no", "false", "not disabled", "non-disabled"].includes(value)) {
    return !userHasDisability;
  }

  return true;
}

function isEligible(scholarship, profile = userProfile) {
  if (!profile) return false;

  const userIncome = toNumber(profile.income);
  const userPercentage = toNumber(profile.percentage);

  const maxIncome = scholarship.maxIncome === "" || scholarship.maxIncome === undefined || scholarship.maxIncome === null
    ? null
    : toNumber(scholarship.maxIncome);

  const minPercentage = scholarship.minPercentage === "" || scholarship.minPercentage === undefined || scholarship.minPercentage === null
    ? null
    : toNumber(scholarship.minPercentage);

  return (
    fieldMatches(profile.state, scholarship.state) &&
    fieldMatches(profile.course, scholarship.course) &&
    fieldMatches(profile.category, scholarship.category) &&
    fieldMatches(profile.gender, scholarship.gender) &&
    disabilityMatches(profile.disability, scholarship.disabilityAllowed) &&
    (maxIncome === null || userIncome <= maxIncome) &&
    (minPercentage === null || userPercentage >= minPercentage)
  );
}

/* =====================================================
   FILTERS / TABS
===================================================== */

if (dom.filterForm) {
  dom.filterForm.addEventListener("input", renderScholarships);
  dom.filterForm.addEventListener("change", renderScholarships);
}

if (dom.clearFiltersBtn) {
  dom.clearFiltersBtn.addEventListener("click", () => {
    dom.filterForm.reset();
    renderScholarships();
  });
}

dom.tabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeView = button.dataset.view;

    dom.tabButtons.forEach((btn) => btn.classList.remove("active"));
    button.classList.add("active");

    renderScholarships();
  });
});

function scholarshipMatchesFilters(scholarship) {
  const searchText = normalize(dom.searchInput?.value);
  const state = dom.filterState?.value || "";
  const course = dom.filterCourse?.value || "";
  const category = dom.filterCategory?.value || "";
  const gender = dom.filterGender?.value || "";
  const disability = dom.filterDisability?.value || "";
  const income = dom.filterIncome?.value || "";
  const percentage = dom.filterPercentage?.value || "";

  if (searchText) {
    const searchable = normalize(`
      ${scholarship.title}
      ${scholarship.state}
      ${scholarship.course}
      ${scholarship.category}
      ${scholarship.gender}
      ${scholarship.amount}
    `);

    if (!searchable.includes(searchText)) return false;
  }

  if (state && !fieldMatches(state, scholarship.state)) return false;
  if (course && !fieldMatches(course, scholarship.course)) return false;
  if (category && !fieldMatches(category, scholarship.category)) return false;
  if (gender && !fieldMatches(gender, scholarship.gender)) return false;
  if (disability && !disabilityMatches(disability, scholarship.disabilityAllowed)) return false;

  if (income) {
    const maxIncome = scholarship.maxIncome === "" || scholarship.maxIncome === undefined || scholarship.maxIncome === null
      ? null
      : toNumber(scholarship.maxIncome);

    if (maxIncome !== null && toNumber(income) > maxIncome) return false;
  }

  if (percentage) {
    const minPercentage = scholarship.minPercentage === "" || scholarship.minPercentage === undefined || scholarship.minPercentage === null
      ? null
      : toNumber(scholarship.minPercentage);

    if (minPercentage !== null && toNumber(percentage) < minPercentage) return false;
  }

  return true;
}

function getVisibleScholarships() {
  let list = [...scholarships];

  if (activeView === "eligible") {
    list = list.filter((item) => isEligible(item));
  }

  if (activeView === "saved") {
    list = list.filter((item) => favorites.has(item.id));
  }

  return list.filter(scholarshipMatchesFilters);
}

function populateFilterOptions() {
  fillSelect(dom.filterState, uniqueValues("state"), "All states");
  fillSelect(dom.filterCourse, uniqueValues("course"), "All courses");
}

function uniqueValues(field) {
  const values = new Set();

  scholarships.forEach((scholarship) => {
    splitValues(scholarship[field]).forEach((value) => {
      if (!isOpenValue(value)) values.add(titleCase(value));
    });
  });

  if (userProfile?.[field]) values.add(userProfile[field]);

  return [...values].sort((a, b) => a.localeCompare(b));
}

function fillSelect(select, values, defaultText) {
  if (!select) return;

  const oldValue = select.value;
  select.innerHTML = `<option value="">${defaultText}</option>`;

  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });

  if (values.includes(oldValue)) {
    select.value = oldValue;
  }
}

/* =====================================================
   RENDER
===================================================== */

function renderDashboard() {
  fillProfileForm();
  populateFilterOptions();
  renderProfileSummary();
  renderStats();
  renderScholarships();
}

function renderProfileSummary() {
  if (!dom.profileSummary) return;

  const complete = isProfileComplete(userProfile);

  dom.greeting.textContent = `Welcome, ${userProfile?.name || "Student"}`;
  dom.profileStatus.textContent = complete ? "Complete" : "Incomplete";
  dom.profileStatus.className = complete ? "pill success" : "pill warning";

  dom.profileSummary.innerHTML = `
    <div><strong>Email:</strong> ${escapeHTML(userProfile?.email || currentUser?.email || "-")}</div>
    <div><strong>State:</strong> ${escapeHTML(userProfile?.state || "Not added")}</div>
    <div><strong>Course:</strong> ${escapeHTML(userProfile?.course || "Not added")}</div>
    <div><strong>Category:</strong> ${escapeHTML(userProfile?.category || "Not added")}</div>
    <div><strong>Gender:</strong> ${escapeHTML(userProfile?.gender || "Not added")}</div>
    <div><strong>Disability:</strong> ${escapeHTML(userProfile?.disability || "No")}</div>
    <div><strong>Income:</strong> ${formatIncome(userProfile?.income)}</div>
    <div><strong>Percentage/CGPA:</strong> ${escapeHTML(userProfile?.percentage || "Not added")}</div>
  `;
}

function renderStats() {
  const eligibleCount = scholarships.filter((item) => isEligible(item)).length;

  if (dom.recommendationCount) {
    dom.recommendationCount.textContent = `You are eligible for these ${eligibleCount} scholarship${eligibleCount === 1 ? "" : "s"}.`;
  }

  if (dom.savedCount) {
    dom.savedCount.textContent = `${favorites.size} saved`;
  }
}

function renderScholarships() {
  if (!dom.scholarshipsGrid) return;

  renderStats();

  const visibleScholarships = getVisibleScholarships();
  dom.scholarshipsGrid.innerHTML = "";

  if (!visibleScholarships.length) {
    dom.emptyState.hidden = false;

    if (!scholarships.length) {
      dom.emptyState.innerHTML = `
        <h3>No scholarships found in Firestore.</h3>
        <p>Click <strong>Add Sample Scholarships</strong> once, or add documents manually to the <strong>scholarships</strong> collection.</p>
      `;
    } else {
      dom.emptyState.innerHTML = `
        <h3>There are no scholarships for your category right now.</h3>
        <p>Would you like to enable notifications?</p>
        <button class="secondary-btn" type="button" disabled>Notifications coming soon</button>
      `;
    }

    return;
  }

  dom.emptyState.hidden = true;

  visibleScholarships.forEach((scholarship) => {
    dom.scholarshipsGrid.insertAdjacentHTML("beforeend", createScholarshipCard(scholarship));
  });
}

function createScholarshipCard(scholarship) {
  const eligible = isEligible(scholarship);
  const saved = favorites.has(scholarship.id);
  const application = applicationsByScholarship.get(scholarship.id);
  const currentStatus = application?.status || "Not Applied";
  const documents = normalizeDocuments(scholarship.documentsRequired);

  return `
    <article class="scholarship-card ${eligible ? "eligible" : "not-eligible"}">
      <div class="card-topline">
        <span class="pill ${eligible ? "success" : "muted"}">${eligible ? "Eligible" : "Check eligibility"}</span>

        <button class="icon-btn ${saved ? "saved" : ""}" type="button" data-action="favorite" data-id="${escapeHTML(scholarship.id)}">
          ${saved ? "★ Saved" : "☆ Save"}
        </button>
      </div>

      <h3>${escapeHTML(scholarship.title || "Untitled Scholarship")}</h3>

      <div class="meta-grid">
        <div>
          <span>Amount</span>
          <strong>${escapeHTML(scholarship.amount || "Not added")}</strong>
        </div>

        <div>
          <span>Deadline</span>
          <strong>${escapeHTML(formatDeadline(scholarship.deadline))}</strong>
        </div>

        <div>
          <span>Max Income</span>
          <strong>${formatIncome(scholarship.maxIncome)}</strong>
        </div>
      </div>

      <div class="criteria-list">
        <span>State: ${escapeHTML(scholarship.state || "All")}</span>
        <span>Course: ${escapeHTML(scholarship.course || "All")}</span>
        <span>Category: ${escapeHTML(scholarship.category || "All")}</span>
        <span>Gender: ${escapeHTML(scholarship.gender || "All")}</span>
        <span>Min %/CGPA: ${escapeHTML(scholarship.minPercentage || "No minimum")}</span>
        <span>Disability: ${escapeHTML(scholarship.disabilityAllowed || "All")}</span>
      </div>

      <div class="documents">
        <h4>Required Documents</h4>
        <ul>
          ${documents.map((documentName) => `<li>${escapeHTML(documentName)}</li>`).join("")}
        </ul>
      </div>

      <div class="card-actions">
        <label>
          Application Status
          <select class="status-select" data-id="${escapeHTML(scholarship.id)}">
            ${STATUS_OPTIONS.map((status) => `
              <option value="${status.value}" ${status.value === currentStatus ? "selected" : ""}>
                ${status.label}
              </option>
            `).join("")}
          </select>
        </label>

        ${
          scholarship.applyLink
            ? `<a class="primary-link" href="${escapeHTML(scholarship.applyLink)}" target="_blank" rel="noopener noreferrer">Apply on Official Portal</a>`
            : `<button class="primary-link disabled" type="button" disabled>Apply link missing</button>`
        }
      </div>
    </article>
  `;
}

function normalizeDocuments(value) {
  if (Array.isArray(value) && value.length) return value;

  if (typeof value === "string" && value.trim()) {
    return value.split(",").map((item) => item.trim()).filter(Boolean);
  }

  return [
    "Income Certificate",
    "Aadhaar",
    "Bonafide Certificate",
    "Caste Certificate",
    "Marks Memo",
    "Bank Passbook"
  ];
}

/* =====================================================
   APPLICATION STATUS + FAVORITES
===================================================== */

if (dom.scholarshipsGrid) {
  dom.scholarshipsGrid.addEventListener("change", async (event) => {
    if (!event.target.classList.contains("status-select")) return;

    const scholarshipId = event.target.dataset.id;
    const status = event.target.value;

    await updateApplicationStatus(scholarshipId, status);
  });

  dom.scholarshipsGrid.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-action='favorite']");
    if (!button) return;

    await toggleFavorite(button.dataset.id);
  });
}

async function updateApplicationStatus(scholarshipId, status) {
  if (!currentUser || !scholarshipId) return;

  const applicationId = `${currentUser.uid}_${scholarshipId}`;
  const applicationRef = doc(db, "applications", applicationId);
  const existingApplication = applicationsByScholarship.get(scholarshipId);

  const payload = {
    userId: currentUser.uid,
    scholarshipId,
    status,
    updatedAt: serverTimestamp()
  };

  if (status !== "Not Applied" && !existingApplication?.appliedDate) {
    payload.appliedDate = serverTimestamp();
  }

  try {
    await setDoc(applicationRef, payload, { merge: true });

    applicationsByScholarship.set(scholarshipId, {
      id: applicationId,
      ...existingApplication,
      ...payload
    });

    showMessage(dom.dashboardMessage, "Application status updated.", "success");
    renderScholarships();
  } catch (error) {
    showMessage(dom.dashboardMessage, `Status update failed: ${error.message}`, "error");
  }
}

async function toggleFavorite(scholarshipId) {
  if (!currentUser || !scholarshipId) return;

  const favoriteId = `${currentUser.uid}_${scholarshipId}`;
  const favoriteRef = doc(db, "favorites", favoriteId);

  try {
    if (favorites.has(scholarshipId)) {
      await deleteDoc(favoriteRef);
      favorites.delete(scholarshipId);
      showMessage(dom.dashboardMessage, "Removed from Apply Later.", "success");
    } else {
      await setDoc(
        favoriteRef,
        {
          userId: currentUser.uid,
          scholarshipId,
          savedAt: serverTimestamp()
        },
        { merge: true }
      );

      favorites.add(scholarshipId);
      showMessage(dom.dashboardMessage, "Saved to Apply Later.", "success");
    }

    renderScholarships();
  } catch (error) {
    showMessage(dom.dashboardMessage, `Save failed: ${error.message}`, "error");
  }
}

/* =====================================================
   SAMPLE SCHOLARSHIP SEEDING
===================================================== */

if (dom.seedScholarshipsBtn) {
  dom.seedScholarshipsBtn.addEventListener("click", seedSampleScholarships);
}

async function seedSampleScholarships() {
  if (!currentUser) return;

  showMessage(dom.dashboardMessage, "Adding sample scholarships...", "info");

  try {
    for (const scholarship of SAMPLE_SCHOLARSHIPS) {
      const id = slugify(scholarship.title);

      await setDoc(
        doc(db, "scholarships", id),
        {
          ...scholarship,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );
    }

    showMessage(dom.dashboardMessage, "Sample scholarships added successfully.", "success");
    await loadDashboardData();
  } catch (error) {
    showMessage(dom.dashboardMessage, `Could not add sample scholarships: ${error.message}`, "error");
  }
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}
