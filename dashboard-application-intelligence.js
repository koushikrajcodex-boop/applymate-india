import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

let panel;
let summary;
let insights;
let refreshButton;
let currentUser;

installStyles();

onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  if (!user) return;
  mountPanel();
  await loadIntelligence();
});

function mountPanel() {
  if (document.getElementById("applicationIntelligencePanel")) return;
  const applicationList = document.getElementById("applicationList");
  const trackerSection = applicationList?.closest("section");
  const main = document.querySelector("main");
  if (!main) return;

  panel = document.createElement("section");
  panel.id = "applicationIntelligencePanel";
  panel.className = "content-card application-intelligence-panel";

  const heading = document.createElement("div");
  heading.className = "card-heading";

  const copy = document.createElement("div");
  const tag = document.createElement("span");
  tag.className = "tagline";
  tag.textContent = "Application Intelligence";
  const title = document.createElement("h2");
  title.textContent = "Your scholarship application command center";
  const description = document.createElement("p");
  description.className = "mini-note";
  description.textContent = "Shows your application funnel, stalled items, progress rate, and next best action.";
  copy.append(tag, title, description);

  refreshButton = document.createElement("button");
  refreshButton.type = "button";
  refreshButton.className = "secondary-btn";
  refreshButton.textContent = "Refresh Analysis";
  refreshButton.addEventListener("click", loadIntelligence);

  heading.append(copy, refreshButton);
  summary = document.createElement("div");
  summary.className = "application-intelligence-summary";
  insights = document.createElement("div");
  insights.className = "application-intelligence-insights";

  panel.append(heading, summary, insights);

  if (trackerSection?.parentNode) {
    trackerSection.parentNode.insertBefore(panel, trackerSection);
  } else {
    main.appendChild(panel);
  }
}

async function loadIntelligence() {
  if (!currentUser || !summary || !insights) return;
  setBusy(true);
  insights.innerHTML = "<p class='mini-note'>Analyzing your application tracker...</p>";

  try {
    const snapshot = await getDocs(collection(db, "users", currentUser.uid, "applications"));
    const records = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
    render(records);
  } catch (error) {
    console.error("Application intelligence failed:", error);
    insights.innerHTML = "<p class='mini-note'>Could not analyze your tracker right now.</p>";
  } finally {
    setBusy(false);
  }
}

function render(records) {
  const counts = {
    "Not Applied": 0,
    Applied: 0,
    "Under Review": 0,
    Approved: 0,
    Rejected: 0
  };

  records.forEach((record) => {
    if (Object.hasOwn(counts, record.status)) counts[record.status] += 1;
  });

  const started = records.length - counts["Not Applied"];
  const decisions = counts.Approved + counts.Rejected;
  const approvalRate = decisions ? Math.round((counts.Approved / decisions) * 100) : 0;
  const progressRate = records.length ? Math.round((started / records.length) * 100) : 0;
  const stale = records.filter((record) => isStale(record)).length;

  summary.replaceChildren();
  [
    ["Tracked", records.length],
    ["Started", started],
    ["Under review", counts["Under Review"]],
    ["Approved", counts.Approved],
    ["Progress", `${progressRate}%`],
    ["Approval rate", decisions ? `${approvalRate}%` : "—"]
  ].forEach(([label, value]) => summary.appendChild(stat(label, value)));

  insights.replaceChildren();

  if (!records.length) {
    insights.innerHTML = "<p class='mini-note'>Add scholarships to your application tracker to unlock progress analysis.</p>";
    return;
  }

  insights.appendChild(createFunnel(counts));
  insights.appendChild(createAdvice(records, counts, stale));
}

function createFunnel(counts) {
  const card = document.createElement("article");
  card.className = "application-intelligence-card";
  const title = document.createElement("h3");
  title.textContent = "Application funnel";
  card.appendChild(title);

  const total = Math.max(1, Object.values(counts).reduce((sum, value) => sum + value, 0));
  Object.entries(counts).forEach(([label, value]) => {
    const row = document.createElement("div");
    row.className = "funnel-row";
    const text = document.createElement("span");
    text.textContent = `${label}: ${value}`;
    const bar = document.createElement("div");
    bar.className = "funnel-bar";
    const fill = document.createElement("div");
    fill.className = "funnel-fill";
    fill.style.width = `${Math.round((value / total) * 100)}%`;
    bar.appendChild(fill);
    row.append(text, bar);
    card.appendChild(row);
  });

  return card;
}

