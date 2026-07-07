import fs from "node:fs";

const filePath = new URL("../dashboard.js", import.meta.url);
let source = fs.readFileSync(filePath, "utf8");

const original = source;

const imports = `import {
  DEADLINE_SOON_DAYS,
  LAST_VERIFIED,
  MAX_COMPARE_ITEMS,
  STATUS_LABELS,
  VALID_APPLICATION_STATUSES
} from "./dashboard/constants.js";
import {
  cleanText,
  formatIndianNumber,
  getMatchQuality,
  normalizeArray,
  normalizeText,
  parsePercentage
} from "./dashboard/utils.js";
import { normalizeHttpUrl } from "./dashboard/url-utils.js";
`;

if (!source.includes('from "./dashboard/constants.js"')) {
  const anchor = 'import { validateScholarships } from "./scholarship-validator.js";\n';

  if (!source.includes(anchor)) {
    throw new Error("Could not find the dashboard import anchor.");
  }

  source = source.replace(anchor, `${anchor}${imports}`);
}

const constantBlock = /\nconst LAST_VERIFIED = "28 June 2026";\nconst DEADLINE_SOON_DAYS = 15;\nconst MAX_COMPARE_ITEMS = 4;\n\nconst VALID_APPLICATION_STATUSES = \[[\s\S]*?\n\];\n\nconst STATUS_LABELS = \{[\s\S]*?\n\};\n/;
source = source.replace(constantBlock, "\n");

const helperNames = [
  "normalizeText",
  "normalizeArray",
  "cleanText",
  "parsePercentage",
  "formatIndianNumber",
  "getMatchQuality",
  "normalizeHttpUrl"
];

for (const name of helperNames) {
  const pattern = new RegExp(`\\nfunction ${name}\\([^)]*\\) \\{[\\s\\S]*?\\n\\}`, "g");
  const matches = source.match(pattern) || [];

  if (matches.length > 1) {
    throw new Error(`Refusing to remove ${name}: found ${matches.length} definitions.`);
  }

  source = source.replace(pattern, "");
}

const requiredImports = [
  'from "./dashboard/constants.js"',
  'from "./dashboard/utils.js"',
  'from "./dashboard/url-utils.js"'
];

for (const requiredImport of requiredImports) {
  if (!source.includes(requiredImport)) {
    throw new Error(`Missing required import: ${requiredImport}`);
  }
}

for (const name of helperNames) {
  if (source.includes(`function ${name}(`)) {
    throw new Error(`Duplicate local helper remains: ${name}`);
  }
}

if (source === original) {
  console.log("dashboard.js is already using the shared modules.");
  process.exit(0);
}

fs.writeFileSync(filePath, source);
console.log("dashboard.js migrated to shared constants and utility modules.");
