import "./dashboard-notification-settings.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  collection,
  getDocs,
  getFirestore,
  orderBy,
  query
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const auth = getAuth();
const db = getFirestore();
const STORAGE_KEY = "applymate-deadline-window";

let currentUser = null;
let records = [];
let panel;
let list;
let summary;
let windowSelect;
let refreshButton;

installStyles();

onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  if (!user) return;
  mountPanel();
  await refreshCalendarData();
});

function mountPanel() {
  if (document.getElementById("calendarReminderPanel")) return;

  const deadlinePanel = document.getElementById("deadlineIntelligencePanel");
  const main = document.querySelector("main");
  if (!main) return;

  panel = document.createElement("section");
  panel.id = "calendarReminderPanel";
  panel.className = "content-card calendar-reminder-panel";

  const heading = document.createElement("div");
  heading.className = "card-heading";

  const copy = document.createElement("div");
  const tag = document.createElement("span");
  tag.className = "tagline";
  tag.textContent = "Calendar Reminders";

  const title = document.createElement("h2");
  title.textContent = "Never miss a scholarship deadline";

  const description = document.createElement("p");
  description.className = "mini-note";
  description.textContent = "Choose your reminder window and add saved deadlines directly to Google Calendar.";

  copy.append(tag, title, description);

  const controls = document.createElement("div");
  controls.className = "button-row calendar-reminder-controls";

  windowSelect = document.createElement("select");
  windowSelect.setAttribute("aria-label", "Reminder window");
  [7, 15, 30].forEach((days) => {
    const option = document.createElement("option");
    option.value = String(days);
    option.textContent = `${days}-day window`;
    windowSelect.appendChild(option);
  });
  windowSelect.value = localStorage.getItem(STORAGE_KEY) || "15";
  windowSelect.addEventListener("change", () => {
    localStorage.setItem(STORAGE_KEY, windowSelect.value);
    renderRecords();
  });

  refreshButton = document.createElement("button");
  refreshButton.type = "button";
  refreshButton.className = "secondary-btn";
  refreshButton.textContent = "Refresh";
  refreshButton.addEventListener("click", refreshCalendarData);

  controls.append(windowSelect, refreshButton);
  heading.append(copy, controls);

  summary = document.createElement("p");
  summary.className = "mini-note";

  list = document.createElement("div");
  list.className = "calendar-reminder-list";

  panel.append(heading, summary, list);

  if (deadlinePanel?.parentNode) {
    deadlinePanel.parentNode.insertBefore(panel, deadlinePanel.nextSibling);
  } else {
    main.prepend(panel);
  }
}

async function refreshCalendarData() {
  if (!currentUser || !list) return;
  setBusy(refreshButton, true, "Refreshing...");
  list.innerHTML = "<p class='mini-note'>Loading saved deadlines...</p>";

  try {
    const savedQuery = query(
      collection(db, "users", currentUser.uid, "savedScholarships"),
      orderBy("createdAt", "desc")
    );
    const snapshot = await getDocs(savedQuery);
    records = snapshot.docs
      .map((item) => ({ id: item.id, ...item.data() }))
      .filter((item) => isIsoDate(item.deadlineDate))
      .sort((a, b) => String(a.deadlineDate).localeCompare(String(b.deadlineDate)));
    renderRecords();
  } catch (error) {
    console.error("Calendar reminder load error:", error);
    records = [];
    list.innerHTML = "<p class='mini-note'>Could not load saved deadline records.</p>";
  } finally {
    setBusy(refreshButton, false);
  }
}

function renderRecords() {
  if (!list) return;
  list.replaceChildren();

  const reminderWindow = Number(windowSelect?.value || 15);
  const future = records.filter((record) => getDaysLeft(record.deadlineDate) >= 0);
  const upcoming = future.filter((record) => getDaysLeft(record.deadlineDate) <= reminderWindow);

  summary.textContent = `${future.length} future saved deadlines. ${upcoming.length} fall inside your ${reminderWindow}-day reminder window.`;

  if (records.length === 0) {
    list.innerHTML = "<p class='mini-note'>Save scholarships with valid deadline dates to enable calendar reminders.</p>";
    return;
  }

  records.slice(0, 12).forEach((record) => list.appendChild(createRecordCard(record, reminderWindow)));
}

