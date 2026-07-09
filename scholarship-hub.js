import "./state-dropdowns.js";
import { db } from "./firebase-config.js";
import { getStateLabel } from "./states.js";
import { getLastVerifiedText, getOfficialSourceUrl, isVerifiedActiveScholarship } from "./scholarship-verification.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const $ = (id) => document.getElementById(id);
const controls = ["hubSearch", "hubState", "hubEducation", "hubCategory", "hubSort"].map($);
let scholarships = [];
let selected = [];

controls.forEach((control) => {
  control.addEventListener("input", render);
  control.addEventListener("change", render);
});

$("hubReset").addEventListener("click", () => {
  controls.forEach((control) => (control.value = ""));
  $("hubSort").value = "deadline";
  render();
});

$("hubCompareBtn").addEventListener("click", showComparison);
loadScholarships();

async function loadScholarships() {
  try {
    const snapshot = await getDocs(collection(db, "scholarships"));
    scholarships = snapshot.docs
      .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
      .filter(isVerifiedActiveScholarship);
    updateStats();
    renderFeatured();
    render();
  } catch (error) {
    console.warn("Scholarship hub load failed", error);
    $("hubCount").textContent = "Could not load active scholarships. Try again later.";
  }
}

function updateStats() {
  $("statActive").textContent = scholarships.length;
  $("statWeek").textContent = scholarships.filter((item) => daysLeft(item.deadlineDate) <= 7).length;
  $("statNew").textContent = scholarships.filter(isNew).length;
  $("statVerified").textContent = scholarships.length;
}

function renderFeatured() {
  const soon = [...scholarships].sort((a, b) => daysLeft(a.deadlineDate) - daysLeft(b.deadlineDate))[0];
  const high = [...scholarships].sort((a, b) => money(b.amount) - money(a.amount))[0];
  const fresh = [...scholarships].sort((a, b) => dateRank(b) - dateRank(a))[0];
  $("featured").innerHTML = [smallCard("Deadline soon", soon), smallCard("High value", high), smallCard("Newly verified", fresh)].join("");
}

function render() {
  const search = clean($("hubSearch").value);
  const state = $("hubState").value;
  const education = $("hubEducation").value;
  const category = $("hubCategory").value;
  const sort = $("hubSort").value;

  let visible = scholarships.filter((item) => {
    const edu = toArray(item.education);
    const cats = toArray(item.categories);
    const text = clean([item.name, item.sourceName, item.amount, item.deadline, item.eligibilityNote, item.incomeNote, edu.join(" "), cats.join(" ")].join(" "));
    return (!search || text.includes(search)) && (!state || item.state === state) && (!education || edu.includes(education)) && (!category || cats.includes(category) || (category === "girls" && item.gender === "female"));
  });

  visible.sort((a, b) => {
    if (sort === "amount") return money(b.amount) - money(a.amount);
    if (sort === "new") return dateRank(b) - dateRank(a);
    if (sort === "priority") return Number(b.priority || 0) - Number(a.priority || 0);
    return daysLeft(a.deadlineDate) - daysLeft(b.deadlineDate);
  });

  $("hubCount").textContent = `Showing ${visible.length} of ${scholarships.length} verified active scholarships`;
  $("hubCards").innerHTML = visible.length ? visible.map(bigCard).join("") : "<p class='mini-note'>No verified active scholarships match these filters. Try reset.</p>";
  document.querySelectorAll("[data-compare]").forEach((button) => {
    button.addEventListener("click", () => toggleCompare(button.dataset.compare));
  });
}

function smallCard(title, item) {
  if (!item) return `<article class="hub-small"><span class="badge">${escapeHtml(title)}</span><h3>No record found</h3><p>Add more verified active scholarships from admin.</p></article>`;
  return `<article class="hub-small"><span class="badge">${escapeHtml(title)}</span><h3>${escapeHtml(item.name)}</h3><p>${formatDays(item.deadlineDate)} • Last verified: ${escapeHtml(getLastVerifiedText(item))}</p><a class="text-btn" href="#results">View details</a></article>`;
}

