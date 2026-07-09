import { getStateLabel, isKnownStateSlug } from "./states.js";

export const SCHOLARSHIP_STATUS = Object.freeze({
  ACTIVE: "active",
  DRAFT: "draft",
  CLOSED: "closed"
});

export const APPLICATION_WINDOW = Object.freeze({
  OPEN: "open",
  UPCOMING: "upcoming",
  VERIFY: "verify",
  CLOSED: "closed"
});

export const SCHOLARSHIP_REQUIRED_FIELDS = Object.freeze([
  "name",
  "state",
  "stateLabel",
  "status",
  "amount",
  "maxIncome",
  "minPercentage",
  "deadline",
  "deadlineDate",
  "link",
  "education",
  "categories",
  "genders",
  "disability",
  "eligibilityNote",
  "incomeNote",
  "priority",
  "sourceName",
  "sourceType",
  "applicationWindow",
  "academicYear",
  "verifiedOn",
  "verificationNote",
  "lastChecked"
]);

export function createVerifiedScholarshipRecord(input = {}) {
  const status = normalizeStatus(input.status);
  const applicationWindow = normalizeApplicationWindow(input.applicationWindow);
  const state = normalizeStateSlug(input.state || "national");

  return {
    name: clean(input.name),
    state,
    stateLabel: clean(input.stateLabel || getStateLabel(state)),
    status,
    amount: clean(input.amount || "Varies as per official rules"),
    maxIncome: toNumber(input.maxIncome),
    minPercentage: toNumber(input.minPercentage),
    deadline: clean(input.deadline || "Check official portal"),
    deadlineDate: clean(input.deadlineDate),
    link: clean(input.link || input.sourceUrl),
    education: toArray(input.education),
    categories: toArray(input.categories),
    genders: toArray(input.genders).length ? toArray(input.genders) : ["any"],
    disability: clean(input.disability || "any"),
    eligibilityNote: clean(input.eligibilityNote),
    incomeNote: clean(input.incomeNote),
    priority: clampNumber(input.priority, 0, 100, 50),
    sourceName: clean(input.sourceName || "Official Portal"),
    sourceType: clean(input.sourceType || "admin"),
    applicationWindow,
    academicYear: clean(input.academicYear),
    verifiedOn: clean(input.verifiedOn || getTodayString()),
    verificationNote: clean(input.verificationNote || "Needs official source review before publishing."),
    lastChecked: clean(input.lastChecked || getTodayString())
  };
}

export function validateScholarshipRecord(record = {}) {
  const errors = [];

  SCHOLARSHIP_REQUIRED_FIELDS.forEach((field) => {
    if (!hasMeaningfulValue(record[field])) {
      errors.push(`Missing required field: ${field}`);
    }
  });

  const state = normalizeStateSlug(record.state || "national");
  if (record.state && !isKnownStateSlug(state)) {
    errors.push("Invalid scholarship state.");
  }

  if (record.status && ![SCHOLARSHIP_STATUS.ACTIVE, SCHOLARSHIP_STATUS.DRAFT, SCHOLARSHIP_STATUS.CLOSED].includes(record.status)) {
    errors.push("Invalid scholarship status.");
  }

  if (record.applicationWindow && !Object.values(APPLICATION_WINDOW).includes(record.applicationWindow)) {
    errors.push("Invalid application window.");
  }

  if (record.link && !isValidUrl(record.link)) {
    errors.push("Invalid official link.");
  }

  if (record.verifiedOn && !isValidIsoDate(record.verifiedOn)) {
    errors.push("Invalid verifiedOn date.");
  }

  getScholarshipQualityWarnings(record).forEach((warning) => errors.push(warning));

  return {
    valid: errors.length === 0,
    errors
  };
}

export function isScholarshipVisibleToStudents(record = {}) {
  if (record.status !== SCHOLARSHIP_STATUS.ACTIVE) return false;
  if (record.applicationWindow === APPLICATION_WINDOW.CLOSED) return false;
  if (isPastDate(record.deadlineDate)) return false;
  if (!isVerifiedActiveScholarship(record)) return false;
  return true;
}

export function isVerifiedActiveScholarship(record = {}) {
  if (record.status !== SCHOLARSHIP_STATUS.ACTIVE) return true;
  return Boolean(
    isValidIsoDate(record.verifiedOn) &&
    clean(record.sourceName) &&
    isValidUrl(record.sourceUrl || record.link)
  );
}

export function getScholarshipQualityWarnings(record = {}) {
  const warnings = [];
  const state = normalizeStateSlug(record.state || "national");

  if (!clean(record.name)) warnings.push("Missing scholarship name.");
  if (!isKnownStateSlug(state)) warnings.push("Unknown scholarship state.");
  if (!isValidUrl(record.sourceUrl || record.link)) warnings.push("Missing valid official source URL.");
  if (!clean(record.sourceName)) warnings.push("Missing official source name.");
  if (!isValidIsoDate(record.verifiedOn)) warnings.push("Missing valid verified date.");
  if (!clean(record.verificationNote)) warnings.push("Missing verification note.");
  if (record.status === SCHOLARSHIP_STATUS.ACTIVE && !isVerifiedActiveScholarship(record)) {
    warnings.push("Active scholarship must have verifiedOn, sourceName, and sourceUrl/link before publishing.");
  }
  if (record.status === SCHOLARSHIP_STATUS.ACTIVE && normalizeApplicationWindow(record.applicationWindow) === APPLICATION_WINDOW.CLOSED) {
    warnings.push("Closed scholarship should not be active.");
  }
  if (record.status === SCHOLARSHIP_STATUS.ACTIVE && isPastDate(record.deadlineDate)) {
    warnings.push("Expired scholarship should not be active.");
  }

  return warnings;
}

function normalizeStatus(value) {
  const text = clean(value).toLowerCase();
  if (["active", "draft", "closed"].includes(text)) return text;
  return SCHOLARSHIP_STATUS.DRAFT;
}

function normalizeApplicationWindow(value) {
  const text = clean(value).toLowerCase();
  if (["open", "upcoming", "verify", "closed"].includes(text)) return text;
  return APPLICATION_WINDOW.VERIFY;
}

function normalizeStateSlug(value) {
  return clean(value || "national").toLowerCase();
}

function toArray(value) {
  if (Array.isArray(value)) {
    return value.map((item) => clean(item).toLowerCase()).filter(Boolean);
  }

  return String(value || "")
    .split(",")
    .map((item) => clean(item).toLowerCase())
    .filter(Boolean);
}

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function toNumber(value) {
  const number = Number(String(value || "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(number) ? number : 0;
}

function clampNumber(value, min, max, fallback) {
  const number = toNumber(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(number, max));
}

function hasMeaningfulValue(value) {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "number") return Number.isFinite(value);
  return clean(value) !== "";
}

function isValidIsoDate(value) {
  const text = clean(value);
  return /^20\d{2}-[01]\d-[0-3]\d$/.test(text);
}

function isPastDate(value) {
  const text = clean(value);
  if (!text) return false;
  const date = new Date(`${text}T23:59:59`);
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() < Date.now();
}

function isValidUrl(value) {
  const text = clean(value);
  if (!text) return false;

  try {
    const url = new URL(text);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function getTodayString() {
  return new Date().toISOString().slice(0, 10);
}
