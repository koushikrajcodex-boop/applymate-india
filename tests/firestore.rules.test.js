import fs from "node:fs";
import assert from "node:assert/strict";

const rules = fs.readFileSync("firestore.rules", "utf8");

assert.match(rules, /rules_version = '2';/);
assert.match(rules, /function isOwner\(userId\)/);
assert.match(rules, /match \/users\/\{userId\}/);
assert.match(rules, /match \/savedScholarships\/\{docId\}/);
assert.match(rules, /match \/applications\/\{docId\}/);
assert.match(rules, /match \/scholarships\/\{scholarshipId\}/);
assert.match(rules, /allow read: if true;/);
assert.match(rules, /allow create, update: if isAdmin\(\)/);
assert.doesNotMatch(rules, /allow read, write: if isOwner\(userId\);/);

console.log("Firestore rules structure check passed.");
