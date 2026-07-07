import fs from "node:fs";
import assert from "node:assert/strict";

const source = fs.readFileSync("dashboard.js", "utf8");

assert.match(source, /from "\.\/dashboard\/constants\.js"/);
assert.match(source, /from "\.\/dashboard\/utils\.js"/);
assert.match(source, /from "\.\/dashboard\/url-utils\.js"/);

for (const name of [
  "normalizeText",
  "normalizeArray",
  "cleanText",
  "parsePercentage",
  "formatIndianNumber",
  "getMatchQuality",
  "normalizeHttpUrl"
]) {
  assert.doesNotMatch(
    source,
    new RegExp(`function ${name}\\(`),
    `${name} should be imported, not defined inside dashboard.js`
  );
}

assert.doesNotMatch(source, /const LAST_VERIFIED =/);
assert.doesNotMatch(source, /const VALID_APPLICATION_STATUSES =/);
assert.doesNotMatch(source, /const STATUS_LABELS =/);

console.log("Dashboard module integration checks passed.");
