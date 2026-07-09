import "./home-polish.js?v=1";
import { db } from "./firebase-config.js";
import { getActiveScholarshipStats } from "./live-count-utils.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const countBox = document.getElementById("activeScholarshipHomeCount");
const labelBox = document.getElementById("activeScholarshipHomeLabel");
const updatedBox = document.getElementById("activeScholarshipHomeUpdated");
const heroStatCards = [...document.querySelectorAll(".hero-stats > div")];

upgradeHomeScholarshipLinks();

if (countBox || labelBox || updatedBox || heroStatCards.length) {
  loadCount();
}

async function loadCount() {
  try {
    const snapshot = await getDocs(collection(db, "scholarships"));
    const items = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
    const stats = getActiveScholarshipStats(items);

    setHeroStat(0, stats.activeCount > 0 ? `${stats.activeCount}+` : "0", stats.activeCount === 1 ? "Active scholarship" : "Active scholarships");
    setHeroStat(1, String(stats.closingSoonCount), "Closing this week");
    setHeroStat(2, String(stats.newThisMonthCount), "New this month");

    if (countBox) countBox.textContent = stats.activeCount > 0 ? `${stats.activeCount}+` : "0";
    if (labelBox) labelBox.textContent = stats.activeCount === 1 ? "Active scholarship" : "Active scholarships";
    if (updatedBox) updatedBox.textContent = `Live stats from Firestore • ${new Date().toLocaleString("en-IN")}`;
  } catch (error) {
    console.warn("Live scholarship count failed", error);
    setHeroStat(0, "Live", "Active scholarships");
    setHeroStat(1, "—", "Closing this week");
    setHeroStat(2, "—", "New this month");
    if (updatedBox) updatedBox.textContent = "Open the scholarship hub for the latest active list.";
  }
}

function upgradeHomeScholarshipLinks() {
  document.querySelectorAll('a[href="scholarships.html"], a[href="scholarships-live.html"]').forEach((link) => {
    if (link.textContent.toLowerCase().includes("scholarship") || link.textContent.toLowerCase().includes("directory")) {
      link.href = "scholarship-hub.html";
      if (link.textContent.trim() === "View Scholarships") link.textContent = "Open Scholarship Hub";
      if (link.textContent.trim() === "View Live Scholarships") link.textContent = "Open Scholarship Hub";
      if (link.textContent.trim() === "Open Scholarship Directory") link.textContent = "Open Scholarship Hub";
      if (link.textContent.trim() === "Open Live Directory") link.textContent = "Open Scholarship Hub";
      if (link.textContent.trim() === "Explore Scholarship Directory") link.textContent = "Explore Scholarship Hub";
      if (link.textContent.trim() === "Explore Live Directory") link.textContent = "Explore Scholarship Hub";
    }
  });
}

function setHeroStat(index, value, label) {
  const card = heroStatCards[index];
  if (!card) return;
  const strong = card.querySelector("strong");
  const span = card.querySelector("span");
  if (strong) strong.textContent = value;
  if (span) span.textContent = label;
}
