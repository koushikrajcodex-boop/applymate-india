import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { collection, doc, getDoc, getDocs } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const state = {
  user: null,
  profile: null,
  saved: [],
  applications: []
};

const statusBox = document.getElementById("accountStatus");
const diagnosticsBox = document.getElementById("diagnosticsResults");
const exportButton = document.getElementById("exportAccountDataBtn");
const diagnosticsButton = document.getElementById("runDiagnosticsBtn");
const clearLocalButton = document.getElementById("clearLocalPreferencesBtn");

onAuthStateChanged(auth, async (user) => {
  state.user = user;

  if (!user) {
    renderSignedOut();
    return;
  }

  await loadAccountData();
  renderAccountStatus();
});

exportButton?.addEventListener("click", exportAccountData);
diagnosticsButton?.addEventListener("click", runDiagnostics);
clearLocalButton?.addEventListener("click", clearLocalPreferences);

async function loadAccountData() {
  if (!state.user) return;

  setButtonBusy(exportButton, true, "Loading account...");

  try {
    const [profileSnapshot, savedSnapshot, applicationSnapshot] = await Promise.all([
      getDoc(doc(db, "users", state.user.uid)),
      getDocs(collection(db, "users", state.user.uid, "savedScholarships")),
      getDocs(collection(db, "users", state.user.uid, "applications"))
    ]);

    state.profile = profileSnapshot.exists() ? serializeValue(profileSnapshot.data()) : {};
    state.saved = savedSnapshot.docs.map((item) => ({ id: item.id, ...serializeValue(item.data()) }));
    state.applications = applicationSnapshot.docs.map((item) => ({ id: item.id, ...serializeValue(item.data()) }));
  } catch (error) {
    console.error("Account data load failed:", error);
    statusBox.innerHTML = "<p class='mini-note'>Account data could not be loaded. Run diagnostics below.</p>";
  } finally {
    setButtonBusy(exportButton, false);
  }
}

function renderSignedOut() {
  statusBox.innerHTML = `
    <div class="notice-box">
      You are not signed in. <a href="login.html">Login</a> to view account data and diagnostics.
    </div>
  `;
  exportButton.disabled = true;
}

function renderAccountStatus() {
  const preferences = state.profile?.notificationPreferences || {};
  const profileFields = ["name", "state", "education", "category", "gender", "disability", "income"];
  const completedFields = profileFields.filter((key) => String(state.profile?.[key] ?? "").trim() !== "").length;
  const profilePercent = Math.round((completedFields / profileFields.length) * 100);

  statusBox.replaceChildren();

  const grid = document.createElement("div");
  grid.className = "account-stat-grid";

  [
    ["Signed in as", state.user.email || "Unknown email"],
    ["Profile completion", `${profilePercent}%`],
    ["Saved scholarships", state.saved.length],
    ["Tracked applications", state.applications.length]
  ].forEach(([label, value]) => grid.appendChild(createStat(label, value)));

  const preferenceCard = document.createElement("article");
  preferenceCard.className = "account-detail-card";
  const heading = document.createElement("h3");
  heading.textContent = "Notification preferences";
  preferenceCard.appendChild(heading);

  const list = document.createElement("ul");
  [
    ["Deadline alerts", preferences.deadlineAlerts !== false],
    ["Saved scholarship alerts", preferences.savedScholarshipAlerts !== false],
    ["Tracker alerts", preferences.trackerAlerts !== false],
    ["Profile reminders", preferences.profileReminders !== false]
  ].forEach(([label, enabled]) => {
    const item = document.createElement("li");
    item.textContent = `${label}: ${enabled ? "Enabled" : "Disabled"}`;
    list.appendChild(item);
  });

  preferenceCard.appendChild(list);
  statusBox.append(grid, preferenceCard);
}

function createStat(label, value) {
  const card = document.createElement("div");
  card.className = "account-stat";
  const strong = document.createElement("strong");
  strong.textContent = String(value);
  const span = document.createElement("span");
  span.textContent = label;
  card.append(strong, span);
  return card;
}

