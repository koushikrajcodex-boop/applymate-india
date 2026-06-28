import { auth, db } from "./firebase-config.js";

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

const userEmail = document.getElementById("userEmail");
const logoutBtn = document.getElementById("logoutBtn");

const profileName = document.getElementById("profileName");
const profileState = document.getElementById("profileState");
const profileEducation = document.getElementById("profileEducation");
const profileCategory = document.getElementById("profileCategory");
const profileGender = document.getElementById("profileGender");
const profileDisability = document.getElementById("profileDisability");
const profileIncome = document.getElementById("profileIncome");
const profilePercentage = document.getElementById("profilePercentage");
const saveProfileBtn = document.getElementById("saveProfileBtn");
const profileMessage = document.getElementById("profileMessage");

const recommendationSummary = document.getElementById("recommendationSummary");
const recommendationList = document.getElementById("recommendationList");

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

const scholarships = [
  {
    name: "Andhra Pradesh Post-Matric Scholarship - Jnanabhumi",
    state: "andhra-pradesh",
    stateLabel: "Andhra Pradesh",
    education: ["intermediate", "degree", "engineering", "pg"],
    categories: ["sc", "st", "bc", "obc", "ebc", "ews", "minority", "kapu", "disabled"],
    genders: ["any"],
    disability: "any",
    maxIncome: 200000,
    minPercentage: 0,
    deadline: "Check official Jnanabhumi portal",
    link: "https://jnanabhumi.ap.gov.in/",
    sourceName: "Official Jnanabhumi Portal",
    eligibilityNote: "For eligible Andhra Pradesh post-matric students. Rules may vary by department and category.",
    incomeNote: "Income rules can vary by category. Verify on Jnanabhumi.",
    priority: 95
  },
  {
    name: "Andhra Pradesh Pre-Matric Scholarship - Jnanabhumi",
    state: "andhra-pradesh",
    stateLabel: "Andhra Pradesh",
    education: ["school"],
    categories: ["sc", "st", "bc", "obc", "ebc", "ews", "minority", "kapu", "disabled"],
    genders: ["any"],
    disability: "any",
    maxIncome: 200000,
    minPercentage: 0,
    deadline: "Check official Jnanabhumi portal",
    link: "https://jnanabhumi.ap.gov.in/",
    sourceName: "Official Jnanabhumi Portal",
    eligibilityNote: "For eligible school students in Andhra Pradesh. Exact rules should be checked officially.",
    incomeNote: "Income/category rules can vary. Verify before applying.",
    priority: 82
  },
  {
    name: "Telangana ePASS Post-Matric Scholarship",
    state: "telangana",
    stateLabel: "Telangana",
    education: ["intermediate", "degree", "engineering", "pg"],
    categories: ["sc", "st", "bc", "obc", "ebc", "ews", "minority", "disabled"],
    genders: ["any"],
    disability: "any",
    maxIncome: 200000,
    minPercentage: 0,
    deadline: "Check official Telangana ePASS portal",
    link: "https://telanganaepass.cgg.gov.in/",
    sourceName: "Official Telangana ePASS Portal",
    eligibilityNote: "For eligible Telangana post-matric students from welfare categories.",
    incomeNote: "Income limits can vary by category and current rules.",
    priority: 95
  },
  {
    name: "Telangana ePASS Pre-Matric Scholarship",
    state: "telangana",
    stateLabel: "Telangana",
    education: ["school"],
    categories: ["sc", "st", "bc", "obc", "ebc", "ews", "minority", "disabled"],
    genders: ["any"],
    disability: "any",
    maxIncome: 200000,
    minPercentage: 0,
    deadline: "Check official Telangana ePASS portal",
    link: "https://telanganaepass.cgg.gov.in/",
    sourceName: "Official Telangana ePASS Portal",
    eligibilityNote: "For eligible school students in Telangana.",
    incomeNote: "Verify current income and class rules on ePASS.",
    priority: 82
  },
  {
    name: "National Means-cum-Merit Scholarship Scheme - NMMSS",
    state: "national",
    stateLabel: "National",
    education: ["school"],
    categories: ["general", "sc", "st", "bc", "obc", "minority", "ebc", "ews"],
    genders: ["any"],
    disability: "any",
    maxIncome: 350000,
    minPercentage: 55,
    deadline: "Check NSP / state education department",
    link: "https://scholarships.gov.in/",
    sourceName: "National Scholarship Portal",
    eligibilityNote: "For eligible school students. Selection and rules depend on official notification.",
    incomeNote: "Usually income-based. Verify state/NSP instructions.",
    priority: 88
  },
  {
    name: "Central Sector Scheme of Scholarship for College and University Students",
    state: "national",
    stateLabel: "National",
    education: ["degree", "engineering", "pg"],
    categories: ["general", "sc", "st", "bc", "obc", "minority", "ebc", "ews"],
    genders: ["any"],
    disability: "any",
    maxIncome: 450000,
    minPercentage: 80,
    deadline: "Check National Scholarship Portal",
    link: "https://scholarships.gov.in/",
    sourceName: "National Scholarship Portal",
    eligibilityNote: "For eligible meritorious college/university students as per official rules.",
    incomeNote: "Income limit and merit rules should be verified on NSP.",
    priority: 86
  },
  {
    name: "AICTE Pragati Scholarship for Girl Students",
    state: "national",
    stateLabel: "National",
    education: ["engineering"],
    categories: ["general", "sc", "st", "bc", "obc", "minority", "ebc", "ews", "kapu"],
    genders: ["female"],
    disability: "any",
    maxIncome: 800000,
    minPercentage: 0,
    deadline: "Check AICTE / NSP portal",
    link: "https://www.aicte-india.org/",
    sourceName: "AICTE",
    eligibilityNote: "For eligible girl students pursuing technical education as per AICTE rules.",
    incomeNote: "Family income rules should be checked on official AICTE/NSP notification.",
    priority: 92
  },
  {
    name: "AICTE Saksham Scholarship for Specially Abled Students",
    state: "national",
    stateLabel: "National",
    education: ["engineering"],
    categories: ["general", "sc", "st", "bc", "obc", "minority", "ebc", "ews", "kapu", "disabled"],
    genders: ["any"],
    disability: "yes",
    maxIncome: 800000,
    minPercentage: 0,
    deadline: "Check AICTE / NSP portal",
    link: "https://www.aicte-india.org/",
    sourceName: "AICTE",
    eligibilityNote: "For eligible specially abled students pursuing technical education.",
    incomeNote: "Verify latest income/disability conditions in official notification.",
    priority: 92
  },
  {
    name: "Post Matric Scholarship for Minorities",
    state: "national",
    stateLabel: "National",
    education: ["intermediate", "degree", "engineering", "pg"],
    categories: ["minority"],
    genders: ["any"],
    disability: "any",
    maxIncome: 200000,
    minPercentage: 50,
    deadline: "Check NSP",
    link: "https://scholarships.gov.in/",
    sourceName: "National Scholarship Portal",
    eligibilityNote: "For eligible minority community students as per official rules.",
    incomeNote: "Income limit can change. Verify on NSP.",
    priority: 84
  },
  {
    name: "Scholarship for Students with Disabilities",
    state: "national",
    stateLabel: "National",
    education: ["school", "intermediate", "degree", "engineering", "pg"],
    categories: ["general", "sc", "st", "bc", "obc", "minority", "ebc", "ews", "kapu", "disabled"],
    genders: ["any"],
    disability: "yes",
    maxIncome: 250000,
    minPercentage: 0,
    deadline: "Check NSP",
    link: "https://scholarships.gov.in/",
    sourceName: "National Scholarship Portal",
    eligibilityNote: "For eligible students with benchmark disabilities as per official scheme rules.",
    incomeNote: "Income and disability rules should be verified officially.",
    priority: 88
  }
];

