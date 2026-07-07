import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  collection,
  getDocs,
  getFirestore,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const auth = getAuth();
const db = getFirestore();

const SOON_DAYS = 15;
let panel;
let list;
let summary;
let refreshButton;
let currentUser;

installDeadlineStyles();

onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  if (!user) return;

  mountDeadlinePanel();
  await refreshDeadlineIntelligence();
});

function mountDeadlinePanel() {
  if (document.getElementById("deadlineIntelligencePanel")) return;

  const main = document.querySelector("main");
  if (!main) return;

  panel = document.createElement("section");
  panel.id = "deadlineIntelligencePanel";
  panel.className = "content-card deadline-intelligence-panel";

  const heading = document.createElement("div");
  heading.className = "card-heading";

  const copy = document.createElement("div");
  const tag = document.createElement("span");
  tag.className = "tagline";
  tag.textContent = "Deadline Intelligence";

  const title = document.createElement("h2");
  title.textContent = "What needs your attention now";

  const description = document.createElement("p");
  description.className = "mini-note";
  description.textContent = "Prioritizes saved scholarships and verified open scholarships by deadline urgency.";

  copy.append(tag, title, description);

  refreshButton = document.createElement("button");
  refreshButton.type = "button";
  refreshButton.className = "secondary-btn";
  refreshButton.textContent = "Refresh Deadlines";
  refreshButton.addEventListener("click", refreshDeadlineIntelligence);

  heading.append(copy, refreshButton);

  summary = document.createElement("p");
  summary.className = "mini-note";

  list = document.createElement("div");
  list.className = "deadline-intelligence-list";

  panel.append(heading, summary, list);

  const anchor = document.getElementById("recommendationSummary")?.closest("section") || main.firstElementChild;
  if (anchor?.parentNode) {
    anchor.parentNode.insertBefore(panel, anchor);
  } else {
    main.prepend(panel);
  }
}

async function refreshDeadlineIntelligence() {
  if (!currentUser || !list) return;

  setBusy(refreshButton, true, "Refreshing...");
  list.innerHTML = "<p class='mini-note'>Checking deadline priorities...</p>";

  try {
    const [saved, published] = await Promise.all([
      fetchSavedScholarships(),
      fetchPublishedScholarships()
    ]);

    const items = buildDeadlineItems(saved, published);
    renderDeadlineItems(items, saved.length, published.length);
  } catch (error) {
    console.error("Deadline intelligence error:", error);
    list.innerHTML = "<p class='mini-note'>Could not load deadline intelligence right now.</p>";
  } finally {
    setBusy(refreshButton, false);
  }
}

