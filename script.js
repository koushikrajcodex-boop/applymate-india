const CONTACT_EMAIL = "koushikrajcodex@gmail.com";
const LAST_VERIFIED = "28 June 2026";

const scholarships = [
  {
    name: "Andhra Pradesh Post-Matric Scholarship - Jnanabhumi",
    state: "andhra-pradesh",
    stateLabel: "Andhra Pradesh",
    education: ["intermediate", "degree", "engineering", "pg"],
    categories: ["sc", "st", "bc", "obc", "ebc", "ews", "minority", "kapu", "disabled"],
    maxIncome: 200000,
    deadline: "Check official Jnanabhumi portal",
    link: "https://jnanabhumi.ap.gov.in/",
    sourceName: "Official Jnanabhumi Portal",
    eligibilityNote: "For eligible Andhra Pradesh post-matric students. Rules may vary by department and category.",
    incomeNote: "Income rules can vary by category. Verify on Jnanabhumi.",
    documents: ["Aadhaar card", "Income certificate", "Caste/category certificate if applicable", "Bank passbook", "Previous marks memo", "College bonafide certificate"],
    tags: ["ap", "andhra", "post matric", "fee reimbursement", "jnanabhumi"],
    priority: 95
  },
  {
    name: "Andhra Pradesh Pre-Matric Scholarship - Jnanabhumi",
    state: "andhra-pradesh",
    stateLabel: "Andhra Pradesh",
    education: ["school"],
    categories: ["sc", "st", "bc", "obc", "ebc", "ews", "minority", "kapu", "disabled"],
    maxIncome: 200000,
    deadline: "Check official Jnanabhumi portal",
    link: "https://jnanabhumi.ap.gov.in/",
    sourceName: "Official Jnanabhumi Portal",
    eligibilityNote: "For eligible school students in Andhra Pradesh. Exact class/category rules should be checked officially.",
    incomeNote: "Income/category rules can vary. Verify before applying.",
    documents: ["Aadhaar card", "Income certificate", "Caste/category certificate if applicable", "School bonafide certificate", "Previous class marks memo", "Bank account details"],
    tags: ["ap", "andhra", "pre matric", "school", "jnanabhumi"],
    priority: 82
  },
  {
    name: "Telangana ePASS Post-Matric Scholarship",
    state: "telangana",
    stateLabel: "Telangana",
    education: ["intermediate", "degree", "engineering", "pg"],
    categories: ["sc", "st", "bc", "obc", "ebc", "ews", "minority", "disabled"],
    maxIncome: 200000,
    deadline: "Check official Telangana ePASS portal",
    link: "https://telanganaepass.cgg.gov.in/",
    sourceName: "Official Telangana ePASS Portal",
    eligibilityNote: "For eligible Telangana post-matric students from welfare categories.",
    incomeNote: "Income limits can vary by category and current rules.",
    documents: ["Aadhaar card", "Income certificate", "Caste/category certificate", "SSC / 10th marks memo", "Previous marks memo", "Bank passbook", "College bonafide certificate"],
    tags: ["telangana", "ts", "epass", "post matric", "fee reimbursement"],
    priority: 95
  },
  {
    name: "Telangana ePASS Pre-Matric Scholarship",
    state: "telangana",
    stateLabel: "Telangana",
    education: ["school"],
    categories: ["sc", "st", "bc", "obc", "ebc", "ews", "minority", "disabled"],
    maxIncome: 200000,
    deadline: "Check official Telangana ePASS portal",
    link: "https://telanganaepass.cgg.gov.in/",
    sourceName: "Official Telangana ePASS Portal",
    eligibilityNote: "For eligible school students in Telangana.",
    incomeNote: "Verify current income and class rules on ePASS.",
    documents: ["Aadhaar card", "Income certificate", "Caste/category certificate", "School bonafide certificate", "Previous class marks memo", "Bank account details"],
    tags: ["telangana", "ts", "epass", "pre matric", "school"],
    priority: 82
  },
  {
    name: "National Means-cum-Merit Scholarship Scheme - NMMSS",
    state: "national",
    stateLabel: "National",
    education: ["school"],
    categories: ["general", "sc", "st", "bc", "obc", "minority", "ebc", "ews"],
    maxIncome: 350000,
    deadline: "Check NSP / state education department",
    link: "https://scholarships.gov.in/",
    sourceName: "National Scholarship Portal",
    eligibilityNote: "For eligible school students. Selection and rules depend on official notification.",
    incomeNote: "Usually income-based. Verify state/NSP instructions.",
    documents: ["Aadhaar card", "Income certificate", "School certificate", "Previous marks memo", "Bank account details"],
    tags: ["national", "nsp", "school", "merit", "nmms"],
    priority: 88
  },
  {
    name: "Central Sector Scheme of Scholarship for College and University Students",
    state: "national",
    stateLabel: "National",
    education: ["degree", "engineering", "pg"],
    categories: ["general", "sc", "st", "bc", "obc", "minority", "ebc", "ews"],
    maxIncome: 450000,
    deadline: "Check National Scholarship Portal",
    link: "https://scholarships.gov.in/",
    sourceName: "National Scholarship Portal",
    eligibilityNote: "For eligible meritorious college/university students as per official rules.",
    incomeNote: "Income limit and merit rules should be verified on NSP.",
    documents: ["Aadhaar card", "Income certificate", "Marks memo", "Bank passbook", "College bonafide certificate"],
    tags: ["national", "college", "degree", "university", "merit", "nsp"],
    priority: 86
  },
  {
    name: "AICTE Pragati Scholarship for Girl Students",
    state: "national",
    stateLabel: "National",
    education: ["engineering"],
    categories: ["general", "sc", "st", "bc", "obc", "minority", "ebc", "ews", "girls"],
    maxIncome: 800000,
    deadline: "Check AICTE / NSP portal",
    link: "https://www.aicte-india.org/",
    sourceName: "AICTE",
    eligibilityNote: "For eligible girl students pursuing technical education as per AICTE rules.",
    incomeNote: "Family income rules should be checked on official AICTE/NSP notification.",
    documents: ["Aadhaar card", "Income certificate", "Admission proof", "Marks memo", "Bank details", "College bonafide certificate"],
    tags: ["aicte", "pragati", "girls", "engineering", "technical"],
    priority: 92
  },
  {
    name: "AICTE Saksham Scholarship for Specially Abled Students",
    state: "national",
    stateLabel: "National",
    education: ["engineering"],
    categories: ["disabled"],
    maxIncome: 800000,
    deadline: "Check AICTE / NSP portal",
    link: "https://www.aicte-india.org/",
    sourceName: "AICTE",
    eligibilityNote: "For eligible specially abled students pursuing technical education.",
    incomeNote: "Verify latest income/disability conditions in official notification.",
    documents: ["Aadhaar card", "Disability certificate", "Income certificate", "Admission proof", "Marks memo", "Bank details"],
    tags: ["aicte", "saksham", "disabled", "engineering", "technical"],
    priority: 92
  },
  {
    name: "Post Matric Scholarship for Minorities",
    state: "national",
    stateLabel: "National",
    education: ["intermediate", "degree", "engineering", "pg"],
    categories: ["minority"],
    maxIncome: 200000,
    deadline: "Check NSP",
    link: "https://scholarships.gov.in/",
    sourceName: "National Scholarship Portal",
    eligibilityNote: "For eligible minority community students as per official rules.",
    incomeNote: "Income limit can change. Verify on NSP.",
    documents: ["Aadhaar card", "Income certificate", "Community certificate if required", "Marks memo", "Bank account details"],
    tags: ["minority", "nsp", "post matric", "national"],
    priority: 84
  },
  {
    name: "Pre Matric Scholarship for Minorities",
    state: "national",
    stateLabel: "National",
    education: ["school"],
    categories: ["minority"],
    maxIncome: 100000,
    deadline: "Check NSP",
    link: "https://scholarships.gov.in/",
    sourceName: "National Scholarship Portal",
    eligibilityNote: "For eligible minority school students as per official rules.",
    incomeNote: "Verify latest income rules on NSP.",
    documents: ["Aadhaar card", "Income certificate", "School certificate", "Previous marks memo", "Bank details"],
    tags: ["minority", "pre matric", "school", "nsp"],
    priority: 80
  },
  {
    name: "Scholarship for Students with Disabilities",
    state: "national",
    stateLabel: "National",
    education: ["school", "intermediate", "degree", "engineering", "pg"],
    categories: ["disabled"],
    maxIncome: 250000,
    deadline: "Check NSP",
    link: "https://scholarships.gov.in/",
    sourceName: "National Scholarship Portal",
    eligibilityNote: "For eligible students with benchmark disabilities as per official scheme rules.",
    incomeNote: "Income and disability rules should be verified officially.",
    documents: ["Aadhaar card", "Disability certificate", "Income certificate", "Marks memo", "Bank details"],
    tags: ["disabled", "disability", "nsp", "national"],
    priority: 88
  },
  {
    name: "AP Kapu Welfare Scholarship Support",
    state: "andhra-pradesh",
    stateLabel: "Andhra Pradesh",
    education: ["intermediate", "degree", "engineering", "pg"],
    categories: ["kapu"],
    maxIncome: 200000,
    deadline: "Check AP welfare portals",
    link: "https://jnanabhumi.ap.gov.in/",
    sourceName: "AP Jnanabhumi / Welfare Department",
    eligibilityNote: "For eligible Kapu community students depending on current AP rules.",
    incomeNote: "Verify income and category rules on official portal.",
    documents: ["Aadhaar card", "Income certificate", "Caste/community certificate", "Marks memo", "Bank passbook", "Bonafide certificate"],
    tags: ["ap", "kapu", "welfare", "jnanabhumi"],
    priority: 78
  }
];

