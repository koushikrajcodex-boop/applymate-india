import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { collection, getDocs, getFirestore } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const ADMIN_EMAILS = [
  "lastwarrior324@gmail.com",
  "koushikrajcodex@gmail.com"
];

const auth = getAuth();
const db = getFirestore();
let panel;
let summary;
let issueList;
let refreshButton;

installStyles();

onAuthStateChanged(auth, async (user) => {
  if (!ADMIN_EMAILS.includes(String(user?.email || "").toLowerCase())) return;
  mountPanel();
  await scanScholarships();
});

function mountPanel() {
  if (document.getElementById("adminQualityPanel")) return;
  const adminContent = document.getElementById("adminContent");
  if (!adminContent) return;

  panel = document.createElement("section");
  panel.id = "adminQualityPanel";
  panel.className = "content-card admin-quality-panel";

  const heading = document.createElement("div");
  heading.className = "card-heading";

  const copy = document.createElement("div");
  const tag = document.createElement("span");
  tag.className = "tagline";
  tag.textContent = "Data Quality";
  const title = document.createElement("h2");
  title.textContent = "Scholarship Health Dashboard";
  const description = document.createElement("p");
  description.className = "mini-note";
  description.textContent = "Scans every scholarship for missing fields, stale verification, duplicate names, invalid links, and deadline problems.";
  copy.append(tag, title, description);

  refreshButton = document.createElement("button");
  refreshButton.type = "button";
  refreshButton.className = "secondary-btn";
  refreshButton.textContent = "Run Quality Scan";
  refreshButton.addEventListener("click", scanScholarships);

  heading.append(copy, refreshButton);
  summary = document.createElement("div");
  summary.className = "quality-summary-grid";
  issueList = document.createElement("div");
  issueList.className = "quality-issue-list";

  panel.append(heading, summary, issueList);
  adminContent.prepend(panel);
}

async function scanScholarships() {
  if (!summary || !issueList) return;
  setBusy(true);
  issueList.innerHTML = "<p class='mini-note'>Scanning scholarship records...</p>";

  try {
    const snapshot = await getDocs(collection(db, "scholarships"));
    const records = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
    const nameCounts = new Map();

    records.forEach((record) => {
      const name = normalize(record.name);
      if (name) nameCounts.set(name, (nameCounts.get(name) || 0) + 1);
    });

    const results = records.map((record) => analyze(record, nameCounts));
    renderSummary(records, results);
    renderIssues(results);
  } catch (error) {
    console.error("Scholarship quality scan failed:", error);
    issueList.innerHTML = "<p class='mini-note'>Could not run the quality scan.</p>";
  } finally {
    setBusy(false);
  }
}

function analyze(record, nameCounts) {
  const issues = [];
  const normalizedName = normalize(record.name);

  if (!record.name || String(record.name).trim().length < 3) issues.push("Missing or very short name");
  if (!isHttpUrl(record.link)) issues.push("Invalid official link");
  if (!record.sourceName || String(record.sourceName).trim().length < 2) issues.push("Missing source name");
  if (!isIsoDate(record.deadlineDate)) issues.push("Missing or invalid deadline date");
  if (!record.eligibilityNote || String(record.eligibilityNote).trim().length < 11) issues.push("Eligibility note is too short");
  if (!record.incomeNote || String(record.incomeNote).trim().length < 6) issues.push("Income note is too short");
  if (!Array.isArray(record.education) || record.education.length === 0) issues.push("Education eligibility missing");
  if (!Array.isArray(record.categories) || record.categories.length === 0) issues.push("Category eligibility missing");
  if (!Array.isArray(record.genders) || record.genders.length === 0) issues.push("Gender eligibility missing");
  if (!record.disability) issues.push("Disability rule missing");
  if (normalizedName && nameCounts.get(normalizedName) > 1) issues.push("Possible duplicate name");
  if (record.status === "active" && record.applicationWindow !== "open") issues.push("Active record is not marked open");
  if (record.status === "active" && !isIsoDate(record.verifiedOn)) issues.push("Active record is not verified");
  if (isIsoDate(record.verifiedOn) && daysSince(record.verifiedOn) > 60) issues.push("Verification is older than 60 days");
  if (isIsoDate(record.deadlineDate) && daysLeft(record.deadlineDate) < 0 && record.applicationWindow === "open") issues.push("Expired deadline still marked open");

  const requiredChecks = 12;
  const score = Math.max(0, Math.round(((requiredChecks - Math.min(issues.length, requiredChecks)) / requiredChecks) * 100));
  return { record, issues, score };
}

