// ApplyMate Bulk Auto Import dashboard v2
// Read-only dashboard for the GitHub Actions based scholarship importer.

const $ = (id) => document.getElementById(id);
const ACTION_URL = "https://github.com/koushikrajcodex-boop/applymate-india/actions/workflows/scholarship-bulk-auto-import.yml";
const REPORT_URL = "data/bulk-import-report.json";
const FEED_URL = "data/auto-discovered-scholarships.json";

const PACKS = [
  ["all", "All Packs", "General bulk import across official + trusted portals."],
  ["national", "National", "NSP, AICTE, UGC and national trusted sources."],
  ["engineering", "Engineering", "AICTE, technical education, FFE, Reliance, Vidyasaarathi."],
  ["ap_tel", "AP + Telangana", "AP Jnanabhumi and Telangana ePASS focused sources."],
  ["categories", "SC/ST/OBC/EWS/Minority", "Category-focused government and trusted portals."],
  ["private_trusted", "Private Trusted", "Buddy4Study, Vidyasaarathi, FFE, HDFC, Reliance, Tata."],
  ["girls", "Girls", "Girls/women-focused scholarship sources like Pragati." ]
];

const els = {
  status: $("bulkBotStatus"),
  reportGenerated: $("bulkReportGenerated"),
  reportMode: $("bulkReportMode"),
  reportAdded: $("bulkReportAdded"),
  reportSkipped: $("bulkReportSkipped"),
  reportFailed: $("bulkReportFailed"),
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
  loadBtn: $("bulkLoadReportBtn"),
  openActionBtn: $("bulkOpenActionBtn"),
  openReportBtn: $("bulkOpenReportBtn"),
  openFeedBtn: $("bulkOpenFeedBtn")
};

installDashboard();

function installDashboard() {
  els.loadBtn?.addEventListener("click", loadAll);
  els.openActionBtn?.addEventListener("click", () => window.open(ACTION_URL, "_blank", "noopener,noreferrer"));
  els.openReportBtn?.addEventListener("click", () => window.open(cacheBust(REPORT_URL), "_blank", "noopener,noreferrer"));
  els.openFeedBtn?.addEventListener("click", () => window.open(cacheBust(FEED_URL), "_blank", "noopener,noreferrer"));
  renderPacks();
  loadAll();
}

async function loadAll() {
  setStatus("Loading latest bulk import report and discovery feed...");
  const [reportResult, feedResult] = await Promise.allSettled([fetchJson(REPORT_URL), fetchJson(FEED_URL)]);

  if (reportResult.status === "fulfilled") renderReport(reportResult.value);
  else renderReportError(reportResult.reason);

  if (feedResult.status === "fulfilled") renderFeed(feedResult.value);
  else renderFeedError(feedResult.reason);

  const ok = reportResult.status === "fulfilled" && feedResult.status === "fulfilled";
  setStatus(ok ? "Dashboard loaded. Choose a source pack in GitHub Actions, run the workflow, then refresh this report." : "Some files could not load. Check repo reports or rerun the Action.", !ok);
}

async function fetchJson(url) {
  const response = await fetch(cacheBust(url), { cache: "no-store" });
  if (!response.ok) throw new Error(`${url} HTTP ${response.status}`);
  return response.json();
}

