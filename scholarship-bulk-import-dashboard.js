// ApplyMate AI Scholarship Bot dashboard v3
// Read-only dashboard for GitHub Actions discovery, import, and tracker reports.

const $ = (id) => document.getElementById(id);
const ACTION_URL = "https://github.com/koushikrajcodex-boop/applymate-india/actions/workflows/scholarship-bulk-auto-import.yml";
const REPORT_URL = "data/bulk-import-report.json";
const FEED_URL = "data/auto-discovered-scholarships.json";
const TRACKER_URL = "data/scholarship-ai-tracker-report.json";

const PACKS = [
  ["all", "All Packs", "General import across official + trusted portals."],
  ["national", "National", "NSP, AICTE, UGC and national trusted sources."],
  ["engineering", "Engineering", "AICTE, technical education, FFE, Reliance, Vidyasaarathi."],
  ["ap_tel", "AP + Telangana", "AP Jnanabhumi and Telangana ePASS focused sources."],
  ["categories", "SC/ST/OBC/EWS/Minority", "Category-focused government and trusted portals."],
  ["private_trusted", "Private Trusted", "Buddy4Study, Vidyasaarathi, FFE, HDFC, Reliance, Tata."],
  ["girls", "Girls", "Girls/women-focused scholarship sources like Pragati."]
];

const els = {
  status: $("bulkBotStatus"),
  reportGenerated: $("bulkReportGenerated"),
  reportMode: $("bulkReportMode"),
  reportAdded: $("bulkReportAdded"),
  reportUpdated: $("bulkReportUpdated"),
  reportSkipped: $("bulkReportSkipped"),
  reportFailed: $("bulkReportFailed"),
  reportActiveCandidates: $("bulkReportActiveCandidates"),
  reportDraftCandidates: $("bulkReportDraftCandidates"),
  feedGenerated: $("bulkFeedGenerated"),
  feedTotal: $("bulkFeedTotal"),
  feedCurated: $("bulkFeedCurated"),
  feedErrors: $("bulkFeedErrors"),
  currentPack: $("bulkCurrentPack"),
  secretFirebase: $("bulkSecretFirebase"),
  secretProject: $("bulkSecretProject"),
  explainer: $("bulkReportExplainer"),
  packList: $("bulkSourcePacks"),
  importedList: $("bulkImportedList"),
  skippedList: $("bulkSkippedList"),
  feedList: $("bulkFeedList"),
  errorsList: $("bulkErrorsList"),
  trackerGenerated: $("trackerGenerated"),
  trackerChecked: $("trackerChecked"),
  trackerActive: $("trackerActive"),
  trackerPromoted: $("trackerPromoted"),
  trackerExpired: $("trackerExpired"),
  trackerNeedsReview: $("trackerNeedsReview"),
  trackerFailed: $("trackerFailed"),
  trackerThreshold: $("trackerThreshold"),
  trackerList: $("trackerList"),
  loadBtn: $("bulkLoadReportBtn"),
  openActionBtn: $("bulkOpenActionBtn"),
  openReportBtn: $("bulkOpenReportBtn"),
  openFeedBtn: $("bulkOpenFeedBtn"),
  openTrackerBtn: $("bulkOpenTrackerBtn")
};

installDashboard();

function installDashboard() {
  els.loadBtn?.addEventListener("click", loadAll);
  els.openActionBtn?.addEventListener("click", () => window.open(ACTION_URL, "_blank", "noopener,noreferrer"));
  els.openReportBtn?.addEventListener("click", () => window.open(cacheBust(REPORT_URL), "_blank", "noopener,noreferrer"));
  els.openFeedBtn?.addEventListener("click", () => window.open(cacheBust(FEED_URL), "_blank", "noopener,noreferrer"));
  els.openTrackerBtn?.addEventListener("click", () => window.open(cacheBust(TRACKER_URL), "_blank", "noopener,noreferrer"));
  renderPacks();
  loadAll();
}

async function loadAll() {
  setStatus("Loading latest AI scholarship bot reports...");
  const [reportResult, feedResult, trackerResult] = await Promise.allSettled([
    fetchJson(REPORT_URL),
    fetchJson(FEED_URL),
    fetchJson(TRACKER_URL)
  ]);

  if (reportResult.status === "fulfilled") renderReport(reportResult.value);
  else renderReportError(reportResult.reason);

  if (feedResult.status === "fulfilled") renderFeed(feedResult.value);
  else renderFeedError(feedResult.reason);

  if (trackerResult.status === "fulfilled") renderTracker(trackerResult.value);
  else renderTrackerError(trackerResult.reason);

  const ok = reportResult.status === "fulfilled" && feedResult.status === "fulfilled" && trackerResult.status === "fulfilled";
  setStatus(ok ? "AI bot dashboard loaded. Run the GitHub Action anytime to refresh scholarships." : "Some reports could not load. Run the Action once or check the repo data files.", !ok);
}

