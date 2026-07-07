import "./pwa-register.js";
import "./dashboard-calendar.js";
import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { collection, doc, getDoc, getDocs } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const section = document.getElementById("recommendationsSection");
let box = null;

if (section) {
  box = document.createElement("div");
  box.id = "dashboardSmartInsights";
  box.className = "notice-box";
  box.textContent = "Loading smart scholarship insights...";
  section.insertBefore(box, document.getElementById("bestMatchBox") || section.firstChild);
}

onAuthStateChanged(auth, async (user) => {
  if (!user || !box) return;
  try {
    const profileSnap = await getDoc(doc(db, "users", user.uid));
    const profile = profileSnap.exists() ? profileSnap.data() : {};
    const dataSnap = await getDocs(collection(db, "scholarships"));
    const active = dataSnap.docs
      .map((item) => ({ id: item.id, ...item.data() }))
      .filter((item) => item.status === "active")
      .filter((item) => item.applicationWindow !== "closed")
      .filter((item) => !expired(item.deadlineDate));

    renderInsights(profile, active);
  } catch (error) {
    console.warn("Dashboard insights failed", error);
    box.textContent = "Smart insights could not load right now. Recommendations still work below.";
  }
});

function renderInsights(profile, scholarships) {
  const normalized = normalizeProfile(profile);
  const ready = normalized.state && normalized.education && normalized.category && Number.isFinite(normalized.income);

  if (!ready) {
    box.innerHTML = "Complete your profile to unlock smart insights like best match, closing soon, high value, and newly verified scholarships.";
    return;
  }

  const matches = scholarships
    .map((item) => score(item, normalized))
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);

  const best = matches[0];
  const soon = matches.filter((item) => daysLeft(item.deadlineDate) <= 14)[0];
  const high = [...matches].sort((a, b) => money(b.amount) - money(a.amount))[0];
  const fresh = [...matches].sort((a, b) => dateRank(b) - dateRank(a))[0];

  box.replaceChildren();
  box.append(
    heading("Smart Dashboard Insights"),
    text(`Checked ${scholarships.length} active scholarships and found ${matches.length} likely matches for your profile.`),
    grid([card("Best match", best), card("Closing soon", soon), card("High value", high), card("Newly verified", fresh)]),
    actions()
  );
}

function score(item, profile) {
  const education = arr(item.education);
  const categories = arr(item.categories);
  const genders = arr(item.genders || item.gender || "any");
  const maxIncome = Number(item.maxIncome || 99999999) || 99999999;
  const stateOk = item.state === profile.state || item.state === "national";
  const educationOk = education.includes(profile.education) || education.includes("any");
  const categoryOk = categories.includes(profile.category) || categories.includes("general") || categories.includes("any") || aliases(profile.category).some((value) => categories.includes(value));
  const genderOk = genders.includes("any") || genders.includes(profile.gender) || !profile.gender;
  const disabilityOk = item.disability === "any" || item.disability === profile.disability || !item.disability;
  const incomeOk = profile.income <= maxIncome || maxIncome >= 99999999;

  if (!stateOk || !educationOk || !categoryOk || !genderOk || !disabilityOk || !incomeOk) return null;

  let points = Number(item.priority || 50);
  if (item.state === profile.state) points += 25;
  if (education.includes(profile.education)) points += 20;
  if (categories.includes(profile.category)) points += 20;
  if (profile.income <= maxIncome) points += 10;
  if (daysLeft(item.deadlineDate) <= 14) points += 8;
  if (item.verifiedOn) points += 5;

  return { ...item, score: Math.min(points, 100) };
}

function grid(cards) {
  const wrap = document.createElement("div");
  wrap.className = "guide-list";
  cards.forEach((item) => wrap.appendChild(item));
  return wrap;
}

function card(title, item) {
  const node = document.createElement("article");
  node.className = "guide-card";
  const h = document.createElement("h2");
  h.textContent = title;
  const p = document.createElement("p");
  if (!item) {
    p.textContent = "No match found in this bucket yet.";
    node.append(h, p);
    return node;
  }
  p.textContent = `${item.name || "Scholarship"} • ${formatDays(item.deadlineDate)} • Score ${item.score || 0}%`;
  node.append(h, p);
  if (safeUrl(item.link)) {
    const a = document.createElement("a");
    a.className = "text-btn";
    a.href = safeUrl(item.link);
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.textContent = "Official Link";
    node.appendChild(a);
  }
  return node;
}

function actions() {
  const row = document.createElement("div");
  row.className = "button-row";
  const hub = document.createElement("a");
  hub.className = "secondary-btn";
  hub.href = "scholarship-hub.html";
  hub.textContent = "Open Scholarship Hub";
  row.appendChild(hub);
  return row;
}

function heading(value) {
  const h = document.createElement("strong");
  h.textContent = value;
  return h;
}

function text(value) {
  const p = document.createElement("p");
  p.className = "mini-note";
  p.textContent = value;
  return p;
}

function normalizeProfile(profile) {
  return {
    state: slug(profile.state),
    education: educationSlug(profile.education),
    category: categorySlug(profile.category),
    gender: genderSlug(profile.gender),
    disability: disabilitySlug(profile.disability),
    income: Number(profile.income || NaN)
  };
}

function arr(value) {
  if (Array.isArray(value)) return value.map(slug).filter(Boolean);
  return String(value || "").split(",").map(slug).filter(Boolean);
}

function slug(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, "-");
}

function educationSlug(value) {
  const text = slug(value);
  if (text.includes("engineer")) return "engineering";
  if (text.includes("inter")) return "intermediate";
  if (text.includes("degree")) return "degree";
  if (text.includes("post") || text === "pg") return "pg";
  if (text.includes("school")) return "school";
  return text;
}

function categorySlug(value) {
  const text = slug(value);
  if (text.includes("obc") || text.includes("bc")) return "obc";
  if (text.includes("ews") || text.includes("ebc")) return "ews";
  return text;
}

function genderSlug(value) {
  const text = slug(value);
  if (text.includes("female")) return "female";
  if (text.includes("male")) return "male";
  return "any";
}

function disabilitySlug(value) {
  const text = slug(value);
  if (text === "yes") return "yes";
  if (text === "no") return "no";
  return "any";
}

function aliases(category) {
  return { obc: ["bc", "ebc"], ews: ["ebc"], disabled: ["disability"] }[category] || [];
}

function expired(dateText) {
  const left = daysLeft(dateText);
  return Number.isFinite(left) && left < 0;
}

function daysLeft(dateText) {
  if (!dateText) return Infinity;
  const date = new Date(`${dateText}T23:59:59`);
  if (Number.isNaN(date.getTime())) return Infinity;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((date.getTime() - today.getTime()) / 86400000);
}

function formatDays(dateText) {
  const left = daysLeft(dateText);
  if (!Number.isFinite(left)) return "check portal";
  if (left === 0) return "last day";
  if (left === 1) return "1 day left";
  return `${left} days left`;
}

function money(value) {
  const numbers = String(value || "").match(/[0-9][0-9,]{2,}/g) || [];
  return numbers.map((item) => Number(item.replace(/,/g, ""))).sort((a, b) => b - a)[0] || 0;
}

function dateRank(item) {
  const text = item.createdAt?.toDate ? item.createdAt.toDate().toISOString().slice(0, 10) : item.verifiedOn || item.lastChecked || "";
  const date = text ? new Date(`${text}T00:00:00`) : new Date(0);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function safeUrl(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  try {
    const url = new URL(text);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
}
