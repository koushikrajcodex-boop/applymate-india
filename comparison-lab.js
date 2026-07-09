const CONTACT_EMAIL = "koushikrajcodex@gmail.com";

const scholarships = [
  {
    name: "Andhra Pradesh Post-Matric Scholarship - Jnanabhumi",
    stateLabel: "Andhra Pradesh",
    education: ["intermediate", "degree", "engineering", "pg"],
    categories: ["SC", "ST", "BC", "OBC", "EBC", "EWS", "Minority", "Kapu", "Disabled"],
    maxIncome: "₹2,00,000",
    deadline: "Check official Jnanabhumi portal",
    sourceName: "Official Jnanabhumi Portal",
    link: "https://jnanabhumi.ap.gov.in/",
    eligibilityNote: "For eligible Andhra Pradesh post-matric students. Rules may vary by department and category.",
    incomeNote: "Income rules can vary by category. Verify on Jnanabhumi.",
    documents: ["Aadhaar card", "Income certificate", "Category certificate if applicable", "Bank passbook", "Marks memo", "College bonafide certificate"]
  },
  {
    name: "Telangana ePASS Post-Matric Scholarship",
    stateLabel: "Telangana",
    education: ["intermediate", "degree", "engineering", "pg"],
    categories: ["SC", "ST", "BC", "OBC", "EBC", "EWS", "Minority", "Disabled"],
    maxIncome: "₹2,00,000",
    deadline: "Check official Telangana ePASS portal",
    sourceName: "Official Telangana ePASS Portal",
    link: "https://telanganaepass.cgg.gov.in/",
    eligibilityNote: "For eligible Telangana post-matric students from welfare categories.",
    incomeNote: "Income limits can vary by category and current rules.",
    documents: ["Aadhaar card", "Income certificate", "Category certificate", "SSC memo", "Previous marks memo", "Bank passbook", "College bonafide certificate"]
  },
  {
    name: "National Means-cum-Merit Scholarship Scheme - NMMSS",
    stateLabel: "National",
    education: ["school"],
    categories: ["General", "SC", "ST", "BC", "OBC", "Minority", "EBC", "EWS"],
    maxIncome: "₹3,50,000",
    deadline: "Check NSP / state education department",
    sourceName: "National Scholarship Portal",
    link: "https://scholarships.gov.in/",
    eligibilityNote: "For eligible school students. Selection and rules depend on official notification.",
    incomeNote: "Usually income-based. Verify state or NSP instructions.",
    documents: ["Aadhaar card", "Income certificate", "School certificate", "Marks memo", "Bank account details"]
  },
  {
    name: "Central Sector Scheme of Scholarship for College and University Students",
    stateLabel: "National",
    education: ["degree", "engineering", "pg"],
    categories: ["General", "SC", "ST", "BC", "OBC", "Minority", "EBC", "EWS"],
    maxIncome: "₹4,50,000",
    deadline: "Check National Scholarship Portal",
    sourceName: "National Scholarship Portal",
    link: "https://scholarships.gov.in/",
    eligibilityNote: "For eligible meritorious college or university students as per official rules.",
    incomeNote: "Income limit and merit rules should be verified on NSP.",
    documents: ["Aadhaar card", "Income certificate", "Marks memo", "Bank passbook", "College bonafide certificate"]
  },
  {
    name: "AICTE Pragati Scholarship for Girl Students",
    stateLabel: "National",
    education: ["engineering"],
    categories: ["Girls", "General", "SC", "ST", "BC", "OBC", "Minority", "EBC", "EWS"],
    maxIncome: "₹8,00,000",
    deadline: "Check AICTE / NSP portal",
    sourceName: "AICTE",
    link: "https://www.aicte-india.org/",
    eligibilityNote: "For eligible girl students pursuing technical education as per AICTE rules.",
    incomeNote: "Family income rules should be checked on official notification.",
    documents: ["Aadhaar card", "Income certificate", "Admission proof", "Marks memo", "Bank details", "College certificate"]
  },
  {
    name: "AICTE Saksham Scholarship for Specially Abled Students",
    stateLabel: "National",
    education: ["engineering"],
    categories: ["Disabled"],
    maxIncome: "₹8,00,000",
    deadline: "Check AICTE / NSP portal",
    sourceName: "AICTE",
    link: "https://www.aicte-india.org/",
    eligibilityNote: "For eligible specially abled students pursuing technical education.",
    incomeNote: "Verify latest income and disability conditions in official notification.",
    documents: ["Aadhaar card", "Disability certificate", "Income certificate", "Admission proof", "Marks memo", "Bank details"]
  },
  {
    name: "Post Matric Scholarship for Minorities",
    stateLabel: "National",
    education: ["intermediate", "degree", "engineering", "pg"],
    categories: ["Minority"],
    maxIncome: "₹2,00,000",
    deadline: "Check NSP",
    sourceName: "National Scholarship Portal",
    link: "https://scholarships.gov.in/",
    eligibilityNote: "For eligible minority community students as per official rules.",
    incomeNote: "Income limit can change. Verify on NSP.",
    documents: ["Aadhaar card", "Income certificate", "Community certificate if required", "Marks memo", "Bank account details"]
  },
  {
    name: "Scholarship for Students with Disabilities",
    stateLabel: "National",
    education: ["school", "intermediate", "degree", "engineering", "pg"],
    categories: ["Disabled"],
    maxIncome: "₹2,50,000",
    deadline: "Check NSP",
    sourceName: "National Scholarship Portal",
    link: "https://scholarships.gov.in/",
    eligibilityNote: "For eligible students with benchmark disabilities as per official scheme rules.",
    incomeNote: "Income and disability rules should be verified officially.",
    documents: ["Aadhaar card", "Disability certificate", "Income certificate", "Marks memo", "Bank details"]
  }
];

