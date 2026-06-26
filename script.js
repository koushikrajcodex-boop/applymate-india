const scholarships = [
  {
    name: "Andhra Pradesh Post-Matric Scholarship - Jnanabhumi",
    state: "andhra-pradesh",
    education: ["intermediate", "degree", "engineering", "pg"],
    categories: ["sc", "st", "bc", "obc", "ebc", "ews", "minority", "kapu", "disabled"],
    maxIncome: 200000,
    deadline: "Check official Jnanabhumi portal",
    link: "https://jnanabhumi.ap.gov.in/",
    sourceName: "Official Jnanabhumi Portal",
    lastVerified: "26 June 2026",
    eligibilityNote: "For AP post-matric students. Exact rules vary by welfare department/category, so verify on the official portal.",
    documents: [
      "Aadhaar card",
      "Income certificate",
      "Caste/category certificate if applicable",
      "Bank passbook",
      "Previous marks memo",
      "College bonafide certificate",
      "Attendance proof if required"
    ]
  },
  {
    name: "Telangana ePASS Post-Matric Scholarship",
    state: "telangana",
    education: ["intermediate", "degree", "engineering", "pg"],
    categories: ["sc", "st", "bc", "obc", "ebc", "ews", "minority"],
    maxIncome: 200000,
    deadline: "Check official Telangana ePASS portal",
    link: "https://telanganaepass.cgg.gov.in/",
    sourceName: "Official Telangana ePASS Portal",
    lastVerified: "26 June 2026",
    eligibilityNote: "For Telangana post-matric students from eligible welfare categories. Income limits can vary by category/rural/urban status.",
    documents: [
      "Aadhaar card",
      "Income certificate",
      "Caste/category certificate",
      "SSC / 10th marks memo",
      "Previous qualifying exam marks memo",
      "Bank passbook",
      "College bonafide certificate",
      "Passport-size photo"
    ]
  },
  {
    name: "Telangana ePASS Disabled Welfare Post-Matric Scholarship",
    state: "telangana",
    education: ["intermediate", "degree", "engineering", "pg"],
    categories: ["disabled"],
    maxIncome: 100000,
    deadline: "Check official Telangana ePASS portal",
    link: "https://telanganaepass.cgg.gov.in/",
    sourceName: "Official Telangana ePASS Portal",
    lastVerified: "26 June 2026",
    eligibilityNote: "For Telangana disabled welfare students. Verify exact current income and document rules on ePASS.",
    documents: [
      "Aadhaar card",
      "Disability certificate",
      "Income certificate",
      "SSC / 10th marks memo",
      "Previous marks memo",
      "Bank passbook",
      "College bonafide certificate"
    ]
  },
  {
    name: "AICTE Pragati Scholarship for Girl Students",
    state: "national",
    education: ["degree", "engineering"],
    categories: ["girls"],
    maxIncome: 800000,
    deadline: "Check official AICTE / NSP portal",
    link: "https://scholarships.gov.in/",
    sourceName: "National Scholarship Portal / AICTE",
    lastVerified: "26 June 2026",
    eligibilityNote: "For girl students admitted to AICTE-approved technical degree/diploma courses. Maximum two girl children per family.",
    documents: [
      "Aadhaar card",
      "Admission proof",
      "Income certificate",
      "Previous marks memo",
      "Bank passbook",
      "Bonafide certificate",
      "Passport-size photo"
    ]
  },
  {
    name: "AICTE Saksham Scholarship for Specially-Abled Students",
    state: "national",
    education: ["degree", "engineering"],
    categories: ["disabled"],
    maxIncome: 800000,
    deadline: "Check official AICTE / NSP portal",
    link: "https://scholarships.gov.in/",
    sourceName: "National Scholarship Portal / AICTE",
    lastVerified: "26 June 2026",
    eligibilityNote: "For specially-abled students in AICTE-approved technical courses.",
    documents: [
      "Aadhaar card",
      "Disability certificate",
      "Admission proof",
      "Income certificate",
      "Previous marks memo",
      "Bank passbook",
      "Bonafide certificate"
    ]
  },
  {
    name: "National Means-cum-Merit Scholarship Scheme - NMMSS",
    state: "national",
    education: ["school"],
    categories: ["general", "sc", "st", "bc", "obc", "minority", "ebc", "ews"],
    maxIncome: 350000,
    deadline: "Check NSP / state education department",
    link: "https://scholarships.gov.in/",
    sourceName: "National Scholarship Portal",
    lastVerified: "26 June 2026",
    eligibilityNote: "For eligible school students. Selection is usually through state-level exam/process.",
    documents: [
      "Aadhaar card",
      "Income certificate",
      "School bonafide certificate",
      "Previous class marks memo",
      "Bank account details",
      "Caste certificate if applicable"
    ]
  },
  {
    name: "Post-Matric Scholarship for SC Students",
    state: "national",
    education: ["intermediate", "degree", "engineering", "pg"],
    categories: ["sc"],
    maxIncome: 250000,
    deadline: "Check NSP / state portal",
    link: "https://scholarships.gov.in/",
    sourceName: "National Scholarship Portal / State Portal",
    lastVerified: "26 June 2026",
    eligibilityNote: "For SC students pursuing post-matric studies. Implementation may happen through state portals or NSP.",
    documents: [
      "Aadhaar card",
      "SC caste certificate",
      "Income certificate",
      "Previous marks memo",
      "Bank passbook",
      "Institution bonafide certificate",
      "Fee receipt if required"
    ]
  },
  {
    name: "Post-Matric Scholarship for ST Students",
    state: "national",
    education: ["intermediate", "degree", "engineering", "pg"],
    categories: ["st"],
    maxIncome: 250000,
    deadline: "Check NSP / state portal",
    link: "https://scholarships.gov.in/",
    sourceName: "National Scholarship Portal / State Portal",
    lastVerified: "26 June 2026",
    eligibilityNote: "For ST students pursuing post-matric studies. Exact process depends on state/UT.",
    documents: [
      "Aadhaar card",
      "ST caste certificate",
      "Income certificate",
      "Previous marks memo",
      "Bank passbook",
      "Institution bonafide certificate",
      "Fee receipt if required"
    ]
  },
  {
    name: "Post-Matric Scholarship for OBC / EBC / DNT Students",
    state: "national",
    education: ["intermediate", "degree", "engineering", "pg"],
    categories: ["bc", "obc", "ebc", "ews"],
    maxIncome: 250000,
    deadline: "Check NSP / state portal",
    link: "https://scholarships.gov.in/",
    sourceName: "National Scholarship Portal / State Portal",
    lastVerified: "26 June 2026",
    eligibilityNote: "For eligible OBC/EBC/DNT students. Exact category mapping depends on state rules.",
    documents: [
      "Aadhaar card",
      "OBC/EBC/category certificate",
      "Income certificate",
      "Previous marks memo",
      "Bank passbook",
      "Institution bonafide certificate",
      "Fee receipt if required"
    ]
  }
];

