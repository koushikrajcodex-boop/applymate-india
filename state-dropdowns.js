import { getEnabledStateOptions } from "./states.js";

const defaultConfigs = [
  { id: "state", includeAny: true, anyValue: "any", anyLabel: "Any State" },
  { id: "hubState", includeAny: true, anyValue: "", anyLabel: "All states" },
  { id: "liveScholarshipState", includeAny: true, anyValue: "", anyLabel: "All states" },
  { id: "profileState", includeAny: true, anyValue: "", anyLabel: "Select state" },
  { id: "filterState", includeAny: true, anyValue: "", anyLabel: "All states" },
  { id: "adminScholarshipState", includeAny: false },
  { id: "adminFilterState", includeAny: true, anyValue: "", anyLabel: "All states" }
];

renderApplyMateStateDropdowns();

document.addEventListener("DOMContentLoaded", renderApplyMateStateDropdowns);

export function renderApplyMateStateDropdowns(configs = defaultConfigs) {
  configs.forEach((config) => {
    const select = document.getElementById(config.id);
    if (!select) return;

    const currentValue = select.value;
    const options = [];

    if (config.includeAny) {
      options.push(`<option value="${escapeHtml(config.anyValue ?? "")}">${escapeHtml(config.anyLabel || "All states")}</option>`);
    }

    options.push(...getEnabledStateOptions().map((state) => (
      `<option value="${escapeHtml(state.slug)}">${escapeHtml(state.label)}</option>`
    )));

    select.innerHTML = options.join("");

    if ([...select.options].some((option) => option.value === currentValue)) {
      select.value = currentValue;
    }
  });
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