function exportAccountData() {
  if (!state.user) return;

  const payload = {
    exportedAt: new Date().toISOString(),
    platform: "ApplyMate India",
    account: {
      uid: state.user.uid,
      email: state.user.email || "",
      emailVerified: Boolean(state.user.emailVerified),
      providerIds: state.user.providerData.map((provider) => provider.providerId)
    },
    profile: state.profile || {},
    savedScholarships: state.saved,
    applications: state.applications,
    localPreferences: collectLocalPreferences()
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `applymate-account-export-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function runDiagnostics() {
  setButtonBusy(diagnosticsButton, true, "Running checks...");
  diagnosticsBox.innerHTML = "<p class='mini-note'>Running browser, network, authentication, and Firestore checks...</p>";

  const checks = [];

  checks.push(createCheck("Browser online status", navigator.onLine, navigator.onLine ? "Online" : "Offline"));
  checks.push(createCheck("Secure context", window.isSecureContext, window.isSecureContext ? "Secure HTTPS context" : "Not running in a secure context"));
  checks.push(createCheck("Local storage", testLocalStorage(), testLocalStorage() ? "Available" : "Unavailable or blocked"));
  checks.push(createCheck("Service worker support", "serviceWorker" in navigator, "serviceWorker" in navigator ? "Supported" : "Not supported"));
  checks.push(createCheck("Authenticated session", Boolean(state.user), state.user ? "Signed in" : "Signed out"));

  if (state.user) {
    try {
      await getDoc(doc(db, "users", state.user.uid));
      checks.push(createCheck("Firestore profile read", true, "Successful"));
    } catch (error) {
      checks.push(createCheck("Firestore profile read", false, friendlyError(error)));
    }

    try {
      await getDocs(collection(db, "users", state.user.uid, "applications"));
      checks.push(createCheck("Tracker data read", true, "Successful"));
    } catch (error) {
      checks.push(createCheck("Tracker data read", false, friendlyError(error)));
    }
  }

  diagnosticsBox.replaceChildren(...checks);
  setButtonBusy(diagnosticsButton, false);
}

function createCheck(label, passed, detail) {
  const card = document.createElement("article");
  card.className = `diagnostic-check ${passed ? "passed" : "failed"}`;
  const title = document.createElement("strong");
  title.textContent = `${passed ? "Pass" : "Check"}: ${label}`;
  const text = document.createElement("p");
  text.className = "mini-note";
  text.textContent = detail;
  card.append(title, text);
  return card;
}

function clearLocalPreferences() {
  const confirmed = window.confirm(
    "Clear ApplyMate preferences stored only in this browser? Cloud profile, saved scholarships, and tracker data will not be deleted."
  );

  if (!confirmed) return;

  const keys = Object.keys(localStorage).filter((key) => key.startsWith("applymate"));
  keys.forEach((key) => localStorage.removeItem(key));

  diagnosticsBox.innerHTML = `<p class="quality-success">Cleared ${keys.length} local ApplyMate preference${keys.length === 1 ? "" : "s"}. Cloud data was not changed.</p>`;
}

function collectLocalPreferences() {
  return Object.fromEntries(
    Object.keys(localStorage)
      .filter((key) => key.startsWith("applymate"))
      .map((key) => [key, localStorage.getItem(key)])
  );
}

function testLocalStorage() {
  const key = "applymate-storage-test";
  try {
    localStorage.setItem(key, "ok");
    const passed = localStorage.getItem(key) === "ok";
    localStorage.removeItem(key);
    return passed;
  } catch {
    return false;
  }
}

function serializeValue(value) {
  if (value === null || value === undefined) return value;
  if (typeof value?.toDate === "function") return value.toDate().toISOString();
  if (Array.isArray(value)) return value.map(serializeValue);
  if (typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, serializeValue(item)]));
  }
  return value;
}

function friendlyError(error) {
  const code = String(error?.code || "");
  if (code.includes("permission-denied")) return "Permission denied. Check login and Firestore rules.";
  if (code.includes("unavailable")) return "Service temporarily unavailable or network interrupted.";
  return String(error?.message || "Unknown error").slice(0, 180);
}

function setButtonBusy(button, busy, text = "Working...") {
  if (!button) return;
  if (busy) {
    button.dataset.originalText = button.textContent;
    button.textContent = text;
    button.disabled = true;
  } else {
    button.textContent = button.dataset.originalText || button.textContent;
    button.disabled = false;
  }
}
