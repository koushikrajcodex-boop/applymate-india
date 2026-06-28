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

const savedName = document.getElementById("savedName");
const savedLink = document.getElementById("savedLink");
const addSavedBtn = document.getElementById("addSavedBtn");
const savedList = document.getElementById("savedList");

const appName = document.getElementById("appName");
const appStatus = document.getElementById("appStatus");
const appNote = document.getElementById("appNote");
const addApplicationBtn = document.getElementById("addApplicationBtn");
const applicationList = document.getElementById("applicationList");

const VALID_APPLICATION_STATUSES = new Set([
  "Not Applied",
  "Applied",
  "Under Review",
  "Approved",
  "Rejected"
]);

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

  if (percentage.length > 30) {
    showProfileMessage("Percentage / CGPA must be 30 characters or fewer.", true);
    return;
  }

  setButtonBusy(saveProfileBtn, true, "Saving...");

  try {
    const userRef = doc(db, "users", currentUser.uid);

    await setDoc(userRef, {
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
    }, { merge: true });

    showProfileMessage("Profile saved successfully.");
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
    await addDoc(
      collection(db, "users", currentUser.uid, "savedScholarships"),
      {
        name,
        link,
        source: "dashboard-manual",
        createdAt: serverTimestamp()
      }
    );

    if (savedName) savedName.value = "";
    if (savedLink) savedLink.value = "";

    await loadSavedScholarships();
  } catch (error) {
    console.error("Scholarship save error:", error);
    alert("Could not save the scholarship. Please try again.");
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

  if (!VALID_APPLICATION_STATUSES.has(status)) {
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
      createdAt: serverTimestamp()
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
    await setDoc(userRef, {
      email: currentUser.email || "",
      createdAt: serverTimestamp(),
      profileCompleted: false
    });
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
}

async function loadSavedScholarships() {
  if (!currentUser || !savedList) return;

  showContainerMessage(savedList, "Loading saved scholarships...");

  try {
    const savedRef = collection(
      db,
      "users",
      currentUser.uid,
      "savedScholarships"
    );
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
    const applicationsRef = collection(
      db,
      "users",
      currentUser.uid,
      "applications"
    );
    const applicationsQuery = query(
      applicationsRef,
      orderBy("createdAt", "desc")
    );
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

  const status = VALID_APPLICATION_STATUSES.has(item.status)
    ? item.status
    : "Not Applied";

  const badge = document.createElement("span");
  badge.className = "badge";
  badge.textContent = status;

  const heading = document.createElement("h3");
  heading.textContent = String(item.name || "Untitled scholarship");

  const statusParagraph = document.createElement("p");
  statusParagraph.className = "info";
  statusParagraph.append(
    createStrongText("Status:"),
    document.createTextNode(` ${status}`)
  );

  const noteParagraph = document.createElement("p");
  noteParagraph.className = "info";
  noteParagraph.append(
    createStrongText("Note:"),
    document.createTextNode(` ${item.note || "No note added."}`)
  );

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

  card.append(
    badge,
    heading,
    statusParagraph,
    noteParagraph,
    removeButton
  );
  return card;
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
  if (element) element.value = String(value || "");
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
