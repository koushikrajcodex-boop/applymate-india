import { db } from "./firebase-config.js";
import { daysLeft, getActiveScholarshipStats, isNewThisMonth } from "./live-count-utils.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const QUERY_TIMEOUT_MS = 8000;
const countBox = document.getElementById("activeScholarshipHomeCount");
const labelBox = document.getElementById("activeScholarshipHomeLabel");
const updatedBox = document.getElementById("activeScholarshipHomeUpdated");
const heroStatCards = [...document.querySelectorAll(".hero-stats > div")];
const main = document.querySelector("main");

upgradeHomeScholarshipLinks();

if (countBox || labelBox || updatedBox || heroStatCards.length || main) {
  loadCountAndHighlights();
}

async function loadCountAndHighlights() {
  try {
    const snapshot = await withTimeout(
      getDocs(collection(db, "scholarships")),
      QUERY_TIMEOUT_MS,
      "Firestore count query timed out"
    );
    const items = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
    const stats = getActiveScholarshipStats(items);

    setHeroStat(0, stats.activeCount > 0 ? `${stats.activeCount}+` : "0", stats.activeCount === 1 ? "Active scholarship" : "Active scholarships");
    setHeroStat(1, String(stats.closingSoonCount), "Closing this week");
    setHeroStat(2, String(stats.newThisMonthCount), "New this month");

    if (countBox) countBox.textContent = stats.activeCount > 0 ? `${stats.activeCount}+` : "0";
    if (labelBox) labelBox.textContent = stats.activeCount === 1 ? "Active scholarship" : "Active scholarships";
    if (updatedBox) updatedBox.textContent = `Live stats from Firestore • ${new Date().toLocaleString("en-IN")}`;

    addHighlightsSection(stats.active);
  } catch (error) {
    console.warn("Live scholarship count failed", error);
    setHeroStat(0, "Live", "Active scholarships");
    setHeroStat(1, "—", "Closing this week");
    setHeroStat(2, "—", "New this month");
    if (countBox) countBox.textContent = "Live";
    if (labelBox) labelBox.textContent = "Scholarship directory";
    if (updatedBox) updatedBox.textContent = "Live count is taking longer than expected. Open the scholarship directory for the latest verified list.";
  }
}

function addHighlightsSection(activeScholarships) {
  if (!main || !activeScholarships.length || document.getElementById("homeLiveHighlights")) return;

  const closingSoon = [...activeScholarships]
    .filter((item) => daysLeft(item.deadlineDate) >= 0 && daysLeft(item.deadlineDate) <= 14)
    .sort((a, b) => daysLeft(a.deadlineDate) - daysLeft(b.deadlineDate))
    .slice(0, 3);

  const newlyAdded = [...activeScholarships]
    .filter(isNewThisMonth)
    .sort((a, b) => dateRank(b) - dateRank(a))
    .slice(0, 3);

  const section = document.createElement("section");
  section.className = "content-strip";
  section.id = "homeLiveHighlights";
  section.innerHTML = `
    <span class="badge">Live Updates</span>
    <h2>Active scholarship highlights</h2>
    <p>Quickly check scholarships that are closing soon or newly verified in Firestore.</p>
    <div class="guide-list">
      ${makeHighlightColumn("Closing soon", closingSoon, "⏳")}
      ${makeHighlightColumn("New this month", newlyAdded, "🆕")}
      <a class="guide-card" href="scholarships.html#live-directory">
        <h2>Explore all active scholarships</h2>
        <p>Open the canonical verified directory with filters, official links, and last verified dates.</p>
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
      <a class="text-btn" href="scholarships.html#live-directory">View verified directory</a>
    </article>
  `;
}

function upgradeHomeScholarshipLinks() {
  document.querySelectorAll('a[href="scholarships-live.html"]').forEach((link) => {
    link.href = "scholarships.html#live-directory";
    if (link.textContent.trim() === "View Live Scholarships") link.textContent = "View Verified Scholarships";
    if (link.textContent.trim() === "Open Live Directory") link.textContent = "Open Verified Directory";
    if (link.textContent.trim() === "Explore Live Directory") link.textContent = "Explore Verified Directory";
  });
}

function withTimeout(promise, timeoutMs, message) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = window.setTimeout(() => reject(new Error(message)), timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => window.clearTimeout(timeoutId));
}

function setHeroStat(index, value, label) {
  const card = heroStatCards[index];
  if (!card) return;
  const strong = card.querySelector("strong");
  const span = card.querySelector("span");
  if (strong) strong.textContent = value;
  if (span) span.textContent = label;
}

function formatDaysLeft(deadlineDate) {
  const left = daysLeft(deadlineDate);
  if (!Number.isFinite(left)) return "Check official portal";
  if (left === 0) return "Last day";
  if (left === 1) return "1 day left";
  return `${left} days left`;
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