function findScholarships() {
  const state = document.getElementById("state").value;
  const education = document.getElementById("education").value;
  const category = document.getElementById("category").value;
  const income = Number(document.getElementById("income").value);
  const search = document.getElementById("search").value.trim().toLowerCase();

  const matches = scholarships
    .map((scholarship) => {
      let score = scholarship.priority || 50;

      const stateMatch = state === "any" || scholarship.state === state || scholarship.state === "national";
      const educationMatch = scholarship.education.includes(education);
      const categoryMatch = scholarship.categories.includes(category) || scholarship.categories.includes("general");
      const incomeMatch = income <= scholarship.maxIncome;

      if (!stateMatch || !educationMatch || !categoryMatch || !incomeMatch) {
        return null;
      }

      if (scholarship.state === state) score += 20;
      if (scholarship.education.includes(education)) score += 15;
      if (scholarship.categories.includes(category)) score += 15;
      if (income <= scholarship.maxIncome) score += 10;

      if (search) {
        const searchable = [
          scholarship.name,
          scholarship.stateLabel,
          scholarship.eligibilityNote,
          scholarship.incomeNote,
          scholarship.sourceName,
          ...scholarship.tags
        ].join(" ").toLowerCase();

        if (!searchable.includes(search)) {
          return null;
        }

        score += 20;
      }

      return { ...scholarship, score };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);

  renderResults(matches);
}

function renderResults(results) {
  const resultSummary = document.getElementById("resultSummary");
  const resultsContainer = document.getElementById("results");

  if (!resultSummary || !resultsContainer) return;

  if (results.length === 0) {
    resultSummary.innerHTML = `
      <div class="content-strip">
        <h2>No Scholarships Found</h2>
        <p>
          No matching scholarships were found for your selected details right now.
          Try changing state, category, income, or education filters.
        </p>
      </div>
    `;
    resultsContainer.innerHTML = "";
    return;
  }

  resultSummary.innerHTML = `
    <div class="content-strip">
      <h2>You may be eligible for these ${results.length} scholarships.</h2>
      <p>These are possible matches based on your selected details. Verify final eligibility on official portals.</p>
    </div>
  `;

  resultsContainer.innerHTML = results.map((scholarship) => {
    const documents = scholarship.documents
      .map((doc) => `<li>${escapeHtml(doc)}</li>`)
      .join("");

    return `
      <article class="scholarship">
        <span class="badge">${escapeHtml(scholarship.stateLabel)}</span>
        <h3>${escapeHtml(scholarship.name)}</h3>

        <p class="info"><strong>Eligibility note:</strong> ${escapeHtml(scholarship.eligibilityNote)}</p>
        <p class="info"><strong>Income note:</strong> ${escapeHtml(scholarship.incomeNote)}</p>
        <p class="info"><strong>Deadline:</strong> ${escapeHtml(scholarship.deadline)}</p>
        <p class="info"><strong>Last verified:</strong> ${escapeHtml(LAST_VERIFIED)}</p>

        <h4>Common documents</h4>
        <ul>${documents}</ul>

        <div class="button-row">
          <a class="text-btn" href="${escapeHtml(scholarship.link)}" target="_blank" rel="noopener noreferrer">
            Official Link
          </a>
          <a class="secondary-btn" href="mailto:${CONTACT_EMAIL}?subject=Correction for ${encodeURIComponent(scholarship.name)}">
            Report Correction
          </a>
        </div>
      </article>
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

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
