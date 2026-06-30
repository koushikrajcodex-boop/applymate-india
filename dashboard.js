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
} 
  from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
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
    !normalizedProfile.income
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
    normalizedProfile.state,
    normalizedProfile.education,
    normalizedProfile.category,
    normalizedProfile.gender,
    normalizedProfile.disability === "yes" ? "disability: yes" : "",
    Number.isFinite(normalizedProfile.income)
      ? `income ₹${formatIndianNumber(normalizedProfile.income)}`
      : "",
    normalizedProfile.percentage !== null
      ? `marks ${normalizedProfile.percentage}%`
      : ""
  ].filter(Boolean);

  recommendationSummary.textContent =
    `You are eligible for ${matches.length} scholarship${matches.length === 1 ? "" : "s"} based on your profile${profileParts.length ? `: ${profileParts.join(", ")}.` : "."}`;
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
    document.createTextNode(` ${scholarship.deadline}`)
  );

  const officialLink = document.createElement("a");
  officialLink.className = "text-btn";
  officialLink.href = scholarship.link;
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
    const educationMatch = !educationValue || scholarship.education.includes(educationValue);
    const categoryMatch = !categoryValue || scholarship.categories.includes(categoryValue);

    const genderMatch =
      !genderValue ||
      scholarship.genders.includes(genderValue) ||
      scholarship.genders.includes("any");

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
  return scholarships
    .map((scholarship) => {
      const stateMatch =
        scholarship.state === profile.state ||
        scholarship.state === "national";

      const educationMatch = scholarship.education.includes(profile.education);

      const categoryMatch =
        scholarship.categories.includes(profile.category) ||
        scholarship.categories.includes("general");

      const incomeMatch = profile.income <= scholarship.maxIncome;

      const genderMatch =
        scholarship.genders.includes("any") ||
        scholarship.genders.includes(profile.gender);

      const disabilityMatch =
        scholarship.disability === "any" ||
        scholarship.disability === profile.disability;

      const percentageMatch =
        profile.percentage === null ||
        profile.percentage >= scholarship.minPercentage;

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

      let score = scholarship.priority || 50;

      if (scholarship.state === profile.state) score += 20;
      if (scholarship.categories.includes(profile.category)) score += 15;
      if (scholarship.genders.includes(profile.gender)) score += 10;

      if (scholarship.disability === profile.disability && profile.disability === "yes") {
        score += 15;
      }

      if (profile.percentage !== null && profile.percentage >= scholarship.minPercentage) {
        score += 10;
      }

      return { ...scholarship, score };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);
}

