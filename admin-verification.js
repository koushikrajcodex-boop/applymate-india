import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  collection,
  doc,
  getDocs,
  getFirestore,
  serverTimestamp,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const ADMIN_EMAILS = [
  "lastwarrior324@gmail.com",
  "koushikrajcodex@gmail.com"
];

const auth = getAuth();
const db = getFirestore();

let currentAdmin = null;
let records = [];
let panel = null;
let list = null;
let count = null;
let filter = null;
let refreshButton = null;

installStyles();
installActivePublishGuard();

onAuthStateChanged(auth, async (user) => {
  currentAdmin = user;
  if (!isAdmin(user)) return;

  mountPanel();
  await loadQueue();
});

function isAdmin(user) {
  return ADMIN_EMAILS.includes(String(user?.email || "").toLowerCase());
}

function mountPanel() {
  if (document.getElementById("adminVerificationPanel")) return;

  const adminContent = document.getElementById("adminContent");
  if (!adminContent) return;

  panel = document.createElement("section");
  panel.id = "adminVerificationPanel";
  panel.className = "content-card verification-panel";

  const heading = document.createElement("div");
  heading.className = "card-heading";

  const copy = document.createElement("div");
  const tag = document.createElement("span");
  tag.className = "tagline";
  tag.textContent = "Quality Control";

  const title = document.createElement("h2");
  title.textContent = "Scholarship Verification Queue";

  const description = document.createElement("p");
  description.className = "mini-note";
  description.textContent = "Verify official details before publishing. Active scholarships must have a valid link, deadline date, source, verification date, verification note, and an open application window.";

  copy.append(tag, title, description);

  const actions = document.createElement("div");
  actions.className = "button-row verification-actions";

  filter = document.createElement("select");
  filter.id = "verificationQueueFilter";
  [
    ["needs-review", "Needs review"],
    ["draft", "Draft only"],
    ["active", "Active only"],
    ["closed", "Closed only"],
    ["all", "All records"]
  ].forEach(([value, label]) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    filter.appendChild(option);
  });
  filter.addEventListener("change", renderQueue);

  refreshButton = document.createElement("button");
  refreshButton.type = "button";
  refreshButton.className = "secondary-btn";
  refreshButton.textContent = "Refresh Queue";
  refreshButton.addEventListener("click", loadQueue);

  actions.append(filter, refreshButton);
  heading.append(copy, actions);

  count = document.createElement("p");
  count.className = "mini-note";

  list = document.createElement("div");
  list.className = "verification-list";

  panel.append(heading, count, list);
  adminContent.prepend(panel);
}

async function loadQueue() {
  if (!currentAdmin || !isAdmin(currentAdmin) || !list) return;

  setBusy(refreshButton, true, "Refreshing...");
  list.innerHTML = "<p class='mini-note'>Loading verification queue...</p>";

  try {
    const snapshot = await getDocs(collection(db, "scholarships"));
    records = snapshot.docs
      .map((item) => ({ id: item.id, ...item.data() }))
      .sort((a, b) => {
        const aNeeds = getVerificationIssues(a).length > 0 ? 1 : 0;
        const bNeeds = getVerificationIssues(b).length > 0 ? 1 : 0;
        if (bNeeds !== aNeeds) return bNeeds - aNeeds;
        return String(a.name || "").localeCompare(String(b.name || ""));
      });

    renderQueue();
  } catch (error) {
    console.error("Verification queue load failed:", error);
    list.innerHTML = "<p class='mini-note'>Could not load the verification queue.</p>";
  } finally {
    setBusy(refreshButton, false);
  }
}

function renderQueue() {
  if (!list) return;

  const mode = filter?.value || "needs-review";
  const shown = records.filter((record) => {
    if (mode === "all") return true;
    if (mode === "needs-review") return getVerificationIssues(record).length > 0;
    return record.status === mode;
  });

  count.textContent = `Showing ${shown.length} of ${records.length} scholarship records.`;
  list.replaceChildren();

  if (!shown.length) {
    list.innerHTML = "<p class='mini-note'>No scholarships match this verification view.</p>";
    return;
  }

  shown.forEach((record) => list.appendChild(createCard(record)));
}