const selects = [
  document.getElementById("compareOne"),
  document.getElementById("compareTwo"),
  document.getElementById("compareThree")
];
const output = document.getElementById("comparisonOutput");

document.getElementById("compareBtn")?.addEventListener("click", renderComparison);
document.getElementById("clearCompareBtn")?.addEventListener("click", clearComparison);

populateSelects();
selects[0].value = scholarships[0].name;
selects[1].value = scholarships[1].name;
renderComparison();

function populateSelects() {
  selects.forEach((select, index) => {
    select.innerHTML = "";
    const empty = document.createElement("option");
    empty.value = "";
    empty.textContent = index === 0 ? "Choose a scholarship" : "Optional comparison";
    select.appendChild(empty);

    scholarships.forEach((scholarship) => {
      const option = document.createElement("option");
      option.value = scholarship.name;
      option.textContent = scholarship.name;
      select.appendChild(option);
    });
  });
}

function renderComparison() {
  const selected = selects
    .map((select) => scholarships.find((item) => item.name === select.value))
    .filter(Boolean)
    .filter((item, index, list) => list.findIndex((other) => other.name === item.name) === index);

  if (!selected.length) {
    output.innerHTML = "<div class='compare-empty'>Select at least one scholarship to compare.</div>";
    return;
  }

  const rows = [
    ["State", (item) => item.stateLabel],
    ["Education", (item) => item.education.join(", ")],
    ["Eligible groups", (item) => item.categories.join(", ")],
    ["Income limit", (item) => item.maxIncome],
    ["Deadline note", (item) => item.deadline],
    ["Source", (item) => item.sourceName],
    ["Eligibility note", (item) => item.eligibilityNote],
    ["Income note", (item) => item.incomeNote],
    ["Documents", (item) => item.documents.join(", ")],
    ["Official link", (item) => `<a class="text-btn" href="${escapeAttribute(item.link)}" target="_blank" rel="noopener noreferrer">Open source</a>`],
    ["Correction", (item) => `<a class="secondary-btn" href="mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`Correction for ${item.name}`)}">Report issue</a>`]
  ];

  output.innerHTML = `
    <table class="comparison-table">
      <thead>
        <tr>
          <th>Criteria</th>
          ${selected.map((item) => `<th>${escapeHtml(item.name)}</th>`).join("")}
        </tr>
      </thead>
      <tbody>
        ${rows.map(([label, getter]) => `
          <tr>
            <td>${escapeHtml(label)}</td>
            ${selected.map((item) => `<td>${getter(item)}</td>`).join("")}
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function clearComparison() {
  selects.forEach((select) => { select.value = ""; });
  output.innerHTML = "<div class='compare-empty'>Selection cleared. Choose scholarships to compare.</div>";
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}
