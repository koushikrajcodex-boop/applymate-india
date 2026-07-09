const BASE_DOCUMENTS = [
  ["Aadhaar card", "Identity verification for most scholarship portals."],
  ["Recent passport photo", "Often required for online applications or institute forms."],
  ["Bank passbook or account proof", "Make sure account holder name matches application details."],
  ["Previous marks memo", "Used for merit, renewal, and academic verification."],
  ["Bonafide or study certificate", "Usually issued by school, college, or institution."]
];

const EXTRA_DOCUMENTS = {
  school: [["School certificate", "Useful for school-level schemes and class verification."]],
  intermediate: [["Intermediate admission proof", "Confirms current course and institution."]],
  degree: [["College admission proof", "Confirms enrollment in degree course."]],
  engineering: [["Technical course admission proof", "Required for AICTE and technical education schemes."], ["Institution approval details", "Some schemes require AICTE or institution recognition."]],
  pg: [["PG admission proof", "Confirms enrollment in postgraduate course."]],
  scst: [["Caste certificate", "Required for SC/ST category-based scholarships."]],
  bcobc: [["Caste or community certificate", "Required for BC/OBC/EBC category schemes."], ["Non-creamy layer certificate", "May be required for some OBC scholarships."]],
  minority: [["Minority community certificate", "Needed when a portal asks for minority verification."]],
  disabled: [["Disability certificate", "Required for disability scholarships."], ["UDID card if available", "Useful for disability verification where accepted."]],
  fee: [["Fee receipt", "Required for reimbursement or fee-support schemes."], ["College fee structure", "May be needed to verify claimed fee amount."]],
  girls: [["Girl student declaration if required", "Some schemes ask for a declaration or institution certificate."]],
  disability: [["Disability certificate", "Required for disability-focused schemes."]],
  merit: [["Rank or merit certificate", "Useful for merit-based awards and entrance-rank schemes."]]
};

const STORAGE_KEY = "applymate-document-vault";
const form = document.getElementById("vaultForm");
const output = document.getElementById("vaultOutput");
const summary = document.getElementById("vaultSummary");
const copyButton = document.getElementById("copyChecklistBtn");
const resetButton = document.getElementById("resetVaultBtn");
let currentDocs = [];

form?.addEventListener("submit", (event) => {
  event.preventDefault();
  buildChecklist();
});
copyButton?.addEventListener("click", copyChecklist);
resetButton?.addEventListener("click", resetLocalStatus);

buildChecklist();

function buildChecklist() {
  const education = document.getElementById("educationLevel")?.value || "engineering";
  const category = document.getElementById("categoryType")?.value || "general";
  const type = document.getElementById("scholarshipType")?.value || "general";

  const docs = [
    ...BASE_DOCUMENTS,
    ...(EXTRA_DOCUMENTS[education] || []),
    ...(EXTRA_DOCUMENTS[category] || []),
    ...(EXTRA_DOCUMENTS[type] || []),
    ["Income certificate", "Most scholarships need current family income proof."]
  ];

  const seen = new Set();
  currentDocs = docs
    .filter(([name]) => {
      const key = name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map(([name, reason]) => ({ name, reason, status: getStatus(name) }));

  renderDocs();
}

function renderDocs() {
  output.replaceChildren();
  currentDocs.forEach((doc) => output.appendChild(createDocCard(doc)));
  renderSummary();
}

function createDocCard(doc) {
  const card = document.createElement("article");
  card.className = "vault-doc-card";

  const top = document.createElement("div");
  top.className = "vault-doc-top";
  const title = document.createElement("strong");
  title.textContent = doc.name;
  const badge = document.createElement("span");
  badge.className = `vault-status ${doc.status}`;
  badge.textContent = label(doc.status);
  top.append(title, badge);

  const reason = document.createElement("p");
  reason.className = "mini-note";
  reason.textContent = doc.reason;

  const actions = document.createElement("div");
  actions.className = "button-row";
  ["ready", "missing", "soon"].forEach((status) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = status === doc.status ? "" : "secondary-btn";
    button.textContent = label(status);
    button.addEventListener("click", () => updateStatus(doc.name, status));
    actions.appendChild(button);
  });

  card.append(top, reason, actions);
  return card;
}

function renderSummary() {
  const total = currentDocs.length;
  const ready = currentDocs.filter((doc) => doc.status === "ready").length;
  const missing = currentDocs.filter((doc) => doc.status === "missing").length;
  const score = total ? Math.round((ready / total) * 100) : 0;

  summary.replaceChildren(
    stat("Ready", ready),
    stat("Missing", missing),
    stat("Score", `${score}%`)
  );
}

function stat(label, value) {
  const card = document.createElement("div");
  card.className = "vault-stat";
  const strong = document.createElement("strong");
  strong.textContent = String(value);
  const span = document.createElement("span");
  span.textContent = label;
  card.append(strong, span);
  return card;
}

function updateStatus(name, status) {
  const data = loadData();
  data[name] = status;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  buildChecklist();
}

function getStatus(name) {
  return loadData()[name] || "missing";
}

function loadData() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function resetLocalStatus() {
  if (!confirm("Reset all document checklist statuses saved in this browser?")) return;
  localStorage.removeItem(STORAGE_KEY);
  buildChecklist();
}

function copyChecklist() {
  const text = currentDocs
    .map((doc) => `${label(doc.status)} - ${doc.name}: ${doc.reason}`)
    .join("\n");

  navigator.clipboard?.writeText(text).then(() => {
    copyButton.textContent = "Copied!";
    setTimeout(() => { copyButton.textContent = "Copy Checklist"; }, 1500);
  }).catch(() => {
    alert(text);
  });
}

function label(status) {
  return {
    ready: "Ready",
    missing: "Missing",
    soon: "Expiring soon"
  }[status] || "Missing";
}
