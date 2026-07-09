import { db } from "./firebase-config.js";
import { getStateLabel, INDIA_STATE_OPTIONS } from "./states.js";
import { isVerifiedActiveScholarship, getOfficialSourceUrl, getLastVerifiedText } from "./scholarship-verification.js";
import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const $ = (id) => document.getElementById(id);
const MAX_RESULTS = 8;

let verifiedScholarships = [];
let latestMatches = [];

const els = {
  input: $("aiProfileInput"),
  findBtn: $("aiFindBtn"),
  exampleBtn: $("aiExampleBtn"),
  clearBtn: $("aiClearBtn"),
  message: $("aiMessage"),
  summary: $("aiSummary"),
  results: $("aiResults"),
  profileBox: $("aiProfileBox")
};

setupEvents();
loadScholarships();

function setupEvents() {
  els.findBtn?.addEventListener("click", runAssistant);
  els.exampleBtn?.addEventListener("click", useExample);
  els.clearBtn?.addEventListener("click", clearAssistant);
  els.input?.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      runAssistant();
    }
  });
}

async function loadScholarships() {
  setMessage("Loading verified scholarships from Firestore...");

  try {
    const snapshot = await getDocs(collection(db, "scholarships"));
    verifiedScholarships = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter(isVerifiedActiveScholarship)
      .sort((a, b) => Number(b.priority || 0) - Number(a.priority || 0));

    setMessage(`Ready. ${verifiedScholarships.length} verified active scholarships loaded.`);
  } catch (error) {
    console.error("AI assistant scholarship load failed", error);
    verifiedScholarships = [];
    setMessage("Could not load scholarships from Firestore. Check internet or Firestore rules.", true);
  }
}

function runAssistant() {
  const raw = value(els.input);

  if (!raw) {
    setMessage("Write your student profile first.", true);
    return;
  }

  const profile = parseProfile(raw);
  renderDetectedProfile(profile);

  if (!verifiedScholarships.length) {
    setMessage("No verified scholarships loaded yet. Refresh after adding active scholarships in admin.", true);
    show(els.summary, "No verified scholarships available.");
    showResults([]);
    return;
  }

  latestMatches = verifiedScholarships
    .map((item) => scoreScholarship(item, profile))
    .filter(Boolean)
    .sort((a, b) => b.aiScore - a.aiScore || Number(b.priority || 0) - Number(a.priority || 0))
    .slice(0, MAX_RESULTS);

  showResults(latestMatches);

  if (latestMatches.length) {
    const best = latestMatches[0];
    show(els.summary, `You may be eligible for ${latestMatches.length} strong verified matches. Best match: ${best.name} (${best.aiScore}%).`);
    setMessage("AI-style matching complete. Open official links before applying.");
  } else {
    show(els.summary, "No strong verified matches found for this profile yet.");
    setMessage("Try adding more details or loosen filters. Admin can add more verified scholarships.", true);
  }
}

function parseProfile(text) {
  const normalized = normalizeText(text);
  const slugged = slugText(text);

  return {
    rawText: text,
    state: detectState(normalized, slugged),
    education: detectEducation(normalized),
    category: detectCategory(normalized),
    gender: detectGender(normalized),
    disability: detectDisability(normalized),
    income: detectIncome(text),
    percentage: detectPercentage(text),
    keywords: extractKeywords(normalized)
  };
}

function detectState(normalized, slugged) {
  const match = INDIA_STATE_OPTIONS.find((state) => {
    const label = normalizeText(state.label);
    const stateSlugText = state.slug.replaceAll("-", " ");
    return normalized.includes(label) || normalized.includes(stateSlugText) || slugged.includes(state.slug);
  });

  return match?.slug || "";
}

function detectEducation(text) {
  if (/b\.?\s*tech|btech|engineering|engineer|cse|computer science|ai ml|aiml|diploma/.test(text)) return "engineering";
  if (/degree|bsc|b\.sc|ba|b\.a|bcom|b\.com|ug|under graduate|undergraduate/.test(text)) return "degree";
  if (/intermediate|inter|class 11|class 12|12th|11th/.test(text)) return "intermediate";
  if (/school|class [1-9]|10th|ssc/.test(text)) return "school";
  if (/post graduation|postgraduate|pg|mtech|m\.tech|msc|m\.sc|ma|m\.a|mcom|m\.com|masters/.test(text)) return "pg";
  return "";
}