function getNoMatchReason(profile) {
  const possibleByStateEducation = scholarships.filter((scholarship) => {
    const stateMatch =
      scholarship.state === profile.state ||
      scholarship.state === "national";

    const educationMatch = scholarship.education.includes(profile.education);

    return stateMatch && educationMatch;
  });

  if (possibleByStateEducation.length === 0) {
    return "No scholarships found for your current state and education level. Try checking official portals or update your education/state if entered incorrectly.";
  }

  const incomeEligible = possibleByStateEducation.some((scholarship) => {
    return profile.income <= scholarship.maxIncome;
  });

  if (!incomeEligible) {
    return "No scholarships found because your annual family income is above the current listed limits. Please verify scheme rules on official portals.";
  }

  const categoryEligible = possibleByStateEducation.some((scholarship) => {
    return (
      scholarship.categories.includes(profile.category) ||
      scholarship.categories.includes("general")
    );
  });

  if (!categoryEligible) {
    return "No scholarships found for your selected category right now. Try checking official portals for latest category-specific schemes.";
  }

  const genderEligible = possibleByStateEducation.some((scholarship) => {
    return (
      scholarship.genders.includes("any") ||
      scholarship.genders.includes(profile.gender)
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
      profile.percentage >= scholarship.minPercentage
    );
  });

  if (!percentageEligible) {
    return "No scholarships found because your percentage/CGPA is below the listed merit requirement.";
  }

  return "No matching scholarships found for your profile right now. Try updating your profile or check official portals for latest schemes.";
}
function getMatchQuality(score) {
  const safeScore = Math.min(Number(score || 0), 100);

  if (safeScore >= 90) {
    return "🟢 Excellent Match";
  }

  if (safeScore >= 75) {
    return "🔵 Very Good Match";
  }

  if (safeScore >= 60) {
    return "🟡 Good Match";
  }

  return "⚪ Possible Match";
}
function createRecommendationCard(scholarship) {
  const card = document.createElement("div");
  card.className = "scholarship";

  const badge = document.createElement("span");
  badge.className = "badge";
  badge.textContent = scholarship.stateLabel;

  const heading = document.createElement("h3");
  heading.textContent = scholarship.name;
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
    document.createTextNode(` ${scholarship.eligibilityNote}`)
  );

  const income = document.createElement("p");
  income.className = "info";
  income.append(
    createStrongText("Income note:"),
    document.createTextNode(` ${scholarship.incomeNote}`)
  );

  const deadline = document.createElement("p");
  deadline.className = "info";
  deadline.append(
    createStrongText("Deadline:"),
    document.createTextNode(` ${scholarship.deadline}`)
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
  officialLink.href = scholarship.link;
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

  if (scholarship.state === normalizedProfile.state) {
    reasons.push(`Your state matches: ${scholarship.stateLabel}.`);
  } else if (scholarship.state === "national") {
    reasons.push("This is a national-level scholarship.");
  }

  if (scholarship.education.includes(normalizedProfile.education)) {
    reasons.push("Your course/education matches this scholarship.");
  }

  if (scholarship.categories.includes(normalizedProfile.category) || scholarship.categories.includes("general")) {
    reasons.push("Your category is included in the eligibility list.");
  }

  if (Number(normalizedProfile.income || 0) <= Number(scholarship.maxIncome || 0)) {
    reasons.push(`Your income is within the listed limit of ₹${formatIndianNumber(scholarship.maxIncome)}.`);
  }

  if (scholarship.genders.includes("any") || scholarship.genders.includes(normalizedProfile.gender)) {
    reasons.push("Your gender matches the listed eligibility.");
  }

  if (scholarship.disability === "any" || scholarship.disability === normalizedProfile.disability) {
    reasons.push("Your disability status matches the listed eligibility.");
  }

  if (normalizedProfile.percentage === null || normalizedProfile.percentage >= Number(scholarship.minPercentage || 0)) {
    reasons.push(Number(scholarship.minPercentage || 0) > 0
      ? `Your marks meet the minimum requirement of ${scholarship.minPercentage}%.`
      : "No minimum marks requirement is listed for this scholarship.");
  }

  if (normalizedProfile.year) {
    reasons.push(`Your current year of study is saved as ${normalizedProfile.year}.`);
  }

  return reasons.length ? reasons : ["This scholarship matches your saved profile based on available eligibility rules."];
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
    chip.textContent = `${scholarship.name} ×`;

    chip.addEventListener("click", () => {
      compareScholarships = compareScholarships.filter((item) => {
        return normalizeText(item.name) !== normalizeText(scholarship.name);
      });

      renderComparison();
      applyRecommendationFilters();
    });

    chipRow.appendChild(chip);
  });

  compareList.append(selectedHeading, chipRow);
  comparisonTableWrap.appendChild(createComparisonTable(compareScholarships));
}

