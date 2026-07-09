export const INDIA_STATE_OPTIONS = Object.freeze([
  { slug: "national", label: "National", type: "national", enabled: true },
  { slug: "andhra-pradesh", label: "Andhra Pradesh", type: "state", enabled: true },
  { slug: "arunachal-pradesh", label: "Arunachal Pradesh", type: "state", enabled: true },
  { slug: "assam", label: "Assam", type: "state", enabled: true },
  { slug: "bihar", label: "Bihar", type: "state", enabled: true },
  { slug: "chhattisgarh", label: "Chhattisgarh", type: "state", enabled: true },
  { slug: "goa", label: "Goa", type: "state", enabled: true },
  { slug: "gujarat", label: "Gujarat", type: "state", enabled: true },
  { slug: "haryana", label: "Haryana", type: "state", enabled: true },
  { slug: "himachal-pradesh", label: "Himachal Pradesh", type: "state", enabled: true },
  { slug: "jharkhand", label: "Jharkhand", type: "state", enabled: true },
  { slug: "karnataka", label: "Karnataka", type: "state", enabled: true },
  { slug: "kerala", label: "Kerala", type: "state", enabled: true },
  { slug: "madhya-pradesh", label: "Madhya Pradesh", type: "state", enabled: true },
  { slug: "maharashtra", label: "Maharashtra", type: "state", enabled: true },
  { slug: "manipur", label: "Manipur", type: "state", enabled: true },
  { slug: "meghalaya", label: "Meghalaya", type: "state", enabled: true },
  { slug: "mizoram", label: "Mizoram", type: "state", enabled: true },
  { slug: "nagaland", label: "Nagaland", type: "state", enabled: true },
  { slug: "odisha", label: "Odisha", type: "state", enabled: true },
  { slug: "punjab", label: "Punjab", type: "state", enabled: true },
  { slug: "rajasthan", label: "Rajasthan", type: "state", enabled: true },
  { slug: "sikkim", label: "Sikkim", type: "state", enabled: true },
  { slug: "tamil-nadu", label: "Tamil Nadu", type: "state", enabled: true },
  { slug: "telangana", label: "Telangana", type: "state", enabled: true },
  { slug: "tripura", label: "Tripura", type: "state", enabled: true },
  { slug: "uttar-pradesh", label: "Uttar Pradesh", type: "state", enabled: true },
  { slug: "uttarakhand", label: "Uttarakhand", type: "state", enabled: true },
  { slug: "west-bengal", label: "West Bengal", type: "state", enabled: true },
  { slug: "andaman-and-nicobar-islands", label: "Andaman and Nicobar Islands", type: "ut", enabled: true },
  { slug: "chandigarh", label: "Chandigarh", type: "ut", enabled: true },
  { slug: "dadra-and-nagar-haveli-and-daman-and-diu", label: "Dadra and Nagar Haveli and Daman and Diu", type: "ut", enabled: true },
  { slug: "delhi", label: "Delhi", type: "ut", enabled: true },
  { slug: "jammu-and-kashmir", label: "Jammu and Kashmir", type: "ut", enabled: true },
  { slug: "ladakh", label: "Ladakh", type: "ut", enabled: true },
  { slug: "lakshadweep", label: "Lakshadweep", type: "ut", enabled: true },
  { slug: "puducherry", label: "Puducherry", type: "ut", enabled: true }
]);

export function getStateLabel(slug) {
  return INDIA_STATE_OPTIONS.find((state) => state.slug === slug)?.label || "National";
}

export function isKnownStateSlug(slug) {
  return INDIA_STATE_OPTIONS.some((state) => state.slug === slug);
}

export function getEnabledStateOptions() {
  return INDIA_STATE_OPTIONS.filter((state) => state.enabled);
}

if (typeof window !== "undefined") {
  window.ApplyMateStates = {
    options: INDIA_STATE_OPTIONS,
    getStateLabel,
    isKnownStateSlug,
    getEnabledStateOptions
  };
}
