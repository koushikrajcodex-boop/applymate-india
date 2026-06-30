import { auth, db } from "./firebase-config.js";
import { scholarships } from "./scholarships-data.js";
import { validateScholarships } from "./scholarship-validator.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

import {
  doc,
  getDoc,
  setDoc,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  serverTimestamp,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const scholarshipValidation = validateScholarships(scholarships);

if (!scholarshipValidation.valid) {
  console.warn("Scholarship data validation errors:", scholarshipValidation.errors);
}

const userEmail = document.getElementById("userEmail");
const logoutBtn = document.getElementById("logoutBtn");

const notificationToggleBtn = document.getElementById("notificationToggleBtn");
const notificationBadge = document.getElementById("notificationBadge");
const notificationPanel = document.getElementById("notificationPanel");
const notificationList = document.getElementById("notificationList");
const markNotificationsReadBtn = document.getElementById("markNotificationsReadBtn");

const profileName = document.getElementById("profileName");
const profileState = document.getElementById("profileState");
const profileEducation = document.getElementById("profileEducation");
const profileYear = document.getElementById("profileYear");
const profileCategory = document.getElementById("profileCategory");
const profileGender = document.getElementById("profileGender");
const profileDisability = document.getElementById("profileDisability");
const profileIncome = document.getElementById("profileIncome");
const profilePercentage = document.getElementById("profilePercentage");
const saveProfileBtn = document.getElementById("saveProfileBtn");
const profileMessage = document.getElementById("profileMessage");

const recommendationSummary = document.getElementById("recommendationSummary");
const recommendationList = document.getElementById("recommendationList");
const recommendationSearch = document.getElementById("recommendationSearch");
const filterState = document.getElementById("filterState");
const filterEducation = document.getElementById("filterEducation");
const filterCategory = document.getElementById("filterCategory");
const filterGender = document.getElementById("filterGender");
const filterDisability = document.getElementById("filterDisability");
const filterDeadline = document.getElementById("filterDeadline");
const resetFiltersBtn = document.getElementById("resetFiltersBtn");
const recommendationCount = document.getElementById("recommendationCount");
const bestMatchBox = document.getElementById("bestMatchBox");

const compareList = document.getElementById("compareList");
const clearCompareBtn = document.getElementById("clearCompareBtn");
const comparisonTableWrap = document.getElementById("comparisonTableWrap");

const savedName = document.getElementById("savedName");
const savedLink = document.getElementById("savedLink");
const addSavedBtn = document.getElementById("addSavedBtn");
const savedList = document.getElementById("savedList");

const appName = document.getElementById("appName");
const appStatus = document.getElementById("appStatus");
const appNote = document.getElementById("appNote");
const addApplicationBtn = document.getElementById("addApplicationBtn");
const applicationList = document.getElementById("applicationList");

const LAST_VERIFIED = "28 June 2026";
const DEADLINE_SOON_DAYS = 15;
const MAX_COMPARE_ITEMS = 4;

const VALID_APPLICATION_STATUSES = [
  "Not Applied",
  "Applied",
  "Under Review",
  "Approved",
  "Rejected"
];

const STATUS_LABELS = {
  "Not Applied": "🟢 Not Applied",
  "Applied": "🟡 Applied",
  "Under Review": "🔵 Under Review",
  "Approved": "✅ Approved",
  "Rejected": "❌ Rejected"
};

let currentUser = null;
let latestProfile = {};
let availableScholarships = scholarships;
let scholarshipSourceLabel = "local data";
let latestRecommendedScholarships = [];
let filteredRecommendedScholarships = [];
let compareScholarships = [];
let savedScholarshipItems = [];
let applicationItems = [];
let notificationItems = [];
let readNotificationKeys = [];

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.replace("login.html");
    return;
  }

  currentUser = user;

  if (userEmail) {
    userEmail.textContent = `Logged in as: ${user.email || "student"}`;
  }

  try {
    setupNotificationEvents();
    setupFilterEvents();
    setupComparisonEvents();

    await loadAvailableScholarships();

    await Promise.all([
      loadProfile(),
      loadSavedScholarships(),
      loadApplications()
    ]);

    refreshNotifications();
  } catch (error) {
    console.error("Dashboard loading error:", error);
    showProfileMessage("Some dashboard data could not be loaded.", true);
  }
});

logoutBtn?.addEventListener("click", async () => {
  logoutBtn.disabled = true;

  try {
    await signOut(auth);
    window.location.replace("login.html");
  } catch (error) {
    console.error("Logout error:", error);
    logoutBtn.disabled = false;
    alert("Could not log out. Please try again.");
  }
});

saveProfileBtn?.addEventListener("click", async () => {
  if (!currentUser) return;

  const name = profileName?.value.trim() || "";
  const income = profileIncome?.value.trim() || "";
  const percentage = profilePercentage?.value.trim() || "";

  if (name.length > 100) {
    showProfileMessage("Name must be 100 characters or fewer.", true);
    return;
  }

  if (income && (!Number.isFinite(Number(income)) || Number(income) < 0)) {
    showProfileMessage("Enter a valid annual family income.", true);
    return;
  }

  if (percentage && parsePercentage(percentage) === null) {
    showProfileMessage("Enter percentage like 85% or CGPA like 8.5.", true);
    return;
  }

  if (percentage.length > 30) {
    showProfileMessage("Percentage / CGPA must be 30 characters or fewer.", true);
    return;
  }

  setButtonBusy(saveProfileBtn, true, "Saving...");

  try {
    const userRef = doc(db, "users", currentUser.uid);

    const profileData = {
      email: currentUser.email || "",
      name,
      state: profileState?.value || "",
      education: profileEducation?.value || "",
      year: profileYear?.value || "",
      category: profileCategory?.value || "",
      gender: profileGender?.value || "",
      disability: profileDisability?.value || "",
      income,
      percentage,
      profileCompleted: true,
      updatedAt: serverTimestamp()
    };

    await setDoc(userRef, profileData, { merge: true });

    latestProfile = {
      ...latestProfile,
      ...profileData
    };

    showProfileMessage("Profile saved successfully. Recommendations and notifications updated.");
    renderRecommendations(profileData);
    refreshNotifications();
  } catch (error) {
    console.error("Profile save error:", error);
    showProfileMessage("Could not save profile. Please try again.", true);
  } finally {
    setButtonBusy(saveProfileBtn, false);
  }
});

