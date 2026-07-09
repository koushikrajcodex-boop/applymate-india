// ApplyMate public scholarship loader
// Adds the secretless JSON scholarship engine to pages that already render the live directory.

const PUBLIC_SCHOLARSHIPS_URL = "data/public-scholarships.json";

window.addEventListener("DOMContentLoaded", () => {
  const listBox = document.getElementById("liveScholarshipList");
  const sourceBox = document.getElementById("liveScholarshipSource");
  const countBox = document.getElementById("liveScholarshipCount");
  if (!listBox || !sourceBox || !countBox) return;

  setTimeout(() => {
    const sourceText = String(sourceBox.textContent || "").toLowerCase();
    const noFirestoreData = sourceText.includes("no verified") || sourceText.includes("unavailable") || sourceText.includes("loading");
    const emptyText = String(listBox.textContent || "").toLowerCase();
    const looksEmpty = emptyText.includes("no verified") || emptyText.includes("could not load") || emptyText.includes("loading verified");

    if (noFirestoreData || looksEmpty) {
      loadPublicScholarships(listBox, sourceBox, countBox);
    }
  }, 1800);
});

async function loadPublicScholarships(listBox, sourceBox, countBox) {
  try {
    const response = await fetch(`${PUBLIC_SCHOLARSHIPS_URL}?v=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`public JSON HTTP ${response.status}`);
    const payload = await response.json();
    const records = Array.isArray(payload.records) ? payload.records.filter(isPublicActive) : [];

    sourceBox.textContent = records.length ? "Source: secretless AI public JSON" : "No public scholarship data yet";
    countBox.textContent = `Showing ${records.length} public active scholarships`;
    listBox.replaceChildren();

    if (!records.length) {
      listBox.innerHTML = "<p class='mini-note'>The public scholarship engine has not found active scholarships yet. Run the GitHub Action once to generate the database.</p>";
      return;
    }

    records.forEach((item) => listBox.appendChild(makePublicCard(item)));
  } catch (error) {
    console.warn("Public scholarship JSON load failed", error);
  }
}

function makePublicCard(item) {
  const card = document.createElement("article");
  card.className = "live-scholarship-card";

  const badges = document.createElement("div");
  badges.className = "live-card-badges";
  badges.append(makeBadge(item.stateLabel || titleCase(item.state || "National")));
  badges.append(makeBadge("🤖 AI public engine"));
  badges.append(makeBadge(`Trust: ${item.sourceTrust || "review"}`));
  badges.append(makeBadge(`Score: ${item.aiConfidence || 0}%`));
  if (item.verifiedOn) badges.append(makeBadge(`Last checked: ${item.verifiedOn}`));

  const title = document.createElement("h3");
  title.textContent = item.name || "Scholarship source";

  const eligibility = document.createElement("p");
  eligibility.className = "info";
  eligibility.innerHTML = `<strong>Eligibility:</strong> ${safe(item.eligibilityNote || "Verify on official portal.")}`;

  const meta = document.createElement("div");
  meta.className = "live-card-meta";
  addMeta(meta, "Amount", item.amount || "Varies");
  addMeta(meta, "Deadline", item.deadline || "Check official portal");
  addMeta(meta, "Income", Number(item.maxIncome || 0) > 0 ? `₹${Number(item.maxIncome).toLocaleString("en-IN")}` : "Check official rules");
  addMeta(meta, "Education", toArray(item.education).join(", ") || "Any");
  addMeta(meta, "Categories", toArray(item.categories).join(", ") || "Any");
  addMeta(meta, "Source", item.sourceName || "Official source");

  const buttons = document.createElement("div");
  buttons.className = "button-row";
  if (item.sourceUrl || item.link) {
    const official = document.createElement("a");
    official.className = "text-btn";
    official.href = item.sourceUrl || item.link;
    official.target = "_blank";
    official.rel = "noopener noreferrer";
    official.textContent = "Open Official Source";
    buttons.appendChild(official);
  }

  const dashboard = document.createElement("a");
  dashboard.className = "secondary-btn";
  dashboard.href = "dashboard.html";
  dashboard.textContent = "Save / Track";
  buttons.appendChild(dashboard);

  card.append(badges, title, eligibility, meta, buttons);
  return card;
}

function isPublicActive(item) {
  return item && item.status === "active" && item.sourceUrl && !isExpired(item.deadlineDate);
}
function isExpired(dateText) {
  if (!dateText || dateText === "2099-12-31") return false;
  const date = new Date(`${dateText}T23:59:59`);
  return !Number.isNaN(date.getTime()) && date.getTime() < Date.now();
}
function makeBadge(text) {
  const badge = document.createElement("span");
  badge.className = "badge";
  badge.textContent = text;
  return badge;
}
function addMeta(container, label, value) {
  const p = document.createElement("p");
  p.innerHTML = `<strong>${safe(label)}</strong>${safe(value)}`;
  container.appendChild(p);
}
function toArray(value) {
  if (Array.isArray(value)) return value.map(clean).filter(Boolean);
  return String(value || "").split(",").map(clean).filter(Boolean);
}
function titleCase(value) {
  return String(value || "").replaceAll("-", " ").replace(/^./, (char) => char.toUpperCase());
}
function clean(value) { return String(value || "").trim().toLowerCase(); }
function safe(value) { return String(value || "").replaceAll("<", "&lt;").replaceAll(">", "&gt;"); }
