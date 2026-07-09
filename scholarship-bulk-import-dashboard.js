// ApplyMate Bulk Auto Import dashboard
// Read-only dashboard for the GitHub Actions based scholarship importer.

const $ = (id) => document.getElementById(id);
const ACTION_URL = "https://github.com/koushikrajcodex-boop/applymate-india/actions/workflows/scholarship-bulk-auto-import.yml";
const REPORT_URL = "data/bulk-import-report.json";
const FEED_URL = "data/auto-discovered-scholarships.json";

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
  setStatus(ok ? "Dashboard loaded. Run the GitHub Action to bulk import, then refresh this report." : "Some files could not load. Check repo reports or rerun the Action.", !ok);
}

async function fetchJson(url) {
  const response = await fetch(cacheBust(url), { cache: "no-store" });
  if (!response.ok) throw new Error(`${url} HTTP ${response.status}`);
  return response.json();
}

function renderReport(report) {
  text(els.reportGenerated, report.generatedAt || "not-run-yet");
  text(els.reportMode, report.mode || "not-run-yet");
  text(els.reportAdded, String(num(report.added)));
  text(els.reportSkipped, String(num(report.skipped)));
  text(els.reportFailed, String(num(report.failed)));

  renderCards(els.importedList, array(report.imported).slice(0, 30), (item) => ({
    title: item.name || "Imported scholarship",
    meta: `${item.status || "draft"} • ${item.id || "no id"}`,
    url: item.link || "",
    body: "Added to Firestore by Bulk Scholarship Auto Import."
  }), "No imported records yet. Run the workflow with dry_run=false.");

  renderCards(els.skippedList, array(report.skippedRecords).slice(0, 30), (item) => ({
    title: item.name || "Skipped record",
    meta: item.reason || "skipped",
    url: item.link || "",
    body: "Skipped to prevent duplicate records."
  }), "No skipped records yet.");

  renderCards(els.errorsList, array(report.errors).slice(0, 30), (item) => ({
    title: item.name || item.seed || "Error",
    meta: item.error || "error",
    url: item.link || "",
    body: item.query || "Check GitHub Actions logs for details."
  }), "No errors in latest report.");
}

function renderFeed(feed) {
  text(els.feedGenerated, feed.generatedAt || "not-run-yet");
  text(els.feedTotal, String(num(feed.total) || array(feed.records).length));
  text(els.feedCurated, String(num(feed.curatedPortalCount)));
  text(els.feedErrors, String(num(feed.searchErrorCount) || array(feed.errors).length));

  renderCards(els.feedList, array(feed.records).slice(0, 50), (item) => ({
    title: item.title || item.name || "Discovered scholarship source",
    meta: `${item.official ? "official" : item.trustedPortal ? "trusted" : "review"} • score ${item.score || 0}% • ${item.seedState || item.state || "National"}`,
    url: item.url || item.link || "",
    body: item.snippet || item.description || "Review this source before publishing."
  }), "No discovered records yet. Run the workflow once.");
}

function renderReportError(error) {
  text(els.reportGenerated, "failed to load");
  text(els.reportMode, "unknown");
  text(els.reportAdded, "0");
  text(els.reportSkipped, "0");
  text(els.reportFailed, "0");
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