function detectCategory(text) {
  if (/\bsc\b|scheduled caste/.test(text)) return "sc";
  if (/\bst\b|scheduled tribe/.test(text)) return "st";
  if (/obc|\bbc\b|backward class/.test(text)) return "obc";
  if (/ews|ebc|economically weaker/.test(text)) return "ews";
  if (/minority|muslim|christian|sikh|buddhist|jain|parsi/.test(text)) return "minority";
  if (/kapu/.test(text)) return "kapu";
  if (/general|open category|oc/.test(text)) return "general";
  return "";
}

function detectGender(text) {
  if (/female|girl|woman|women|daughter/.test(text)) return "female";
  if (/male|boy|man|men|son/.test(text)) return "male";
  return "any";
}

function detectDisability(text) {
  if (/no disability|not disabled|without disability|normal/.test(text)) return "no";
  if (/disabled|disability|specially abled|pwd|physically challenged/.test(text)) return "yes";
  return "any";
}

function detectIncome(text) {
  const lowered = String(text || "").toLowerCase();

  const lakhMatch = lowered.match(/(?:₹|rs\.?|inr)?\s*([0-9]+(?:\.[0-9]+)?)\s*(?:lakh|lakhs|lac|lacs|l)\b/);
  if (lakhMatch) return Math.round(Number(lakhMatch[1]) * 100000);

  const incomeContext = lowered.match(/(?:income|family income|annual income)[^0-9]{0,20}([0-9,]+)/);
  if (incomeContext) return number(incomeContext[1]);

  const rupeeMatch = lowered.match(/(?:₹|rs\.?|inr)\s*([0-9,]+)/);
  if (rupeeMatch) return number(rupeeMatch[1]);

  const plainBigNumber = lowered.match(/\b([1-9][0-9]{4,7})\b/);
  return plainBigNumber ? number(plainBigNumber[1]) : 0;
}

function detectPercentage(text) {
  const lowered = String(text || "").toLowerCase();
  const percent = lowered.match(/([0-9]+(?:\.[0-9]+)?)\s*%/);
  if (percent) return clamp(Number(percent[1]), 0, 100);

  const cgpa = lowered.match(/([0-9]+(?:\.[0-9]+)?)\s*cgpa/);
  if (cgpa) {
    const value = Number(cgpa[1]);
    return value <= 10 ? clamp(value * 10, 0, 100) : clamp(value, 0, 100);
  }

  const marks = lowered.match(/(?:marks|percentage|score)[^0-9]{0,20}([0-9]+(?:\.[0-9]+)?)/);
  return marks ? clamp(Number(marks[1]), 0, 100) : 0;
}

function extractKeywords(text) {
  return [...new Set(text
    .split(/\s+/)
    .map((word) => word.replace(/[^a-z0-9]/g, ""))
    .filter((word) => word.length >= 4)
    .filter((word) => !STOP_WORDS.has(word))
  )].slice(0, 24);
}

