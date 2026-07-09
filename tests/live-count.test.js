import assert from "node:assert/strict";
import { daysLeft, getActiveScholarshipStats, isExpired } from "../live-count-utils.js";

const fixedNow = new Date("2026-07-09T10:00:00+05:30");

function testExpiredHelper() {
  assert.equal(isExpired("2026-07-08", fixedNow), true);
  assert.equal(isExpired("2026-07-09", fixedNow), false);
  assert.equal(isExpired("2026-07-10", fixedNow), false);
}

function testDaysLeftUsesFixedDate() {
  assert.equal(daysLeft("2026-07-09", fixedNow), 0);
  assert.equal(daysLeft("2026-07-16", fixedNow), 7);
}

function testActiveCountExcludesExpiredAndClosed() {
  const stats = getActiveScholarshipStats([
    { name: "Expired Active", status: "active", applicationWindow: "open", deadlineDate: "2026-07-08", verifiedOn: "2026-07-01" },
    { name: "Closed Active", status: "active", applicationWindow: "closed", deadlineDate: "2026-07-20", verifiedOn: "2026-07-01" },
    { name: "Draft", status: "draft", applicationWindow: "open", deadlineDate: "2026-07-20", verifiedOn: "2026-07-01" },
    { name: "Valid Active", status: "active", applicationWindow: "open", deadlineDate: "2026-07-16", verifiedOn: "2026-07-01" },
    { name: "No Deadline Active", status: "active", applicationWindow: "open", deadlineDate: "", verifiedOn: "2026-07-01" }
  ], fixedNow);

  assert.equal(stats.activeCount, 2);
  assert.deepEqual(stats.active.map((item) => item.name), ["Valid Active", "No Deadline Active"]);
  assert.equal(stats.closingSoonCount, 1);
}

function run() {
  testExpiredHelper();
  testDaysLeftUsesFixedDate();
  testActiveCountExcludesExpiredAndClosed();
  console.log("Live count tests passed.");
}

run();
