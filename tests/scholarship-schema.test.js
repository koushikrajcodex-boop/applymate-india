import assert from "node:assert/strict";
import { createVerifiedScholarshipRecord, validateScholarshipRecord } from "../scholarship-schema.js";

function testSchemaAcceptsCompleteRecord() {
  const record = createVerifiedScholarshipRecord({
    name: "Complete Scholarship",
    status: "active",
    amount: "₹10,000",
    maxIncome: 250000,
    minPercentage: 50,
    deadline: "31 December 2099",
    deadlineDate: "2099-12-31",
    link: "https://example.gov.in/scholarship",
    education: ["degree"],
    categories: ["general"],
    genders: ["any"],
    disability: "any",
    eligibilityNote: "For eligible students as per official rules.",
    incomeNote: "Family income limit applies.",
    priority: 75,
    sourceName: "Official Portal",
    sourceType: "admin",
    applicationWindow: "open",
    academicYear: "2099-2100",
    verifiedOn: "2099-01-01",
    verificationNote: "Verified from official portal.",
    lastChecked: "2099-01-01"
  });

  const result = validateScholarshipRecord(record);
  assert.equal(result.valid, true);
}

function testSchemaRejectsMissingRequiredFields() {
  const result = validateScholarshipRecord({
    name: "Incomplete Scholarship",
    status: "active",
    link: "https://example.gov.in"
  });

  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes("Missing required field: state")));
  assert.ok(result.errors.some((error) => error.includes("Missing required field: education")));
  assert.ok(result.errors.some((error) => error.includes("Missing required field: verifiedOn")));
}

function run() {
  testSchemaAcceptsCompleteRecord();
  testSchemaRejectsMissingRequiredFields();
  console.log("Scholarship schema tests passed.");
}

run();