function scoreScholarship(item, profile) {
  const reasons = [];
  const cautions = [];
  const education = arr(item.education);
  const categories = arr(item.categories);
  const genders = arr(item.genders || item.gender || "any");
  const maxIncome = Number(item.maxIncome || 99999999) || 99999999;
  const minPercentage = Number(item.minPercentage || 0) || 0;
  const scholarshipText = normalizeText([
    item.name,
    item.sourceName,
    item.amount,
    item.eligibilityNote,
    item.incomeNote,
    education.join(" "),
    categories.join(" ")
  ].join(" "));

  if (profile.state && item.state !== "national" && item.state !== profile.state) return null;
  if (profile.education && !education.includes(profile.education) && !education.includes("any")) return null;
  if (profile.category && !matchesCategory(profile.category, categories)) return null;
  if (profile.gender && !genders.includes("any") && !genders.includes(profile.gender)) return null;
  if (profile.disability && item.disability && item.disability !== "any" && item.disability !== profile.disability) return null;
  if (profile.income && maxIncome < 99999999 && profile.income > maxIncome) return null;
  if (profile.percentage && minPercentage && profile.percentage < minPercentage) return null;

  let score = 35 + Number(item.priority || 50) * 0.35;

  if (item.state === "national") {
    score += 8;
    reasons.push("National-level scholarship can apply across states.");
  } else if (profile.state && item.state === profile.state) {
    score += 18;
    reasons.push(`State matches ${getStateLabel(profile.state)}.`);
  } else if (!profile.state) {
    cautions.push("State not detected, so state-specific matching may be incomplete.");
  }

  if (profile.education && education.includes(profile.education)) {
    score += 16;
    reasons.push(`Course matches ${label(profile.education)}.`);
  } else if (education.includes("any")) {
    score += 7;
    reasons.push("Education rule accepts multiple courses.");
  } else if (!profile.education) {
    cautions.push("Course not detected.");
  }

  if (profile.category && matchesCategory(profile.category, categories)) {
    score += 14;
    reasons.push(`Category matches ${label(profile.category)}.`);
  } else if (categories.includes("any")) {
    score += 6;
    reasons.push("Category rule is open/any.");
  } else if (!profile.category) {
    cautions.push("Category not detected.");
  }

  if (profile.gender && genders.includes(profile.gender)) {
    score += 8;
    reasons.push(`Gender rule matches ${profile.gender}.`);
  } else if (genders.includes("any")) {
    score += 5;
    reasons.push("Gender rule accepts any gender.");
  }

  if (profile.disability && item.disability === profile.disability) {
    score += 6;
    reasons.push("Disability rule matches your profile.");
  } else if (item.disability === "any") {
    score += 4;
  }

  if (profile.income && maxIncome < 99999999 && profile.income <= maxIncome) {
    score += 10;
    reasons.push(`Income is within ₹${formatNumber(maxIncome)} limit.`);
  } else if (!profile.income) {
    cautions.push("Income not detected.");
  }

  if (profile.percentage && minPercentage && profile.percentage >= minPercentage) {
    score += 8;
    reasons.push(`Marks meet minimum ${minPercentage}%.`);
  } else if (!profile.percentage) {
    cautions.push("Percentage/CGPA not detected.");
  }

  const keywordHits = profile.keywords.filter((word) => scholarshipText.includes(word)).slice(0, 4);
  if (keywordHits.length) {
    score += Math.min(8, keywordHits.length * 2);
    reasons.push(`Keyword match: ${keywordHits.join(", ")}.`);
  }

  const left = daysLeft(item.deadlineDate);
  if (left <= 7) cautions.push("Deadline is very close. Apply fast after official verification.");
  else if (left <= 30) reasons.push("Deadline is still active but approaching.");

  if (!reasons.length) reasons.push("This is a broad verified scholarship that may fit after official checks.");

  return {
    ...item,
    aiScore: clamp(Math.round(score), 0, 100),
    aiReasons: reasons.slice(0, 5),
    aiCautions: cautions.slice(0, 4)
  };
}

function showResults(items) {
  if (!els.results) return;

  if (!items.length) {
    els.results.innerHTML = "<p class='mini-note'>No matching verified scholarships yet.</p>";
    return;
  }

  els.results.innerHTML = items.map(resultCard).join("");
}

