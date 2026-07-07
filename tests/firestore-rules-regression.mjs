import fs from "node:fs";

const rulesPath = new URL("../firestore.rules", import.meta.url);
const rules = fs.readFileSync(rulesPath, "utf8");
const failures = [];

function requirePattern(pattern, message) {
  if (!pattern.test(rules)) failures.push(message);
}

function forbidPattern(pattern, message) {
  if (pattern.test(rules)) failures.push(message);
}

function requireText(text, message) {
  if (!rules.includes(text)) failures.push(message);
}

requireText("rules_version = '2';", "Rules must use version 2.");
requireText("function isOwner(userId)", "Owner helper is missing.");
requireText("function isAdmin()", "Admin helper is missing.");
requireText("request.auth.token.admin == true", "Admin custom-claim support is missing.");
requireText("lastwarrior324@gmail.com", "Primary admin email fallback is missing.");
requireText("koushikrajcodex@gmail.com", "Secondary admin email fallback is missing.");

requireText("function isValidUserProfile()", "User profile validation is missing.");
requireText("function isValidSavedScholarship()", "Saved-scholarship validation is missing.");
requireText("function isValidApplication()", "Application validation is missing.");
requireText("function isValidScholarship()", "Admin scholarship validation is missing.");

requirePattern(
  /match\s+\/users\/\{userId\}[\s\S]*?allow\s+read:\s*if\s+isOwner\(userId\);/,
  "User documents must be readable only by their owner."
);
requirePattern(
  /match\s+\/savedScholarships\/\{docId\}[\s\S]*?allow\s+create,\s*update:\s*if\s+isOwner\(userId\)\s*&&\s*isValidSavedScholarship\(\);/,
  "Saved scholarships must require owner access and validation."
);
requirePattern(
  /match\s+\/applications\/\{docId\}[\s\S]*?allow\s+create,\s*update:\s*if\s+isOwner\(userId\)\s*&&\s*isValidApplication\(\);/,
  "Applications must require owner access and validation."
);
requirePattern(
  /match\s+\/scholarships\/\{scholarshipId\}[\s\S]*?allow\s+create,\s*update:\s*if\s+isAdmin\(\)\s*&&\s*isValidScholarship\(\);/,
  "Scholarship writes must require admin access and validation."
);

requireText('"Not Applied"', "Not Applied tracker status is missing.");
requireText('"Applied"', "Applied tracker status is missing.");
requireText('"Under Review"', "Under Review tracker status is missing.");
requireText('"Approved"', "Approved tracker status is missing.");
requireText('"Rejected"', "Rejected tracker status is missing.");
requireText('"active"', "Active scholarship status is missing.");
requireText('"draft"', "Draft scholarship status is missing.");
requireText('"closed"', "Closed scholarship status is missing.");

requirePattern(
  /match\s+\/\{document=\*\*\}[\s\S]*?allow\s+read,\s*write:\s*if\s+false;/,
  "A deny-all fallback rule is required."
);

forbidPattern(
  /allow\s+read,\s*write:\s*if\s+isOwner\(userId\)\s*;/,
  "Broad owner read/write rule detected; keep create/update validation in place."
);
forbidPattern(
  /allow\s+write:\s*if\s+true\s*;/,
  "Unconditional Firestore writes must never be allowed."
);
forbidPattern(
  /allow\s+read,\s*write:\s*if\s+true\s*;/,
  "Unconditional Firestore access must never be allowed."
);

const openingBraces = (rules.match(/\{/g) || []).length;
const closingBraces = (rules.match(/\}/g) || []).length;
if (openingBraces !== closingBraces) {
  failures.push(`Unbalanced braces: ${openingBraces} opening and ${closingBraces} closing.`);
}

if (failures.length > 0) {
  console.error("Firestore rules regression check failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Firestore rules regression check passed.");