function createRecordCard(record, reminderWindow) {
  const daysLeft = getDaysLeft(record.deadlineDate);
  const card = document.createElement("article");
  card.className = `calendar-reminder-card ${getCardClass(daysLeft, reminderWindow)}`;

  const content = document.createElement("div");
  const title = document.createElement("h3");
  title.textContent = record.name || "Untitled scholarship";

  const meta = document.createElement("p");
  meta.className = "mini-note";
  meta.textContent = getDeadlineLabel(daysLeft, record.deadlineDate);
  content.append(title, meta);

  const actions = document.createElement("div");
  actions.className = "button-row";

  if (daysLeft >= 0) {
    const calendarLink = document.createElement("a");
    calendarLink.className = "text-btn";
    calendarLink.href = buildGoogleCalendarUrl(record);
    calendarLink.target = "_blank";
    calendarLink.rel = "noopener noreferrer";
    calendarLink.textContent = "Add to Google Calendar";
    actions.appendChild(calendarLink);
  }

  const officialLink = normalizeHttpUrl(record.link);
  if (officialLink) {
    const link = document.createElement("a");
    link.className = "text-btn";
    link.href = officialLink;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "Official Link";
    actions.appendChild(link);
  }

  card.append(content, actions);
  return card;
}

function buildGoogleCalendarUrl(record) {
  const start = String(record.deadlineDate).replaceAll("-", "");
  const end = addDays(record.deadlineDate, 1).replaceAll("-", "");
  const details = [
    "Scholarship deadline reminder from ApplyMate India.",
    record.deadline ? `Deadline note: ${record.deadline}` : "",
    record.link ? `Official link: ${record.link}` : "",
    "Always verify the official portal before applying."
  ].filter(Boolean).join("\n\n");

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `Scholarship deadline: ${record.name || "Scholarship"}`,
    dates: `${start}/${end}`,
    details
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function addDays(dateString, days) {
  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getDaysLeft(deadlineDate) {
  const deadline = new Date(`${deadlineDate}T23:59:59`);
  if (Number.isNaN(deadline.getTime())) return Infinity;
  return Math.ceil((deadline.getTime() - Date.now()) / 86400000);
}

function getDeadlineLabel(daysLeft, deadlineDate) {
  if (daysLeft < 0) return `Deadline ${deadlineDate} may have passed.`;
  if (daysLeft === 0) return `Deadline is today: ${deadlineDate}.`;
  if (daysLeft === 1) return `1 day left. Deadline: ${deadlineDate}.`;
  return `${daysLeft} days left. Deadline: ${deadlineDate}.`;
}

function getCardClass(daysLeft, reminderWindow) {
  if (daysLeft < 0) return "expired";
  if (daysLeft <= 3) return "critical";
  if (daysLeft <= reminderWindow) return "inside-window";
  return "future";
}

function isIsoDate(value) {
  return /^20\d{2}-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/.test(String(value || ""));
}

function normalizeHttpUrl(value) {
  try {
    const url = new URL(String(value || ""));
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

function setBusy(button, busy, text) {
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

function installStyles() {
  if (document.getElementById("calendarReminderStyles")) return;
  const style = document.createElement("style");
  style.id = "calendarReminderStyles";
  style.textContent = `
    .calendar-reminder-panel { border: 1px solid #b2ddff; }
    .calendar-reminder-controls { align-items: center; }
    .calendar-reminder-list { display: grid; gap: 12px; margin-top: 14px; }
    .calendar-reminder-card { display: flex; justify-content: space-between; gap: 16px; align-items: center; padding: 15px; border: 1px solid var(--border); border-radius: 16px; background: #fff; }
    .calendar-reminder-card h3 { margin: 0 0 6px; }
    .calendar-reminder-card.critical { border-left: 5px solid #d92d20; }
    .calendar-reminder-card.inside-window { border-left: 5px solid #f79009; }
    .calendar-reminder-card.future { border-left: 5px solid #2e90fa; }
    .calendar-reminder-card.expired { border-left: 5px solid #667085; opacity: .8; }
    @media (max-width: 700px) {
      .calendar-reminder-card { align-items: flex-start; flex-direction: column; }
      .calendar-reminder-controls { width: 100%; }
      .calendar-reminder-controls select,
      .calendar-reminder-controls button { width: 100%; }
    }
  `;
  document.head.appendChild(style);
}
