import { getStateLabel } from "./states.js";

const CONTACT_EMAIL = "koushikrajcodex@gmail.com";

window.findScholarships = findScholarships;
window.clearFilters = clearFilters;
window.renderResults = renderResults;

function getLiveScholarships() {
  return Array.isArray(window.applymateLiveFinderData)
    ? window.applymateLiveFinderData.map(normalizeScholarship)
    : [];
}

function findScholarships() {
  const liveScholarships = getLiveScholarships();

  if (!liveScholarships.length) {
    const loaded = Boolean(window.applymateLiveFinderLoaded);
    renderResults([], {
      title: loaded ? "No active scholarships available." : "Scholarships are still loading.",
      message: loaded
        ? "No active Firestore scholarships are available right now. Please check again later or open official portals from the guides."
        : "Firestore scholarship data is still loading. Wait a moment and try again."
    });
    return;
  }

  const state = value("state", "any");
  const education = value("education", "school");
  const category = value("category", "general");
  const income = Number(value("income", "100000"));
  const search = value("search", "").trim().toLowerCase();

  const matches = liveScholarships
    .map((scholarship) => scoreScholarship(scholarship, { state, education, category, income, search }))
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);

  const selectedStateLabel = state === "any" ? "Any State" : getStateLabel(state);
  const hasStateSpecificResults = state === "any" || matches.some((scholarship) => scholarship.state === state);
  const hasNationalFallback = state !== "any" && matches.some((scholarship) => scholarship.state === "national");

  renderResults(matches, {
    selectedState: state,
    selectedStateLabel,
    nationalFallbackOnly: state !== "any" && !hasStateSpecificResults && hasNationalFallback
  });
}

function scoreScholarship(scholarship, profile) {
  const education = normalizeArray(scholarship.education);
  const categories = normalizeArray(scholarship.categories);
  const maxIncome = Number(scholarship.maxIncome || 99999999) || 99999999;

  const stateMatch =
    profile.state === "any" ||
    scholarship.state === profile.state ||
    scholarship.state === "national";

  const educationMatch = education.includes(profile.education) || education.includes("any");

  const categoryMatch =
    categories.includes(profile.category) ||
    categories.includes("general") ||
    categories.includes("any") ||
    categoryAliases(profile.category).some((alias) => categories.includes(alias));

  const incomeMatch = profile.income <= maxIncome || maxIncome >= 99999999;

  if (!stateMatch || !educationMatch || !categoryMatch || !incomeMatch) {
    return null;
  }

  let score = Number(scholarship.priority || 50);
  if (scholarship.state === profile.state) score += 25;
  if (education.includes(profile.education)) score += 20;
  if (categories.includes(profile.category)) score += 20;
  if (profile.income <= maxIncome) score += 10;

  if (profile.search) {
    const searchable = [
      scholarship.name,
      scholarship.stateLabel,
      scholarship.sourceName,
      scholarship.eligibilityNote,
      scholarship.incomeNote,
      scholarship.amount,
      education.join(" "),
      categories.join(" ")
    ].join(" ").toLowerCase();

    if (!searchable.includes(profile.search)) {
      return null;
    }

    score += 20;
  }

  return {
    ...scholarship,
    score
  };
}

