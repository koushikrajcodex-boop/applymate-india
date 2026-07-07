import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const errors = [];
const warnings = [];

function exists(filePath) {
  return fs.existsSync(path.join(root, filePath));
}

function read(filePath) {
  return fs.readFileSync(path.join(root, filePath), "utf8");
}

function fail(message) {
  errors.push(message);
}

function warn(message) {
  warnings.push(message);
}

function checkRequiredFiles() {
  [
    "index.html",
    "404.html",
    "offline.html",
    "manifest.webmanifest",
    "service-worker.js",
    "robots.txt",
    "sitemap.xml",
    "style.css"
  ].forEach((file) => {
    if (!exists(file)) fail(`Missing required file: ${file}`);
  });
}

function checkManifest() {
  if (!exists("manifest.webmanifest")) return;

  try {
    const manifest = JSON.parse(read("manifest.webmanifest"));

    ["name", "short_name", "start_url", "scope", "display", "icons"].forEach((key) => {
      if (!(key in manifest)) fail(`Manifest missing key: ${key}`);
    });

    if (!Array.isArray(manifest.icons) || manifest.icons.length < 2) {
      fail("Manifest should include at least two icons.");
    }

    for (const icon of manifest.icons || []) {
      if (icon.src && !exists(icon.src.replace(/^\.\//, ""))) {
        fail(`Manifest icon missing: ${icon.src}`);
      }
    }
  } catch (error) {
    fail(`Manifest is invalid JSON: ${error.message}`);
  }
}

function checkSitemap() {
  if (!exists("sitemap.xml")) return;

  const sitemap = read("sitemap.xml");
  const matches = [...sitemap.matchAll(/<loc>https:\/\/koushikrajcodex-boop\.github\.io\/applymate-india\/([^<]*)<\/loc>/g)];

  if (matches.length === 0) {
    fail("Sitemap has no matching GitHub Pages URLs.");
  }

  for (const match of matches) {
    const file = match[1] || "index.html";
    const localFile = file === "" ? "index.html" : file;

    if (!exists(localFile)) {
      fail(`Sitemap references missing file: ${localFile}`);
    }
  }
}

function checkServiceWorkerCache() {
  if (!exists("service-worker.js")) return;

  const source = read("service-worker.js");
  const assetMatches = [...source.matchAll(/"([^"]+\.(?:html|css|js|webmanifest|svg))"/g)];

  for (const match of assetMatches) {
    const asset = match[1].replace(/^\.\//, "");

    if (asset.startsWith("http")) continue;
    if (!exists(asset)) fail(`Service worker caches missing file: ${asset}`);
  }
}

function checkHtmlLinks() {
  const htmlFiles = fs.readdirSync(root).filter((file) => file.endsWith(".html"));

  for (const htmlFile of htmlFiles) {
    const source = read(htmlFile);
    const links = [
      ...source.matchAll(/href="([^"]+)"/g),
      ...source.matchAll(/src="([^"]+)"/g)
    ];

    for (const match of links) {
      const href = match[1];

      if (
        href.startsWith("http") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        href.startsWith("#") ||
        href.startsWith("data:") ||
        href.startsWith("javascript:")
      ) {
        continue;
      }

      const clean = href.split("?")[0].split("#")[0].replace(/^\.\//, "");
      if (!clean || clean.endsWith("/")) continue;

      if (!exists(clean)) {
        warn(`${htmlFile} references missing file: ${href}`);
      }
    }
  }
}

checkRequiredFiles();
checkManifest();
checkSitemap();
checkServiceWorkerCache();
checkHtmlLinks();

if (warnings.length > 0) {
  console.warn("Integrity warnings:");
  for (const warning of warnings) console.warn(`- ${warning}`);
}

if (errors.length > 0) {
  console.error("Integrity check failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Integrity check passed.");