function bigCard(item) {
  const isSelected = selected.includes(item.id);
  const officialUrl = getOfficialSourceUrl(item);
  return `<article class="hub-card"><div class="hub-badges"><span class="badge">${escapeHtml(item.stateLabel || labelState(item.state))}</span><span class="badge">Last verified: ${escapeHtml(getLastVerifiedText(item))}</span>${isNew(item) ? "<span class='badge'>🆕 New</span>" : ""}<span class="badge">⏳ ${formatDays(item.deadlineDate)}</span></div><h3>${escapeHtml(item.name)}</h3><p class="info"><strong>Eligibility:</strong> ${escapeHtml(item.eligibilityNote || "Verify on official portal.")}</p><div class="hub-meta"><p><strong>Amount</strong>${escapeHtml(item.amount || "Varies")}</p><p><strong>Deadline</strong>${escapeHtml(item.deadline || "Check portal")}</p><p><strong>Education</strong>${escapeHtml(toArray(item.education).join(", ") || "Any")}</p><p><strong>Categories</strong>${escapeHtml(toArray(item.categories).join(", ") || "Any")}</p><p><strong>Income</strong>${incomeText(item.maxIncome)}</p><p><strong>Source</strong>${escapeHtml(item.sourceName || "Official source")}</p><p><strong>Last verified</strong>${escapeHtml(getLastVerifiedText(item))}</p></div><div class="button-row">${officialButton(officialUrl)}<button class="secondary-btn" type="button" data-compare="${escapeHtml(item.id)}">${isSelected ? "Remove compare" : "Compare"}</button><a class="secondary-btn" href="dashboard.html">Save / Track</a></div></article>`;
}

function toggleCompare(id) {
  if (selected.includes(id)) selected = selected.filter((item) => item !== id);
  else if (selected.length < 3) selected.push(id);
  else alert("You can compare up to 3 scholarships at once.");
  render();
}

function showComparison() {
  const items = selected.map((id) => scholarships.find((item) => item.id === id)).filter(Boolean);
  if (!items.length) {
    alert("Select 2 or 3 scholarships to compare.");
    return;
  }
  $("compareBox").style.display = "block";
  $("compareTable").innerHTML = `<table class="compare-table"><tr><th>Field</th>${items.map((item) => `<th>${escapeHtml(item.name)}</th>`).join("")}</tr><tr><td>Amount</td>${items.map((item) => `<td>${escapeHtml(item.amount || "Varies")}</td>`).join("")}</tr><tr><td>Deadline</td>${items.map((item) => `<td>${escapeHtml(item.deadline || "Check portal")}<br>${formatDays(item.deadlineDate)}</td>`).join("")}</tr><tr><td>Last verified</td>${items.map((item) => `<td>${escapeHtml(getLastVerifiedText(item))}</td>`).join("")}</tr><tr><td>Eligibility</td>${items.map((item) => `<td>${escapeHtml(item.eligibilityNote || "Verify on portal")}</td>`).join("")}</tr><tr><td>Official Link</td>${items.map((item) => `<td>${officialButton(getOfficialSourceUrl(item))}</td>`).join("")}</tr></table>`;
  $("compareBox").scrollIntoView({ behavior: "smooth" });
}

function officialButton(link) {
  if (!String(link || "").startsWith("http")) return "";
  return `<a class="text-btn" href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer">Official Link</a>`;
}

function toArray(value) {
  if (Array.isArray(value)) return value.map(clean).filter(Boolean);
  return String(value || "").split(",").map(clean).filter(Boolean);
}

function clean(value) {
  return String(value || "").trim().toLowerCase();
}

function labelState(state) {
  return getStateLabel(state || "national");
}

function daysLeft(deadlineDate) {
  if (!deadlineDate) return 99999;
  const date = new Date(`${deadlineDate}T23:59:59`);
  if (Number.isNaN(date.getTime())) return 99999;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((date.getTime() - today.getTime()) / 86400000);
}

function formatDays(deadlineDate) {
  const left = daysLeft(deadlineDate);
  if (left === 99999) return "Check portal";
  if (left === 0) return "Last day";
  if (left === 1) return "1 day left";
  return `${left} days left`;
}

function money(value) {
  const numbers = String(value || "").match(/[0-9][0-9,]{2,}/g) || [];
  return numbers.map((item) => Number(item.replace(/,/g, ""))).sort((a, b) => b - a)[0] || 0;
}

function dateRank(item) {
  const text = item.createdAt?.toDate ? item.createdAt.toDate().toISOString().slice(0, 10) : item.verifiedOn || item.lastChecked || "";
  const date = text ? new Date(`${text}T00:00:00`) : new Date(0);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function isNew(item) {
  const date = new Date(dateRank(item));
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}

function incomeText(maxIncome) {
  const value = Number(maxIncome || 0);
  if (value > 0 && value < 99999999) return `₹${value.toLocaleString("en-IN")}`;
  return "Check official rules";
}

function escapeHtml(value) {
  return String(value || "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}
