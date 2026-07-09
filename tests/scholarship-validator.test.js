import assert from "node:assert/strict";
import { validateScholarships } from "../scholarship-validator.js";

const validScholarship = {
  name: "Example Scholarship",
  state: "national",
  stateLabel: "National",
  education: ["engineering", "degree"],
  categories: ["general", "obc"],
  genders: ["any"],
  disability: "any",
  maxIncome: 250000,
  minPercentage: 60,
  amount: "Up to ₹50,000",
  deadline: "Check official portal",
  link: "https://example.gov.in",
  sourceName: "Official Portal",
  eligibilityNote: "For eligible students as per official rules.",
  incomeNote: "Family income limit applies.",
  priority: 10
};

function testValidScholarshipPasses() {
  const result = validateScholarships([validScholarship]);
  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
}

function testRejectsNonArrayDataset() {
  const result = validateScholarships({});
  assert.equal(result.valid, false);
  assert.ok(result.errors.includes("Scholarships data must be an array."));
}

function testRejectsMissingRequiredFields() {
  const result = validateScholarships([{ ...validScholarship, name: "", education: [], maxIncome: "not-a-number" }]);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes("missing or invalid name")));
  assert.ok(result.errors.some((error) => error.includes("missing or invalid education")));
  assert.ok(result.errors.some((error) => error.includes("missing or invalid maxIncome")));
}

function run() {
  testValidScholarshipPasses();
  testRejectsNonArrayDataset();
  testRejectsMissingRequiredFields();
  console.log("Scholarship validator tests passed.");
}

run();