function findScholarships() {
  const searchInput = document.getElementById("search");
  const stateInput = document.getElementById("state");
  const educationInput = document.getElementById("education");
  const categoryInput = document.getElementById("category");
  const incomeInput = document.getElementById("income");

  if (!searchInput || !stateInput || !educationInput || !categoryInput || !incomeInput) {
    return;
  }

  const searchText = searchInput.value.toLowerCase().trim();
  const selectedState = stateInput.value;
  const selectedEducation = educationInput.value;
  const selectedCategory = categoryInput.value;
  const selectedIncome = Number(incomeInput.value);

  const results = scholarships.filter((scheme) => {
    const stateMatch =
      selectedState === "any" ||
      scheme.state === selectedState ||
      scheme.state === "national";

    const educationMatch = scheme.education.includes(selectedEducation);
    const categoryMatch = scheme.categories.includes(selectedCategory);
    const incomeMatch = selectedIncome <= scheme.maxIncome;

    const searchableText = `
      ${scheme.name}
      ${scheme.state}
      ${scheme.education.join(" ")}
      ${scheme.categories.join(" ")}
      ${scheme.documents.join(" ")}
      ${scheme.eligibilityNote}
      ${scheme.sourceName}
    `.toLowerCase();

    const searchMatch = searchText === "" || searchableText.includes(searchText);

    return stateMatch && educationMatch && categoryMatch && incomeMatch && searchMatch;
  });

  displayResults(results);
}

