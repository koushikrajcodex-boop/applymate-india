export function normalizeHttpUrl(value) {
  const rawValue = String(value ?? "").trim();

  if (!rawValue) return "";

  try {
    const url = new URL(rawValue);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return "";
    }

    return url.href;
  } catch {
    return "";
  }
}
