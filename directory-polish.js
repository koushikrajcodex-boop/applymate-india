import { db } from "./firebase-config.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const listBox = document.getElementById("liveScholarshipList");
const toolbar = document.querySelector(".directory-toolbar");
const countBox = document.getElementById("liveScholarshipCount");

if (listBox && toolbar) {
  initDirectoryPolish();
}

async function initDirectoryPolish() {
  addSortControl();
  addStatsStrip();
  try {
    const snapshot = await getDocs(collection(db, "scholarships"));
    const items = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((item) => item.status === "active")
      .filter((item) => item.applicationWindow !== "closed")
      .filter((item) => !isExpired(item.deadlineDate));
    updateStats(items);
    paintCards();
  } catch (error) {
    console.warn("Directory polish failed", error);
  }

  const observer = new MutationObserver(() => paintCards());
  observer.observe(listBox, { childList: true, subtree: true });
}

function addSortControl() {
  if (document.getElementById("liveScholarshipSort")) return;
  const field = document.createElement("div");
  field.className = "field";
  field.innerHTML = `
    <label for="liveScholarshipSort">Sort</label>
    <select id="liveScholarshipSort">
      <option value="priority">Recommended</option>
      <option value="deadline">Deadline soon</option>
      <option value="new">Newly added</option>
      <option value="verified">Recently verified</option>
      <option value="amount">Highest amount</option>
    </select>
  `;
  toolbar.appendChild(field);
  field.querySelector("select").addEventListener("change", sortVisibleCards);
}

function addStatsStrip() {
  if (document.getElementById("directorySmartStats")) return;
  const stats = document.createElement("div");
  stats.id = "directorySmartStats";
  stats.className = "directory-status";
  stats.innerHTML = `
    <span class="directory-count-pill" id="smartActiveCount">Active: loading</span>
    <span class="directory-count-pill" id="smartClosingCount">Closing this week: loading</span>
    <span class="directory-count-pill" id="smartNewCount">New this month: loading</span>
    <span class="directory-count-pill" id="smartVerifiedCount">Verified: loading</span>
  `;
  const statusRow = document.querySelector(".directory-status");
  statusRow?.after(stats);
}

function updateStats(items) {
  setText("smartActiveCount", `Active: ${items.length}`);
  setText("smartClosingCount", `Closing this week: ${items.filter((item) => daysLeft(item.deadlineDate) >= 0 && daysLeft(item.deadlineDate) <= 7).length}`);
  setText("smartNewCount", `New this month: ${items.filter(isNewThisMonth).length}`);
  setText("smartVerifiedCount", `Verified: ${items.filter((item) => item.verifiedOn || item.lastChecked).length}`);
}

function paintCards() {
  const cards = [...listBox.querySelectorAll(".live-scholarship-card")];
  cards.forEach((card) => {
    if (card.dataset.polished === "yes") return;
    card.dataset.polished = "yes";
    const text = card.textContent || "";
    const deadline = findDate(text);
    const left = daysLeft(deadline);
    const badges = card.querySelector(".live-card-badges") || card;
    addBadge(badges, "✔ Verified");
    if (left >= 0 && left <= 30) addBadge(badges, "🆕 New / Priority");
    if (Number.isFinite(left)) addBadge(badges, left < 0 ? "Expired" : left === 0 ? "⏰ Last day" : `⏳ ${left} days left`);
    card.dataset.deadlineRank = Number.isFinite(left) ? String(left) : "99999";
    card.dataset.amountRank = String(extractMoney(text));
    card.dataset.verifiedRank = String(Date.now());
  });
  sortVisibleCards();
}

function sortVisibleCards() {
  const select = document.getElementById("liveScholarshipSort");
  if (!select || !listBox) return;
  const mode = select.value;
  const cards = [...listBox.querySelectorAll(".live-scholarship-card")];
  cards.sort((a, b) => {
    if (mode === "deadline") return Number(a.dataset.deadlineRank || 99999) - Number(b.dataset.deadlineRank || 99999);
    if (mode === "amount") return Number(b.dataset.amountRank || 0) - Number(a.dataset.amountRank || 0);
    if (mode === "new" || mode === "verified") return Number(b.dataset.verifiedRank || 0) - Number(a.dataset.verifiedRank || 0);
    return 0;
  });
  cards.forEach((card) => listBox.appendChild(card));
  if (countBox && cards.length) countBox.textContent = countBox.textContent.replace("scholarships", "active scholarships");
}

function addBadge(container, text) {
  if ([...container.querySelectorAll(".badge")].some((badge) => badge.textContent === text)) return;
  const badge = document.createElement("span");
  badge.className = "badge";
  badge.textContent = text;
  container.appendChild(badge);
}

function setText(id, value) {
  const node = document.getElementById(id);
  if (node) node.textContent = value;
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

function findDate(text) {
  const match = String(text || "").match(/20[0-9]{2}-[0-9]{2}-[0-9]{2}/);
  return match ? match[0] : "";
}

function extractMoney(text) {
  const numbers = String(text || "").match(/[0-9][0-9,]{2,}/g) || [];
  return numbers.map((number) => Number(number.replace(/,/g, ""))).sort((a, b) => b - a)[0] || 0;
}

function isNewThisMonth(item) {
  const dateText = item.createdAt?.toDate ? item.createdAt.toDate().toISOString().slice(0, 10) : item.verifiedOn || item.lastChecked || "";
  if (!dateText) return false;
  const date = new Date(`${dateText}T00:00:00`);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}