async function fetchSavedScholarships() {
  const savedQuery = query(
    collection(db, "users", currentUser.uid, "savedScholarships"),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(savedQuery);
  return snapshot.docs.map((item) => ({
    id: item.id,
    sourceBucket: "saved",
    ...item.data()
  }));
}

async function fetchPublishedScholarships() {
  const snapshot = await getDocs(collection(db, "scholarships"));
  return snapshot.docs
    .map((item) => ({
      id: item.id,
      sourceBucket: "published",
      ...item.data()
    }))
    .filter((item) => item.status === "active" && item.applicationWindow === "open");
}

function buildDeadlineItems(saved, published) {
  const byName = new Map();

  [...saved, ...published].forEach((item) => {
    const key = normalizeText(item.name);
    if (!key) return;

    const enriched = {
      ...item,
      daysLeft: getDaysLeft(item.deadlineDate),
      priority: getPriority(item)
    };

    const existing = byName.get(key);
    if (!existing || enriched.priority > existing.priority || enriched.daysLeft < existing.daysLeft) {
      byName.set(key, enriched);
    }
  });

  return [...byName.values()]
    .filter((item) => Number.isFinite(item.daysLeft) && item.daysLeft <= 45)
    .sort((a, b) => {
      if (a.daysLeft !== b.daysLeft) return a.daysLeft - b.daysLeft;
      return b.priority - a.priority;
    })
    .slice(0, 8);
}

function renderDeadlineItems(items, savedCount, publishedCount) {
  list.replaceChildren();

  const urgentCount = items.filter((item) => item.daysLeft >= 0 && item.daysLeft <= SOON_DAYS).length;
  const expiredCount = items.filter((item) => item.daysLeft < 0).length;

  summary.textContent = `${savedCount} saved scholarships and ${publishedCount} verified open scholarships checked. ${urgentCount} urgent, ${expiredCount} expired/needs verification.`;

  if (items.length === 0) {
    list.innerHTML = "<p class='mini-note'>No urgent deadlines found in the next 45 days. Keep checking official portals regularly.</p>";
    return;
  }

  items.forEach((item) => list.appendChild(createDeadlineCard(item)));
}

function createDeadlineCard(item) {
  const card = document.createElement("article");
  card.className = `deadline-intelligence-card ${getUrgencyClass(item.daysLeft)}`;

  const title = document.createElement("h3");
  title.textContent = item.name || "Untitled scholarship";

  const meta = document.createElement("p");
  meta.className = "mini-note";
  meta.textContent = getUrgencyText(item.daysLeft, item.deadlineDate);

  const source = document.createElement("p");
  source.className = "mini-note";
  source.textContent = item.sourceBucket === "saved"
    ? "Source: Saved by you"
    : `Source: ${item.sourceName || "Verified scholarship list"}`;

  const actions = document.createElement("div");
  actions.className = "button-row";

  const link = normalizeHttpUrl(item.link);
  if (link) {
    const official = document.createElement("a");
    official.className = "text-btn";
    official.href = link;
    official.target = "_blank";
    official.rel = "noopener noreferrer";
    official.textContent = "Open Official Link";
    actions.appendChild(official);
  }

  card.append(title, meta, source, actions);
  return card;
}

function getDaysLeft(deadlineDate) {
  if (!deadlineDate) return Infinity;
  const deadline = new Date(`${deadlineDate}T23:59:59`);
  if (Number.isNaN(deadline.getTime())) return Infinity;
  return Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function getPriority(item) {
  let score = 0;
  if (item.sourceBucket === "saved") score += 50;
  if (item.status === "active") score += 20;
  if (item.applicationWindow === "open") score += 20;
  if (item.verifiedOn) score += 10;
  return score;
}

function getUrgencyClass(daysLeft) {
  if (daysLeft < 0) return "expired";
  if (daysLeft <= 3) return "critical";
  if (daysLeft <= SOON_DAYS) return "soon";
  return "upcoming";
}

function getUrgencyText(daysLeft, deadlineDate) {
  if (daysLeft < 0) return `Deadline ${deadlineDate} may have passed. Verify before applying.`;
  if (daysLeft === 0) return `Deadline is today (${deadlineDate}). Act immediately if official portal confirms it.`;
  if (daysLeft === 1) return `1 day left. Official deadline: ${deadlineDate}.`;
  if (daysLeft <= SOON_DAYS) return `${daysLeft} days left. Official deadline: ${deadlineDate}.`;
  return `${daysLeft} days left. Official deadline: ${deadlineDate}.`;
}

function normalizeHttpUrl(value) {
  const text = String(value || "").trim();
  if (!text) return "";

  try {
    const url = new URL(text);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function setBusy(button, busy, label = "Working...") {
  if (!button) return;
  if (busy) {
    button.dataset.originalText = button.textContent;
    button.textContent = label;
    button.disabled = true;
    return;
  }
  button.textContent = button.dataset.originalText || button.textContent;
  button.disabled = false;
}

function installDeadlineStyles() {
  if (document.getElementById("deadlineIntelligenceStyles")) return;

  const style = document.createElement("style");
  style.id = "deadlineIntelligenceStyles";
  style.textContent = `
    .deadline-intelligence-panel { border: 1px solid #fedf89; }
    .deadline-intelligence-list { display: grid; gap: 14px; margin-top: 14px; }
    .deadline-intelligence-card { padding: 16px; border: 1px solid var(--border); border-radius: 16px; background: #fff; }
    .deadline-intelligence-card h3 { margin-top: 0; }
    .deadline-intelligence-card.critical { border-left: 5px solid #d92d20; }
    .deadline-intelligence-card.soon { border-left: 5px solid #f79009; }
    .deadline-intelligence-card.upcoming { border-left: 5px solid #2e90fa; }
    .deadline-intelligence-card.expired { border-left: 5px solid #667085; opacity: .88; }
  `;
  document.head.appendChild(style);
}
