const STORAGE_KEY = "applymate-apply-first-options";

const form = document.getElementById("priorityForm");
const output = document.getElementById("priorityOutput");
const copyButton = document.getElementById("copyPriorityBtn");
const clearButton = document.getElementById("clearAllBtn");
let options = loadOptions();

form?.addEventListener("submit", (event) => {
  event.preventDefault();
  addOption();
});

copyButton?.addEventListener("click", copyPriorityList);
clearButton?.addEventListener("click", clearAllOptions);

renderOptions();

function addOption() {
  const name = document.getElementById("scholarshipName")?.value.trim();
  if (!name) return;

  const option = {
    id: crypto?.randomUUID ? crypto.randomUUID() : String(Date.now()),
    name,
    deadlineDate: document.getElementById("deadlineDate")?.value || "",
    eligibilityLevel: Number(document.getElementById("eligibilityLevel")?.value || 2),
    documentLevel: Number(document.getElementById("documentLevel")?.value || 2),
    benefitLevel: Number(document.getElementById("benefitLevel")?.value || 2),
    effortLevel: Number(document.getElementById("effortLevel")?.value || 2),
    createdAt: new Date().toISOString()
  };

  options.push(option);
  saveOptions();
  form.reset();
  setValue("eligibilityLevel", "2");
  setValue("documentLevel", "2");
  setValue("benefitLevel", "2");
  setValue("effortLevel", "2");
  renderOptions();
}

function renderOptions() {
  output.replaceChildren();
  const ranked = getRankedOptions();

  if (!ranked.length) {
    const empty = document.createElement("div");
    empty.className = "empty-priority";
    empty.textContent = "Add two or more scholarship options to compare what you should apply for first.";
    output.appendChild(empty);
    return;
  }

  ranked.forEach((item, index) => output.appendChild(createCard(item, index)));
}

function createCard(item, index) {
  const card = document.createElement("article");
  card.className = "priority-card";

  const top = document.createElement("div");
  top.className = "priority-top";

  const titleWrap = document.createElement("div");
  const rank = document.createElement("span");
  rank.className = "priority-rank";
  rank.textContent = String(index + 1);
  const title = document.createElement("strong");
  title.textContent = ` ${item.name}`;
  titleWrap.append(rank, title);

  const score = document.createElement("span");
  score.className = `priority-score ${scoreClass(item.score)}`;
  score.textContent = `${item.score}/100`;
  top.append(titleWrap, score);

  const reason = document.createElement("p");
  reason.className = "mini-note";
  reason.textContent = item.reason;

  const grid = document.createElement("div");
  grid.className = "score-grid";
  grid.append(
    pill("Deadline", item.deadlineLabel),
    pill("Eligibility", levelLabel(item.eligibilityLevel, "eligibility")),
    pill("Documents", levelLabel(item.documentLevel, "documents")),
    pill("Benefit", levelLabel(item.benefitLevel, "benefit"))
  );

  const actions = document.createElement("div");
  actions.className = "button-row";
  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "secondary-btn";
  remove.textContent = "Remove";
  remove.addEventListener("click", () => removeOption(item.id));
  actions.appendChild(remove);

  card.append(top, reason, grid, actions);
  return card;
}

function pill(label, value) {
  const item = document.createElement("div");
  item.className = "score-pill";
  const strong = document.createElement("strong");
  strong.textContent = value;
  const span = document.createElement("span");
  span.textContent = label;
  item.append(strong, span);
  return item;
}

function getRankedOptions() {
  return options
    .map((option) => ({ ...option, ...scoreOption(option) }))
    .sort((a, b) => b.score - a.score || deadlineSort(a.deadlineDate, b.deadlineDate));
}

