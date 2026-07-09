export function validateScholarships(scholarships) {
  const errors = [];

  if (!Array.isArray(scholarships)) {
    return {
      valid: false,
      errors: ["Scholarships data must be an array."]
    };
  }

  checkDuplicateNames(scholarships, errors);

  scholarships.forEach((scholarship, index) => {
    const label = scholarship?.name || `Scholarship at index ${index}`;

    checkString(scholarship, "name", label, errors);
    checkString(scholarship, "state", label, errors);
    checkString(scholarship, "stateLabel", label, errors);
    checkArray(scholarship, "education", label, errors);
    checkArray(scholarship, "categories", label, errors);
    checkArray(scholarship, "genders", label, errors);
    checkString(scholarship, "disability", label, errors);
    checkNumber(scholarship, "maxIncome", label, errors);
    checkNumber(scholarship, "minPercentage", label, errors);
    checkString(scholarship, "amount", label, errors);
    checkString(scholarship, "deadline", label, errors);
    checkString(scholarship, "link", label, errors);
    checkString(scholarship, "sourceName", label, errors);
    checkString(scholarship, "eligibilityNote", label, errors);
    checkString(scholarship, "incomeNote", label, errors);
    checkNumber(scholarship, "priority", label, errors);
    checkActiveVerificationGate(scholarship, label, errors);
  });

  return {
    valid: errors.length === 0,
    errors
  };
}

function checkDuplicateNames(items, errors) {
  const seen = new Map();

  items.forEach((item, index) => {
    const key = normalizeName(item?.name);
    if (!key) return;

    if (seen.has(key)) {
      errors.push(`${item.name}: duplicate scholarship name also appears at index ${seen.get(key)}`);
      return;
    }

    seen.set(key, index);
  });
}

function checkActiveVerificationGate(item, label, errors) {
  if (item?.status !== "active") return;

  if (!isValidIsoDate(item.verifiedOn)) {
    errors.push(`${label}: active scholarships must include a valid verifiedOn date`);
  }

  if (!isNonEmptyString(item.sourceName)) {
    errors.push(`${label}: active scholarships must include a sourceName`);
  }

  if (!isValidUrl(item.sourceUrl || item.link)) {
    errors.push(`${label}: active scholarships must include a valid sourceUrl or link`);
  }

  if (isPastDate(item.deadlineDate)) {
    errors.push(`${label}: active scholarships cannot have an expired deadlineDate`);
  }
}

function checkString(item, field, label, errors) {
  if (!isNonEmptyString(item?.[field])) {
    errors.push(`${label}: missing or invalid ${field}`);
  }
}

function checkArray(item, field, label, errors) {
  if (!Array.isArray(item?.[field]) || item[field].length === 0) {
    errors.push(`${label}: missing or invalid ${field}`);
  }
}

function checkNumber(item, field, label, errors) {
  if (!Number.isFinite(Number(item?.[field]))) {
    errors.push(`${label}: missing or invalid ${field}`);
  }
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim() !== "";
}

function isValidIsoDate(value) {
  return typeof value === "string" && /^20\d{2}-[01]\d-[0-3]\d$/.test(value.trim());
}

function isPastDate(value) {
  if (!isValidIsoDate(value)) return false;
  const date = new Date(`${value}T23:59:59`);
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() < Date.now();
}

function isValidUrl(value) {
  if (typeof value !== "string" || value.trim() === "") return false;

  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function normalizeName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