function createAdvice(records, counts, stale) {
  const card = document.createElement("article");
  card.className = "application-intelligence-card";
  const title = document.createElement("h3");
  title.textContent = "Next best action";
  const advice = document.createElement("p");
  advice.className = "mini-note";

  if (counts["Not Applied"] > 0) {
    advice.textContent = `Start with one of your ${counts["Not Applied"]} not-applied scholarships. Complete documents first, then submit on the official portal.`;
  } else if (stale > 0) {
    advice.textContent = `${stale} tracked application${stale === 1 ? " has" : "s have"} not changed for 14+ days. Check the official portal and update the tracker.`;
  } else if (counts.Applied > 0) {
    advice.textContent = `You have ${counts.Applied} submitted application${counts.Applied === 1 ? "" : "s"}. Save acknowledgment numbers and monitor official status updates.`;
  } else if (counts["Under Review"] > 0) {
    advice.textContent = `You have ${counts["Under Review"]} application${counts["Under Review"] === 1 ? "" : "s"} under review. Keep certificates and bank details ready for verification.`;
  } else if (counts.Approved > 0) {
    advice.textContent = `Great—${counts.Approved} application${counts.Approved === 1 ? " is" : "s are"} approved. Verify the official payment or next-step instructions.`;
  } else {
    advice.textContent = "Review rejected applications, identify missing documents or eligibility gaps, and focus on better-matched scholarships.";
  }

  const noteCount = records.filter((record) => String(record.note || "").trim().length > 0).length;
  const quality = document.createElement("p");
  quality.className = "mini-note";
  quality.textContent = `${noteCount} of ${records.length} applications include notes. Add document or acknowledgment details to make the tracker more useful.`;

  card.append(title, advice, quality);
  return card;
}

function stat(label, value) {
  const card = document.createElement("div");
  card.className = "application-intelligence-stat";
  const strong = document.createElement("strong");
  strong.textContent = String(value);
  const span = document.createElement("span");
  span.textContent = label;
  card.append(strong, span);
  return card;
}

function isStale(record) {
  const value = record.updatedAt || record.createdAt;
  if (!value?.toDate) return false;
  return (Date.now() - value.toDate().getTime()) / 86400000 >= 14;
}

function setBusy(busy) {
  if (!refreshButton) return;
  refreshButton.disabled = busy;
  refreshButton.textContent = busy ? "Analyzing..." : "Refresh Analysis";
}

function installStyles() {
  if (document.getElementById("applicationIntelligenceStyles")) return;
  const style = document.createElement("style");
  style.id = "applicationIntelligenceStyles";
  style.textContent = `
    .application-intelligence-panel { border: 1px solid #c7d7fe; }
    .application-intelligence-summary { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 10px; margin: 16px 0; }
    .application-intelligence-stat { padding: 13px; border: 1px solid var(--border); border-radius: 14px; background: #fff; display: grid; gap: 4px; }
    .application-intelligence-stat strong { font-size: 1.35rem; }
    .application-intelligence-stat span { color: var(--muted); font-size: .88rem; }
    .application-intelligence-insights { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
    .application-intelligence-card { padding: 16px; border: 1px solid var(--border); border-radius: 16px; background: #fff; }
    .application-intelligence-card h3 { margin-top: 0; }
    .funnel-row { display: grid; grid-template-columns: 120px 1fr; gap: 10px; align-items: center; margin: 10px 0; }
    .funnel-bar { height: 9px; border-radius: 999px; background: #eef2f6; overflow: hidden; }
    .funnel-fill { height: 100%; background: currentColor; border-radius: inherit; }
    @media (max-width: 900px) { .application-intelligence-summary { grid-template-columns: repeat(3, 1fr); } }
    @media (max-width: 700px) { .application-intelligence-insights { grid-template-columns: 1fr; } }
    @media (max-width: 520px) { .application-intelligence-summary { grid-template-columns: repeat(2, 1fr); } .funnel-row { grid-template-columns: 1fr; } }
  `;
  document.head.appendChild(style);
}
