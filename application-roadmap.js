const STORAGE_KEY = "applymate-application-roadmap";

const form = document.getElementById("roadmapForm");
const output = document.getElementById("roadmapOutput");
const summary = document.getElementById("roadmapSummary");
const warning = document.getElementById("roadmapWarning");
const copyButton = document.getElementById("copyRoadmapBtn");
const resetButton = document.getElementById("resetRoadmapBtn");
let currentRoadmap = [];

form?.addEventListener("submit", (event) => {
  event.preventDefault();
  buildRoadmap(true);
});
copyButton?.addEventListener("click", copyRoadmap);
resetButton?.addEventListener("click", resetRoadmap);

loadSavedInputs();
buildRoadmap(false);

function buildRoadmap(shouldSave) {
  const data = readInputs();
  if (shouldSave) saveInputs(data);

  const daysLeft = getDaysLeft(data.deadlineDate);
  const urgency = getUrgency(daysLeft);
  currentRoadmap = createSteps(data, daysLeft, urgency);

  renderSummary(data, daysLeft, urgency);
  renderWarning(data, daysLeft, urgency);
  renderSteps();
}

function readInputs() {
  return {
    scholarshipName: document.getElementById("scholarshipName")?.value.trim() || "Selected scholarship",
    deadlineDate: document.getElementById("deadlineDate")?.value || "",
    portalType: document.getElementById("portalType")?.value || "government",
    readinessLevel: document.getElementById("readinessLevel")?.value || "medium",
    applicationStage: document.getElementById("applicationStage")?.value || "not-started"
  };
}

function saveInputs(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function loadSavedInputs() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    setValue("scholarshipName", data.scholarshipName || "");
    setValue("deadlineDate", data.deadlineDate || "");
    setValue("portalType", data.portalType || "government");
    setValue("readinessLevel", data.readinessLevel || "medium");
    setValue("applicationStage", data.applicationStage || "not-started");
  } catch {
    // Ignore invalid browser data and keep default form values.
  }
}

function setValue(id, value) {
  const element = document.getElementById(id);
  if (element) element.value = value;
}

