const CONTACT_EMAIL = "koushikrajcodex@gmail.com";
const LAST_VERIFIED = "26 June 2026";

const scholarships = [
  {
    name: "Andhra Pradesh Post-Matric Scholarship - Jnanabhumi",
    state: "andhra-pradesh",
    stateLabel: "Andhra Pradesh",
    education: ["intermediate", "degree", "engineering", "pg"],
    categories: ["sc", "st", "bc", "obc", "ebc", "ews", "minority", "kapu", "disabled"],
    maxIncome: 200000,
    incomeNote: "Income rules can vary by category. Verify on Jnanabhumi.",
    deadline: "Check official Jnanabhumi portal",
    link: "https://jnanabhumi.ap.gov.in/",
    sourceName: "Official Jnanabhumi Portal",
    lastVerified: LAST_VERIFIED,
    eligibilityNote: "For eligible Andhra Pradesh post-matric students. Rules may vary by welfare department and category.",
    documents: [
      "Aadhaar card",
      "Income certificate",
      "Caste/category certificate if applicable",
      "Bank passbook",
      "Previous marks memo",
      "College bonafide certificate",
      "Attendance proof if required"
    ],
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
    incomeNote: "Income/category rules can vary. Verify before applying.",
    deadline: "Check official Jnanabhumi portal",
    link: "https://jnanabhumi.ap.gov.in/",
    sourceName: "Official Jnanabhumi Portal",
    lastVerified: LAST_VERIFIED,
    eligibilityNote: "For eligible school students in Andhra Pradesh. Exact class/category rules should be checked on the official portal.",
    documents: [
      "Aadhaar card",
      "Income certificate",
      "Caste/category certificate if applicable",
      "School bonafide certificate",
      "Previous class marks memo",
      "Bank account details",
      "Passport-size photo"
    ],
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
    incomeNote: "Income limits can vary by category and current rules.",
    deadline: "Check official Telangana ePASS portal",
    link: "https://telanganaepass.cgg.gov.in/",
    sourceName: "Official Telangana ePASS Portal",
    lastVerified: LAST_VERIFIED,
    eligibilityNote: "For eligible Telangana post-matric students from welfare categories. Verify category, income, course, and college rules.",
    documents: [
      "Aadhaar card",
      "Income certificate",
      "Caste/category certificate",
      "SSC / 10th marks memo",
      "Previous qualifying exam marks memo",
      "Bank passbook",
      "College bonafide certificate",
      "Passport-size photo"
    ],
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
    incomeNote: "Verify current income and class rules on ePASS.",
    deadline: "Check official Telangana ePASS portal",
    link: "https://telanganaepass.cgg.gov.in/",
    sourceName: "Official Telangana ePASS Portal",
    lastVerified: LAST_VERIFIED,
    eligibilityNote: "For eligible school students in Telangana. Scheme availability depends on category and official rules.",
    documents: [
      "Aadhaar card",
      "Income certificate",
      "Caste/category certificate",
      "School bonafide certificate",
      "Previous class marks memo",
      "Bank account details",
      "Passport-size photo"
    ],
    tags: ["telangana", "ts", "epass", "pre matric", "school"],
    priority: 82
  },
  {
    name: "Telangana ePASS Disabled Welfare Post-Matric Scholarship",
    state: "telangana",
    stateLabel: "Telangana",
    education: ["intermediate", "degree", "engineering", "pg"],
    categories: ["disabled"],
    maxIncome: 100000,
    incomeNote: "Verify current income and disability rules on ePASS.",
    deadline: "Check official Telangana ePASS portal",
    link: "https://telanganaepass.cgg.gov.in/",
    sourceName: "Official Telangana ePASS Portal",
    lastVerified: LAST_VERIFIED,
    eligibilityNote: "For Telangana students applying under disability welfare scholarship support.",
    documents: [
      "Aadhaar card",
      "Disability certificate",
      "Income certificate",
      "SSC / 10th marks memo",
      "Previous marks memo",
      "Bank passbook",
      "College bonafide certificate"
    ],
    tags: ["telangana", "disabled", "epass", "post matric"],
    priority: 90
  },
  {
    name: "National Means-cum-Merit Scholarship Scheme - NMMSS",
    state: "national",
    stateLabel: "National",
    education: ["school"],
    categories: ["general", "sc", "st", "bc", "obc", "minority", "ebc", "ews"],
    maxIncome: 350000,
    incomeNote: "Usually income-based. Verify state/NSP instructions.",
    deadline: "Check NSP / state education department",
    link: "https://scholarships.gov.in/",
    sourceName: "National Scholarship Portal",
    lastVerified: LAST_VERIFIED,
    eligibilityNote: "For eligible school students. Selection usually depends on state-level examination/process.",
    documents: [
      "Aadhaar card",
      "Income certificate",
      "School bonafide certificate",
      "Previous class marks memo",
      "Bank account details",
      "Caste/category certificate if applicable"
    ],
    tags: ["nsp", "school", "merit", "nmms", "nmmss"],
    priority: 88
  },
  {
    name: "Central Sector Scheme of Scholarship for College and University Students",
    state: "national",
    stateLabel: "National",
    education: ["degree", "engineering", "pg"],
    categories: ["general", "sc", "st", "bc", "obc", "minority", "ebc", "ews", "disabled"],
    maxIncome: 800000,
    incomeNote: "Merit/income rules apply. Verify on NSP.",
    deadline: "Check National Scholarship Portal",
    link: "https://scholarships.gov.in/",
    sourceName: "National Scholarship Portal",
    lastVerified: LAST_VERIFIED,
    eligibilityNote: "For meritorious students pursuing higher education. Exact eligibility depends on official scheme guidelines.",
    documents: [
      "Aadhaar card",
      "Class 12 marks memo",
      "Admission proof",
      "Income certificate",
      "Bank passbook",
      "Institution verification details",
      "Bonafide certificate if required"
    ],
    tags: ["nsp", "central sector", "college", "university", "merit"],
    priority: 86
  },
  {
    name: "Post-Matric Scholarship for SC Students",
    state: "national",
    stateLabel: "National / State",
    education: ["intermediate", "degree", "engineering", "pg"],
    categories: ["sc"],
    maxIncome: 250000,
    incomeNote: "Income/category rules must be verified on NSP or state portal.",
    deadline: "Check NSP / state portal",
    link: "https://scholarships.gov.in/",
    sourceName: "National Scholarship Portal / State Portal",
    lastVerified: LAST_VERIFIED,
    eligibilityNote: "For eligible SC students pursuing post-matric education. Process may happen through NSP or state portals.",
    documents: [
      "Aadhaar card",
      "SC caste certificate",
      "Income certificate",
      "Previous marks memo",
      "Bank passbook",
      "Institution bonafide certificate",
      "Fee receipt if required"
    ],
    tags: ["sc", "post matric", "nsp", "state scholarship"],
    priority: 90
  },
  {
    name: "Post-Matric Scholarship for ST Students",
    state: "national",
    stateLabel: "National / State",
    education: ["intermediate", "degree", "engineering", "pg"],
    categories: ["st"],
    maxIncome: 250000,
    incomeNote: "Income/category rules must be verified on NSP or state portal.",
    deadline: "Check NSP / state portal",
    link: "https://scholarships.gov.in/",
    sourceName: "National Scholarship Portal / State Portal",
    lastVerified: LAST_VERIFIED,
    eligibilityNote: "For eligible ST students pursuing post-matric education. Exact process depends on state/UT and official rules.",
    documents: [
      "Aadhaar card",
      "ST caste certificate",
      "Income certificate",
      "Previous marks memo",
      "Bank passbook",
      "Institution bonafide certificate",
      "Fee receipt if required"
    ],
    tags: ["st", "post matric", "nsp", "state scholarship"],
    priority: 90
  },
  {
    name: "Post-Matric Scholarship for OBC / EBC / DNT Students",
    state: "national",
    stateLabel: "National / State",
    education: ["intermediate", "degree", "engineering", "pg"],
    categories: ["bc", "obc", "ebc", "ews"],
    maxIncome: 250000,
    incomeNote: "Exact category mapping depends on state and official rules.",
    deadline: "Check NSP / state portal",
    link: "https://scholarships.gov.in/",
    sourceName: "National Scholarship Portal / State Portal",
    lastVerified: LAST_VERIFIED,
    eligibilityNote: "For eligible OBC/EBC/DNT students studying after matriculation. Verify current state/category rules.",
    documents: [
      "Aadhaar card",
      "OBC/EBC/category certificate",
      "Income certificate",
      "Previous marks memo",
      "Bank passbook",
      "Institution bonafide certificate",
      "Fee receipt if required"
    ],
    tags: ["obc", "bc", "ebc", "dnt", "post matric", "nsp"],
    priority: 88
  },
  {
    name: "Pre-Matric Scholarship for Students with Disabilities",
    state: "national",
    stateLabel: "National",
    education: ["school"],
    categories: ["disabled"],
    maxIncome: 250000,
    incomeNote: "Verify disability and income rules on NSP.",
    deadline: "Check National Scholarship Portal",
    link: "https://scholarships.gov.in/",
    sourceName: "National Scholarship Portal",
    lastVerified: LAST_VERIFIED,
    eligibilityNote: "For eligible school students with benchmark disabilities.",
    documents: [
      "Aadhaar card",
      "Disability certificate",
      "Income certificate",
      "School bonafide certificate",
      "Previous marks memo",
      "Bank account details",
      "Passport-size photo"
    ],
    tags: ["disabled", "pre matric", "school", "nsp"],
    priority: 86
  },
  {
    name: "Post-Matric Scholarship for Students with Disabilities",
    state: "national",
    stateLabel: "National",
    education: ["intermediate", "degree", "engineering", "pg"],
    categories: ["disabled"],
    maxIncome: 250000,
    incomeNote: "Verify disability and income rules on NSP.",
    deadline: "Check National Scholarship Portal",
    link: "https://scholarships.gov.in/",
    sourceName: "National Scholarship Portal",
    lastVerified: LAST_VERIFIED,
    eligibilityNote: "For eligible students with benchmark disabilities pursuing post-matric education.",
    documents: [
      "Aadhaar card",
      "Disability certificate",
      "Income certificate",
      "Previous marks memo",
      "Bank passbook",
      "Institution bonafide certificate",
      "Fee receipt if required"
    ],
    tags: ["disabled", "post matric", "nsp"],
    priority: 88
  },
  {
    name: "Top Class Education Scholarship for Students with Disabilities",
    state: "national",
    stateLabel: "National",
    education: ["degree", "engineering", "pg"],
    categories: ["disabled"],
    maxIncome: 800000,
    incomeNote: "Verify institution/course eligibility on NSP.",
    deadline: "Check National Scholarship Portal",
    link: "https://scholarships.gov.in/",
    sourceName: "National Scholarship Portal",
    lastVerified: LAST_VERIFIED,
    eligibilityNote: "For eligible students with disabilities studying in notified top-class institutions.",
    documents: [
      "Aadhaar card",
      "Disability certificate",
      "Income certificate",
      "Admission proof",
      "Previous marks memo",
      "Bank passbook",
      "Institution bonafide certificate"
    ],
    tags: ["disabled", "top class", "degree", "engineering", "nsp"],
    priority: 89
  },
  {
    name: "Central Sector Scholarship of Top Class Education for SC Students",
    state: "national",
    stateLabel: "National",
    education: ["degree", "engineering", "pg"],
    categories: ["sc"],
    maxIncome: 800000,
    incomeNote: "Verify notified institution and income rules on NSP.",
    deadline: "Check National Scholarship Portal",
    link: "https://scholarships.gov.in/All-Scholarships",
    sourceName: "National Scholarship Portal",
    lastVerified: LAST_VERIFIED,
    eligibilityNote: "For eligible SC students admitted to notified top-class institutions/courses.",
    documents: [
      "Aadhaar card",
      "SC caste certificate",
      "Income certificate",
      "Admission proof",
      "Previous marks memo",
      "Bank passbook",
      "Institution bonafide certificate"
    ],
    tags: ["sc", "top class", "college", "nsp"],
    priority: 87
  },
  {
    name: "PM YASASVI Top Class Education in College for OBC / EBC / DNT Students",
    state: "national",
    stateLabel: "National",
    education: ["degree", "engineering", "pg"],
    categories: ["bc", "obc", "ebc", "ews"],
    maxIncome: 250000,
    incomeNote: "Verify category/income/institution rules on NSP.",
    deadline: "Check National Scholarship Portal",
    link: "https://scholarships.gov.in/All-Scholarships",
    sourceName: "National Scholarship Portal",
    lastVerified: LAST_VERIFIED,
    eligibilityNote: "For eligible OBC/EBC/DNT students in higher education under PM YASASVI-related scheme listings.",
    documents: [
      "Aadhaar card",
      "OBC/EBC/DNT certificate",
      "Income certificate",
      "Admission proof",
      "Previous marks memo",
      "Bank passbook",
      "Institution bonafide certificate"
    ],
    tags: ["pm yasasvi", "obc", "ebc", "dnt", "college", "nsp"],
    priority: 86
  },
  {
    name: "PM YASASVI Top Class Education in Schools for OBC / EBC / DNT Students",
    state: "national",
    stateLabel: "National",
    education: ["school"],
    categories: ["bc", "obc", "ebc", "ews"],
    maxIncome: 250000,
    incomeNote: "Verify class, school, category, and income rules.",
    deadline: "Check National Scholarship Portal",
    link: "https://scholarships.gov.in/All-Scholarships",
    sourceName: "National Scholarship Portal",
    lastVerified: LAST_VERIFIED,
    eligibilityNote: "For eligible OBC/EBC/DNT school students under PM YASASVI-related scheme listings.",
    documents: [
      "Aadhaar card",
      "OBC/EBC/DNT certificate",
      "Income certificate",
      "School bonafide certificate",
      "Previous class marks memo",
      "Bank account details",
      "Passport-size photo"
    ],
    tags: ["pm yasasvi", "school", "obc", "ebc", "dnt", "nsp"],
    priority: 84
  },
  {
    name: "AICTE Pragati Scholarship for Girl Students",
    state: "national",
    stateLabel: "National",
    education: ["degree", "engineering"],
    categories: ["girls"],
    maxIncome: 800000,
    incomeNote: "Verify AICTE course/institution and family income rules.",
    deadline: "Check official AICTE / NSP portal",
    link: "https://www.aicte-pragati-saksham-gov.in/",
    sourceName: "AICTE Pragati / Saksham Portal",
    lastVerified: LAST_VERIFIED,
    eligibilityNote: "For eligible girl students admitted to AICTE-approved technical courses.",
    documents: [
      "Aadhaar card",
      "Admission proof",
      "Income certificate",
      "Previous marks memo",
      "Bank passbook",
      "Bonafide certificate",
      "Passport-size photo"
    ],
    tags: ["aicte", "pragati", "girls", "engineering", "technical"],
    priority: 92
  },
  {
    name: "AICTE Saksham Scholarship for Specially-Abled Students",
    state: "national",
    stateLabel: "National",
    education: ["degree", "engineering"],
    categories: ["disabled"],
    maxIncome: 800000,
    incomeNote: "Verify AICTE disability, institution, course, and income rules.",
    deadline: "Check official AICTE / NSP portal",
    link: "https://www.aicte-pragati-saksham-gov.in/",
    sourceName: "AICTE Pragati / Saksham Portal",
    lastVerified: LAST_VERIFIED,
    eligibilityNote: "For eligible specially-abled students in AICTE-approved technical courses.",
    documents: [
      "Aadhaar card",
      "Disability certificate",
      "Admission proof",
      "Income certificate",
      "Previous marks memo",
      "Bank passbook",
      "Bonafide certificate"
    ],
    tags: ["aicte", "saksham", "disabled", "engineering", "technical"],
    priority: 92
  },
  {
    name: "AICTE Swanath Scholarship Scheme",
    state: "national",
    stateLabel: "National",
    education: ["degree", "engineering"],
    categories: ["general", "sc", "st", "bc", "obc", "minority", "ebc", "ews", "disabled"],
    maxIncome: 800000,
    incomeNote: "Verify Swanath-specific eligibility and family income rules.",
    deadline: "Check official AICTE Swanath page / NSP",
    link: "https://www.aicte.gov.in/schemes/students-development-schemes/Swanath/General-Instructions",
    sourceName: "AICTE Swanath Scheme Page",
    lastVerified: LAST_VERIFIED,
    eligibilityNote: "For eligible students under AICTE Swanath conditions such as orphan/COVID-affected/martyr wards in technical education.",
    documents: [
      "Aadhaar card",
      "Admission proof",
      "Income certificate",
      "Relevant Swanath eligibility proof",
      "Previous marks memo",
      "Bank passbook",
      "Institution bonafide certificate"
    ],
    tags: ["aicte", "swanath", "technical", "engineering", "degree"],
    priority: 84
  },
  {
    name: "INSPIRE Scholarship for Higher Education - SHE",
    state: "national",
    stateLabel: "National",
    education: ["degree"],
    categories: ["general", "sc", "st", "bc", "obc", "minority", "ebc", "ews", "disabled"],
    maxIncome: 1000000,
    incomeNote: "Merit/science eligibility is more important. Verify official DST rules.",
    deadline: "Check official INSPIRE portal",
    link: "https://online-inspire.gov.in/",
    sourceName: "INSPIRE / Department of Science & Technology",
    lastVerified: LAST_VERIFIED,
    eligibilityNote: "For meritorious students pursuing basic and natural sciences. Verify subject, rank, and eligibility rules officially.",
    documents: [
      "Aadhaar card",
      "Class 12 marks memo",
      "Admission proof",
      "Course/institution details",
      "Bank account details",
      "Passport-size photo",
      "Certificates required by INSPIRE portal"
    ],
    tags: ["inspire", "dst", "science", "degree", "merit"],
    priority: 82
  },
  {
    name: "ICAR National Talent Scholarship - UG",
    state: "national",
    stateLabel: "National",
    education: ["degree"],
    categories: ["general", "sc", "st", "bc", "obc", "minority", "ebc", "ews"],
    maxIncome: 1000000,
    incomeNote: "Verify ICAR/NSP eligibility and course rules.",
    deadline: "Check National Scholarship Portal",
    link: "https://scholarships.gov.in/All-Scholarships",
    sourceName: "National Scholarship Portal",
    lastVerified: LAST_VERIFIED,
    eligibilityNote: "For eligible students under ICAR-related scholarship listings. Verify course and admission rules before applying.",
    documents: [
      "Aadhaar card",
      "Admission proof",
      "Previous marks memo",
      "Bank passbook",
      "Institution bonafide certificate",
      "Category certificate if applicable"
    ],
    tags: ["icar", "agriculture", "national talent", "nsp", "degree"],
    priority: 78
  },
  {
    name: "National Renewable Energy Fellowship Scheme",
    state: "national",
    stateLabel: "National",
    education: ["pg"],
    categories: ["general", "sc", "st", "bc", "obc", "minority", "ebc", "ews", "disabled"],
    maxIncome: 1000000,
    incomeNote: "Verify fellowship-specific eligibility on NSP.",
    deadline: "Check National Scholarship Portal",
    link: "https://scholarships.gov.in/All-Scholarships",
    sourceName: "National Scholarship Portal",
    lastVerified: LAST_VERIFIED,
    eligibilityNote: "For eligible students in renewable energy-related higher studies/research as per current NSP scheme listing.",
    documents: [
      "Aadhaar card",
      "Admission/research proof",
      "Previous marks memo",
      "Bank passbook",
      "Institution details",
      "Category certificate if applicable"
    ],
    tags: ["renewable energy", "fellowship", "pg", "nsp"],
    priority: 72
  },
  {
    name: "Scholarship for Top Class Education for Students with Disabilities",
    state: "national",
    stateLabel: "National",
    education: ["degree", "engineering", "pg"],
    categories: ["disabled"],
    maxIncome: 800000,
    incomeNote: "Verify institution list and disability eligibility on NSP.",
    deadline: "Check National Scholarship Portal",
    link: "https://scholarships.gov.in/All-Scholarships",
    sourceName: "National Scholarship Portal",
    lastVerified: LAST_VERIFIED,
    eligibilityNote: "For eligible students with disabilities studying in approved top-class institutions.",
    documents: [
      "Aadhaar card",
      "Disability certificate",
      "Income certificate",
      "Admission proof",
      "Previous marks memo",
      "Bank passbook",
      "Institution bonafide certificate"
    ],
    tags: ["disabled", "top class", "nsp", "degree", "pg"],
    priority: 88
  }
];

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getElement(id) {
  return document.getElementById(id);
}

