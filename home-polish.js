import { db } from "./firebase-config.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const main = document.querySelector("main");

if (main) {
  initHomePolish();
}

async function initHomePolish() {
  try {
    const snapshot = await getDocs(collection(db, "scholarships"));
    const scholarships = snapshot.docs
      .map((item) => ({ id: item.id, ...item.data() }))
      .filter((item) => item.status === "active")
      .filter((item) => item.applicationWindow !== "closed")
      .filter((item) => !isExpired(item.deadlineDate));

    if (!scholarships.length) return;

    const closingSoon = scholarships
      .filter((item) => daysLeft(item.deadlineDate) >= 0 && daysLeft(item.deadlineDate) <= 14)
      .sort((a, b) => daysLeft(a.deadlineDate) - daysLeft(b.deadlineDate))
      .slice(0, 3);

    const newlyAdded = scholarships
      .filter(isNewThisMonth)
      .sort((a, b) => dateRank(b) - dateRank(a))
      .slice(0, 3);

    addHighlightsSection(closingSoon, newlyAdded);
  } catch (error) {
    console.warn("Home polish failed", error);
  }
}

function addHighlightsSection(closingSoon, newlyAdded) {
  if (document.getElementById("homeLiveHighlights")) return;

  const section = document.createElement("section");
  section.className = "content-strip";
  section.id = "homeLiveHighlights";

  section.innerHTML = `
    <span class="badge">Live Updates</span>
    <h2>Active scholarship highlights</h2>
    <p>Quickly check scholarships that are closing soon or newly verified in the database.</p>
    <div class="guide-list">
      ${makeHighlightColumn("Closing soon", closingSoon, "⏳")}
      ${makeHighlightColumn("New this month", newlyAdded, "🆕")}
      <a class="guide-card" href="scholarships-live.html">
        <h2>Explore all active scholarships</h2>
        <p>Open the enhanced live directory with filters, countdowns, verified badges, and sorting.</p>
      </a>
    </div>
  `;

  const finder = document.getElementById("finder");
  if (finder) finder.before(section);
  else main.prepend(section);
}

function makeHighlightColumn(title, items, icon) {
  const rows = items.length
    ? items.map((item) => `<li><strong>${escapeHtml(item.name)}</strong><br><span>${icon} ${formatDaysLeft(item.deadlineDate)} • ${escapeHtml(item.sourceName || "Official source")}</span></li>`).join("")
    : "<li>No urgent records right now.</li>";

  return `
    <article class="guide-card">
      <h2>${escapeHtml(title)}</h2>
      <ul>${rows}</ul>
      <a class="text-btn" href="scholarships-live.html">View live directory</a>
    </article>
  `;
}

function isExpired(deadlineDate) {
  const left = daysLeft(deadlineDate);
  return Number.isFinite(left) && left < 0;
}

function daysLeft(deadlineDate) {
  if (!deadlineDate) return Infinity;
  const date = new Date(`${deadlineDate}T23:59:59`);
  if (Number.isNaN(date.getTime())) return Infinity;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((date.getTime() - today.getTime()) / 86400000);
}

function formatDaysLeft(deadlineDate) {
  const left = daysLeft(deadlineDate);
  if (!Number.isFinite(left)) return "Check official portal";
  if (left === 0) return "Last day";
  if (left === 1) return "1 day left";
  return `${left} days left`;
}

function isNewThisMonth(item) {
  const rank = dateRank(item);
  if (!rank) return false;
  const date = new Date(rank);
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}

function dateRank(item) {
  if (item.createdAt?.toDate) return item.createdAt.toDate().getTime();
  const text = item.verifiedOn || item.lastChecked || "";
  if (!text) return 0;
  const date = new Date(`${text}T00:00:00`);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