function createComparisonTable(items) {
  const table = document.createElement("table");
  table.className = "comparison-table";

  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");

  const featureHead = document.createElement("th");
  featureHead.textContent = "Feature";
  headRow.appendChild(featureHead);

  items.forEach((item) => {
    const th = document.createElement("th");
    th.textContent = item.name;
    headRow.appendChild(th);
  });

  thead.appendChild(headRow);

  const tbody = document.createElement("tbody");

  const rows = [
    {
      label: "State",
      value: (item) => item.stateLabel
    },
    {
      label: "Amount",
      value: (item) => item.amount || "Varies as per official rules"
    },
    {
      label: "Course / Education",
      value: (item) => formatList(item.education)
    },
    {
      label: "Category",
      value: (item) => formatList(item.categories)
    },
    {
      label: "Gender",
      value: (item) => formatList(item.genders)
    },
    {
      label: "Disability",
      value: (item) => formatDisability(item.disability)
    },
    {
      label: "Income Limit",
      value: (item) => `Up to ₹${formatIndianNumber(item.maxIncome)}`
    },
    {
      label: "Minimum Marks",
      value: (item) => item.minPercentage > 0 ? `${item.minPercentage}%` : "Not specified"
    },
    {
      label: "Deadline",
      value: (item) => item.deadline
    },
    {
      label: "Deadline Status",
      value: (item) => getDeadlineReminderText(item.deadlineDate)
    },
    {
      label: "Official Portal",
      value: (item) => item.sourceName || "Official portal"
    }
  ];

  rows.forEach((row) => {
    const tr = document.createElement("tr");

    const labelCell = document.createElement("td");
    labelCell.textContent = row.label;
    tr.appendChild(labelCell);

    items.forEach((item) => {
      const td = document.createElement("td");
      td.textContent = row.value(item);
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });

  table.append(thead, tbody);
  return table;
}

async function saveScholarshipToFirestore(item) {
  if (!currentUser) {
    throw new Error("Please log in first.");
  }

  const name = String(item.name || "").trim().slice(0, 200);
  const link = normalizeHttpUrl(item.link);

  if (!name) {
    throw new Error("Scholarship name is missing.");
  }

  const alreadySaved = await isScholarshipAlreadySaved(name);

  if (alreadySaved) {
    throw new Error("This scholarship is already saved.");
  }

  await addDoc(collection(db, "users", currentUser.uid, "savedScholarships"), {
    name,
    link,
    deadline: String(item.deadline || "").trim(),
    deadlineDate: String(item.deadlineDate || "").trim(),
    source: item.source || "dashboard",
    createdAt: serverTimestamp()
  });
}

async function isScholarshipAlreadySaved(name) {
  if (!currentUser) return false;

  const savedRef = collection(db, "users", currentUser.uid, "savedScholarships");
  const snapshot = await getDocs(savedRef);
  const normalizedName = normalizeText(name);

  return snapshot.docs.some((item) => {
    return normalizeText(item.data().name) === normalizedName;
  });
}

async function loadSavedScholarships() {
  if (!currentUser || !savedList) return;

  showContainerMessage(savedList, "Loading saved scholarships...");

  try {
    const savedRef = collection(db, "users", currentUser.uid, "savedScholarships");
    const savedQuery = query(savedRef, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(savedQuery);

    savedList.replaceChildren();
    savedScholarshipItems = [];

    if (snapshot.empty) {
      showContainerMessage(savedList, "No saved scholarships yet.");
      refreshNotifications();
      return;
    }

    snapshot.forEach((documentSnapshot) => {
      const item = {
        id: documentSnapshot.id,
        ...documentSnapshot.data()
      };

      savedScholarshipItems.push(item);

      savedList.appendChild(
        createSavedScholarshipCard(
          documentSnapshot.id,
          item
        )
      );
    });

    refreshNotifications();
  } catch (error) {
    console.error("Saved scholarships loading error:", error);
    showContainerMessage(savedList, "Could not load saved scholarships.");
  }
}

async function loadApplications() {
  if (!currentUser || !applicationList) return;

  showContainerMessage(applicationList, "Loading applications...");

  try {
    const applicationsRef = collection(db, "users", currentUser.uid, "applications");
    const applicationsQuery = query(applicationsRef, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(applicationsQuery);

    applicationList.replaceChildren();
    applicationItems = [];

    if (snapshot.empty) {
      showContainerMessage(applicationList, "No tracked applications yet.");
      refreshNotifications();
      return;
    }

    snapshot.forEach((documentSnapshot) => {
      const item = {
        id: documentSnapshot.id,
        ...documentSnapshot.data()
      };

      applicationItems.push(item);

      applicationList.appendChild(
        createApplicationCard(
          documentSnapshot.id,
          item
        )
      );
    });

    refreshNotifications();
  } catch (error) {
    console.error("Applications loading error:", error);
    showContainerMessage(applicationList, "Could not load applications.");
  }
}

function createSavedScholarshipCard(documentId, item) {
  const card = document.createElement("div");
  card.className = "scholarship";

  const badge = document.createElement("span");
  badge.className = "badge";
  badge.textContent = "Saved";

  const heading = document.createElement("h3");
  heading.textContent = String(item.name || "Untitled scholarship");

  const linkParagraph = document.createElement("p");
  const safeLink = normalizeHttpUrl(item.link);

  if (safeLink) {
    const link = document.createElement("a");
    link.href = safeLink;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "Official link";
    linkParagraph.appendChild(link);
  } else {
    linkParagraph.className = "mini-note";
    linkParagraph.textContent = item.link
      ? "The saved link is not a safe web address."
      : "No link added.";
  }

  const deadlineParagraph = document.createElement("p");
  deadlineParagraph.className = "info";
  deadlineParagraph.append(
    createStrongText("Deadline:"),
    document.createTextNode(` ${item.deadline || "Check official portal"}`)
  );

  const deadlineReminder = document.createElement("p");
  deadlineReminder.className = getDeadlineReminderClass(item.deadlineDate);
  deadlineReminder.textContent = getDeadlineReminderText(item.deadlineDate);

  const removeButton = document.createElement("button");
  removeButton.className = "secondary-btn";
  removeButton.type = "button";
  removeButton.textContent = "Remove";

  removeButton.addEventListener("click", async () => {
    const confirmed = window.confirm("Remove this saved scholarship?");
    if (!confirmed || !currentUser) return;

    setButtonBusy(removeButton, true, "Removing...");

    try {
      await deleteDoc(
        doc(
          db,
          "users",
          currentUser.uid,
          "savedScholarships",
          documentId
        )
      );

      await loadSavedScholarships();
      refreshNotifications();
    } catch (error) {
      console.error("Scholarship removal error:", error);
      setButtonBusy(removeButton, false);
      alert("Could not remove the scholarship. Please try again.");
    }
  });

  card.append(
    badge,
    heading,
    linkParagraph,
    deadlineParagraph,
    deadlineReminder,
    removeButton
  );

  return card;
}

function createApplicationCard(documentId, item) {
  const card = document.createElement("div");
  card.className = "scholarship";

  const status = VALID_APPLICATION_STATUSES.includes(item.status)
    ? item.status
    : "Not Applied";

  const badge = document.createElement("span");
  badge.className = "badge";
  badge.textContent = STATUS_LABELS[status] || status;

  const heading = document.createElement("h3");
  heading.textContent = String(item.name || "Untitled scholarship");

  const statusParagraph = document.createElement("p");
  statusParagraph.className = "info";
  statusParagraph.append(
    createStrongText("Status:"),
    document.createTextNode(` ${STATUS_LABELS[status] || status}`)
  );

  const noteParagraph = document.createElement("p");
  noteParagraph.className = "info";
  noteParagraph.append(
    createStrongText("Note:"),
    document.createTextNode(` ${item.note || "No note added."}`)
  );

  const statusSelect = document.createElement("select");
  statusSelect.className = "status-select";

  VALID_APPLICATION_STATUSES.forEach((statusOption) => {
    const option = document.createElement("option");
    option.value = statusOption;
    option.textContent = STATUS_LABELS[statusOption];
    option.selected = statusOption === status;
    statusSelect.appendChild(option);
  });

  const updateButton = document.createElement("button");
  updateButton.className = "secondary-btn";
  updateButton.type = "button";
  updateButton.textContent = "Update Status";

  updateButton.addEventListener("click", async () => {
    const newStatus = statusSelect.value;

    if (!VALID_APPLICATION_STATUSES.includes(newStatus) || !currentUser) {
      return;
    }

    setButtonBusy(updateButton, true, "Updating...");

    try {
      await updateDoc(
        doc(db, "users", currentUser.uid, "applications", documentId),
        {
          status: newStatus,
          updatedAt: serverTimestamp()
        }
      );

      await loadApplications();
      refreshNotifications();
    } catch (error) {
      console.error("Application status update error:", error);
      setButtonBusy(updateButton, false);
      alert("Could not update status. Please try again.");
    }
  });

  const removeButton = document.createElement("button");
  removeButton.className = "secondary-btn";
  removeButton.type = "button";
  removeButton.textContent = "Remove";

  removeButton.addEventListener("click", async () => {
    const confirmed = window.confirm("Remove this tracked application?");
    if (!confirmed || !currentUser) return;

    setButtonBusy(removeButton, true, "Removing...");

    try {
      await deleteDoc(
        doc(db, "users", currentUser.uid, "applications", documentId)
      );

      await loadApplications();
      refreshNotifications();
    } catch (error) {
      console.error("Application removal error:", error);
      setButtonBusy(removeButton, false);
      alert("Could not remove the application. Please try again.");
    }
  });

  const actions = document.createElement("div");
  actions.className = "button-row";
  actions.append(statusSelect, updateButton, removeButton);

  card.append(
    badge,
    heading,
    statusParagraph,
    noteParagraph,
    actions
  );

  return card;
}

function refreshNotifications() {
  notificationItems = buildNotificationItems();
  renderNotifications();
  persistNotificationSnapshot();
}

function buildNotificationItems() {
  const items = [];
  const normalizedProfile = normalizeProfile(latestProfile || {});

  const requiredProfileMissing =
    !normalizedProfile.state ||
    !normalizedProfile.education ||
    !normalizedProfile.category ||
    !normalizedProfile.income;

  if (requiredProfileMissing) {
    items.push({
      key: "profile-incomplete",
      type: "warning",
      icon: "👤",
      title: "Complete your profile",
      message: "Add your state, education, category, and income to unlock personalized scholarship recommendations."
    });
  } else {
    items.push({
      key: `profile-ready-${normalizedProfile.state}-${normalizedProfile.education}-${normalizedProfile.category}`,
      type: "success",
      icon: "✅",
      title: "Profile ready",
      message: "Your profile is ready for personalized scholarship matching."
    });
  }

  if (latestRecommendedScholarships.length > 0) {
    items.push({
      key: `recommendations-${latestRecommendedScholarships.length}`,
      type: "success",
      icon: "🎯",
      title: `${latestRecommendedScholarships.length} scholarship recommendation${latestRecommendedScholarships.length === 1 ? "" : "s"} found`,
      message: "Review your matched scholarships and save the ones you want to apply for later."
    });
  }

  const unknownDeadlineCount = latestRecommendedScholarships.filter((scholarship) => {
    return getScholarshipDeadlineStatus(scholarship.deadlineDate) === "unknown";
  }).length;

  if (unknownDeadlineCount > 0) {
    items.push({
      key: `deadline-unknown-${unknownDeadlineCount}`,
      type: "info",
      icon: "⏰",
      title: "Verify official deadlines",
      message: `${unknownDeadlineCount} recommended scholarship${unknownDeadlineCount === 1 ? " has" : "s have"} no fixed deadline date added yet. Check the official portal before applying.`
    });
  }

  const closingSoon = latestRecommendedScholarships.filter((scholarship) => {
    return getScholarshipDeadlineStatus(scholarship.deadlineDate) === "soon";
  });

  if (closingSoon.length > 0) {
    items.push({
      key: `deadline-soon-${closingSoon.length}`,
      type: "warning",
      icon: "⚠️",
      title: `${closingSoon.length} deadline${closingSoon.length === 1 ? " is" : "s are"} closing soon`,
      message: "Apply early and verify the final date on the official portal."
    });
  }

  const expiredScholarships = latestRecommendedScholarships.filter((scholarship) => {
    return getScholarshipDeadlineStatus(scholarship.deadlineDate) === "expired";
  });

  if (expiredScholarships.length > 0) {
    items.push({
      key: `deadline-expired-${expiredScholarships.length}`,
      type: "danger",
      icon: "⛔",
      title: `${expiredScholarships.length} deadline${expiredScholarships.length === 1 ? " appears" : "s appear"} expired`,
      message: "Check the official portal for reopening or the next application cycle."
    });
  }

  if (savedScholarshipItems.length > 0) {
    items.push({
      key: `saved-${savedScholarshipItems.length}`,
      type: "info",
      icon: "📌",
      title: `${savedScholarshipItems.length} saved scholarship${savedScholarshipItems.length === 1 ? "" : "s"}`,
      message: "Open your saved list regularly so you do not miss application windows."
    });
  }

  const notAppliedCount = applicationItems.filter((item) => {
    return normalizeText(item.status) === normalizeText("Not Applied");
  }).length;

  if (notAppliedCount > 0) {
    items.push({
      key: `tracker-not-applied-${notAppliedCount}`,
      type: "warning",
      icon: "🟢",
      title: `${notAppliedCount} tracked application${notAppliedCount === 1 ? "" : "s"} not applied yet`,
      message: "Update the status after you submit applications on official portals."
    });
  }

  const underReviewCount = applicationItems.filter((item) => {
    return normalizeText(item.status) === normalizeText("Under Review");
  }).length;

  if (underReviewCount > 0) {
    items.push({
      key: `tracker-under-review-${underReviewCount}`,
      type: "info",
      icon: "🔵",
      title: `${underReviewCount} application${underReviewCount === 1 ? "" : "s"} under review`,
      message: "Keep documents ready in case the portal asks for correction or verification."
    });
  }

  return items;
}

function renderNotifications() {
  if (!notificationList || !notificationBadge) return;

  notificationList.replaceChildren();

  const unreadCount = notificationItems.filter((item) => {
    return !readNotificationKeys.includes(item.key);
  }).length;

  if (unreadCount > 0) {
    notificationBadge.textContent = String(unreadCount);
    notificationBadge.classList.remove("hidden");
  } else {
    notificationBadge.textContent = "0";
    notificationBadge.classList.add("hidden");
  }

  if (notificationItems.length === 0) {
    showContainerMessage(notificationList, "No notifications yet.");
    return;
  }

  notificationItems.forEach((item) => {
    notificationList.appendChild(createNotificationCard(item));
  });
}

function createNotificationCard(item) {
  const card = document.createElement("div");
  card.className = getNotificationCardClass(item);

  const icon = document.createElement("span");
  icon.className = "notification-icon";
  icon.textContent = item.icon || "🔔";

  const body = document.createElement("div");

  const title = document.createElement("h3");
  title.textContent = item.title;

  const message = document.createElement("p");
  message.textContent = item.message;

  const status = document.createElement("span");
  status.className = "notification-status";
  status.textContent = readNotificationKeys.includes(item.key) ? "Read" : "Unread";

  body.append(title, message, status);
  card.append(icon, body);

  return card;
}

function getNotificationCardClass(item) {
  const classes = ["notification-card"];

  if (item.type === "success") {
    classes.push("notification-success");
  } else if (item.type === "warning") {
    classes.push("notification-warning");
  } else if (item.type === "danger") {
    classes.push("notification-danger");
  } else {
    classes.push("notification-info");
  }

  if (!readNotificationKeys.includes(item.key)) {
    classes.push("notification-unread");
  }

  return classes.join(" ");
}

async function persistNotificationSnapshot() {
  if (!currentUser) return;

  try {
    await setDoc(
      doc(db, "users", currentUser.uid),
      {
        notifications: notificationItems.map((item) => ({
          key: item.key,
          type: item.type,
          title: item.title,
          message: item.message,
          icon: item.icon || "🔔",
          generatedAt: new Date().toISOString(),
          read: readNotificationKeys.includes(item.key)
        }))
      },
      { merge: true }
    );
  } catch (error) {
    console.warn("Notification snapshot save skipped:", error);
  }
}

function getDeadlineReminderText(deadlineDate) {
  const deadlineInfo = getDeadlineInfo(deadlineDate);

  if (!deadlineInfo.hasDate) {
    return "⏰ Reminder: Official deadline date is not added yet. Check the official portal before applying.";
  }

  if (deadlineInfo.daysLeft < 0) {
    return "⛔ Deadline status: This deadline appears to be over. Check the official portal for reopening or the next cycle.";
  }

  if (deadlineInfo.daysLeft === 0) {
    return "🚨 Deadline reminder: Last day to apply. Verify the official portal immediately.";
  }

  if (deadlineInfo.daysLeft <= DEADLINE_SOON_DAYS) {
    return `⚠️ Deadline reminder: ${deadlineInfo.daysLeft} day${deadlineInfo.daysLeft === 1 ? "" : "s"} left to apply.`;
  }

  return `✅ Deadline reminder: ${deadlineInfo.daysLeft} days left. You still have time, but apply early.`;
}

function getDeadlineReminderClass(deadlineDate) {
  const status = getScholarshipDeadlineStatus(deadlineDate);

  if (status === "unknown") {
    return "mini-note deadline-reminder deadline-unknown";
  }

  if (status === "expired") {
    return "mini-note deadline-reminder deadline-expired";
  }

  if (status === "soon") {
    return "mini-note deadline-reminder deadline-soon";
  }

  return "mini-note deadline-reminder deadline-safe";
}

function getScholarshipDeadlineStatus(deadlineDate) {
  const deadlineInfo = getDeadlineInfo(deadlineDate);

  if (!deadlineInfo.hasDate) {
    return "unknown";
  }

  if (deadlineInfo.daysLeft < 0) {
    return "expired";
  }

  if (deadlineInfo.daysLeft <= DEADLINE_SOON_DAYS) {
    return "soon";
  }

  return "safe";
}

function getDeadlineInfo(deadlineDate) {
  const text = String(deadlineDate || "").trim();

  if (!text) {
    return {
      hasDate: false,
      daysLeft: null
    };
  }

  const deadline = new Date(`${text}T23:59:59`);

  if (Number.isNaN(deadline.getTime())) {
    return {
      hasDate: false,
      daysLeft: null
    };
  }

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const endOfDeadline = new Date(
    deadline.getFullYear(),
    deadline.getMonth(),
    deadline.getDate(),
    23,
    59,
    59
  );

  const millisecondsPerDay = 1000 * 60 * 60 * 24;
  const daysLeft = Math.ceil((endOfDeadline - startOfToday) / millisecondsPerDay);

  return {
    hasDate: true,
    daysLeft
  };
}

function normalizeProfile(profile) {
  return {
    state: mapState(profile.state),
   education: mapEducation(profile.education),
   year: String(profile.year || "").trim(),
   category: mapCategory(profile.category),
    gender: mapGender(profile.gender),
    disability: mapDisability(profile.disability),
    income: Number(profile.income || 0),
    percentage: parsePercentage(profile.percentage)
  };
}

function mapState(value) {
  const text = normalizeText(value);

  if (text.includes("andhra")) return "andhra-pradesh";
  if (text.includes("telangana")) return "telangana";
  if (text.includes("national")) return "national";

  return "";
}

function mapEducation(value) {
  const text = normalizeText(value);

  if (text.includes("school")) return "school";
  if (text.includes("intermediate")) return "intermediate";
  if (text.includes("degree")) return "degree";
  if (text.includes("engineering")) return "engineering";
  if (text.includes("post") || text.includes("pg")) return "pg";

  return "";
}

function mapCategory(value) {
  const text = normalizeText(value);

  if (text.includes("general")) return "general";
  if (text === "sc") return "sc";
  if (text === "st") return "st";
  if (text.includes("bc") || text.includes("obc")) return "obc";
  if (text.includes("minority")) return "minority";
  if (text.includes("ews") || text.includes("ebc")) return "ews";
  if (text.includes("kapu")) return "kapu";

  return "";
}

function mapGender(value) {
  const text = normalizeText(value);

  if (text.includes("female")) return "female";
  if (text === "male") return "male";

  return "any";
}

function mapDisability(value) {
  const text = normalizeText(value);

  if (text === "yes") return "yes";
  if (text === "no") return "no";

  return "any";
}

function parsePercentage(value) {
  const text = String(value || "").trim().toLowerCase();

  if (!text) return null;

  const number = Number(text.replace(/[^0-9.]/g, ""));

  if (!Number.isFinite(number) || number < 0) {
    return null;
  }

  if (text.includes("cgpa") || number <= 10) {
    return Math.min(number * 10, 100);
  }

  return Math.min(number, 100);
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

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => String(item || "").trim())
    .filter(Boolean);
}

function createStrongText(text) {
  const strong = document.createElement("strong");
  strong.textContent = text;
  return strong;
}

function showContainerMessage(container, message) {
  const paragraph = document.createElement("p");
  paragraph.className = "mini-note";
  paragraph.textContent = message;
  container.replaceChildren(paragraph);
}

function showProfileMessage(message, isError = false) {
  if (!profileMessage) return;

  profileMessage.textContent = message;
  profileMessage.style.color = isError ? "#b42318" : "#067647";
}

function setElementValue(element, value) {
  if (element) {
    element.value = String(value || "");
  }
}

function setText(element, value) {
  if (element) {
    element.textContent = value;
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

function formatList(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return "Not specified";
  }

  return items
    .map((item) => {
      const text = String(item || "").trim();

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

      return labels[text] || text;
    })
    .join(", ");
}

function formatDisability(value) {
  const text = normalizeText(value);

  if (text === "yes") return "Only for disabled students";
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
