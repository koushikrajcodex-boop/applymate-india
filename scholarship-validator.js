export function validateScholarships(scholarships) {
  const errors = [];

  if (!Array.isArray(scholarships)) {
    return {
      valid: false,
      errors: ["Scholarships data must be an array."]
    };
  }

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
  });

  return {
    valid: errors.length === 0,
    errors
  };
}

function checkString(item, field, label, errors) {
  if (typeof item?.[field] !== "string" || item[field].trim() === "") {
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
