import { db } from "./firebase-config.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

let records = [];
let issues = [];

const ids = ["hTotal","hVisible","hIssues","hDuplicates","hExpired","hLinks","hDeadline","hVerify"];
const $ = (id) => document.getElementById(id);

$("healthContent")?.classList.remove("hidden");
$("healthLocked")?.classList.add("hidden");
if ($("healthAdminEmail")) $("healthAdminEmail").textContent = "Read-only Firestore health check";

$("refreshHealthBtn")?.addEventListener("click", runHealthCheck);
$("healthSearch")?.addEventListener("input", renderIssues);
$("healthIssueFilter")?.addEventListener("change", renderIssues);
$("healthStatusFilter")?.addEventListener("change", renderIssues);
$("exportHealthBtn")?.addEventListener("click", exportReport);

runHealthCheck();

async function runHealthCheck() {
  const list = $("healthIssueList");
  if (list) list.innerHTML = "<p class='mini-note'>Checking Firestore data...</p>";
  const snapshot = await getDocs(collection(db, "scholarships"));
  records = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  issues = findIssues(records);
  renderSummary();
  renderIssues();
}

function findIssues(items) {
  const out = [];
  const names = new Map();
  items.forEach((item) => {
    const name = normName(item.name);
    if (!name) return;
    if (!names.has(name)) names.set(name, []);
    names.get(name).push(item);
  });
  names.forEach((same) => {
    if (same.length > 1) same.forEach((item) => add(out, item, "duplicate-name", "Duplicate scholarship name."));
  });
  items.forEach((item) => {
    const active = item.status === "active";
    if (active && expired(item.deadlineDate)) add(out, item, "expired-active", "Active record has expired deadline date.");
    if (active && item.applicationWindow === "closed") add(out, item, "closed-window", "Active record has closed application window.");
    if (active && !validUrl(item.link)) add(out, item, "missing-link", "Active record has no valid official link.");
    if (active && !validDate(item.deadlineDate)) add(out, item, "missing-deadline", "Active record has no valid deadline date.");
    if (active && !item.verifiedOn) add(out, item, "weak-verification", "Active record has no verifiedOn date.");
    if (active && !item.verificationNote) add(out, item, "weak-verification", "Active record has no verification note.");
    if (!item.eligibilityNote || String(item.eligibilityNote).length < 20) add(out, item, "missing-eligibility", "Eligibility note is missing or too short.");
    if (!item.incomeNote || String(item.incomeNote).length < 10) add(out, item, "income-risk", "Income note is missing or too short.");
    if (active && Number(item.maxIncome || 0) === 0) add(out, item, "income-risk", "maxIncome is 0 and may hide recommendations.");
    if (!Array.isArray(item.education) || !item.education.length) add(out, item, "missing-eligibility", "Education list missing.");
    if (!Array.isArray(item.categories) || !item.categories.length) add(out, item, "missing-eligibility", "Category list missing.");
  });
  return out;
}

function renderSummary() {
  const visible = records.filter((x) => x.status === "active" && x.applicationWindow !== "closed" && !expired(x.deadlineDate)).length;
  const uniqueBad = new Set(issues.map((x) => x.item.id)).size;
  const values = [records.length, visible, uniqueBad, count("duplicate-name"), count("expired-active"), count("missing-link"), count("missing-deadline"), count("weak-verification")];
  ids.forEach((id, i) => { if ($(id)) $(id).textContent = values[i]; });
}

function renderIssues() {
  const list = $("healthIssueList");
  const countBox = $("healthIssueCount");
  if (!list) return;
  const q = clean($("healthSearch")?.value || "");
  const type = $("healthIssueFilter")?.value || "";
  const status = $("healthStatusFilter")?.value || "";
  const shown = issues.filter((x) => {
    const text = clean([x.item.name, x.item.sourceName, x.item.status, x.type, x.message].join(" "));
    return (!q || text.includes(q)) && (!type || x.type === type) && (!status || x.item.status === status);
  });
  if (countBox) countBox.textContent = `Showing ${shown.length} of ${issues.length} issues.`;
  list.innerHTML = "";
  if (!shown.length) {
    list.innerHTML = "<p class='mini-note'>No issues match this view.</p>";
    return;
  }
  shown.slice(0, 200).forEach((x) => list.appendChild(card(x)));
}

function card(issue) {
  const item = issue.item;
  const box = document.createElement("article");
  box.className = "issue-card";
  const h = document.createElement("h3");
  h.textContent = item.name || "Unnamed scholarship";
  const tag = document.createElement("span");
  tag.className = "issue-tag issue-warning";
  tag.textContent = issue.type;
  const msg = document.createElement("p");
  msg.className = "info";
  msg.textContent = issue.message;
  const meta = document.createElement("p");
  meta.className = "mini-note";
  meta.textContent = `Status: ${item.status || "missing"} • Source: ${item.sourceName || "missing"} • Deadline: ${item.deadlineDate || "missing"}`;
  box.append(h, tag, msg, meta);
  return box;
}

function exportReport() {
  const data = JSON.stringify({ generatedAt: new Date().toISOString(), total: records.length, issues }, null, 2);
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([data], { type: "application/json" }));
  a.download = "applymate-health-report.json";
  a.click();
}

function add(out, item, type, message) { out.push({ item, type, message }); }
function count(type) { return issues.filter((x) => x.type === type).length; }
function clean(v) { return String(v || "").toLowerCase().trim(); }
function normName(v) { return clean(v).replace(/[^a-z0-9]+/g, " ").trim(); }
function validDate(v) { return /^20[0-9]{2}-[0-9]{2}-[0-9]{2}$/.test(String(v || "")); }
function validUrl(v) { try { const u = new URL(String(v || "")); return u.protocol === "http:" || u.protocol === "https:"; } catch { return false; } }
function expired(v) { return validDate(v) && new Date(`${v}T23:59:59`).getTime() < Date.now(); }
