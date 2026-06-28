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

let currentUser = null;

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  currentUser = user;

  if (userEmail) {
    userEmail.textContent = `Logged in as: ${user.email}`;
  }

  await loadProfile();
  await loadSavedScholarships();
  await loadApplications();
});

logoutBtn?.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "login.html";
});

saveProfileBtn?.addEventListener("click", async () => {
  if (!currentUser) return;

  try {
    const userRef = doc(db, "users", currentUser.uid);

    await setDoc(userRef, {
      email: currentUser.email,
      name: profileName.value.trim(),
      state: profileState.value,
      education: profileEducation.value,
      category: profileCategory.value,
      gender: profileGender.value,
      disability: profileDisability.value,
      income: profileIncome.value.trim(),
      percentage: profilePercentage.value.trim(),
      profileCompleted: true,
      updatedAt: serverTimestamp()
    }, { merge: true });

    showProfileMessage("Profile saved successfully.");
  } catch (error) {
    showProfileMessage("Could not save profile. Check Firestore rules.", true);
    console.error(error);
  }
});

addSavedBtn?.addEventListener("click", async () => {
  if (!currentUser) return;

  const name = savedName.value.trim();
  const link = savedLink.value.trim();

  if (!name) {
    alert("Enter scholarship name.");
    return;
  }

  try {
    await addDoc(collection(db, "users", currentUser.uid, "savedScholarships"), {
      name,
      link,
      source: "dashboard-manual",
      createdAt: serverTimestamp()
    });

    savedName.value = "";
    savedLink.value = "";

    await loadSavedScholarships();
  } catch (error) {
    alert("Could not save scholarship.");
    console.error(error);
  }
});

addApplicationBtn?.addEventListener("click", async () => {
  if (!currentUser) return;

  const name = appName.value.trim();
  const status = appStatus.value;
  const note = appNote.value.trim();

  if (!name) {
    alert("Enter scholarship name.");
    return;
  }

  try {
    await addDoc(collection(db, "users", currentUser.uid, "applications"), {
      name,
      status,
      note,
      createdAt: serverTimestamp()
    });

    appName.value = "";
    appNote.value = "";
    appStatus.value = "Not Applied";

    await loadApplications();
  } catch (error) {
    alert("Could not add application.");
    console.error(error);
  }
});

async function loadProfile() {
  if (!currentUser) return;

  const userRef = doc(db, "users", currentUser.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    await setDoc(userRef, {
      email: currentUser.email,
      createdAt: serverTimestamp(),
      profileCompleted: false
    });
    return;
  }

  const data = userSnap.data();

  profileName.value = data.name || "";
  profileState.value = data.state || "";
  profileEducation.value = data.education || "";
  profileCategory.value = data.category || "";
  profileGender.value = data.gender || "";
  profileDisability.value = data.disability || "";
  profileIncome.value = data.income || "";
  profilePercentage.value = data.percentage || "";
}

async function loadSavedScholarships() {
  if (!currentUser || !savedList) return;

  savedList.innerHTML = "<p class='mini-note'>Loading saved scholarships...</p>";

  try {
    const savedRef = collection(db, "users", currentUser.uid, "savedScholarships");
    const savedQuery = query(savedRef, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(savedQuery);

    if (snapshot.empty) {
      savedList.innerHTML = "<p class='mini-note'>No saved scholarships yet.</p>";
      return;
    }

    savedList.innerHTML = "";

    snapshot.forEach((docSnap) => {
      const item = docSnap.data();
      const id = docSnap.id;

      const card = document.createElement("div");
      card.className = "scholarship";

      card.innerHTML = `
        <span class="badge">Saved</span>
        <h3>${escapeHtml(item.name)}</h3>
        ${
          item.link
            ? `<p><a href="${escapeHtml(item.link)}" target="_blank" rel="noopener noreferrer">Official link</a></p>`
            : `<p class="mini-note">No link added.</p>`
        }
        <button class="secondary-btn" data-delete-saved="${id}">Remove</button>
      `;

      savedList.appendChild(card);
    });

    document.querySelectorAll("[data-delete-saved]").forEach((button) => {
      button.addEventListener("click", async () => {
        const id = button.getAttribute("data-delete-saved");
        await deleteDoc(doc(db, "users", currentUser.uid, "savedScholarships", id));
        await loadSavedScholarships();
      });
    });
  } catch (error) {
    savedList.innerHTML = "<p class='mini-note'>Could not load saved scholarships.</p>";
    console.error(error);
  }
}

async function loadApplications() {
  if (!currentUser || !applicationList) return;

  applicationList.innerHTML = "<p class='mini-note'>Loading applications...</p>";

  try {
    const appsRef = collection(db, "users", currentUser.uid, "applications");
    const appsQuery = query(appsRef, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(appsQuery);

    if (snapshot.empty) {
      applicationList.innerHTML = "<p class='mini-note'>No tracked applications yet.</p>";
      return;
    }

    applicationList.innerHTML = "";

    snapshot.forEach((docSnap) => {
      const item = docSnap.data();
      const id = docSnap.id;

      const card = document.createElement("div");
      card.className = "scholarship";

      card.innerHTML = `
        <span class="badge">${escapeHtml(item.status)}</span>
        <h3>${escapeHtml(item.name)}</h3>
        <p class="info"><strong>Status:</strong> ${escapeHtml(item.status)}</p>
        <p class="info"><strong>Note:</strong> ${escapeHtml(item.note || "No note added.")}</p>
        <button class="secondary-btn" data-delete-app="${id}">Remove</button>
      `;

      applicationList.appendChild(card);
    });

    document.querySelectorAll("[data-delete-app]").forEach((button) => {
      button.addEventListener("click", async () => {
        const id = button.getAttribute("data-delete-app");
        await deleteDoc(doc(db, "users", currentUser.uid, "applications", id));
        await loadApplications();
      });
    });
  } catch (error) {
    applicationList.innerHTML = "<p class='mini-note'>Could not load applications.</p>";
    console.error(error);
  }
}

function showProfileMessage(message, isError = false) {
  if (!profileMessage) return;
  profileMessage.textContent = message;
  profileMessage.style.color = isError ? "#b42318" : "#067647";
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