async function fetchJson(url) {
  const response = await fetch(cacheBust(url), { cache: "no-store" });
  if (!response.ok) throw new Error(`${url} HTTP ${response.status}`);
  return response.json();
}

function renderReport(report) {
  const secret = report.secretStatus || inferSecretStatus(report);
  const added = num(report.added), updated = num(report.updated), skipped = num(report.skipped), failed = num(report.failed);
  text(els.reportGenerated, formatDateTime(report.generatedAt));
  text(els.reportMode, report.importMode ? `${report.mode || "unknown"} / ${report.importMode}` : report.mode || "not-run-yet");
  text(els.reportAdded, String(added));
  text(els.reportUpdated, String(updated));
  text(els.reportSkipped, String(skipped));
  text(els.reportFailed, String(failed));
  text(els.reportActiveCandidates, String(num(report.activeCandidates)));
  text(els.reportDraftCandidates, String(num(report.draftCandidates)));
  text(els.currentPack, report.sourcePackLabel || report.sourcePack || "not selected");
  renderSecret(els.secretFirebase, secret.firebaseServiceAccount || "unknown");
  renderSecret(els.secretProject, secret.firebaseProjectId || "unknown");
  text(els.explainer, report.explainer || explainReport(report));

  const imported = [...array(report.imported), ...array(report.updatedRecords)];
  renderCards(els.importedList, imported.slice(0, 40), (item) => ({
    title: item.name || "Imported scholarship",
    meta: `${item.status || "draft"} • score ${item.aiConfidence || 0}% • ${item.sourcePack || report.sourcePack || "all"} • ${item.id || "no id"}`,
    url: item.link || "",
    body: item.reason ? `Refreshed duplicate: ${item.reason}` : "Added or refreshed by ApplyMate AI Scholarship Bot."
  }), added || updated ? "Imported or refreshed records will appear here after refresh." : "No imported records yet. Run the workflow with dry_run=false.");

  renderCards(els.skippedList, array(report.skippedRecords).slice(0, 40), (item) => ({
    title: item.name || "Skipped record",
    meta: item.reason || "skipped",
    url: item.link || "",
    body: "Skipped to prevent duplicate or unsafe records."
  }), skipped ? "Skipped records will appear here after refresh." : "No skipped records yet.");

  renderCards(els.errorsList, array(report.errors).slice(0, 40), (item) => ({
    title: item.name || item.seed || "Error",
    meta: item.error || "error",
    url: item.link || "",
    body: item.query || report.explainer || "Check GitHub Actions logs for details."
  }), failed ? "Errors will appear here after refresh." : "No errors in latest import report.");
}

function renderFeed(feed) {
  text(els.feedGenerated, formatDateTime(feed.generatedAt));
  text(els.feedTotal, String(num(feed.total) || array(feed.records).length));
  text(els.feedCurated, String(num(feed.curatedPortalCount)));
  text(els.feedErrors, String(num(feed.searchErrorCount) || array(feed.errors).length));
  if (!els.currentPack?.textContent || els.currentPack.textContent === "not selected") text(els.currentPack, feed.sourcePackLabel || feed.sourcePack || "all");

  renderCards(els.feedList, array(feed.records).slice(0, 60), (item) => ({
    title: item.title || item.name || "Discovered scholarship source",
    meta: `${item.official ? "official" : item.trustedPortal ? "trusted" : "review"} • score ${item.score || 0}% • ${item.sourcePack || feed.sourcePack || "all"} • ${item.seedState || item.state || "National"}`,
    url: item.url || item.link || "",
    body: item.snippet || item.description || "Review this source before publishing."
  }), "No discovered records yet. Run the workflow once.");
}

function renderTracker(report) {
  text(els.trackerGenerated, formatDateTime(report.generatedAt));
  text(els.trackerChecked, String(num(report.checked)));
  text(els.trackerActive, String(num(report.active)));
  text(els.trackerPromoted, String(num(report.promoted)));
  text(els.trackerExpired, String(num(report.expired)));
  text(els.trackerNeedsReview, String(num(report.needsReview)));
  text(els.trackerFailed, String(num(report.failed)));
  text(els.trackerThreshold, `${num(report.autoPublishThreshold) || 90}%`);

  renderCards(els.trackerList, array(report.actions).slice(0, 60), (item) => ({
    title: item.name || "Tracker action",
    meta: `${item.action || "checked"} • ${item.statusBefore || "unknown"} → ${item.statusAfter || "unknown"} • score ${item.aiConfidence || 0}%`,
    url: "",
    body: item.reason || report.explainer || "Tracker updated this scholarship."
  }), report.explainer || "No tracker actions yet. Active records may already be clean.");
}

