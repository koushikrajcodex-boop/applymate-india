import "./state-dropdowns.js";

export function isVerifiedActiveScholarship(record = {}) {
  return Boolean(
    record.status === "active" &&
    record.applicationWindow !== "closed" &&
    !isExpired(record.deadlineDate) &&
    isValidIsoDate(record.verifiedOn) &&
    isNonEmptyString(record.sourceName) &&
    isValidUrl(record.sourceUrl || record.link)
  );
}

export function getOfficialSourceUrl(record = {}) {
  return isValidUrl(record.sourceUrl) ? record.sourceUrl : isValidUrl(record.link) ? record.link : "";
}

export function getLastVerifiedText(record = {}) {
  return isValidIsoDate(record.verifiedOn) ? record.verifiedOn : "Not verified";
}

export function isExpired(dateText) {
  if (!dateText) return false;
  const date = new Date(`${dateText}T23:59:59`);
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() < Date.now();
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim() !== "";
}

function isValidIsoDate(value) {
  return typeof value === "string" && /^20\d{2}-[01]\d-[0-3]\d$/.test(value.trim());
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