function findScholarships() {
  const searchInput = getElement("search");
  const stateInput = getElement("state");
  const educationInput = getElement("education");
  const categoryInput = getElement("category");
  const incomeInput = getElement("income");

  if (!searchInput || !stateInput || !educationInput || !categoryInput || !incomeInput) {
    return;
  }

  const searchText = searchInput.value.toLowerCase().trim();
  const selectedState = stateInput.value;
  const selectedEducation = educationInput.value;
  const selectedCategory = categoryInput.value;
  const selectedIncome = Number(incomeInput.value);

  const results = scholarships
    .filter((scheme) => {
      const stateMatch =
        selectedState === "any" ||
        scheme.state === selectedState ||
        scheme.state === "national";

      const educationMatch = scheme.education.includes(selectedEducation);
      const categoryMatch = scheme.categories.includes(selectedCategory);
      const incomeMatch = scheme.maxIncome === null || selectedIncome <= scheme.maxIncome;

      const searchableText = [
        scheme.name,
        scheme.state,
        scheme.stateLabel,
        scheme.education.join(" "),
        scheme.categories.join(" "),
        scheme.documents.join(" "),
        scheme.eligibilityNote,
        scheme.sourceName,
        scheme.incomeNote,
        scheme.tags.join(" ")
      ].join(" ").toLowerCase();

      const searchMatch = searchText === "" || searchableText.includes(searchText);

      return stateMatch && educationMatch && categoryMatch && incomeMatch && searchMatch;
    })
    .sort((a, b) => b.priority - a.priority || a.name.localeCompare(b.name));

  displayResults(results);
}