function renderReport(report) {
  const secret = report.secretStatus || inferSecretStatus(report);
  const added = num(report.added), skipped = num(report.skipped), failed = num(report.failed);
  text(els.reportGenerated, report.generatedAt || "not-run-yet");
  text(els.reportMode, report.mode || "not-run-yet");
  text(els.reportAdded, String(added));
  text(els.reportSkipped, String(skipped));
  text(els.reportFailed, String(failed));
  text(els.currentPack, report.sourcePackLabel || report.sourcePack || "not selected");
  renderSecret(els.secretFirebase, secret.firebaseServiceAccount || "unknown");
  renderSecret(els.secretProject, secret.firebaseProjectId || "unknown");
  text(els.explainer, report.explainer || explainReport(report));

  renderCards(els.importedList, array(report.imported).slice(0, 30), (item) => ({
    title: item.name || "Imported scholarship",
    meta: `${item.status || "draft"} • ${item.sourcePack || report.sourcePack || "all"} • ${item.id || "no id"}`,
    url: item.link || "",
    body: "Added to Firestore by Bulk Scholarship Auto Import."
  }), added ? "Imported records will appear here after refresh." : "No imported records yet. Run the workflow with dry_run=false.");

  renderCards(els.skippedList, array(report.skippedRecords).slice(0, 30), (item) => ({
    title: item.name || "Skipped record",
    meta: item.reason || "skipped",
    url: item.link || "",
    body: "Skipped to prevent duplicate records."
  }), skipped ? "Skipped records will appear here after refresh." : "No skipped records yet.");

  renderCards(els.errorsList, array(report.errors).slice(0, 30), (item) => ({
    title: item.name || item.seed || "Error",
    meta: item.error || "error",
    url: item.link || "",
    body: item.query || report.explainer || "Check GitHub Actions logs for details."
  }), failed ? "Errors will appear here after refresh." : "No errors in latest report.");
}

function renderFeed(feed) {
  text(els.feedGenerated, feed.generatedAt || "not-run-yet");
  text(els.feedTotal, String(num(feed.total) || array(feed.records).length));
  text(els.feedCurated, String(num(feed.curatedPortalCount)));
  text(els.feedErrors, String(num(feed.searchErrorCount) || array(feed.errors).length));
  if (!els.currentPack?.textContent || els.currentPack.textContent === "not selected") text(els.currentPack, feed.sourcePackLabel || feed.sourcePack || "all");

  renderCards(els.feedList, array(feed.records).slice(0, 50), (item) => ({
    title: item.title || item.name || "Discovered scholarship source",
    meta: `${item.official ? "official" : item.trustedPortal ? "trusted" : "review"} • score ${item.score || 0}% • ${item.sourcePack || feed.sourcePack || "all"} • ${item.seedState || item.state || "National"}`,
    url: item.url || item.link || "",
    body: item.snippet || item.description || "Review this source before publishing."
  }), "No discovered records yet. Run the workflow once.");
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
  text(els.reportSkipped, "0");
  text(els.reportFailed, "0");
  text(els.explainer, `Could not load report: ${error.message}`);
  renderSecret(els.secretFirebase, "unknown");
  renderSecret(els.secretProject, "unknown");
  html(els.errorsList, `<article class="bot-card"><h3>Report load failed</h3><p class="bot-mini">${escapeHtml(error.message)}</p></article>`);
}

function renderFeedError(error) {
  text(els.feedGenerated, "failed to load");
  text(els.feedTotal, "0");
  text(els.feedCurated, "0");
  text(els.feedErrors, "1");
  html(els.feedList, `<article class="bot-card"><h3>Feed load failed</h3><p class="bot-mini">${escapeHtml(error.message)}</p></article>`);
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
  const added = num(report.added), skipped = num(report.skipped), failed = num(report.failed);
  if (/not-run/i.test(report.mode || "")) return "The bulk importer has not run yet. Open the Action, choose a source pack, and run dry_run=true first.";
  if (/dry-run/i.test(report.mode || "")) return `Dry run complete. ${report.previewCount || 0} records are ready. Run again with dry_run=false to import them as drafts.`;
  if (failed) return `Import finished with issues. Added ${added}, skipped ${skipped}, failed ${failed}. Check errors below and GitHub Actions logs.`;
  return `Import finished successfully. Added ${added} draft record(s), skipped ${skipped} duplicate(s), failed ${failed}.`;
}
function setStatus(message, bad = false) {
  if (els.status) {
    els.status.textContent = message;
    els.status.style.color = bad ? "#b42318" : "";
  }
}
function cacheBust(url) { return `${url}?v=${Date.now()}`; }
function array(value) { return Array.isArray(value) ? value : []; }
function num(value) { const n = Number(value); return Number.isFinite(n) ? n : 0; }
function text(el, value) { if (el) el.textContent = value || ""; }
function html(el, value) { if (el) el.innerHTML = value || ""; }
function escapeHtml(value) { return String(value || "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;"); }