let currentUser = null;

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
    await Promise.all([
      loadProfile(),
      loadSavedScholarships(),
      loadApplications()
    ]);
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
      category: profileCategory?.value || "",
      gender: profileGender?.value || "",
      disability: profileDisability?.value || "",
      income,
      percentage,
      profileCompleted: true,
      updatedAt: serverTimestamp()
    };

    await setDoc(userRef, profileData, { merge: true });

    showProfileMessage("Profile saved successfully. Recommendations updated.");
    renderRecommendations(profileData);
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
  } catch (error) {
    console.error("Application save error:", error);
    alert("Could not add the application. Please try again.");
  } finally {
    setButtonBusy(addApplicationBtn, false);
  }
});

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
    renderRecommendations(emptyProfile);
    return;
  }

  const data = userSnap.data();

  setElementValue(profileName, data.name);
  setElementValue(profileState, data.state);
  setElementValue(profileEducation, data.education);
  setElementValue(profileCategory, data.category);
  setElementValue(profileGender, data.gender);
  setElementValue(profileDisability, data.disability);
  setElementValue(profileIncome, data.income);
  setElementValue(profilePercentage, data.percentage);

  renderRecommendations(data);
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
    recommendationSummary.textContent =
      "Complete state, education, category, and income to get automatic recommendations.";
    recommendationList.replaceChildren();
    return;
  }

  const matches = getRecommendedScholarships(normalizedProfile);

  if (matches.length === 0) {
    recommendationSummary.textContent =
      "No matching scholarships found for your profile right now. Try updating your profile or check again later.";
    recommendationList.replaceChildren();
    return;
  }

  recommendationSummary.textContent =
    `You are eligible for these ${matches.length} scholarships based on your saved profile.`;

  recommendationList.replaceChildren();

  matches.forEach((scholarship) => {
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

function createRecommendationCard(scholarship) {
  const card = document.createElement("div");
  card.className = "scholarship";

  const badge = document.createElement("span");
  badge.className = "badge";
  badge.textContent = scholarship.stateLabel;

  const heading = document.createElement("h3");
  heading.textContent = scholarship.name;

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
        source: "dashboard-recommendation"
      });

      saveButton.textContent = "Saved ✅";
      await loadSavedScholarships();
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
        note: "Added from personalized recommendations.",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      trackButton.textContent = "Added ✅";
      await loadApplications();
    } catch (error) {
      console.error("Tracker add error:", error);
      setButtonBusy(trackButton, false);
      alert("Could not add this scholarship to tracker.");
    }
  });

  actions.append(officialLink, saveButton, trackButton);

  card.append(
    badge,
    heading,
    eligibility,
    income,
    deadline,
    verified,
    actions
  );

  return card;
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

    if (snapshot.empty) {
      showContainerMessage(savedList, "No saved scholarships yet.");
      return;
    }

    snapshot.forEach((documentSnapshot) => {
      savedList.appendChild(
        createSavedScholarshipCard(
          documentSnapshot.id,
          documentSnapshot.data()
        )
      );
    });
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

    if (snapshot.empty) {
      showContainerMessage(applicationList, "No tracked applications yet.");
      return;
    }

    snapshot.forEach((documentSnapshot) => {
      applicationList.appendChild(
        createApplicationCard(
          documentSnapshot.id,
          documentSnapshot.data()
        )
      );
    });
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
    } catch (error) {
      console.error("Scholarship removal error:", error);
      setButtonBusy(removeButton, false);
      alert("Could not remove the scholarship. Please try again.");
    }
  });

  card.append(badge, heading, linkParagraph, removeButton);
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

function normalizeProfile(profile) {
  return {
    state: mapState(profile.state),
    education: mapEducation(profile.education),
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