function displayResults(results) {
  const resultSummary = document.getElementById("resultSummary");
  const resultsDiv = document.getElementById("results");

  if (!resultSummary || !resultsDiv) {
    return;
  }

  if (results.length === 0) {
    resultSummary.innerHTML = "";
    resultsDiv.innerHTML = `
      <div class="no-result">
        <h3>No clear match found</h3>
        <p>Try changing category, income, state, or search keyword.</p>
        <p>Also check official portals manually before deciding.</p>
      </div>
    `;
    return;
  }

  resultSummary.innerHTML = `
    <div class="summary">
      Found ${results.length} possible scholarship match${results.length > 1 ? "es" : ""}.
    </div>
  `;

  resultsDiv.innerHTML = results.map((scheme) => {
    const docsList = scheme.documents
      .map((doc) => `<li>${doc}</li>`)
      .join("");

    const shareText = encodeURIComponent(
      `I found this scholarship on ApplyMate India: ${scheme.name}. Official link: ${scheme.link}`
    );

    const reportSubject = encodeURIComponent(`Scholarship correction: ${scheme.name}`);
    const reportBody = encodeURIComponent(
      `Scholarship name: ${scheme.name}\nIssue found:\nOfficial source link:\nSuggested correction:`
    );

    return `
      <div class="scholarship">
        <span class="badge">You may be eligible</span>
        <h3>${scheme.name}</h3>

        <p class="info"><strong>Eligibility Note:</strong> ${scheme.eligibilityNote}</p>
        <p class="info"><strong>Deadline:</strong> ${scheme.deadline}</p>

        <p class="info">
          <strong>Official Link:</strong>
          <a href="${scheme.link}" target="_blank">Apply / Verify</a>
        </p>

        <div class="source-line">
          Source: ${scheme.sourceName} • Last verified: ${scheme.lastVerified}
        </div>

        <div class="docs">
          <strong>Documents Needed:</strong>
          <ul>${docsList}</ul>
        </div>

        <p>
          <a href="https://wa.me/?text=${shareText}" target="_blank">
            Share on WhatsApp
          </a>
        </p>

        <a class="report-link" href="mailto:koushikrajcodex@gmail.com?subject=${reportSubject}&body=${reportBody}">
          Report incorrect information
        </a>
      </div>
    `;
  }).join("");
}

function clearFilters() {
  const searchInput = document.getElementById("search");
  const stateInput = document.getElementById("state");
  const educationInput = document.getElementById("education");
  const categoryInput = document.getElementById("category");
  const incomeInput = document.getElementById("income");
  const resultSummary = document.getElementById("resultSummary");
  const resultsDiv = document.getElementById("results");

  if (searchInput) searchInput.value = "";
  if (stateInput) stateInput.value = "any";
  if (educationInput) educationInput.value = "school";
  if (categoryInput) categoryInput.value = "general";
  if (incomeInput) incomeInput.value = "100000";

  if (resultSummary) resultSummary.innerHTML = "";
  if (resultsDiv) resultsDiv.innerHTML = "";
}

document.addEventListener("DOMContentLoaded", () => {
  const searchInput = document.getElementById("search");
  const stateInput = document.getElementById("state");
  const educationInput = document.getElementById("education");
  const categoryInput = document.getElementById("category");
  const incomeInput = document.getElementById("income");

  if (searchInput) searchInput.addEventListener("input", findScholarships);
  if (stateInput) stateInput.addEventListener("change", findScholarships);
  if (educationInput) educationInput.addEventListener("change", findScholarships);
  if (categoryInput) categoryInput.addEventListener("change", findScholarships);
  if (incomeInput) incomeInput.addEventListener("change", findScholarships);
});