addSavedBtn?.addEventListener("click", async () => {
  if (!currentUser) return;

  const name = savedName?.value.trim() || "";
  const rawLink = savedLink?.value.trim() || "";

  if (!name) {
    alert("Enter a scholarship name.");
    savedName?.focus();
    return;
  }

  if (name.length > 200) {
    alert("Scholarship name must be 200 characters or fewer.");
    return;
  }

  const link = normalizeHttpUrl(rawLink);

  if (rawLink && !link) {
    alert("Enter a complete http:// or https:// link.");
    savedLink?.focus();
    return;
  }

  setButtonBusy(addSavedBtn, true, "Saving...");

  try {
    await saveScholarshipToFirestore({
      name,
      link,
      source: "dashboard-manual"
    });

    if (savedName) savedName.value = "";
    if (savedLink) savedLink.value = "";

    await loadSavedScholarships();
    refreshNotifications();
  } catch (error) {
    console.error("Scholarship save error:", error);
    alert(error.message || "Could not save the scholarship. Please try again.");
  } finally {
    setButtonBusy(addSavedBtn, false);
  }
});

addApplicationBtn?.addEventListener("click", async () => {
  if (!currentUser) return;

  const name = appName?.value.trim() || "";
  const status = appStatus?.value || "Not Applied";
  const note = appNote?.value.trim() || "";

  if (!name) {
    alert("Enter a scholarship name.");
    appName?.focus();
    return;
  }

  if (name.length > 200) {
    alert("Scholarship name must be 200 characters or fewer.");
    return;
  }

  if (!VALID_APPLICATION_STATUSES.includes(status)) {
    alert("Select a valid application status.");
    return;
  }

  if (note.length > 1000) {
    alert("Application note must be 1,000 characters or fewer.");
    return;
  }

  setButtonBusy(addApplicationBtn, true, "Adding...");

  try {
    await addDoc(collection(db, "users", currentUser.uid, "applications"), {
      name,
      status,
      note,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    if (appName) appName.value = "";
    if (appNote) appNote.value = "";
    if (appStatus) appStatus.value = "Not Applied";

    await loadApplications();
    refreshNotifications();
  } catch (error) {
    console.error("Application save error:", error);
    alert("Could not add the application. Please try again.");
  } finally {
    setButtonBusy(addApplicationBtn, false);
  }
});

function setupNotificationEvents() {
  notificationToggleBtn?.addEventListener("click", () => {
    notificationPanel?.classList.toggle("hidden");
  });

  markNotificationsReadBtn?.addEventListener("click", async () => {
    if (!currentUser) return;

    readNotificationKeys = notificationItems.map((item) => item.key);
    renderNotifications();

    try {
      await setDoc(
        doc(db, "users", currentUser.uid),
        {
          readNotificationKeys,
          notificationsReadAt: serverTimestamp()
        },
        { merge: true }
      );
    } catch (error) {
      console.error("Notification read save error:", error);
      alert("Notifications were marked here, but could not be saved online.");
    }
  });
}

function setupFilterEvents() {
  const fields = [
    recommendationSearch,
    filterState,
    filterEducation,
    filterCategory,
    filterGender,
    filterDisability,
    filterDeadline
  ];

  fields.forEach((field) => {
    field?.addEventListener("input", applyRecommendationFilters);
    field?.addEventListener("change", applyRecommendationFilters);
  });

  resetFiltersBtn?.addEventListener("click", () => {
    setElementValue(recommendationSearch, "");
    setElementValue(filterState, "");
    setElementValue(filterEducation, "");
    setElementValue(filterCategory, "");
    setElementValue(filterGender, "");
    setElementValue(filterDisability, "");
    setElementValue(filterDeadline, "");

    applyRecommendationFilters();
  });
}

function setupComparisonEvents() {
  clearCompareBtn?.addEventListener("click", () => {
    compareScholarships = [];
    renderComparison();
    applyRecommendationFilters();
  });
}

async function loadAvailableScholarships() {
  try {
    const scholarshipsQuery = query(
      collection(db, "scholarships"),
      orderBy("priority", "desc")
    );

    const snapshot = await getDocs(scholarshipsQuery);

    const firestoreScholarships = snapshot.docs
      .map((documentSnapshot) => ({
        id: documentSnapshot.id,
        ...documentSnapshot.data()
      }))
      .filter((scholarship) => scholarship.status === "active");

    if (firestoreScholarships.length > 0) {
      availableScholarships = firestoreScholarships;
      scholarshipSourceLabel = "Firestore";
      console.info(`Loaded ${firestoreScholarships.length} scholarships from Firestore.`);
      return;
    }

    availableScholarships = scholarships;
    scholarshipSourceLabel = "local data";
    console.info("Using local scholarship data fallback.");
  } catch (error) {
    console.warn("Could not load Firestore scholarships. Using local fallback.", error);
    availableScholarships = scholarships;
    scholarshipSourceLabel = "local data";
  }
}

async function loadProfile() {
  if (!currentUser) return;

  const userRef = doc(db, "users", currentUser.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    const emptyProfile = {
      email: currentUser.email || "",
      createdAt: serverTimestamp(),
      profileCompleted: false
    };

    await setDoc(userRef, emptyProfile);
    latestProfile = emptyProfile;
    readNotificationKeys = [];

    renderRecommendations(emptyProfile);
    refreshNotifications();
    return;
  }

  const data = userSnap.data();

  latestProfile = data;
  readNotificationKeys = normalizeArray(data.readNotificationKeys);

  setElementValue(profileName, data.name);
  setElementValue(profileState, data.state);
  setElementValue(profileEducation, data.education);
  setElementValue(profileYear, data.year);
  setElementValue(profileCategory, data.category);
  setElementValue(profileGender, data.gender);
  setElementValue(profileDisability, data.disability);
  setElementValue(profileIncome, data.income);
  setElementValue(profilePercentage, data.percentage);

  renderRecommendations(data);
  refreshNotifications();
}

function renderRecommendations(profile) {
  if (!recommendationSummary || !recommendationList) return;

  const normalizedProfile = normalizeProfile(profile);

  if (
    !normalizedProfile.state ||
    !normalizedProfile.education ||
    !normalizedProfile.category ||
    !Number.isFinite(normalizedProfile.income)
  ) {
    latestRecommendedScholarships = [];
    filteredRecommendedScholarships = [];

    recommendationSummary.textContent =
      "Complete state, education, category, and income to get automatic recommendations.";

    recommendationList.replaceChildren();
    renderBestMatch(null);
    setText(recommendationCount, "");
    renderComparison();
    refreshNotifications();
    return;
  }

  const matches = getRecommendedScholarships(normalizedProfile);

  if (matches.length === 0) {
    latestRecommendedScholarships = [];
    filteredRecommendedScholarships = [];

    recommendationSummary.textContent = getNoMatchReason(normalizedProfile);
    recommendationList.replaceChildren();
    renderBestMatch(null);
    setText(recommendationCount, "");
    renderComparison();
    refreshNotifications();
    return;
  }

  latestRecommendedScholarships = matches;
  renderBestMatch(matches[0]);

  const profileParts = [
    normalizedProfile.stateLabel,
    normalizedProfile.educationLabel,
    normalizedProfile.categoryLabel,
    normalizedProfile.genderLabel,
    normalizedProfile.disability === "yes" ? "disability: yes" : "",
    Number.isFinite(normalizedProfile.income)
      ? `income ₹${formatIndianNumber(normalizedProfile.income)}`
      : "",
    normalizedProfile.percentage !== null
      ? `marks ${normalizedProfile.percentage}%`
      : ""
  ].filter(Boolean);

  recommendationSummary.textContent =
    `You are eligible for ${matches.length} scholarship${matches.length === 1 ? "" : "s"} based on your profile${profileParts.length ? `: ${profileParts.join(", ")}.` : "."} Source: ${scholarshipSourceLabel}.`;

  applyRecommendationFilters();
  renderComparison();
  refreshNotifications();
}

function renderBestMatch(scholarship) {
  if (!bestMatchBox) return;

  bestMatchBox.replaceChildren();

  if (!scholarship) {
    return;
  }

  const box = document.createElement("div");
  box.className = "notice-box";

  const title = document.createElement("strong");
  title.textContent = "Best Match For You";

  const name = document.createElement("p");
  name.className = "info";
  name.append(
    createStrongText("Scholarship:"),
    document.createTextNode(` ${scholarship.name}`)
  );

  const score = document.createElement("p");
  score.className = "info";
  score.append(
    createStrongText("Match Score:"),
    document.createTextNode(` ${Math.min(Number(scholarship.score || 0), 100)}%`)
  );

  const quality = document.createElement("p");
  quality.className = "info";
  quality.append(
    createStrongText("Match Quality:"),
    document.createTextNode(` ${getMatchQuality(scholarship.score)}`)
  );

  const deadline = document.createElement("p");
  deadline.className = "info";
  deadline.append(
    createStrongText("Deadline:"),
    document.createTextNode(` ${scholarship.deadline || "Check official portal"}`)
  );

  const officialLink = document.createElement("a");
  officialLink.className = "text-btn";
  officialLink.href = normalizeHttpUrl(scholarship.link) || "#";
  officialLink.target = "_blank";
  officialLink.rel = "noopener noreferrer";
  officialLink.textContent = "Open Official Link";

  box.append(title, name, score, quality, deadline, officialLink);
  bestMatchBox.appendChild(box);
}

function applyRecommendationFilters() {
  if (!recommendationList) return;

  const searchText = normalizeText(recommendationSearch?.value || "");
  const stateValue = filterState?.value || "";
  const educationValue = filterEducation?.value || "";
  const categoryValue = filterCategory?.value || "";
  const genderValue = filterGender?.value || "";
  const disabilityValue = filterDisability?.value || "";
  const deadlineValue = filterDeadline?.value || "";

  filteredRecommendedScholarships = latestRecommendedScholarships.filter((scholarship) => {
    const searchableText = normalizeText([
      scholarship.name,
      scholarship.stateLabel,
      scholarship.sourceName,
      scholarship.eligibilityNote,
      scholarship.incomeNote,
      scholarship.deadline,
      scholarship.amount
    ].join(" "));

    const searchMatch = !searchText || searchableText.includes(searchText);
    const stateMatch = !stateValue || scholarship.state === stateValue;
    const educationMatch = !educationValue || normalizeArray(scholarship.education).includes(educationValue);
    const categoryMatch = !categoryValue || normalizeArray(scholarship.categories).includes(categoryValue);

    const genderMatch =
      !genderValue ||
      normalizeArray(scholarship.genders).includes(genderValue) ||
      normalizeArray(scholarship.genders).includes("any");

    const disabilityMatch =
      !disabilityValue ||
      scholarship.disability === disabilityValue ||
      scholarship.disability === "any";

    const deadlineMatch =
      !deadlineValue ||
      getScholarshipDeadlineStatus(scholarship.deadlineDate) === deadlineValue;

    return (
      searchMatch &&
      stateMatch &&
      educationMatch &&
      categoryMatch &&
      genderMatch &&
      disabilityMatch &&
      deadlineMatch
    );
  });

  recommendationList.replaceChildren();

  if (latestRecommendedScholarships.length === 0) {
    setText(recommendationCount, "");
    return;
  }

  setText(
    recommendationCount,
    `Showing ${filteredRecommendedScholarships.length} of ${latestRecommendedScholarships.length} recommended scholarships.`
  );

  if (filteredRecommendedScholarships.length === 0) {
    showContainerMessage(
      recommendationList,
      "No recommended scholarships match your current filters. Try resetting filters."
    );
    return;
  }

  filteredRecommendedScholarships.forEach((scholarship) => {
    recommendationList.appendChild(createRecommendationCard(scholarship));
  });
}

function getRecommendedScholarships(profile) {
  return availableScholarships
    .map((scholarship) => {
      const education = normalizeArray(scholarship.education);
      const categories = normalizeArray(scholarship.categories);
      const genders = normalizeArray(scholarship.genders);

      const stateMatch =
        scholarship.state === profile.state ||
        scholarship.state === "national";

      const educationMatch = education.includes(profile.education);

      const categoryMatch =
        categories.includes(profile.category) ||
        categories.includes("general") ||
        categories.includes("any");

      const incomeMatch = profile.income <= Number(scholarship.maxIncome || 0);

      const genderMatch =
        genders.includes("any") ||
        genders.includes(profile.gender);

      const disabilityMatch =
        scholarship.disability === "any" ||
        scholarship.disability === profile.disability;

      const percentageMatch =
        profile.percentage === null ||
        profile.percentage >= Number(scholarship.minPercentage || 0);

      if (
        !stateMatch ||
        !educationMatch ||
        !categoryMatch ||
        !incomeMatch ||
        !genderMatch ||
        !disabilityMatch ||
        !percentageMatch
      ) {
        return null;
      }

      let score = Number(scholarship.priority || 50);

      if (scholarship.state === profile.state) score += 20;
      if (categories.includes(profile.category)) score += 15;
      if (genders.includes(profile.gender)) score += 10;

      if (scholarship.disability === profile.disability && profile.disability === "yes") {
        score += 15;
      }

      if (profile.percentage !== null && profile.percentage >= Number(scholarship.minPercentage || 0)) {
        score += 10;
      }

      return {
        ...scholarship,
        score: Math.min(score, 100)
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);
}

function getNoMatchReason(profile) {
  const possibleByStateEducation = availableScholarships.filter((scholarship) => {
    const education = normalizeArray(scholarship.education);

    const stateMatch =
      scholarship.state === profile.state ||
      scholarship.state === "national";

    const educationMatch = education.includes(profile.education);

    return stateMatch && educationMatch;
  });

  if (possibleByStateEducation.length === 0) {
    return "No scholarships found for your current state and education level. Try checking official portals or update your education/state if entered incorrectly.";
  }

  const incomeEligible = possibleByStateEducation.some((scholarship) => {
    return profile.income <= Number(scholarship.maxIncome || 0);
  });

  if (!incomeEligible) {
    return "No scholarships found because your annual family income is above the current listed limits. Please verify scheme rules on official portals.";
  }

  const categoryEligible = possibleByStateEducation.some((scholarship) => {
    const categories = normalizeArray(scholarship.categories);

    return (
      categories.includes(profile.category) ||
      categories.includes("general") ||
      categories.includes("any")
    );
  });

  if (!categoryEligible) {
    return "No scholarships found for your selected category right now. Try checking official portals for latest category-specific schemes.";
  }

  const genderEligible = possibleByStateEducation.some((scholarship) => {
    const genders = normalizeArray(scholarship.genders);

    return (
      genders.includes("any") ||
      genders.includes(profile.gender)
    );
  });

  if (!genderEligible) {
    return "No scholarships found for your selected gender and education level right now.";
  }

  const disabilityEligible = possibleByStateEducation.some((scholarship) => {
    return (
      scholarship.disability === "any" ||
      scholarship.disability === profile.disability
    );
  });

  if (!disabilityEligible) {
    return "No scholarships found for your disability status right now.";
  }

  const percentageEligible = possibleByStateEducation.some((scholarship) => {
    return (
      profile.percentage === null ||
      profile.percentage >= Number(scholarship.minPercentage || 0)
    );
  });

  if (!percentageEligible) {
    return "No scholarships found because your percentage/CGPA is below the listed merit requirement.";
  }

  return "No matching scholarships found for your profile right now. Try updating your profile or check official portals for latest schemes.";
}

function getMatchQuality(score) {
  const safeScore = Math.min(Number(score || 0), 100);

  if (safeScore >= 90) return "🟢 Excellent Match";
  if (safeScore >= 75) return "🔵 Very Good Match";
  if (safeScore >= 60) return "🟡 Good Match";

  return "⚪ Possible Match";
}

function createRecommendationCard(scholarship) {
  const card = document.createElement("div");
  card.className = "scholarship";

  const badge = document.createElement("span");
  badge.className = "badge";
  badge.textContent = scholarship.stateLabel || getStateLabel(scholarship.state);

  const heading = document.createElement("h3");
  heading.textContent = scholarship.name || "Untitled Scholarship";

  const matchScore = document.createElement("p");
  matchScore.className = "info";
  matchScore.append(
    createStrongText("Match Score:"),
    document.createTextNode(` ${Math.min(Number(scholarship.score || 0), 100)}%`)
  );

  const matchQuality = document.createElement("p");
  matchQuality.className = "info";
  matchQuality.append(
    createStrongText("Match Quality:"),
    document.createTextNode(` ${getMatchQuality(scholarship.score)}`)
  );

  const whyMatch = document.createElement("div");
  whyMatch.className = "notice-box";

  const whyTitle = document.createElement("strong");
  whyTitle.textContent = "Why you qualify:";

  const whyList = document.createElement("ul");

  getQualificationReasons(scholarship, latestProfile).forEach((reason) => {
    const item = document.createElement("li");
    item.textContent = reason;
    whyList.appendChild(item);
  });

  whyMatch.append(whyTitle, whyList);

  const amount = document.createElement("p");
  amount.className = "info";
  amount.append(
    createStrongText("Amount:"),
    document.createTextNode(` ${scholarship.amount || "Varies as per official rules"}`)
  );

  const eligibility = document.createElement("p");
  eligibility.className = "info";
  eligibility.append(
    createStrongText("Eligibility note:"),
    document.createTextNode(` ${scholarship.eligibilityNote || "Verify official portal."}`)
  );

  const income = document.createElement("p");
  income.className = "info";
  income.append(
    createStrongText("Income note:"),
    document.createTextNode(` ${scholarship.incomeNote || "Verify official portal."}`)
  );

  const deadline = document.createElement("p");
  deadline.className = "info";
  deadline.append(
    createStrongText("Deadline:"),
    document.createTextNode(` ${scholarship.deadline || "Check official portal"}`)
  );

  const deadlineReminder = document.createElement("p");
  deadlineReminder.className = getDeadlineReminderClass(scholarship.deadlineDate);
  deadlineReminder.textContent = getDeadlineReminderText(scholarship.deadlineDate);

  const verified = document.createElement("p");
  verified.className = "info";
  verified.append(
    createStrongText("Last verified:"),
    document.createTextNode(` ${LAST_VERIFIED}`)
  );

  const actions = document.createElement("div");
  actions.className = "button-row";

  const officialLink = document.createElement("a");
  officialLink.className = "text-btn";
  officialLink.href = normalizeHttpUrl(scholarship.link) || "#";
  officialLink.target = "_blank";
  officialLink.rel = "noopener noreferrer";
  officialLink.textContent = "Official Link";

  const saveButton = document.createElement("button");
  saveButton.type = "button";
  saveButton.className = "secondary-btn";
  saveButton.textContent = "Save to Dashboard";

  saveButton.addEventListener("click", async () => {
    setButtonBusy(saveButton, true, "Saving...");

    try {
      await saveScholarshipToFirestore({
        name: scholarship.name,
        link: scholarship.link,
        deadline: scholarship.deadline,
        deadlineDate: scholarship.deadlineDate,
        source: "dashboard-recommendation"
      });

      saveButton.textContent = "Saved ✅";
      await loadSavedScholarships();
      refreshNotifications();
    } catch (error) {
      console.error("Recommendation save error:", error);
      setButtonBusy(saveButton, false);
      alert(error.message || "Could not save this scholarship.");
    }
  });

  const trackButton = document.createElement("button");
  trackButton.type = "button";
  trackButton.className = "secondary-btn";
  trackButton.textContent = "Add to Tracker";

  trackButton.addEventListener("click", async () => {
    setButtonBusy(trackButton, true, "Adding...");

    try {
      await addDoc(collection(db, "users", currentUser.uid, "applications"), {
        name: scholarship.name,
        status: "Not Applied",
        note: `Added from personalized recommendations. ${getDeadlineReminderText(scholarship.deadlineDate)}`,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      trackButton.textContent = "Added ✅";
      await loadApplications();
      refreshNotifications();
    } catch (error) {
      console.error("Tracker add error:", error);
      setButtonBusy(trackButton, false);
      alert("Could not add this scholarship to tracker.");
    }
  });

  const compareButton = document.createElement("button");
  compareButton.type = "button";
  compareButton.className = "secondary-btn";
  compareButton.textContent = isScholarshipInCompare(scholarship)
    ? "Remove Compare"
    : "Compare";

  compareButton.addEventListener("click", () => {
    toggleCompareScholarship(scholarship);
  });

  actions.append(officialLink, saveButton, trackButton, compareButton);

  card.append(
    badge,
    heading,
    matchScore,
    matchQuality,
    whyMatch,
    amount,
    eligibility,
    income,
    deadline,
    deadlineReminder,
    verified,
    actions
  );

  return card;
}

function getQualificationReasons(scholarship, profile) {
  const normalizedProfile = normalizeProfile(profile || {});
  const reasons = [];
  const education = normalizeArray(scholarship.education);
  const categories = normalizeArray(scholarship.categories);
  const genders = normalizeArray(scholarship.genders);

  if (scholarship.state === normalizedProfile.state) {
    reasons.push(`Your state matches: ${scholarship.stateLabel || getStateLabel(scholarship.state)}.`);
  } else if (scholarship.state === "national") {
    reasons.push("This is a national-level scholarship.");
  }

  if (education.includes(normalizedProfile.education)) {
    reasons.push("Your course/education matches this scholarship.");
  }

  if (categories.includes(normalizedProfile.category) || categories.includes("general") || categories.includes("any")) {
    reasons.push("Your category is included in the eligibility list.");
  }

  if (Number(normalizedProfile.income || 0) <= Number(scholarship.maxIncome || 0)) {
    reasons.push(`Your income is within the listed limit of ₹${formatIndianNumber(scholarship.maxIncome)}.`);
  }

  if (genders.includes("any") || genders.includes(normalizedProfile.gender)) {
    reasons.push("Your gender matches the listed eligibility.");
  }

  if (scholarship.disability === "any" || scholarship.disability === normalizedProfile.disability) {
    reasons.push("Your disability status matches the listed eligibility.");
  }

  if (normalizedProfile.percentage === null || normalizedProfile.percentage >= Number(scholarship.minPercentage || 0)) {
    reasons.push(
      Number(scholarship.minPercentage || 0) > 0
        ? `Your marks meet the minimum requirement of ${scholarship.minPercentage}%.`
        : "No minimum marks requirement is listed for this scholarship."
    );
  }

  if (normalizedProfile.year) {
    reasons.push(`Your current year of study is saved as ${normalizedProfile.year}.`);
  }

  return reasons.length
    ? reasons
    : ["This scholarship matches your saved profile based on available eligibility rules."];
}

function toggleCompareScholarship(scholarship) {
  const exists = isScholarshipInCompare(scholarship);

  if (exists) {
    compareScholarships = compareScholarships.filter((item) => {
      return normalizeText(item.name) !== normalizeText(scholarship.name);
    });

    renderComparison();
    applyRecommendationFilters();
    return;
  }

  if (compareScholarships.length >= MAX_COMPARE_ITEMS) {
    alert(`You can compare up to ${MAX_COMPARE_ITEMS} scholarships at a time.`);
    return;
  }

  compareScholarships.push(scholarship);
  renderComparison();
  applyRecommendationFilters();
}

function isScholarshipInCompare(scholarship) {
  return compareScholarships.some((item) => {
    return normalizeText(item.name) === normalizeText(scholarship.name);
  });
}

function renderComparison() {
  if (!compareList || !comparisonTableWrap) return;

  compareList.replaceChildren();
  comparisonTableWrap.replaceChildren();

  if (compareScholarships.length === 0) {
    showContainerMessage(compareList, "No scholarships selected for comparison yet.");
    return;
  }

  const selectedHeading = document.createElement("p");
  selectedHeading.className = "mini-note";
  selectedHeading.textContent =
    `${compareScholarships.length} scholarship${compareScholarships.length === 1 ? "" : "s"} selected.`;

  const chipRow = document.createElement("div");
  chipRow.className = "compare-chip-row";

  compareScholarships.forEach((scholarship) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "compare-chip";
    chip.textContent = `Remove ${scholarship.name}`;
    chip.addEventListener("click", () => toggleCompareScholarship(scholarship));
    chipRow.appendChild(chip);
  });

  compareList.append(selectedHeading, chipRow);

  const table = document.createElement("table");
  table.className = "comparison-table";

  const headerRow = document.createElement("tr");
  ["Scholarship", "Amount", "Deadline", "Income Limit", "Min Marks", "Eligibility", "Link"].forEach((heading) => {
    const th = document.createElement("th");
    th.textContent = heading;
    headerRow.appendChild(th);
  });

  const thead = document.createElement("thead");
  thead.appendChild(headerRow);

  const tbody = document.createElement("tbody");

  compareScholarships.forEach((scholarship) => {
    const row = document.createElement("tr");

    const link = document.createElement("a");
    link.href = normalizeHttpUrl(scholarship.link) || "#";
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "Official";

    [
      scholarship.name,
      scholarship.amount || "Varies",
      scholarship.deadline || "Check official portal",
      `₹${formatIndianNumber(scholarship.maxIncome)}`,
      Number(scholarship.minPercentage || 0) > 0 ? `${scholarship.minPercentage}%` : "Not listed",
      scholarship.eligibilityNote || "Verify official portal"
    ].forEach((value) => {
      const td = document.createElement("td");
      td.textContent = value;
      row.appendChild(td);
    });

    const linkCell = document.createElement("td");
    linkCell.appendChild(link);
    row.appendChild(linkCell);

    tbody.appendChild(row);
  });

  table.append(thead, tbody);
  comparisonTableWrap.appendChild(table);
}

async function saveScholarshipToFirestore(scholarship) {
  if (!currentUser) {
    throw new Error("Login required.");
  }

  const cleanName = cleanText(scholarship.name, 200);
  const cleanLink = normalizeHttpUrl(scholarship.link || "");

  if (!cleanName) {
    throw new Error("Scholarship name is required.");
  }

  await addDoc(collection(db, "users", currentUser.uid, "savedScholarships"), {
    name: cleanName,
    link: cleanLink,
    deadline: cleanText(scholarship.deadline || "", 160),
    deadlineDate: cleanText(scholarship.deadlineDate || "", 30),
    source: cleanText(scholarship.source || "dashboard", 80),
    createdAt: serverTimestamp()
  });
}

async function loadSavedScholarships() {
  if (!currentUser || !savedList) return;

  showContainerMessage(savedList, "Loading saved scholarships...");

  try {
    const savedQuery = query(
      collection(db, "users", currentUser.uid, "savedScholarships"),
      orderBy("createdAt", "desc")
    );

    const snapshot = await getDocs(savedQuery);

    savedScholarshipItems = snapshot.docs.map((documentSnapshot) => ({
      id: documentSnapshot.id,
      ...documentSnapshot.data()
    }));

    renderSavedScholarships();
  } catch (error) {
    console.error("Saved scholarships load error:", error);
    savedScholarshipItems = [];
    showContainerMessage(savedList, "Could not load saved scholarships.");
  }
}

function renderSavedScholarships() {
  if (!savedList) return;

  savedList.replaceChildren();

  if (savedScholarshipItems.length === 0) {
    showContainerMessage(savedList, "No saved scholarships yet.");
    return;
  }

  savedScholarshipItems.forEach((scholarship) => {
    const card = document.createElement("div");
    card.className = "saved-card";

    const heading = document.createElement("h3");
    heading.textContent = scholarship.name || "Untitled scholarship";

    const meta = document.createElement("p");
    meta.className = "mini-note";
    meta.textContent = scholarship.deadline
      ? `Deadline: ${scholarship.deadline}`
      : "Saved for later.";

    const actions = document.createElement("div");
    actions.className = "button-row";

    if (normalizeHttpUrl(scholarship.link)) {
      const link = document.createElement("a");
      link.className = "text-btn";
      link.href = normalizeHttpUrl(scholarship.link);
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = "Official Link";
      actions.appendChild(link);
    }

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "secondary-btn";
    deleteButton.textContent = "Remove";

    deleteButton.addEventListener("click", async () => {
      const confirmed = window.confirm(`Remove "${scholarship.name}" from saved scholarships?`);
      if (!confirmed) return;

      try {
        await deleteDoc(doc(db, "users", currentUser.uid, "savedScholarships", scholarship.id));
        await loadSavedScholarships();
        refreshNotifications();
      } catch (error) {
        console.error("Saved scholarship delete error:", error);
        alert("Could not remove this scholarship.");
      }
    });

    actions.appendChild(deleteButton);
    card.append(heading, meta, actions);
    savedList.appendChild(card);
  });
}

async function loadApplications() {
  if (!currentUser || !applicationList) return;

  showContainerMessage(applicationList, "Loading applications...");

  try {
    const applicationsQuery = query(
      collection(db, "users", currentUser.uid, "applications"),
      orderBy("createdAt", "desc")
    );

    const snapshot = await getDocs(applicationsQuery);

    applicationItems = snapshot.docs.map((documentSnapshot) => ({
      id: documentSnapshot.id,
      ...documentSnapshot.data()
    }));

    renderApplications();
  } catch (error) {
    console.error("Applications load error:", error);
    applicationItems = [];
    showContainerMessage(applicationList, "Could not load applications.");
  }
}

function renderApplications() {
  if (!applicationList) return;

  applicationList.replaceChildren();

  if (applicationItems.length === 0) {
    showContainerMessage(applicationList, "No applications tracked yet.");
    return;
  }

  applicationItems.forEach((application) => {
    const card = document.createElement("div");
    card.className = "application-card";

    const heading = document.createElement("h3");
    heading.textContent = application.name || "Untitled application";

    const statusLabel = document.createElement("p");
    statusLabel.className = "info";
    statusLabel.append(
      createStrongText("Current status:"),
      document.createTextNode(` ${STATUS_LABELS[application.status] || application.status || "Not Applied"}`)
    );

    const note = document.createElement("p");
    note.className = "mini-note";
    note.textContent = application.note || "No note added.";

    const controls = document.createElement("div");
    controls.className = "button-row";

    const select = document.createElement("select");

    VALID_APPLICATION_STATUSES.forEach((status) => {
      const option = document.createElement("option");
      option.value = status;
      option.textContent = STATUS_LABELS[status];
      option.selected = status === application.status;
      select.appendChild(option);
    });

    const updateButton = document.createElement("button");
    updateButton.type = "button";
    updateButton.className = "secondary-btn";
    updateButton.textContent = "Update Status";

    updateButton.addEventListener("click", async () => {
      await updateApplicationStatus(application.id, select.value);
    });

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "secondary-btn";
    deleteButton.textContent = "Delete";

    deleteButton.addEventListener("click", async () => {
      const confirmed = window.confirm(`Delete tracker item "${application.name}"?`);
      if (!confirmed) return;

      try {
        await deleteDoc(doc(db, "users", currentUser.uid, "applications", application.id));
        await loadApplications();
        refreshNotifications();
      } catch (error) {
        console.error("Application delete error:", error);
        alert("Could not delete application.");
      }
    });

    controls.append(select, updateButton, deleteButton);
    card.append(heading, statusLabel, note, controls);
    applicationList.appendChild(card);
  });
}

async function updateApplicationStatus(applicationId, status) {
  if (!currentUser || !applicationId) return;

  if (!VALID_APPLICATION_STATUSES.includes(status)) {
    alert("Select a valid status.");
    return;
  }

  try {
    await updateDoc(doc(db, "users", currentUser.uid, "applications", applicationId), {
      status,
      updatedAt: serverTimestamp()
    });

    await loadApplications();
    refreshNotifications();
  } catch (error) {
    console.error("Application update error:", error);
    alert("Could not update application status.");
  }
}

function refreshNotifications() {
  notificationItems = buildNotificationItems();
  renderNotifications();
}

function buildNotificationItems() {
  const items = [];
  const normalizedProfile = normalizeProfile(latestProfile);

  if (
    !normalizedProfile.state ||
    !normalizedProfile.education ||
    !normalizedProfile.category ||
    !Number.isFinite(normalizedProfile.income)
  ) {
    items.push({
      key: "profile-incomplete",
      icon: "👤",
      title: "Complete your profile",
      message: "Add your state, education, category, and income to get better scholarship recommendations.",
      status: "Action needed"
    });
  }

  latestRecommendedScholarships.forEach((scholarship) => {
    const status = getScholarshipDeadlineStatus(scholarship.deadlineDate);

    if (status === "soon") {
      items.push({
        key: `recommended-soon-${normalizeText(scholarship.name)}`,
        icon: "⏰",
        title: "Recommended scholarship closing soon",
        message: `${scholarship.name} may close soon. Check the official portal.`,
        status: "Deadline alert"
      });
    }

    if (status === "expired") {
      items.push({
        key: `recommended-expired-${normalizeText(scholarship.name)}`,
        icon: "⚠️",
        title: "Recommended scholarship may be expired",
        message: `${scholarship.name} deadline may have passed. Verify official portal before applying.`,
        status: "Verify"
      });
    }
  });

  savedScholarshipItems.forEach((scholarship) => {
    const status = getScholarshipDeadlineStatus(scholarship.deadlineDate);

    if (status === "soon") {
      items.push({
        key: `saved-soon-${scholarship.id}`,
        icon: "🔖",
        title: "Saved scholarship deadline reminder",
        message: `${scholarship.name} may close soon.`,
        status: "Saved alert"
      });
    }
  });

  applicationItems.forEach((application) => {
    if (application.status === "Not Applied") {
      items.push({
        key: `application-not-applied-${application.id}`,
        icon: "📝",
        title: "Application not started",
        message: `${application.name} is still marked as Not Applied.`,
        status: "Tracker"
      });
    }

    if (application.status === "Approved") {
      items.push({
        key: `application-approved-${application.id}`,
        icon: "✅",
        title: "Application approved",
        message: `${application.name} is marked as approved. Keep records safely.`,
        status: "Good news"
      });
    }
  });

  return items;
}

function renderNotifications() {
  if (!notificationList || !notificationBadge) return;

  notificationList.replaceChildren();

  const unreadItems = notificationItems.filter((item) => !readNotificationKeys.includes(item.key));

  if (unreadItems.length > 0) {
    notificationBadge.classList.remove("hidden");
    notificationBadge.textContent = String(unreadItems.length);
  } else {
    notificationBadge.classList.add("hidden");
    notificationBadge.textContent = "0";
  }

  if (notificationItems.length === 0) {
    showContainerMessage(notificationList, "No notifications right now.");
    return;
  }

  notificationItems.forEach((item) => {
    const card = document.createElement("div");
    card.className = "notification-card";

    const icon = document.createElement("span");
    icon.className = "notification-icon";
    icon.textContent = item.icon;

    const content = document.createElement("div");

    const title = document.createElement("h3");
    title.textContent = item.title;

    const message = document.createElement("p");
    message.className = "mini-note";
    message.textContent = item.message;

    const status = document.createElement("span");
    status.className = "notification-status";
    status.textContent = readNotificationKeys.includes(item.key)
      ? "Read"
      : item.status;

    content.append(title, message, status);
    card.append(icon, content);
    notificationList.appendChild(card);
  });
}

function getScholarshipDeadlineStatus(deadlineDate) {
  if (!deadlineDate) return "unknown";

  const deadline = new Date(`${deadlineDate}T23:59:59`);
  const now = new Date();

  if (Number.isNaN(deadline.getTime())) return "unknown";

  const diffMs = deadline.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return "expired";
  if (diffDays <= DEADLINE_SOON_DAYS) return "soon";

  return "safe";
}

function getDeadlineReminderClass(deadlineDate) {
  const status = getScholarshipDeadlineStatus(deadlineDate);

  if (status === "expired") return "mini-note deadline-expired";
  if (status === "soon") return "mini-note deadline-soon";

  return "mini-note";
}

function getDeadlineReminderText(deadlineDate) {
  const status = getScholarshipDeadlineStatus(deadlineDate);

  if (status === "unknown") return "Deadline date not added. Verify official portal.";
  if (status === "expired") return "Deadline may have passed. Verify official portal.";
  if (status === "soon") return "Deadline is closing soon. Apply as early as possible.";

  return "Deadline looks safe, but verify official portal before applying.";
}

function normalizeProfile(profile) {
  const state = normalizeState(profile?.state || "");
  const education = normalizeEducation(profile?.education || "");
  const category = normalizeCategory(profile?.category || "");
  const gender = normalizeGender(profile?.gender || "");
  const disability = normalizeDisability(profile?.disability || "");
  const income = parseIncome(profile?.income);
  const percentage = parsePercentage(profile?.percentage);

  return {
    state,
    stateLabel: getStateLabel(state),
    education,
    educationLabel: getEducationLabel(education),
    year: cleanText(profile?.year || "", 60),
    category,
    categoryLabel: getCategoryLabel(category),
    gender,
    genderLabel: getGenderLabel(gender),
    disability,
    income,
    percentage
  };
}

function normalizeState(value) {
  const text = normalizeText(value);

  if (text.includes("andhra")) return "andhra-pradesh";
  if (text.includes("telangana")) return "telangana";
  if (text.includes("national") || text.includes("other")) return "national";

  return text.replace(/\s+/g, "-");
}

function normalizeEducation(value) {
  const text = normalizeText(value);

  if (text.includes("engineering")) return "engineering";
  if (text.includes("intermediate")) return "intermediate";
  if (text.includes("degree")) return "degree";
  if (text.includes("post") || text === "pg") return "pg";
  if (text.includes("school")) return "school";

  return text.replace(/\s+/g, "-");
}

function normalizeCategory(value) {
  const text = normalizeText(value);

  if (text.includes("obc") || text.includes("bc")) return "obc";
  if (text.includes("ews") || text.includes("ebc")) return "ews";
  if (text.includes("general")) return "general";
  if (text.includes("minority")) return "minority";
  if (text.includes("kapu")) return "kapu";
  if (text === "sc") return "sc";
  if (text === "st") return "st";

  return text.replace(/\s+/g, "-");
}

function normalizeGender(value) {
  const text = normalizeText(value);

  if (text.includes("female")) return "female";
  if (text.includes("male")) return "male";
  if (text.includes("prefer")) return "any";

  return text || "any";
}

function normalizeDisability(value) {
  const text = normalizeText(value);

  if (text === "yes") return "yes";
  if (text === "no") return "no";

  return "";
}

function parseIncome(value) {
  const number = Number(value);

  if (!Number.isFinite(number) || number < 0) {
    return NaN;
  }

  return number;
}

function parsePercentage(value) {
  const text = String(value || "").trim();

  if (!text) return null;

  const number = Number(text.replace(/[^0-9.]/g, ""));

  if (!Number.isFinite(number) || number < 0) {
    return null;
  }

  if (number <= 10 && /cgpa/i.test(text)) {
    return Math.min(number * 10, 100);
  }

  if (number <= 10 && !text.includes("%")) {
    return Math.min(number * 10, 100);
  }

  return Math.min(number, 100);
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeArray(value) {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => normalizeText(item))
    .filter(Boolean);
}

function cleanText(value, maxLength = 500) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
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

function showProfileMessage(message, isError = false) {
  if (!profileMessage) return;

  profileMessage.textContent = message;
  profileMessage.style.color = isError ? "#b42318" : "#067647";
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

function createStrongText(text) {
  const strong = document.createElement("strong");
  strong.textContent = text;
  return strong;
}

function formatIndianNumber(value) {
  const number = Number(value || 0);

  if (!Number.isFinite(number)) {
    return "0";
  }

  return number.toLocaleString("en-IN");
}

function getStateLabel(state) {
  const labels = {
    "national": "National",
    "andhra-pradesh": "Andhra Pradesh",
    "telangana": "Telangana"
  };

  return labels[state] || state || "National";
}

function getEducationLabel(education) {
  const labels = {
    school: "School",
    intermediate: "Intermediate",
    degree: "Degree",
    engineering: "Engineering",
    pg: "Post Graduation"
  };

  return labels[education] || education;
}

function getCategoryLabel(category) {
  const labels = {
    general: "General",
    sc: "SC",
    st: "ST",
    obc: "BC / OBC",
    ews: "EWS / EBC",
    minority: "Minority",
    kapu: "Kapu",
    any: "Any"
  };

  return labels[category] || category;
}

function getGenderLabel(gender) {
  const labels = {
    male: "Male",
    female: "Female",
    any: "Any"
  };

  return labels[gender] || gender;
}
