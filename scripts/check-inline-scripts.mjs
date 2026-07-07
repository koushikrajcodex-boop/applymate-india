import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const htmlFiles = fs.readdirSync(root).filter((file) => file.endsWith(".html"));
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "applymate-inline-js-"));
const failures = [];
let checked = 0;

try {
  for (const htmlFile of htmlFiles) {
    const source = fs.readFileSync(path.join(root, htmlFile), "utf8");
    const scripts = [...source.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];

    scripts.forEach((match, index) => {
      const attributes = match[1] || "";
      const code = match[2] || "";

      if (/\bsrc\s*=/.test(attributes)) return;
      if (/type\s*=\s*["']application\/ld\+json["']/i.test(attributes)) return;
      if (!code.trim()) return;

      const extension = /type\s*=\s*["']module["']/i.test(attributes) ? ".mjs" : ".js";
      const tempFile = path.join(tempDir, `${path.basename(htmlFile, ".html")}-${index + 1}${extension}`);
      fs.writeFileSync(tempFile, code, "utf8");

      const result = spawnSync(process.execPath, ["--check", tempFile], {
        encoding: "utf8"
      });

      checked += 1;

      if (result.status !== 0) {
        failures.push({
          htmlFile,
          scriptNumber: index + 1,
          details: (result.stderr || result.stdout || "Unknown syntax error").trim()
        });
      }
    });
  }
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}

if (failures.length > 0) {
  console.error("Inline JavaScript syntax check failed:");

  for (const failure of failures) {
    console.error(`\n- ${failure.htmlFile}, inline script ${failure.scriptNumber}`);
    console.error(failure.details);
  }

  process.exit(1);
}

console.log(`Inline JavaScript syntax check passed (${checked} script block${checked === 1 ? "" : "s"}).`);