function createCard(record) {
  const issues = getVerificationIssues(record);
  const card = document.createElement("article");
  card.className = `verification-card ${issues.length ? "needs-review" : "verified"}`;

  const top = document.createElement("div");
  top.className = "verification-card-top";

  const title = document.createElement("h3");
  title.textContent = record.name || "Untitled scholarship";

  const badge = document.createElement("span");
  badge.className = issues.length ? "verification-badge warning" : "verification-badge success";
  badge.textContent = issues.length ? `${issues.length} issue${issues.length === 1 ? "" : "s"}` : "Verified";

  top.append(title, badge);

  const meta = document.createElement("div");
  meta.className = "verification-meta";
  [
    ["Status", record.status || "missing"],
    ["Window", record.applicationWindow || "missing"],
    ["Verified", record.verifiedOn || "missing"],
    ["Deadline", record.deadlineDate || "missing"],
    ["Source", record.sourceName || "missing"]
  ].forEach(([label, value]) => {
    const item = document.createElement("p");
    const strong = document.createElement("strong");
    strong.textContent = `${label}: `;
    item.append(strong, document.createTextNode(String(value)));
    meta.appendChild(item);
  });

  const issueBox = document.createElement("div");
  issueBox.className = issues.length ? "verification-issues" : "verification-ok";

  if (issues.length) {
    const ul = document.createElement("ul");
    issues.forEach((issue) => {
      const li = document.createElement("li");
      li.textContent = issue;
      ul.appendChild(li);
    });
    issueBox.appendChild(ul);
  } else {
    issueBox.textContent = "All required publication checks are complete.";
  }

  const actions = document.createElement("div");
  actions.className = "button-row";

  const verifyButton = document.createElement("button");
  verifyButton.type = "button";
  verifyButton.className = "secondary-btn";
  verifyButton.textContent = "Verify Details";
  verifyButton.addEventListener("click", () => verifyRecord(record));

  const publishButton = document.createElement("button");
  publishButton.type = "button";
  publishButton.textContent = "Verify & Publish";
  publishButton.disabled = issues.some((issue) => !issue.startsWith("Verification"));
  publishButton.title = publishButton.disabled
    ? "Fix official link, deadline, source and content fields first."
    : "Save verification details and publish this scholarship.";
  publishButton.addEventListener("click", () => publishRecord(record, publishButton));

  const draftButton = document.createElement("button");
  draftButton.type = "button";
  draftButton.className = "secondary-btn";
  draftButton.textContent = "Return to Draft";
  draftButton.addEventListener("click", () => changeStatus(record, "draft", draftButton));

  actions.append(verifyButton, publishButton, draftButton);
  card.append(top, meta, issueBox, actions);
  return card;
}

function getVerificationIssues(record) {
  const issues = [];

  if (!isValidHttpUrl(record.link)) issues.push("Official http/https link is missing or invalid.");
  if (!isIsoDate(record.deadlineDate)) issues.push("Deadline date must use YYYY-MM-DD format.");
  if (!record.sourceName || String(record.sourceName).trim().length < 2) issues.push("Official source name is missing.");
  if (!record.eligibilityNote || String(record.eligibilityNote).trim().length < 11) issues.push("Eligibility note is too short.");
  if (!record.incomeNote || String(record.incomeNote).trim().length < 6) issues.push("Income note is too short.");
  if (!Array.isArray(record.education) || record.education.length === 0) issues.push("Education eligibility is missing.");
  if (!Array.isArray(record.categories) || record.categories.length === 0) issues.push("Category eligibility is missing.");
  if (!Array.isArray(record.genders) || record.genders.length === 0) issues.push("Gender eligibility is missing.");
  if (record.applicationWindow !== "open") issues.push("Application window is not marked open.");
  if (!isIsoDate(record.verifiedOn)) issues.push("Verification date is missing.");
  if (!record.verificationNote || String(record.verificationNote).trim().length < 12) issues.push("Verification note is missing or too short.");

  return issues;
}

async function verifyRecord(record) {
  const today = new Date().toISOString().slice(0, 10);
  const verifiedOn = window.prompt("Verified-on date (YYYY-MM-DD):", record.verifiedOn || today);
  if (verifiedOn === null) return;
  if (!isIsoDate(verifiedOn)) {
    alert("Enter the verification date as YYYY-MM-DD.");
    return;
  }

  const verificationNote = window.prompt(
    "Verification note (at least 12 characters):",
    record.verificationNote || "Official source checked and details verified."
  );
  if (verificationNote === null) return;
  if (verificationNote.trim().length < 12) {
    alert("Verification note must be at least 12 characters.");
    return;
  }

  const windowValue = window.prompt(
    "Application window: open, upcoming, closed, or verify",
    record.applicationWindow || "open"
  );
  if (windowValue === null) return;

  const normalizedWindow = windowValue.trim().toLowerCase();
  if (!["open", "upcoming", "closed", "verify"].includes(normalizedWindow)) {
    alert("Use open, upcoming, closed, or verify.");
    return;
  }

  try {
    await updateDoc(doc(db, "scholarships", record.id), {
      verifiedOn,
      lastChecked: verifiedOn,
      verificationNote: verificationNote.trim().slice(0, 1000),
      applicationWindow: normalizedWindow,
      updatedAt: serverTimestamp(),
      updatedBy: currentAdmin.email || ""
    });
    await loadQueue();
    alert("Verification details saved.");
  } catch (error) {
    console.error("Scholarship verification failed:", error);
    alert("Could not save verification details. Check the scholarship fields and Firestore rules.");
  }
}

