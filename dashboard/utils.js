export function normalizeText(value) {
  return String(value ?? "").trim().toLowerCase();
}

export function normalizeArray(value) {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeText(item)).filter(Boolean);
  }

  if (typeof value === "string") {
    return value.split(",").map((item) => normalizeText(item)).filter(Boolean);
  }

  return [];
}

export function cleanText(value, maxLength = 500) {
  return String(value ?? "").trim().slice(0, Math.max(0, maxLength));
}

export function parsePercentage(value) {
  const rawValue = String(value ?? "").trim().replace(/%/g, "");
  if (!rawValue) return null;

  const parsedValue = Number(rawValue);
  if (!Number.isFinite(parsedValue) || parsedValue < 0) return null;
  if (parsedValue <= 10) return Math.min(parsedValue * 10, 100);
  return parsedValue <= 100 ? parsedValue : null;
}

export function formatIndianNumber(value) {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue)
    ? new Intl.NumberFormat("en-IN").format(parsedValue)
    : "0";
}

export function getMatchQuality(score) {
  const safeScore = Math.min(Math.max(Number(score) || 0, 0), 100);
  if (safeScore >= 90) return "🟢 Excellent Match";
  if (safeScore >= 75) return "🔵 Very Good Match";
  if (safeScore >= 60) return "🟡 Good Match";
  return "⚪ Possible Match";
}
