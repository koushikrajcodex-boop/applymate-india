const scholarships = [
  {
    name: "Andhra Pradesh Post-Matric Scholarship - Jnanabhumi",
    state: "andhra-pradesh",
    education: ["intermediate", "degree", "engineering", "pg"],
    categories: ["sc", "st", "bc", "obc", "ebc", "ews", "minority", "kapu", "disabled"],
    maxIncome: 200000,
    deadline: "Check official Jnanabhumi portal",
    link: "https://jnanabhumi.ap.gov.in/",
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
  },
  {
    name: "Pre-Matric Scholarship for Students with Disabilities",
    state: "national",
    education: ["school"],
    categories: ["disabled"],
    maxIncome: 250000,
    deadline: "Check NSP portal",
    link: "https://scholarships.gov.in/",
    lastVerified: "26 June 2026",
    eligibilityNote: "For students with benchmark disabilities studying in eligible school classes.",
    documents: [
      "Aadhaar card",
      "Disability certificate",
      "Income certificate",
      "School bonafide certificate",
      "Previous marks memo",
      "Bank account details",
      "Passport-size photo"
    ]
  },
  {
    name: "Post-Matric Scholarship for Students with Disabilities",
    state: "national",
    education: ["intermediate", "degree", "engineering", "pg"],
    categories: ["disabled"],
    maxIncome: 250000,
    deadline: "Check NSP portal",
    link: "https://scholarships.gov.in/",
    lastVerified: "26 June 2026",
    eligibilityNote: "For students with benchmark disabilities pursuing post-matric education.",
    documents: [
      "Aadhaar card",
      "Disability certificate",
      "Income certificate",
      "Previous marks memo",
      "Bank passbook",
      "Institution bonafide certificate",
      "Fee receipt if required"
    ]
  },
  {
    name: "Top Class Education Scholarship for Students with Disabilities",
    state: "national",
    education: ["degree", "engineering", "pg"],
    categories: ["disabled"],
    maxIncome: 800000,
    deadline: "Check NSP portal",
    link: "https://scholarships.gov.in/",
    lastVerified: "26 June 2026",
    eligibilityNote: "For students with benchmark disabilities in notified top-class institutions.",
    documents: [
      "Aadhaar card",
      "Disability certificate",
      "Income certificate",
      "Admission proof",
      "Previous marks memo",
      "Bank passbook",
      "Institution bonafide certificate"
    ]
  },
  {
    name: "Top Class Education Scheme for OBC / EBC / DNT Students",
    state: "national",
    education: ["degree", "engineering", "pg"],
    categories: ["bc", "obc", "ebc", "ews"],
    maxIncome: 250000,
    deadline: "Check NSP portal",
    link: "https://scholarships.gov.in/",
    lastVerified: "26 June 2026",
    eligibilityNote: "For eligible OBC/EBC/DNT students admitted to prescribed full-time courses/institutions.",
    documents: [
      "Aadhaar card",
      "OBC/EBC/category certificate",
      "Income certificate",
      "Admission proof",
      "Previous marks memo",
      "Bank passbook",
      "Institution bonafide certificate"
    ]
  }
];

function findScholarships() {
  const searchText = document.getElementById("search").value.toLowerCase().trim();
  const selectedState = document.getElementById("state").value;
  const selectedEducation = document.getElementById("education").value;
  const selectedCategory = document.getElementById("category").value;
  const selectedIncome = Number(document.getElementById("income").value);

  const results = scholarships.filter((scheme) => {
    const stateMatch =
      scheme.state === selectedState ||
      scheme.state === "national" ||
      selectedState === "any";

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
    `.toLowerCase();

    const searchMatch =
      searchText === "" || searchableText.includes(searchText);

    return stateMatch && educationMatch && categoryMatch && incomeMatch && searchMatch;
  });

  displayResults(results);
}

function displayResults(results) {
  const resultSummary = document.getElementById("resultSummary");
  const resultsDiv = document.getElementById("results");

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

        <div class="docs">
          <strong>Documents Needed:</strong>
          <ul>${docsList}</ul>
        </div>

        <p>
          <a href="https://wa.me/?text=${shareText}" target="_blank">
            Share on WhatsApp
          </a>
        </p>

        <span class="verified">Last verified: ${scheme.lastVerified}</span>
      </div>
    `;
  }).join("");
}

function clearFilters() {
  document.getElementById("search").value = "";
  document.getElementById("state").value = "any";
  document.getElementById("education").value = "school";
  document.getElementById("category").value = "general";
  document.getElementById("income").value = "100000";

  document.getElementById("resultSummary").innerHTML = "";
  document.getElementById("results").innerHTML = "";
}

document.getElementById("search").addEventListener("input", findScholarships);
document.getElementById("state").addEventListener("change", findScholarships);
document.getElementById("education").addEventListener("change", findScholarships);
document.getElementById("category").addEventListener("change", findScholarships);
document.getElementById("income").addEventListener("change", findScholarships);