function scoreOption(option) {
  const deadline = deadlineScore(option.deadlineDate);
  const eligibility = option.eligibilityLevel * 15;
  const documents = option.documentLevel * 12;
  const benefit = option.benefitLevel * 14;
  const effortPenalty = option.effortLevel * 4;
  const rawScore = deadline.points + eligibility + documents + benefit - effortPenalty;
  const score = Math.max(0, Math.min(100, Math.round(rawScore)));

  return {
    score,
    deadlineLabel: deadline.label,
    reason: buildReason(score, deadline, option)
  };
}

function deadlineScore(deadlineDate) {
  const days = daysUntil(deadlineDate);
  if (days === null) return { points: 10, label: "No date", urgency: "unknown" };
  if (days < 0) return { points: 0, label: "Expired", urgency: "expired" };
  if (days <= 3) return { points: 35, label: `${days} days`, urgency: "critical" };
  if (days <= 10) return { points: 30, label: `${days} days`, urgency: "urgent" };
  if (days <= 30) return { points: 22, label: `${days} days`, urgency: "soon" };
  if (days <= 60) return { points: 16, label: `${days} days`, urgency: "later" };
  return { points: 12, label: `${days} days`, urgency: "comfortable" };
}

function daysUntil(deadlineDate) {
  if (!deadlineDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadline = new Date(`${deadlineDate}T00:00:00`);
  if (Number.isNaN(deadline.getTime())) return null;
  return Math.ceil((deadline - today) / 86400000);
}

function buildReason(score, deadline, option) {
  if (deadline.urgency === "expired") {
    return "This deadline appears expired. Check the official portal before spending time on it.";
  }

  const parts = [];
  if (deadline.urgency === "critical" || deadline.urgency === "urgent") parts.push("deadline is close");
  if (option.eligibilityLevel === 3) parts.push("eligibility looks strong");
  if (option.documentLevel === 3) parts.push("documents are ready");
  if (option.benefitLevel === 3) parts.push("benefit is high");
  if (option.effortLevel === 3) parts.push("but effort is high");

  if (parts.length) return `Priority is based on: ${parts.join(", ")}.`;
  if (score >= 70) return "Good option to apply soon because the overall score is strong.";
  if (score >= 45) return "Keep this in your shortlist, but compare it with stronger or more urgent options.";
  return "Lower priority for now unless official rules make it important for you.";
}

function deadlineSort(a, b) {
  const aDays = daysUntil(a);
  const bDays = daysUntil(b);
  if (aDays === null && bDays === null) return 0;
  if (aDays === null) return 1;
  if (bDays === null) return -1;
  return aDays - bDays;
}

function levelLabel(value, type) {
  const labels = {
    eligibility: { 1: "Not sure", 2: "Possible", 3: "Strong" },
    documents: { 1: "Not ready", 2: "Partial", 3: "Ready" },
    benefit: { 1: "Low", 2: "Medium", 3: "High" }
  };
  return labels[type]?.[value] || "Medium";
}

function scoreClass(score) {
  if (score >= 70) return "priority-high";
  if (score >= 45) return "priority-medium";
  return "priority-low";
}

function removeOption(id) {
  options = options.filter((option) => option.id !== id);
  saveOptions();
  renderOptions();
}

function clearAllOptions() {
  if (!options.length) return;
  if (!confirm("Clear all saved scholarship priority options from this browser?")) return;
  options = [];
  saveOptions();
  renderOptions();
}

function copyPriorityList() {
  const ranked = getRankedOptions();
  if (!ranked.length) return;

  const text = ranked
    .map((item, index) => `${index + 1}. ${item.name} - ${item.score}/100 - ${item.reason}`)
    .join("\n");

  navigator.clipboard?.writeText(text).then(() => {
    copyButton.textContent = "Copied!";
    setTimeout(() => { copyButton.textContent = "Copy Priority List"; }, 1500);
  }).catch(() => {
    alert(text);
  });
}

function loadOptions() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveOptions() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(options));
}

function setValue(id, value) {
  const element = document.getElementById(id);
  if (element) element.value = value;
}
