const scholarships = [
  { name: "Andhra Pradesh Post-Matric Scholarship - Jnanabhumi", state: "andhra-pradesh", education: ["intermediate", "degree", "engineering", "pg"], categories: ["sc", "st", "obc", "minority", "disabled", "general"], maxIncome: 200000, effort: "medium", source: "Official Jnanabhumi Portal", link: "https://jnanabhumi.ap.gov.in/" },
  { name: "Telangana ePASS Post-Matric Scholarship", state: "telangana", education: ["intermediate", "degree", "engineering", "pg"], categories: ["sc", "st", "obc", "minority", "disabled", "general"], maxIncome: 200000, effort: "medium", source: "Official Telangana ePASS Portal", link: "https://telanganaepass.cgg.gov.in/" },
  { name: "Central Sector Scheme for College and University Students", state: "national", education: ["degree", "engineering", "pg"], categories: ["general", "sc", "st", "obc", "minority"], maxIncome: 450000, effort: "medium", source: "National Scholarship Portal", link: "https://scholarships.gov.in/" },
  { name: "AICTE Pragati Scholarship for Girl Students", state: "national", education: ["engineering"], categories: ["girls", "general", "sc", "st", "obc", "minority"], maxIncome: 800000, effort: "medium", source: "AICTE", link: "https://www.aicte-india.org/" },
  { name: "AICTE Saksham Scholarship for Specially Abled Students", state: "national", education: ["engineering"], categories: ["disabled"], maxIncome: 800000, effort: "medium", source: "AICTE", link: "https://www.aicte-india.org/" },
  { name: "Post Matric Scholarship for Minorities", state: "national", education: ["intermediate", "degree", "engineering", "pg"], categories: ["minority"], maxIncome: 200000, effort: "low", source: "National Scholarship Portal", link: "https://scholarships.gov.in/" },
  { name: "Scholarship for Students with Disabilities", state: "national", education: ["school", "intermediate", "degree", "engineering", "pg"], categories: ["disabled"], maxIncome: 250000, effort: "medium", source: "National Scholarship Portal", link: "https://scholarships.gov.in/" },
  { name: "National Means-cum-Merit Scholarship Scheme", state: "national", education: ["school"], categories: ["general", "sc", "st", "obc", "minority"], maxIncome: 350000, effort: "high", source: "National Scholarship Portal", link: "https://scholarships.gov.in/" }
];

const form = document.getElementById("shortlistForm");
const results = document.getElementById("shortlistResults");

form?.addEventListener("submit", (event) => {
  event.preventDefault();
  rankScholarships();
});

rankScholarships();

function rankScholarships() {
  const profile = {
    state: value("stateInput"),
    education: value("educationInput"),
    category: value("categoryInput"),
    income: Number(value("incomeInput") || 0),
    effort: value("effortInput")
  };

  const ranked = scholarships
    .map((item) => score(item, profile))
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  render(ranked);
}

function score(item, profile) {
  const reasons = [];
  let points = 20;

  if (item.state === profile.state) {
    points += 25;
    reasons.push("Strong state match");
  } else if (item.state === "national") {
    points += 16;
    reasons.push("National-level option");
  }

  if (item.education.includes(profile.education)) {
    points += 24;
    reasons.push("Education level matches");
  }

  if (item.categories.includes(profile.category) || item.categories.includes("general")) {
    points += 20;
    reasons.push("Category may match");
  }

  if (profile.income <= item.maxIncome) {
    points += 18;
    reasons.push("Income appears within limit");
  } else {
    points -= 20;
    reasons.push("Income may exceed listed limit");
  }

  if (profile.effort === item.effort || profile.effort === "high") {
    points += 8;
    reasons.push("Document effort looks manageable");
  }

  if (item.source) {
    points += 5;
    reasons.push("Official source is clear");
  }

  return { ...item, score: Math.max(0, Math.min(100, points)), reasons };
}

function render(ranked) {
  results.replaceChildren();

  ranked.forEach((item, index) => {
    const card = document.createElement("article");
    card.className = "planner-card";

    const top = document.createElement("div");
    top.className = "planner-card-top";

    const title = document.createElement("div");
    const h3 = document.createElement("h3");
    h3.textContent = `${index + 1}. ${item.name}`;
    const source = document.createElement("p");
    source.className = "mini-note";
    source.textContent = `Source: ${item.source}`;
    title.append(h3, source);

    const score = document.createElement("span");
    score.className = "planner-score";
    score.textContent = `${item.score}%`;

    top.append(title, score);

    const list = document.createElement("ul");
    list.className = "planner-reasons";
    item.reasons.slice(0, 4).forEach((reason) => {
      const li = document.createElement("li");
      li.textContent = reason;
      list.appendChild(li);
    });

    const actions = document.createElement("div");
    actions.className = "button-row";
    const link = document.createElement("a");
    link.className = "text-btn";
    link.href = item.link;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "Open Official Link";
    actions.appendChild(link);

    card.append(top, list, actions);
    results.appendChild(card);
  });
}

function value(id) {
  return document.getElementById(id)?.value || "";
}