function renderSummary(records, results) {
  summary.replaceChildren();
  const active = records.filter((record) => record.status === "active").length;
  const ready = results.filter((result) => result.issues.length === 0).length;
  const stale = results.filter((result) => result.issues.includes("Verification is older than 60 days")).length;
  const average = results.length
    ? Math.round(results.reduce((total, result) => total + result.score, 0) / results.length)
    : 0;

  [
    ["Total records", records.length],
    ["Active", active],
    ["Publication ready", ready],
    ["Stale verification", stale],
    ["Average quality", `${average}%`]
  ].forEach(([label, value]) => {
    const card = document.createElement("div");
    card.className = "quality-stat";
    const strong = document.createElement("strong");
    strong.textContent = String(value);
    const span = document.createElement("span");
    span.textContent = label;
    card.append(strong, span);
    summary.appendChild(card);
  });
}

function renderIssues(results) {
  issueList.replaceChildren();
  const problemRecords = results
    .filter((result) => result.issues.length > 0)
    .sort((a, b) => a.score - b.score || String(a.record.name || "").localeCompare(String(b.record.name || "")));

  if (!problemRecords.length) {
    issueList.innerHTML = "<p class='quality-success'>All scholarship records passed the current quality checks.</p>";
    return;
  }

  problemRecords.slice(0, 25).forEach(({ record, issues, score }) => {
    const card = document.createElement("article");
    card.className = "quality-record-card";

    const top = document.createElement("div");
    top.className = "quality-record-top";
    const title = document.createElement("h3");
    title.textContent = record.name || "Untitled scholarship";
    const badge = document.createElement("span");
    badge.className = score >= 80 ? "quality-badge good" : score >= 50 ? "quality-badge warning" : "quality-badge danger";
    badge.textContent = `${score}%`;
    top.append(title, badge);

    const list = document.createElement("ul");
    issues.forEach((issue) => {
      const item = document.createElement("li");
      item.textContent = issue;
      list.appendChild(item);
    });

    card.append(top, list);
    issueList.appendChild(card);
  });
}

function isHttpUrl(value) {
  try {
    const url = new URL(String(value || ""));
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isIsoDate(value) {
  return /^20\d{2}-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/.test(String(value || ""));
}

function daysSince(value) {
  const date = new Date(`${value}T00:00:00`);
  return Math.floor((Date.now() - date.getTime()) / 86400000);
}

function daysLeft(value) {
  const date = new Date(`${value}T23:59:59`);
  return Math.ceil((date.getTime() - Date.now()) / 86400000);
}

function normalize(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function setBusy(busy) {
  if (!refreshButton) return;
  refreshButton.disabled = busy;
  refreshButton.textContent = busy ? "Scanning..." : "Run Quality Scan";
}

function installStyles() {
  if (document.getElementById("adminQualityStyles")) return;
  const style = document.createElement("style");
  style.id = "adminQualityStyles";
  style.textContent = `
    .admin-quality-panel { border: 1px solid #a6f4c5; }
    .quality-summary-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 12px; margin: 16px 0; }
    .quality-stat { padding: 14px; border: 1px solid var(--border); border-radius: 14px; background: #fff; display: grid; gap: 4px; }
    .quality-stat strong { font-size: 1.45rem; }
    .quality-stat span { color: var(--muted); font-size: .9rem; }
    .quality-issue-list { display: grid; gap: 12px; }
    .quality-record-card { padding: 15px; border: 1px solid var(--border); border-radius: 15px; background: #fff; }
    .quality-record-top { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; }
    .quality-record-top h3 { margin: 0; }
    .quality-badge { padding: 5px 9px; border-radius: 999px; font-weight: 700; }
    .quality-badge.good { background: #ecfdf3; color: #067647; }
    .quality-badge.warning { background: #fffaeb; color: #b54708; }
    .quality-badge.danger { background: #fef3f2; color: #b42318; }
    .quality-success { padding: 14px; border-radius: 12px; background: #ecfdf3; color: #067647; }
    @media (max-width: 900px) { .quality-summary-grid { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 520px) { .quality-summary-grid { grid-template-columns: 1fr; } }
  `;
  document.head.appendChild(style);
}
