import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { validateScholarships } from "../scholarship-validator.js";

const candidates = [
  "data/scholarships.json",
  "data/scholarships.js",
  "scholarships-data.js",
  "scholarship-data.js"
];

const existing = candidates.find((filePath) => fs.existsSync(filePath));

if (!existing) {
  console.log("No open scholarship dataset file found yet. Skipping dataset validation.");
  console.log("Expected one of:");
  candidates.forEach((filePath) => console.log(`- ${filePath}`));
  process.exit(0);
}

const scholarships = await loadDataset(existing);
const result = validateScholarships(scholarships);

if (!result.valid) {
  console.error(`Scholarship data validation failed for ${existing}:`);
  result.errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`Scholarship data validation passed for ${existing}. Records checked: ${scholarships.length}`);

async function loadDataset(filePath) {
  const extension = path.extname(filePath);

  if (extension === ".json") {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  }

  const module = await import(pathToFileURL(path.resolve(filePath)).href);
  return module.default || module.scholarships || module.SCHOLARSHIPS || [];
}