function renderPacks() {
  if (!els.packList) return;
  els.packList.innerHTML = PACKS.map(([value, title, desc]) => `<article class="bot-card">
    <span class="bot-status good">${escapeHtml(value)}</span>
    <h3>${escapeHtml(title)}</h3>
    <p class="bot-mini">${escapeHtml(desc)}</p>
    <p class="bot-mini"><strong>Use in Action:</strong> source_pack = ${escapeHtml(value)}</p>
  </article>`).join("");
}

function renderReportError(error) {
  text(els.reportGenerated, "failed to load");
  text(els.reportMode, "unknown");
  text(els.reportAdded, "0");
  text(els.reportUpdated, "0");
  text(els.reportSkipped, "0");
  text(els.reportFailed, "0");
  text(els.reportActiveCandidates, "0");
  text(els.reportDraftCandidates, "0");
  text(els.explainer, `Could not load import report: ${error.message}`);
  renderSecret(els.secretFirebase, "unknown");
  renderSecret(els.secretProject, "unknown");
  html(els.errorsList, `<article class="bot-card"><h3>Import report load failed</h3><p class="bot-mini">${escapeHtml(error.message)}</p></article>`);
}
function renderFeedError(error) {
  text(els.feedGenerated, "failed to load");
  text(els.feedTotal, "0");
  text(els.feedCurated, "0");
  text(els.feedErrors, "1");
  html(els.feedList, `<article class="bot-card"><h3>Discovery feed load failed</h3><p class="bot-mini">${escapeHtml(error.message)}</p></article>`);
}
function renderTrackerError(error) {
  text(els.trackerGenerated, "failed to load");
  text(els.trackerChecked, "0");
  text(els.trackerActive, "0");
  text(els.trackerPromoted, "0");
  text(els.trackerExpired, "0");
  text(els.trackerNeedsReview, "0");
  text(els.trackerFailed, "1");
  html(els.trackerList, `<article class="bot-card"><h3>Tracker report load failed</h3><p class="bot-mini">${escapeHtml(error.message)}</p></article>`);
}

function renderCards(container, items, map, emptyMessage) {
  if (!container) return;
  if (!items.length) {
    container.innerHTML = `<p class="mini-note">${escapeHtml(emptyMessage)}</p>`;
    return;
  }
  container.innerHTML = items.map((item, index) => {
    const card = map(item);
    return `<article class="bot-card">
      <span class="bot-status ${index < 10 ? "good" : "warn"}">${index + 1}</span>
      <h3>${escapeHtml(card.title)}</h3>
      <p class="bot-mini"><strong>${escapeHtml(card.meta)}</strong></p>
      ${card.url ? `<p class="bot-mini"><a href="${escapeHtml(card.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(card.url)}</a></p>` : ""}
      <p class="bot-mini">${escapeHtml(card.body)}</p>
    </article>`;
  }).join("");
}

function renderSecret(el, value) {
  if (!el) return;
  const v = String(value || "unknown");
  const good = /present|not-needed|using-service-account/.test(v);
  const bad = /missing|invalid|failed/.test(v);
  el.className = `bot-status ${good ? "good" : bad ? "bad" : "warn"}`;
  el.textContent = v.replaceAll("_", " ");
}
function inferSecretStatus(report) {
  const text = JSON.stringify(report || {}).toLowerCase();
  return {
    firebaseServiceAccount: text.includes("firebase_service_account_json") ? "missing_or_invalid" : report.mode === "import" ? "present" : "unknown",
    firebaseProjectId: report.mode === "import" ? "present_or_service_account_project" : "unknown"
  };
}
function explainReport(report) {
  const added = num(report.added), updated = num(report.updated), skipped = num(report.skipped), failed = num(report.failed);
  if (/not-run/i.test(report.mode || "")) return "The importer has not run yet. Open the Action, choose a source pack, and run dry_run=true first.";
  if (/dry-run/i.test(report.mode || "")) return `Dry run complete. ${report.previewCount || 0} records are ready. Active candidates: ${report.activeCandidates || 0}.`;
  if (failed) return `Import finished with issues. Added ${added}, refreshed ${updated}, skipped ${skipped}, failed ${failed}. Check errors below.`;
  return `Import finished successfully. Added ${added}, refreshed ${updated}, skipped ${skipped}, failed ${failed}.`;
}
function setStatus(message, bad = false) { if (els.status) { els.status.textContent = message; els.status.style.color = bad ? "#b42318" : ""; } }
function cacheBust(url) { return `${url}?v=${Date.now()}`; }
function array(value) { return Array.isArray(value) ? value : []; }
function num(value) { const n = Number(value); return Number.isFinite(n) ? n : 0; }
function text(el, value) { if (el) el.textContent = value || ""; }
function html(el, value) { if (el) el.innerHTML = value || ""; }
function formatDateTime(value) {
  if (!value) return "not-run-yet";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}
function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