async function publishRecord(record, button) {
  const baseIssues = getVerificationIssues(record).filter((issue) => !issue.startsWith("Verification"));
  if (baseIssues.length) {
    alert(`Fix these items before publishing:\n\n${baseIssues.join("\n")}`);
    return;
  }

  const today = new Date().toISOString().slice(0, 10);
  const verificationNote = window.prompt(
    "Final verification note:",
    record.verificationNote || "Official source checked and application window confirmed open."
  );
  if (verificationNote === null) return;
  if (verificationNote.trim().length < 12) {
    alert("Verification note must be at least 12 characters.");
    return;
  }

  const confirmed = window.confirm(`Publish "${record.name}" as an active verified scholarship?`);
  if (!confirmed) return;

  setBusy(button, true, "Publishing...");
  try {
    await updateDoc(doc(db, "scholarships", record.id), {
      status: "active",
      applicationWindow: "open",
      verifiedOn: today,
      lastChecked: today,
      verificationNote: verificationNote.trim().slice(0, 1000),
      updatedAt: serverTimestamp(),
      updatedBy: currentAdmin.email || ""
    });
    await loadQueue();
    alert("Scholarship verified and published.");
  } catch (error) {
    console.error("Scholarship publish failed:", error);
    alert("Could not publish this scholarship. Check required fields and Firestore rules.");
  } finally {
    setBusy(button, false);
  }
}

async function changeStatus(record, status, button) {
  if (!record?.id) return;
  const confirmed = window.confirm(`Change "${record.name}" to ${status}?`);
  if (!confirmed) return;

  setBusy(button, true, "Updating...");
  try {
    await updateDoc(doc(db, "scholarships", record.id), {
      status,
      updatedAt: serverTimestamp(),
      updatedBy: currentAdmin.email || ""
    });
    await loadQueue();
  } catch (error) {
    console.error("Scholarship status update failed:", error);
    alert("Could not update scholarship status.");
  } finally {
    setBusy(button, false);
  }
}

function installActivePublishGuard() {
  document.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button || button.textContent.trim() !== "Mark Active") return;

    event.preventDefault();
    event.stopImmediatePropagation();
    alert("Use the Verification Queue → Verify & Publish button. This prevents unverified scholarships from becoming active.");
  }, true);
}

function isValidHttpUrl(value) {
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

function installStyles() {
  if (document.getElementById("adminVerificationStyles")) return;
  const style = document.createElement("style");
  style.id = "adminVerificationStyles";
  style.textContent = `
    .verification-panel { border: 1px solid #b7d5c2; }
    .verification-actions { align-items: center; }
    .verification-actions select { min-width: 170px; }
    .verification-list { display: grid; gap: 16px; margin-top: 16px; }
    .verification-card { padding: 18px; border: 1px solid var(--border); border-radius: 18px; background: #fff; }
    .verification-card.needs-review { border-left: 5px solid #f79009; }
    .verification-card.verified { border-left: 5px solid #12b76a; }
    .verification-card-top { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; }
    .verification-card-top h3 { margin: 0; }
    .verification-badge { display: inline-flex; padding: 6px 10px; border-radius: 999px; font-size: .82rem; font-weight: 700; }
    .verification-badge.warning { background: #fff4e5; color: #b54708; }
    .verification-badge.success { background: #ecfdf3; color: #067647; }
    .verification-meta { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 8px; margin: 14px 0; }
    .verification-meta p { margin: 0; padding: 9px; border-radius: 10px; background: #f8fafc; overflow-wrap: anywhere; }
    .verification-issues, .verification-ok { padding: 12px 14px; border-radius: 12px; margin-bottom: 14px; }
    .verification-issues { background: #fffaeb; color: #93370d; }
    .verification-issues ul { margin: 0; padding-left: 20px; }
    .verification-ok { background: #ecfdf3; color: #067647; }
    @media (max-width: 900px) { .verification-meta { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 620px) {
      .verification-card-top { flex-direction: column; }
      .verification-meta { grid-template-columns: 1fr; }
      .verification-actions { width: 100%; }
      .verification-actions select, .verification-actions button { width: 100%; }
    }
  `;
  document.head.appendChild(style);
}