function renderResults(results, emptyState = {}) {
  const resultSummary = document.getElementById("resultSummary");
  const resultsContainer = document.getElementById("results");

  if (!resultSummary || !resultsContainer) return;

  if (results.length === 0) {
    const selectedStateText = emptyState.selectedState && emptyState.selectedState !== "any"
      ? ` for ${emptyState.selectedStateLabel}`
      : "";

    resultSummary.innerHTML = `
      <div class="content-strip">
        <span class="badge">No Match Found</span>
        <h2>${escapeHtml(emptyState.title || `No scholarships found${selectedStateText}.`)}</h2>

        <p>
          ${escapeHtml(emptyState.message || `We have not added verified state-specific scholarships${selectedStateText} for this combination yet. Select "Any State" or keep National scholarships enabled to see national-level options you may still be eligible for.`)}
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
          <a href="scholarship-hub.html" class="secondary-btn">Open Scholarship Hub</a>
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

  const fallbackNote = emptyState.nationalFallbackOnly
    ? `<div class="notice-box">We have not added verified ${escapeHtml(emptyState.selectedStateLabel)}-specific scholarships for this filter yet. Showing National-level scholarships you may still be eligible for.</div>`
    : "";

  resultSummary.innerHTML = `
    <div class="content-strip">
      <span class="badge">Possible Matches</span>
      <h2>You may be eligible for these ${results.length} scholarships.</h2>
      <p>
        These are possible matches from live Firestore data based on your selected details.
        Verify final eligibility on official portals before applying.
      </p>
      ${fallbackNote}
    </div>
  `;

  resultsContainer.innerHTML = results.map(scholarshipCard).join("");
}

function scholarshipCard(scholarship) {
  const documents = normalizeDocuments(scholarship.documents)
    .map((doc) => `<li>${escapeHtml(doc)}</li>`)
    .join("");

  return `
    <article class="scholarship">
      <span class="badge">${escapeHtml(scholarship.stateLabel)}</span>
      <h3>${escapeHtml(scholarship.name)}</h3>

      <p class="info"><strong>Eligibility note:</strong> ${escapeHtml(scholarship.eligibilityNote)}</p>
      <p class="info"><strong>Income note:</strong> ${escapeHtml(scholarship.incomeNote)}</p>
      <p class="info"><strong>Deadline:</strong> ${escapeHtml(scholarship.deadline)}</p>
      <p class="info"><strong>Last verified:</strong> ${escapeHtml(scholarship.verifiedOn || scholarship.lastChecked || "Check official source")}</p>

      <h4>Common documents</h4>
      <ul>${documents}</ul>

      <div class="button-row">
        ${officialLink(scholarship.link)}
        <a class="secondary-btn" href="mailto:${CONTACT_EMAIL}?subject=Correction for ${encodeURIComponent(scholarship.name)}">
          Report Correction
        </a>
      </div>
    </article>
  `;
}

function officialLink(link) {
  if (!String(link || "").startsWith("http")) return "";
  return `<a class="text-btn" href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer">Official Link</a>`;
}

function normalizeScholarship(item) {
  const categories = normalizeArray(item.categories);
  if (clean(item.gender) === "female" && !categories.includes("girls")) categories.push("girls");
  if (item.disability === "yes" && !categories.includes("disabled")) categories.push("disabled");

  return {
    ...item,
    state: item.state || "national",
    stateLabel: item.stateLabel || getStateLabel(item.state || "national"),
    education: normalizeArray(item.education).length ? normalizeArray(item.education) : ["any"],
    categories: categories.length ? categories : ["general"],
    maxIncome: Number(item.maxIncome || 99999999) || 99999999,
    deadline: item.deadline || "Check official portal",
    link: item.link || item.sourceUrl || "",
    sourceName: item.sourceName || "Official source",
    eligibilityNote: item.eligibilityNote || "Verify eligibility on official portal.",
    incomeNote: item.incomeNote || "Verify income rules on official portal.",
    documents: normalizeDocuments(item.documents)
  };
}

function clearFilters() {
  setValue("search", "");
  setValue("state", "any");
  setValue("education", "school");
  setValue("category", "general");
  setValue("income", "100000");

  const resultSummary = document.getElementById("resultSummary");
  const results = document.getElementById("results");
  if (resultSummary) resultSummary.innerHTML = "";
  if (results) results.innerHTML = "";
}

function value(id, fallback) {
  return document.getElementById(id)?.value || fallback;
}

function setValue(id, nextValue) {
  const element = document.getElementById(id);
  if (element) element.value = nextValue;
}

function normalizeArray(value) {
  if (Array.isArray(value)) return value.map(clean).filter(Boolean);
  return String(value || "").split(",").map(clean).filter(Boolean);
}

function normalizeDocuments(value) {
  const documents = Array.isArray(value)
    ? value.filter(Boolean)
    : String(value || "").split(",").map((item) => item.trim()).filter(Boolean);

  return documents.length
    ? documents
    : ["Aadhaar card", "Income certificate if applicable", "Category certificate if applicable", "Previous marks memo", "Bank details"];
}

function categoryAliases(category) {
  return {
    bc: ["obc", "ebc"],
    obc: ["bc", "ebc"],
    ebc: ["ews", "obc", "bc"],
    ews: ["ebc"],
    girls: ["female"],
    disabled: ["disability"]
  }[category] || [];
}

function clean(value) {
  return String(value || "").trim().toLowerCase();
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
