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
    documents: [
      "Aadhaar card",
      "Income certificate",
      "Caste/category certificate if applicable",
      "Bank passbook",
      "Previous marks memo",
      "College bonafide certificate"
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
    deadline: "Check official Jnanabhumi portal",
    link: "https://jnanabhumi.ap.gov.in/",
    sourceName: "Official Jnanabhumi Portal",
    eligibilityNote: "For eligible school students in Andhra Pradesh. Exact class/category rules should be checked officially.",
    incomeNote: "Income/category rules can vary. Verify before applying.",
    documents: [
      "Aadhaar card",
      "Income certificate",
      "Caste/category certificate if applicable",
      "School bonafide certificate",
      "Previous class marks memo",
      "Bank account details"
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
    deadline: "Check official Telangana ePASS portal",
    link: "https://telanganaepass.cgg.gov.in/",
    sourceName: "Official Telangana ePASS Portal",
    eligibilityNote: "For eligible Telangana post-matric students from welfare categories.",
    incomeNote: "Income limits can vary by category and current rules.",
    documents: [
      "Aadhaar card",
      "Income certificate",
      "Caste/category certificate",
      "SSC / 10th marks memo",
      "Previous marks memo",
      "Bank passbook",
      "College bonafide certificate"
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
    deadline: "Check official Telangana ePASS portal",
    link: "https://telanganaepass.cgg.gov.in/",
    sourceName: "Official Telangana ePASS Portal",
    eligibilityNote: "For eligible school students in Telangana.",
    incomeNote: "Verify current income and class rules on ePASS.",
    documents: [
      "Aadhaar card",
      "Income certificate",
      "Caste/category certificate",
      "School bonafide certificate",
      "Previous class marks memo",
      "Bank account details"
    ],
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
    documents: [
      "Aadhaar card",
      "Income certificate",
      "School certificate",
      "Previous marks memo",
      "Bank account details"
    ],
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
    documents: [
      "Aadhaar card",
      "Income certificate",
      "Marks memo",
      "Bank passbook",
      "College bonafide certificate"
    ],
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
    documents: [
      "Aadhaar card",
      "Income certificate",
      "Admission proof",
      "Marks memo",
      "Bank details",
      "College bonafide certificate"
    ],
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
    documents: [
      "Aadhaar card",
      "Disability certificate",
      "Income certificate",
      "Admission proof",
      "Marks memo",
      "Bank details"
    ],
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
    documents: [
      "Aadhaar card",
      "Income certificate",
      "Community certificate if required",
      "Marks memo",
      "Bank account details"
    ],
    tags: ["minority", "nsp", "post matric", "national"],
    priority: 84
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
    documents: [
      "Aadhaar card",
      "Disability certificate",
      "Income certificate",
      "Marks memo",
      "Bank details"
    ],
    tags: ["disabled", "disability", "nsp", "national"],
    priority: 88
  }
,
  {
    name: "AICTE Pragati Scholarship for Girl Students - Technical Diploma",
    state: "national",
    stateLabel: "National",
    education: ["engineering"],
    categories: ["general", "sc", "st", "bc", "obc", "minority", "ebc", "ews", "girls"],
    maxIncome: 800000,
    deadline: "Check AICTE / NSP portal",
    link: "https://scholarships.gov.in/",
    sourceName: "National Scholarship Portal / AICTE",
    eligibilityNote: "For eligible girl students pursuing technical diploma education as per AICTE rules.",
    incomeNote: "Family income rules should be verified on official AICTE/NSP notification.",
    documents: [
      "Aadhaar card",
      "Income certificate",
      "Admission proof",
      "Marks memo",
      "Bank details",
      "Institution certificate"
    ],
    tags: ["aicte", "pragati", "girls", "diploma", "technical"],
    priority: 90
  },
  {
    name: "AICTE Saksham Scholarship for Specially Abled Students - Technical Diploma",
    state: "national",
    stateLabel: "National",
    education: ["engineering"],
    categories: ["disabled"],
    maxIncome: 800000,
    deadline: "Check AICTE / NSP portal",
    link: "https://scholarships.gov.in/",
    sourceName: "National Scholarship Portal / AICTE",
    eligibilityNote: "For eligible specially abled students pursuing technical diploma education.",
    incomeNote: "Verify latest income and disability conditions in official notification.",
    documents: [
      "Aadhaar card",
      "Disability certificate",
      "Income certificate",
      "Admission proof",
      "Marks memo",
      "Bank details"
    ],
    tags: ["aicte", "saksham", "disabled", "diploma", "technical"],
    priority: 90
  },
  {
    name: "AICTE Swanath Scholarship Scheme - Technical Degree",
    state: "national",
    stateLabel: "National",
    education: ["engineering"],
    categories: ["general", "sc", "st", "bc", "obc", "minority", "ebc", "ews"],
    maxIncome: 1000000,
    deadline: "Check AICTE / NSP portal",
    link: "https://scholarships.gov.in/",
    sourceName: "National Scholarship Portal / AICTE",
    eligibilityNote: "For eligible students under AICTE Swanath scheme conditions. Verify official criteria before applying.",
    incomeNote: "Income and special eligibility rules should be verified on NSP/AICTE.",
    documents: [
      "Aadhaar card",
      "Admission proof",
      "Marks memo",
      "Bank details",
      "Relevant eligibility certificate",
      "Institution certificate"
    ],
    tags: ["aicte", "swanath", "engineering", "technical", "welfare"],
    priority: 89
  },
  {
    name: "AICTE Swanath Scholarship Scheme - Technical Diploma",
    state: "national",
    stateLabel: "National",
    education: ["engineering"],
    categories: ["general", "sc", "st", "bc", "obc", "minority", "ebc", "ews"],
    maxIncome: 1000000,
    deadline: "Check AICTE / NSP portal",
    link: "https://scholarships.gov.in/",
    sourceName: "National Scholarship Portal / AICTE",
    eligibilityNote: "For eligible technical diploma students under AICTE Swanath scheme conditions.",
    incomeNote: "Income and special eligibility rules should be checked officially.",
    documents: [
      "Aadhaar card",
      "Admission proof",
      "Marks memo",
      "Bank details",
      "Relevant eligibility certificate",
      "Institution certificate"
    ],
    tags: ["aicte", "swanath", "diploma", "technical", "welfare"],
    priority: 88
  },
  {
    name: "PM YASASVI Top Class Education in College for OBC, EBC and DNT Students",
    state: "national",
    stateLabel: "National",
    education: ["degree", "engineering", "pg"],
    categories: ["bc", "obc", "ebc"],
    maxIncome: 1000000,
    deadline: "Check National Scholarship Portal",
    link: "https://scholarships.gov.in/",
    sourceName: "National Scholarship Portal",
    eligibilityNote: "For eligible OBC, EBC and DNT students as per PM YASASVI official scheme rules.",
    incomeNote: "Income and category rules should be verified on NSP.",
    documents: [
      "Aadhaar card",
      "Income certificate",
      "Category certificate",
      "Admission proof",
      "Marks memo",
      "Bank details"
    ],
    tags: ["pm yasasvi", "obc", "ebc", "dnt", "college", "nsp"],
    priority: 87
  },
  {
    name: "PM YASASVI Top Class Education in Schools for OBC, EBC and DNT Students",
    state: "national",
    stateLabel: "National",
    education: ["school"],
    categories: ["bc", "obc", "ebc"],
    maxIncome: 1000000,
    deadline: "Check National Scholarship Portal",
    link: "https://scholarships.gov.in/",
    sourceName: "National Scholarship Portal",
    eligibilityNote: "For eligible school students from OBC, EBC and DNT communities as per official scheme rules.",
    incomeNote: "Verify latest income and school-level rules on NSP.",
    documents: [
      "Aadhaar card",
      "Income certificate",
      "Category certificate",
      "School certificate",
      "Previous class marks memo",
      "Bank details"
    ],
    tags: ["pm yasasvi", "school", "obc", "ebc", "dnt", "nsp"],
    priority: 84
  },
  {
    name: "Central Sector Scholarship of Top Class Education for SC Students",
    state: "national",
    stateLabel: "National",
    education: ["degree", "engineering", "pg"],
    categories: ["sc"],
    maxIncome: 1000000,
    deadline: "Check National Scholarship Portal",
    link: "https://scholarships.gov.in/",
    sourceName: "National Scholarship Portal",
    eligibilityNote: "For eligible SC students pursuing higher education as per official scheme guidelines.",
    incomeNote: "Income and institution/course rules should be verified officially.",
    documents: [
      "Aadhaar card",
      "SC caste certificate",
      "Income certificate",
      "Admission proof",
      "Marks memo",
      "Bank details"
    ],
    tags: ["sc", "top class", "higher education", "nsp", "central sector"],
    priority: 88
  },
  {
    name: "National Fellowship and Scholarship for Higher Education of ST Students",
    state: "national",
    stateLabel: "National",
    education: ["degree", "engineering", "pg"],
    categories: ["st"],
    maxIncome: 1000000,
    deadline: "Check National Scholarship Portal",
    link: "https://scholarships.gov.in/",
    sourceName: "National Scholarship Portal",
    eligibilityNote: "For eligible ST students pursuing higher education under official Ministry of Tribal Affairs rules.",
    incomeNote: "Verify latest eligibility and income rules on NSP.",
    documents: [
      "Aadhaar card",
      "ST certificate",
      "Income certificate",
      "Admission proof",
      "Marks memo",
      "Bank details"
    ],
    tags: ["st", "tribal", "higher education", "nsp", "fellowship"],
    priority: 88
  },
  {
    name: "National Scholarship for Post Graduate Studies",
    state: "national",
    stateLabel: "National",
    education: ["pg"],
    categories: ["general", "sc", "st", "bc", "obc", "minority", "ebc", "ews"],
    maxIncome: 1000000,
    deadline: "Check National Scholarship Portal",
    link: "https://scholarships.gov.in/",
    sourceName: "National Scholarship Portal / UGC",
    eligibilityNote: "For eligible postgraduate students as per UGC/NSP scheme rules.",
    incomeNote: "Check official notification for latest eligibility and income rules.",
    documents: [
      "Aadhaar card",
      "PG admission proof",
      "Previous marks memo",
      "Bank details",
      "Institution certificate"
    ],
    tags: ["ugc", "post graduate", "pg", "national", "nsp"],
    priority: 82
  },
  {
    name: "Ishan Uday Special Scholarship Scheme for North Eastern Region",
    state: "national",
    stateLabel: "National",
    education: ["degree", "engineering", "pg"],
    categories: ["general", "sc", "st", "bc", "obc", "minority", "ebc", "ews"],
    maxIncome: 1000000,
    deadline: "Check National Scholarship Portal",
    link: "https://scholarships.gov.in/",
    sourceName: "National Scholarship Portal / UGC",
    eligibilityNote: "For eligible students from the North Eastern Region as per official scheme rules.",
    incomeNote: "Verify domicile, income and course rules on NSP.",
    documents: [
      "Aadhaar card",
      "Domicile/residence proof",
      "Income certificate",
      "Admission proof",
      "Marks memo",
      "Bank details"
    ],
    tags: ["ishan uday", "north east", "ugc", "national", "nsp"],
    priority: 81
  },
  {
    name: "Prime Minister's Scholarship Scheme for Wards of States/UTs Police Personnel Martyred During Terror/Naxal Attacks",
    state: "national",
    stateLabel: "National",
    education: ["degree", "engineering", "pg"],
    categories: ["general", "sc", "st", "bc", "obc", "minority", "ebc", "ews"],
    maxIncome: 1000000,
    deadline: "Check National Scholarship Portal",
    link: "https://scholarships.gov.in/",
    sourceName: "National Scholarship Portal / Ministry of Home Affairs",
    eligibilityNote: "For eligible wards of States/UTs police personnel as per Ministry of Home Affairs scheme rules.",
    incomeNote: "Special eligibility conditions should be verified on NSP.",
    documents: [
      "Aadhaar card",
      "Service/eligibility certificate",
      "Admission proof",
      "Marks memo",
      "Bank details",
      "Institution certificate"
    ],
    tags: ["prime minister scholarship", "police", "mha", "national", "nsp"],
    priority: 80
  },
  {
    name: "Prime Minister's Scholarship Scheme for Central Armed Police Forces and Assam Rifles",
    state: "national",
    stateLabel: "National",
    education: ["degree", "engineering", "pg"],
    categories: ["general", "sc", "st", "bc", "obc", "minority", "ebc", "ews"],
    maxIncome: 1000000,
    deadline: "Check National Scholarship Portal",
    link: "https://scholarships.gov.in/",
    sourceName: "National Scholarship Portal / Ministry of Home Affairs",
    eligibilityNote: "For eligible wards of Central Armed Police Forces and Assam Rifles personnel as per official rules.",
    incomeNote: "Special eligibility and service-related rules should be checked officially.",
    documents: [
      "Aadhaar card",
      "Service/eligibility certificate",
      "Admission proof",
      "Marks memo",
      "Bank details",
      "Institution certificate"
    ],
    tags: ["prime minister scholarship", "capf", "assam rifles", "mha", "nsp"],
    priority: 80
  },
  {
    name: "Financial Assistance for Education to Wards of Beedi/Cine/IOMC/LSDM Workers - Pre Matric",
    state: "national",
    stateLabel: "National",
    education: ["school"],
    categories: ["general", "sc", "st", "bc", "obc", "minority", "ebc", "ews"],
    maxIncome: 1000000,
    deadline: "Check National Scholarship Portal",
    link: "https://scholarships.gov.in/",
    sourceName: "National Scholarship Portal / Ministry of Labour & Employment",
    eligibilityNote: "For eligible school students who are wards of specified worker groups as per official rules.",
    incomeNote: "Worker category and income rules should be verified on NSP.",
    documents: [
      "Aadhaar card",
      "Worker identity/eligibility proof",
      "Income certificate",
      "School certificate",
      "Bank details",
      "Previous class marks memo"
    ],
    tags: ["labour", "beedi", "cine", "pre matric", "school", "nsp"],
    priority: 78
  },
  {
    name: "Financial Assistance for Education to Wards of Beedi/Cine/IOMC/LSDM Workers - Post Matric",
    state: "national",
    stateLabel: "National",
    education: ["intermediate", "degree", "engineering", "pg"],
    categories: ["general", "sc", "st", "bc", "obc", "minority", "ebc", "ews"],
    maxIncome: 1000000,
    deadline: "Check National Scholarship Portal",
    link: "https://scholarships.gov.in/",
    sourceName: "National Scholarship Portal / Ministry of Labour & Employment",
    eligibilityNote: "For eligible post-matric students who are wards of specified worker groups as per official rules.",
    incomeNote: "Worker category and income rules should be verified on NSP.",
    documents: [
      "Aadhaar card",
      "Worker identity/eligibility proof",
      "Income certificate",
      "Admission proof",
      "Marks memo",
      "Bank details"
    ],
    tags: ["labour", "beedi", "cine", "post matric", "nsp"],
    priority: 78
  },
  {
    name: "ICAR National Talent Scholarship - Undergraduate",
    state: "national",
    stateLabel: "National",
    education: ["degree"],
    categories: ["general", "sc", "st", "bc", "obc", "minority", "ebc", "ews"],
    maxIncome: 1000000,
    deadline: "Check National Scholarship Portal",
    link: "https://scholarships.gov.in/",
    sourceName: "National Scholarship Portal / ICAR",
    eligibilityNote: "For eligible undergraduate students under ICAR National Talent Scholarship rules.",
    incomeNote: "Course, admission and eligibility rules should be checked on official portal.",
    documents: [
      "Aadhaar card",
      "Admission proof",
      "Marks memo",
      "Bank details",
      "Institution certificate"
    ],
    tags: ["icar", "agriculture", "national talent scholarship", "ug", "nsp"],
    priority: 79
  }];

function findScholarships() {
  const state = document.getElementById("state").value;
  const education = document.getElementById("education").value;
  const category = document.getElementById("category").value;
  const income = Number(document.getElementById("income").value);
  const search = document.getElementById("search").value.trim().toLowerCase();

  const matches = scholarships
    .map((scholarship) => {
      let score = scholarship.priority || 50;

      const stateMatch =
        state === "any" ||
        scholarship.state === state ||
        scholarship.state === "national";

      const educationMatch = scholarship.education.includes(education);

      const categoryMatch =
        scholarship.categories.includes(category) ||
        scholarship.categories.includes("general");

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
        ]
          .join(" ")
          .toLowerCase();

        if (!searchable.includes(search)) {
          return null;
        }

        score += 20;
      }

      return {
        ...scholarship,
        score
      };
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
        <span class="badge">No Match Found</span>
        <h2>No scholarships found for this combination.</h2>

        <p>
          We could not find a matching scholarship for your selected state, education,
          category, income range, or search keyword right now.
        </p>

        <div class="notice-box">
          Try these quick fixes:
          <br />
          ✅ Change your category or special group
          <br />
          ✅ Increase the income range if your income is higher
          <br />
          ✅ Select "Any State" to include National scholarships
          <br />
          ✅ Remove the search keyword and try again
        </div>

        <div class="button-row">
          <button onclick="clearFilters()">Reset Filters</button>
          <a href="login.html" class="secondary-btn">Create Account / Login</a>
          <a href="guides.html" class="secondary-btn">Read Scholarship Guides</a>
        </div>

        <p class="mini-note">
          Scholarship rules and deadlines change often. Always check official portals for the latest updates.
        </p>
      </div>
    `;

    resultsContainer.innerHTML = "";
    return;
  }

  resultSummary.innerHTML = `
    <div class="content-strip">
      <span class="badge">Possible Matches</span>
      <h2>You may be eligible for these ${results.length} scholarships.</h2>
      <p>
        These are possible matches based on your selected details.
        Verify final eligibility on official portals before applying.
      </p>
    </div>
  `;

  resultsContainer.innerHTML = results
    .map((scholarship) => {
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
    })
    .join("");
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