function displayResults(results) {
  const resultSummary = getElement("resultSummary");
  const resultsDiv = getElement("results");

  if (!resultSummary || !resultsDiv) {
    return;
  }

  if (results.length === 0) {
    resultSummary.innerHTML = "";
    resultsDiv.innerHTML = `
      <div class="no-result">
        <h3>No clear match found</h3>
        <p>Try changing category, income, education level, state, or search keyword.</p>
        <p>Some scholarships may still be available on official portals even if they do not appear here.</p>
        <p>
          <a href="guides.html">Read scholarship guides</a> or
          <a href="mailto:${CONTACT_EMAIL}?subject=Suggest a Scholarship">suggest a scholarship to add</a>.
        </p>
      </div>
    `;
    return;
  }

  resultSummary.innerHTML = `
    <div class="summary">
      Found ${results.length} possible scholarship match${results.length > 1 ? "es" : ""}.
      Always verify final eligibility on the official portal.
    </div>
  `;

  resultsDiv.innerHTML = results.map((scheme) => {
    const docsList = scheme.documents
      .map((doc) => `<li>${escapeHtml(doc)}</li>`)
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
        <span class="badge">Possible match</span>

        <h3>${escapeHtml(scheme.name)}</h3>

        <p class="info"><strong>State / Level:</strong> ${escapeHtml(scheme.stateLabel)}</p>
        <p class="info"><strong>Eligibility Note:</strong> ${escapeHtml(scheme.eligibilityNote)}</p>
        <p class="info"><strong>Income Note:</strong> ${escapeHtml(scheme.incomeNote)}</p>
        <p class="info"><strong>Deadline:</strong> ${escapeHtml(scheme.deadline)}</p>

        <p class="info">
          <strong>Official Link:</strong>
          <a href="${escapeHtml(scheme.link)}" target="_blank" rel="noopener noreferrer">Apply / Verify</a>
        </p>

        <div class="source-line">
          Source: ${escapeHtml(scheme.sourceName)} • Last verified: ${escapeHtml(scheme.lastVerified)}
        </div>

        <div class="docs">
          <strong>Documents commonly needed:</strong>
          <ul>${docsList}</ul>
        </div>

        <p>
          <a href="https://wa.me/?text=${shareText}" target="_blank" rel="noopener noreferrer">
            Share on WhatsApp
          </a>
        </p>

        <a class="report-link" href="mailto:${CONTACT_EMAIL}?subject=${reportSubject}&body=${reportBody}">
          Report incorrect information
        </a>
      </div>
    `;
  }).join("");
}

function clearFilters() {
  const searchInput = getElement("search");
  const stateInput = getElement("state");
  const educationInput = getElement("education");
  const categoryInput = getElement("category");
  const incomeInput = getElement("income");
  const resultSummary = getElement("resultSummary");
  const resultsDiv = getElement("results");

  if (searchInput) searchInput.value = "";
  if (stateInput) stateInput.value = "any";
  if (educationInput) educationInput.value = "school";
  if (categoryInput) categoryInput.value = "general";
  if (incomeInput) incomeInput.value = "100000";

  if (resultSummary) resultSummary.innerHTML = "";
  if (resultsDiv) resultsDiv.innerHTML = "";
}

document.addEventListener("DOMContentLoaded", () => {
  const searchInput = getElement("search");
  const stateInput = getElement("state");
  const educationInput = getElement("education");
  const categoryInput = getElement("category");
  const incomeInput = getElement("income");

  if (searchInput) searchInput.addEventListener("input", findScholarships);
  if (stateInput) stateInput.addEventListener("change", findScholarships);
  if (educationInput) educationInput.addEventListener("change", findScholarships);
  if (categoryInput) categoryInput.addEventListener("change", findScholarships);
  if (incomeInput) incomeInput.addEventListener("change", findScholarships);
});
