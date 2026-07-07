import assert from "node:assert/strict";
import {
  cleanText,
  formatIndianNumber,
  getMatchQuality,
  normalizeArray,
  normalizeText,
  parsePercentage
} from "../dashboard/utils.js";
import { normalizeHttpUrl } from "../dashboard/url-utils.js";

assert.equal(normalizeText("  Andhra Pradesh  "), "andhra pradesh");
assert.deepEqual(normalizeArray(["UG", " PG "]), ["ug", "pg"]);
assert.deepEqual(normalizeArray("UG, PG"), ["ug", "pg"]);
assert.equal(cleanText("  Scholarship  ", 8), "Scholars");
assert.equal(parsePercentage("85%"), 85);
assert.equal(parsePercentage("8.5"), 85);
assert.equal(parsePercentage("120"), null);
assert.equal(formatIndianNumber(450000), "4,50,000");
assert.equal(getMatchQuality(95), "🟢 Excellent Match");
assert.equal(getMatchQuality(80), "🔵 Very Good Match");
assert.equal(getMatchQuality(65), "🟡 Good Match");
assert.equal(getMatchQuality(40), "⚪ Possible Match");
assert.equal(normalizeHttpUrl("https://scholarships.gov.in"), "https://scholarships.gov.in/");
assert.equal(normalizeHttpUrl("javascript:alert(1)"), "");
assert.equal(normalizeHttpUrl("not-a-url"), "");
assert.equal(normalizeHttpUrl(""), "");

console.log("Dashboard utility tests passed.");
