// Loads GitHub Actions generated scholarship discovery feed into the analyzer draft box.

const $auto = (id) => document.getElementById(id);
const autoEls = {
  load: $auto("autoDiscoveryLoadBtn"),
  openFeed: $auto("autoDiscoveryOpenFeedBtn"),
  status: $auto("autoDiscoveryStatus"),
  input: $auto("botPanelInput"),
  analyze: $auto("botPanelAnalyzeBtn")
};

const FEED_URL = "data/auto-discovered-scholarships.json";

installAutoDiscoveryLoader();

function installAutoDiscoveryLoader() {
  autoEls.load?.addEventListener("click", loadAutoDiscoveryFeed);
  autoEls.openFeed?.addEventListener("click", () => window.open(`${FEED_URL}?v=${Date.now()}`, "_blank", "noopener,noreferrer"));
  setAutoStatus("Auto-discovery loader ready. Run the GitHub Action, then load drafts here.");
}

async function loadAutoDiscoveryFeed() {
  try {
    setAutoStatus("Loading auto-discovered scholarship feed...");
    const response = await fetch(`${FEED_URL}?v=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const feed = await response.json();
    const records = Array.isArray(feed.records) ? feed.records : [];
    if (!records.length) {
      setAutoStatus(`No records yet. Feed generatedAt: ${feed.generatedAt || "unknown"}. Run Scholarship Auto Discovery in GitHub Actions.`, true);
      return;
    }
    const blocks = records.map(toLegacyBlock).join("\n---\n");
    if (autoEls.input) autoEls.input.value = blocks;
    autoEls.analyze?.click();
    setAutoStatus(`Loaded ${records.length} auto-discovered draft(s). Generated: ${feed.generatedAt || "unknown"}. Review, then Import Draft/Review.`);
  } catch (error) {
    console.error(error);
    setAutoStatus(`Could not load auto-discovery feed: ${error.message}`, true);
  }
}

function toLegacyBlock(item) {
  return [
    `Scholarship Name ${cleanTitle(item.title)}`,
    `State ${guessState(`${item.title || ""} ${item.snippet || ""} ${item.url || ""}`)}`,
    `Education ${guessEducation(`${item.title || ""} ${item.snippet || ""}`).join(", ")}`,
    `Categories ${guessCategories(`${item.title || ""} ${item.snippet || ""}`).join(", ")}`,
    "Gender any",
    `Amount ${extractAmount(item.snippet)}`,
    `Income limit ${extractIncome(item.snippet)}`,
    `Deadline date ${extractDate(item.snippet)}`,
    `Official link ${item.url || ""}`,
    `Source ${sourceNameFromUrl(item.url)}`,
    `Eligibility Auto-discovered from GitHub Actions. Verify official page/PDF before publishing. Seed: ${item.seedName || "auto"}. Snippet: ${item.snippet || ""}`,
    `Income note ${extractIncomeNote(item.snippet)}`
  ].join("\n");
}

function setAutoStatus(message, bad = false) {
  if (autoEls.status) {
    autoEls.status.textContent = message;
    autoEls.status.style.color = bad ? "#b42318" : "";
  }
}
function cleanTitle(title) { return clean(title).replace(/\s*-\s*(PDF|Official|Notification).*$/i, "").slice(0, 160) || "Scholarship details needed"; }
function sourceNameFromUrl(url) { try { const host = new URL(url).hostname.replace(/^www\./, ""); if (host.includes("scholarships.gov.in")) return "National Scholarship Portal"; if (host.includes("aicte")) return "AICTE"; if (host.includes("jnanabhumi")) return "AP Jnanabhumi"; if (host.includes("telanganaepass")) return "Telangana ePASS"; if (host.includes("ugc")) return "UGC"; if (host.includes("andaman") || host.includes("and.nic")) return "Andaman and Nicobar Administration"; return host.split(".").slice(0, 2).join("."); } catch { return "Official Portal"; } }
function guessState(text) { const t = String(text || "").toLowerCase(); if (/andhra pradesh|jnanabhumi|\bap\b/.test(t)) return "Andhra Pradesh"; if (/telangana|epass/.test(t)) return "Telangana"; if (/andaman|nicobar|port blair/.test(t)) return "Andaman and Nicobar Islands"; if (/karnataka/.test(t)) return "Karnataka"; if (/tamil nadu/.test(t)) return "Tamil Nadu"; if (/kerala/.test(t)) return "Kerala"; if (/maharashtra/.test(t)) return "Maharashtra"; if (/odisha|orissa/.test(t)) return "Odisha"; if (/west bengal/.test(t)) return "West Bengal"; return "National"; }
function guessEducation(text) { const t = norm(text); const out = []; if (/school|class|pre matric/.test(t)) out.push("school"); if (/intermediate|senior secondary|10 2|class xii/.test(t)) out.push("intermediate"); if (/degree|graduation|graduate|undergraduate|ug/.test(t)) out.push("degree"); if (/engineering|btech|technology|polytechnic|diploma|iti/.test(t)) out.push("engineering"); if (/medicine|medical|nursing|pharmacy/.test(t)) out.push("medical"); if (/post graduate|pg|masters|m tech|m phil|phd|post doctoral/.test(t)) out.push("pg"); return out.length ? [...new Set(out)] : ["any"]; }
function guessCategories(text) { const t = norm(text); const out = []; if (/general|open category/.test(t)) out.push("general"); if (/\bsc\b|scheduled caste/.test(t)) out.push("sc"); if (/\bst\b|scheduled tribe/.test(t)) out.push("st"); if (/\bobc\b|other backward class|backward class/.test(t)) out.push("obc"); if (/ews|economically weaker/.test(t)) out.push("ews"); if (/minority|muslim|christian|sikh|buddhist|jain|parsi/.test(t)) out.push("minority"); return out.length ? [...new Set(out)] : ["general", "sc", "st", "obc", "ews", "minority"]; }
function extractAmount(text) { const amount = String(text || "").match(/(?:₹|rs\.?)\s*([0-9][0-9,]*(?:\.\d+)?)/i)?.[1]?.replace(/,/g, "") || ""; const freq = /per\s+month|monthly|p\.m\./i.test(text) ? " per month" : /per\s+annum|per\s+year|annually|yearly|p\.a\./i.test(text) ? " per year" : ""; return amount ? `Rs.${amount}${freq}` : "Varies as per official rules"; }
function extractIncome(text) { return String(text || "").match(/(?:income\s+limit|annual\s+income|family\s+income|max(?:imum)?\s+income|not\s+exceed)[^₹\d]{0,100}(?:₹|rs\.?\s?)?([0-9][0-9,]{3,})/i)?.[1]?.replace(/,/g, "") || "0"; }
function extractIncomeNote(text) { const hit = around(text, /(income\s+limit|annual income|family income|max(?:imum)? income|not exceed)/i, 350); if (hit) return hit; if (/non[-\s]?creamy layer/i.test(text)) return "OBC non-creamy layer rule found. Verify exact income rule from official notification."; return "Verify income rules on official portal."; }
function extractDate(text) { return date(findDate(text)); }
function findDate(text) { return String(text || "").match(/20\d{2}-[01]\d-[0-3]\d/)?.[0] || String(text || "").match(/[0-3]?\d[/-][01]?\d[/-]20\d{2}/)?.[0] || String(text || "").match(/[0-3]?\d\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\s+20\d{2}/i)?.[0] || ""; }
function date(v) { const s = String(v || "").trim(); if (!s) return ""; const iso = s.match(/20\d{2}-[01]\d-[0-3]\d/)?.[0]; if (iso) return iso; const n = s.match(/([0-3]?\d)[/-]([01]?\d)[/-](20\d{2})/); if (n) return `${n[3]}-${n[2].padStart(2, "0")}-${n[1].padStart(2, "0")}`; const m = s.match(/([0-3]?\d)\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\s+(20\d{2})/i); if (!m) return ""; const mm = { jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06", jul: "07", aug: "08", sep: "09", sept: "09", oct: "10", nov: "11", dec: "12" }; return `${m[3]}-${mm[m[2].toLowerCase().slice(0, 4)] || mm[m[2].toLowerCase().slice(0, 3)]}-${m[1].padStart(2, "0")}`; }
function around(text, regex, len) { const s = clean(text).replace(/https?:\/\/\S+/g, ""); const i = s.search(regex); return i < 0 ? "" : s.slice(Math.max(0, i - 100), i + len); }
function clean(v) { return String(v || "").replace(/\s+/g, " ").trim(); }
function norm(v) { return String(v || "").toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim(); }