function resultCard(item) {
  const url = getOfficialSourceUrl(item);
  const cautionHtml = item.aiCautions?.length
    ? `<p class="mini-note"><strong>Check:</strong> ${escapeHtml(item.aiCautions.join(" "))}</p>`
    : "";

  return `
    <article class="ai-match-card">
      <div class="ai-badge-row">
        <span class="ai-badge good">${escapeHtml(String(item.aiScore))}% match</span>
        <span class="ai-badge">${escapeHtml(item.stateLabel || getStateLabel(item.state || "national"))}</span>
        <span class="ai-badge warn">Deadline: ${escapeHtml(item.deadlineDate || "Check portal")}</span>
        <span class="ai-badge">Verified: ${escapeHtml(getLastVerifiedText(item))}</span>
      </div>
      <h3>${escapeHtml(item.name || "Scholarship")}</h3>
      <p class="info"><strong>Amount:</strong> ${escapeHtml(item.amount || "Varies")}</p>
      <p class="info"><strong>Eligibility:</strong> ${escapeHtml(item.eligibilityNote || "Verify on official portal.")}</p>
      <p class="info"><strong>Why this matches:</strong> ${escapeHtml((item.aiReasons || []).join(" "))}</p>
      ${cautionHtml}
      <div class="button-row">
        ${url ? `<a class="text-btn" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">Open Official Link</a>` : ""}
        <a class="secondary-btn" href="login.html">Login to Save / Track</a>
      </div>
    </article>
  `;
}

function renderDetectedProfile(profile) {
  if (!els.profileBox) return;

  const rows = [
    ["State", profile.state ? getStateLabel(profile.state) : "Not detected"],
    ["Course", profile.education ? label(profile.education) : "Not detected"],
    ["Category", profile.category ? label(profile.category) : "Not detected"],
    ["Gender", profile.gender || "any"],
    ["Disability", profile.disability || "any"],
    ["Income", profile.income ? `₹${formatNumber(profile.income)}` : "Not detected"],
    ["Marks", profile.percentage ? `${profile.percentage}%` : "Not detected"]
  ];

  els.profileBox.innerHTML = rows.map(([key, val]) => `
    <div class="ai-profile-row">
      <span>${escapeHtml(key)}</span>
      <strong>${escapeHtml(val)}</strong>
    </div>
  `).join("");
}

function useExample() {
  set(els.input, "I am a female B.Tech CSE student from Andhra Pradesh. My category is OBC, family income is 180000 per year, marks are 82%, no disability.");
  runAssistant();
}

function clearAssistant() {
  set(els.input, "");
  latestMatches = [];
  show(els.summary, "Results will appear here.");
  if (els.profileBox) els.profileBox.innerHTML = "<p class='mini-note'>Enter your profile and click Find My Scholarships.</p>";
  if (els.results) els.results.innerHTML = "<p class='mini-note'>No results yet.</p>";
  setMessage(verifiedScholarships.length ? `Ready. ${verifiedScholarships.length} verified active scholarships loaded.` : "Loading verified scholarships...");
}

function matchesCategory(category, categories) {
  return categories.includes("any") ||
    categories.includes(category) ||
    categoryAliases(category).some((alias) => categories.includes(alias));
}

function categoryAliases(category) {
  return {
    obc: ["bc", "ebc"],
    ews: ["ebc"],
    disabled: ["disability", "pwd"]
  }[category] || [];
}

function arr(value) {
  return Array.isArray(value)
    ? value.map(slug).filter(Boolean)
    : String(value || "").split(",").map(slug).filter(Boolean);
}

function slug(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

function slugText(value) {
  return normalizeText(value).replace(/\s+/g, "-");
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9.₹%]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function daysLeft(dateText) {
  if (!dateText) return Infinity;
  const date = new Date(`${dateText}T23:59:59`);
  if (Number.isNaN(date.getTime())) return Infinity;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((date.getTime() - today.getTime()) / 86400000);
}

function number(value) {
  const n = Number(String(value || "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("en-IN");
}

function label(value) {
  return String(value || "")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function value(element) { return element?.value?.trim() || ""; }
function set(element, value) { if (element) element.value = value ?? ""; }
function show(element, value) { if (element) element.textContent = value || ""; }
function setMessage(message, danger = false) { if (els.message) { els.message.textContent = message || ""; els.message.style.color = danger ? "#b42318" : ""; } }
function escapeHtml(value) { return String(value || "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;"); }

const STOP_WORDS = new Set([
  "from", "with", "student", "students", "course", "family", "income", "marks", "percentage", "category",
  "female", "male", "girl", "boy", "state", "year", "annual", "scholarship", "scholarships", "apply",
  "india", "indian", "have", "this", "that", "there", "their", "about", "without", "disability"
]);