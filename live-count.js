import { db } from "./firebase-config.js";
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
    const active = snapshot.docs
      .map((item) => ({ id: item.id, ...item.data() }))
      .filter((item) => item.status === "active")
      .filter((item) => item.applicationWindow !== "closed")
      .filter((item) => !isExpired(item.deadlineDate));

    const closingSoon = active.filter((item) => daysLeft(item.deadlineDate) >= 0 && daysLeft(item.deadlineDate) <= 7);
    const newThisMonth = active.filter(isNewThisMonth);

    setHeroStat(0, active.length > 0 ? `${active.length}+` : "0", active.length === 1 ? "Active scholarship" : "Active scholarships");
    setHeroStat(1, String(closingSoon.length), "Closing this week");
    setHeroStat(2, String(newThisMonth.length), "New this month");

    if (countBox) countBox.textContent = active.length > 0 ? `${active.length}+` : "0";
    if (labelBox) labelBox.textContent = active.length === 1 ? "Active scholarship" : "Active scholarships";
    if (updatedBox) updatedBox.textContent = `Live stats from Firestore • ${new Date().toLocaleString("en-IN")}`;
  } catch (error) {
    console.warn("Live scholarship count failed", error);
    setHeroStat(0, "Live", "Active scholarships");
    setHeroStat(1, "—", "Closing this week");
    setHeroStat(2, "—", "New this month");
    if (updatedBox) updatedBox.textContent = "Open the scholarship directory for the latest active list.";
  }
}

function upgradeHomeScholarshipLinks() {
  document.querySelectorAll('a[href="scholarships.html"]').forEach((link) => {
    if (link.textContent.toLowerCase().includes("scholarship")) {
      link.href = "scholarships-live.html";
      if (link.textContent.trim() === "View Scholarships") link.textContent = "View Live Scholarships";
      if (link.textContent.trim() === "Open Scholarship Directory") link.textContent = "Open Live Directory";
      if (link.textContent.trim() === "Explore Scholarship Directory") link.textContent = "Explore Live Directory";
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

function isExpired(deadlineDate) {
  if (!deadlineDate) return false;
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

function isNewThisMonth(item) {
  const dateText = item.createdAt?.toDate ? item.createdAt.toDate().toISOString().slice(0, 10) : item.verifiedOn || item.lastChecked || "";
  if (!dateText) return false;
  const date = new Date(`${dateText}T00:00:00`);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}
