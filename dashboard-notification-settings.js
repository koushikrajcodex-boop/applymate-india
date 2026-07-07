import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  doc,
  getDoc,
  serverTimestamp,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const DEFAULTS = {
  deadlineAlerts: true,
  savedScholarshipAlerts: true,
  trackerAlerts: true,
  profileReminders: true
};

let currentUser = null;
let panel = null;
let message = null;
let saveButton = null;
const inputs = {};

installStyles();

onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  if (!user) return;
  mountPanel();
  await loadPreferences();
});

function mountPanel() {
  if (document.getElementById("notificationSettingsPanel")) return;

  const main = document.querySelector("main");
  const notificationPanel = document.getElementById("notificationPanel");
  if (!main) return;

  panel = document.createElement("section");
  panel.id = "notificationSettingsPanel";
  panel.className = "content-card notification-settings-panel";

  const heading = document.createElement("div");
  heading.className = "card-heading";

  const copy = document.createElement("div");
  const title = document.createElement("h2");
  title.textContent = "Notification Preferences";

  const description = document.createElement("p");
  description.className = "mini-note";
  description.textContent = "Choose which dashboard alerts you want. These settings are saved to your account.";

  copy.append(title, description);
  heading.appendChild(copy);

  const options = document.createElement("div");
  options.className = "notification-settings-grid";

  [
    ["deadlineAlerts", "Deadline alerts", "Closing-soon and expired scholarship notices."],
    ["savedScholarshipAlerts", "Saved scholarship alerts", "Reminders for scholarships you bookmarked."],
    ["trackerAlerts", "Application tracker alerts", "Updates for Not Applied, Approved, and other tracker states."],
    ["profileReminders", "Profile reminders", "Prompts when profile details are incomplete."]
  ].forEach(([key, label, help]) => {
    const item = document.createElement("label");
    item.className = "notification-setting-item";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = `pref-${key}`;
    checkbox.checked = DEFAULTS[key];
    inputs[key] = checkbox;

    const text = document.createElement("span");
    const strong = document.createElement("strong");
    strong.textContent = label;
    const small = document.createElement("small");
    small.textContent = help;
    text.append(strong, small);

    item.append(checkbox, text);
    options.appendChild(item);
  });

  saveButton = document.createElement("button");
  saveButton.type = "button";
  saveButton.textContent = "Save Preferences";
  saveButton.addEventListener("click", savePreferences);

  message = document.createElement("p");
  message.className = "mini-note";
  message.setAttribute("role", "status");

  panel.append(heading, options, saveButton, message);

  if (notificationPanel?.parentNode) {
    notificationPanel.parentNode.insertBefore(panel, notificationPanel.nextSibling);
  } else {
    main.prepend(panel);
  }
}

async function loadPreferences() {
  if (!currentUser) return;

  try {
    const snapshot = await getDoc(doc(db, "users", currentUser.uid));
    const stored = snapshot.exists() ? snapshot.data().notificationPreferences || {} : {};
    const preferences = { ...DEFAULTS, ...stored };

    Object.entries(inputs).forEach(([key, input]) => {
      input.checked = preferences[key] !== false;
    });

    message.textContent = "Preferences loaded.";
  } catch (error) {
    console.error("Notification preference load error:", error);
    message.textContent = "Using default notification preferences.";
  }
}

async function savePreferences() {
  if (!currentUser) return;

  const notificationPreferences = Object.fromEntries(
    Object.entries(inputs).map(([key, input]) => [key, input.checked])
  );

  setBusy(true);
  message.textContent = "Saving preferences...";

  try {
    await updateDoc(doc(db, "users", currentUser.uid), {
      notificationPreferences,
      updatedAt: serverTimestamp()
    });

    window.dispatchEvent(new CustomEvent("applymate-notification-preferences", {
      detail: notificationPreferences
    }));

    message.textContent = "Notification preferences saved successfully.";
  } catch (error) {
    console.error("Notification preference save error:", error);
    message.textContent = "Could not save notification preferences.";
  } finally {
    setBusy(false);
  }
}

function setBusy(busy) {
  if (!saveButton) return;
  saveButton.disabled = busy;
  saveButton.textContent = busy ? "Saving..." : "Save Preferences";
}

function installStyles() {
  if (document.getElementById("notificationSettingsStyles")) return;

  const style = document.createElement("style");
  style.id = "notificationSettingsStyles";
  style.textContent = `
    .notification-settings-panel { border: 1px solid #d6bbfb; }
    .notification-settings-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin: 16px 0; }
    .notification-setting-item { display: flex; gap: 12px; align-items: flex-start; padding: 14px; border: 1px solid var(--border); border-radius: 14px; background: #fff; cursor: pointer; }
    .notification-setting-item input { margin-top: 4px; width: 18px; height: 18px; }
    .notification-setting-item span { display: grid; gap: 4px; }
    .notification-setting-item small { color: var(--muted); line-height: 1.45; }
    @media (max-width: 700px) { .notification-settings-grid { grid-template-columns: 1fr; } }
  `;
  document.head.appendChild(style);
}