function getDaysLeft(deadlineDate) {
  if (!deadlineDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadline = new Date(`${deadlineDate}T00:00:00`);
  if (Number.isNaN(deadline.getTime())) return null;
  return Math.ceil((deadline - today) / 86400000);
}

function getUrgency(daysLeft) {
  if (daysLeft === null) return "unknown";
  if (daysLeft < 0) return "expired";
  if (daysLeft <= 3) return "critical";
  if (daysLeft <= 10) return "urgent";
  if (daysLeft <= 30) return "steady";
  return "comfortable";
}

function createSteps(data, daysLeft, urgency) {
  const steps = [];

  if (!data.deadlineDate) {
    steps.push(step("Add the official deadline", "Find the deadline on the official portal and enter it here before planning.", "high"));
  }

  if (urgency === "expired") {
    steps.push(step("Check whether the portal is still accepting late submissions", "Do not submit through unofficial links. Use only the official portal or college notice.", "high"));
  }

  if (data.applicationStage === "submitted") {
    steps.push(step("Save proof of submission", "Download or screenshot the application number, date, and acknowledgement page.", "high"));
    steps.push(step("Track verification status", "Check student, institute, district, or portal verification status regularly.", "medium"));
    steps.push(step("Respond to correction requests", "If the portal asks for correction, update details before the correction deadline.", "high"));
    return steps;
  }

  if (data.readinessLevel === "low") {
    steps.push(step("Prepare mandatory documents first", "Collect Aadhaar, marks memo, income certificate, bank proof, photo, and study/bonafide certificate.", "high"));
    steps.push(step("Check certificate name matching", "Make sure your name, parent name, DOB, bank details, and category details are consistent.", "high"));
  }

  if (data.readinessLevel === "medium") {
    steps.push(step("Finish missing certificates", "Complete any pending income, caste/community, disability, bonafide, or fee receipt documents.", "high"));
  }

  steps.push(step("Verify eligibility before filling", `Confirm ${data.scholarshipName} eligibility, income limit, course rules, category rules, and renewal conditions.`, "high"));

  if (data.applicationStage === "not-started") {
    steps.push(step("Create or update portal profile", "Use correct mobile number, email, Aadhaar details, bank details, course, and institute details.", "medium"));
  }

  if (data.applicationStage === "profile") {
    steps.push(step("Start the application draft", "Fill the application early and pause before final submit to recheck every field.", "medium"));
  }

  if (data.applicationStage === "draft") {
    steps.push(step("Recheck draft before final submit", "Review personal details, course details, income, category, bank account, and uploaded documents.", "high"));
  }

  steps.push(...portalSpecificSteps(data.portalType));

  if (urgency === "critical") {
    steps.unshift(step("Submit only after one full recheck", "Deadline is very close. Avoid careless mistakes, but do not delay unnecessary polishing.", "high"));
  } else if (urgency === "urgent") {
    steps.push(step("Set a same-week submission target", "Finish submission at least one or two days before the deadline to avoid portal traffic or document errors.", "high"));
  } else {
    steps.push(step("Submit before the final week", "Do not wait until the last day. Portals can slow down or documents may need correction.", "medium"));
  }

  steps.push(step("Save final proof", "After submission, save acknowledgement number, PDF, screenshots, SMS/email confirmation, and official status link.", "high"));

  return steps;
}

function portalSpecificSteps(portalType) {
  const map = {
    government: [
      step("Use only the official government portal", "Avoid random WhatsApp links or duplicate websites. Check URL carefully before entering details.", "high"),
      step("Check institute verification flow", "Some government schemes require college or district verification after student submission.", "medium")
    ],
    college: [
      step("Confirm college office requirements", "Ask whether hard copies, signatures, seal, fee receipts, or bonafide certificates are required.", "high"),
      step("Keep one physical file ready", "Arrange photocopies and originals in the same order as the college checklist.", "medium")
    ],
    private: [
      step("Check organizer credibility", "Verify the sponsor, official website, selection method, privacy policy, and contact details.", "high"),
      step("Prepare statement or essay if required", "Private scholarships may ask for goals, achievements, financial need, or recommendation letters.", "medium")
    ],
    renewal: [
      step("Check renewal-specific conditions", "Confirm previous-year marks, attendance, promotion status, and previous scholarship application ID.", "high"),
      step("Update only changed details", "Do not alter correct old details unless the official portal asks for updated information.", "medium")
    ]
  };
  return map[portalType] || map.government;
}

function step(title, description, priority) {
  return { title, description, priority };
}

function renderSummary(data, daysLeft, urgency) {
  summary.replaceChildren(
    stat("Deadline", daysLeft === null ? "Not set" : daysLeft < 0 ? "Expired" : `${daysLeft} days`),
    stat("Urgency", labelUrgency(urgency)),
    stat("Steps", currentRoadmap.length)
  );
}

function stat(label, value) {
  const card = document.createElement("div");
  card.className = "roadmap-stat";
  const strong = document.createElement("strong");
  strong.textContent = String(value);
  const span = document.createElement("span");
  span.textContent = label;
  card.append(strong, span);
  return card;
}

function renderWarning(data, daysLeft, urgency) {
  if (!warning) return;
  if (!data.deadlineDate) {
    warning.hidden = false;
    warning.textContent = "Add the official deadline to make the roadmap more accurate.";
    return;
  }
  if (urgency === "expired") {
    warning.hidden = false;
    warning.textContent = "This deadline appears to be over. Check the official portal for extension or correction-window updates.";
    return;
  }
  if (urgency === "critical") {
    warning.hidden = false;
    warning.textContent = "Deadline is very close. Focus only on mandatory steps and official submission proof.";
    return;
  }
  warning.hidden = true;
  warning.textContent = "";
}

function renderSteps() {
  output.replaceChildren();
  currentRoadmap.forEach((item, index) => {
    const card = document.createElement("article");
    card.className = "roadmap-step";

    const top = document.createElement("div");
    top.className = "roadmap-step-top";
    const title = document.createElement("strong");
    title.textContent = `${index + 1}. ${item.title}`;
    const badge = document.createElement("span");
    badge.className = `roadmap-badge priority-${item.priority === "high" ? "high" : item.priority === "medium" ? "medium" : "normal"}`;
    badge.textContent = priorityLabel(item.priority);
    top.append(title, badge);

    const description = document.createElement("p");
    description.className = "mini-note";
    description.textContent = item.description;

    card.append(top, description);
    output.appendChild(card);
  });
}

function copyRoadmap() {
  const data = readInputs();
  const text = [
    `Scholarship roadmap: ${data.scholarshipName}`,
    data.deadlineDate ? `Deadline: ${data.deadlineDate}` : "Deadline: Not set",
    "",
    ...currentRoadmap.map((item, index) => `${index + 1}. [${priorityLabel(item.priority)}] ${item.title} - ${item.description}`)
  ].join("\n");

  navigator.clipboard?.writeText(text).then(() => {
    copyButton.textContent = "Copied!";
    setTimeout(() => { copyButton.textContent = "Copy Roadmap"; }, 1500);
  }).catch(() => {
    alert(text);
  });
}

function resetRoadmap() {
  localStorage.removeItem(STORAGE_KEY);
  setValue("scholarshipName", "");
  setValue("deadlineDate", "");
  setValue("portalType", "government");
  setValue("readinessLevel", "medium");
  setValue("applicationStage", "not-started");
  buildRoadmap(false);
}

function labelUrgency(urgency) {
  return {
    unknown: "Need date",
    expired: "Expired",
    critical: "Critical",
    urgent: "Urgent",
    steady: "Steady",
    comfortable: "Comfortable"
  }[urgency] || "Need date";
}

function priorityLabel(priority) {
  return {
    high: "High priority",
    medium: "Medium priority",
    normal: "Normal"
  }[priority] || "Normal";
}
