export function getActiveScholarshipStats(items = [], now = new Date()) {
  const active = items
    .filter((item) => item.status === "active")
    .filter((item) => item.applicationWindow !== "closed")
    .filter((item) => !isExpired(item.deadlineDate, now));

  return {
    active,
    activeCount: active.length,
    closingSoonCount: active.filter((item) => {
      const left = daysLeft(item.deadlineDate, now);
      return left >= 0 && left <= 7;
    }).length,
    newThisMonthCount: active.filter((item) => isNewThisMonth(item, now)).length
  };
}

export function isExpired(deadlineDate, now = new Date()) {
  if (!deadlineDate) return false;
  const left = daysLeft(deadlineDate, now);
  return Number.isFinite(left) && left < 0;
}

export function daysLeft(deadlineDate, now = new Date()) {
  if (!deadlineDate) return Infinity;
  const date = new Date(`${deadlineDate}T23:59:59`);
  if (Number.isNaN(date.getTime())) return Infinity;
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  return Math.ceil((date.getTime() - today.getTime()) / 86400000);
}

export function isNewThisMonth(item, now = new Date()) {
  const dateText = item.createdAt?.toDate ? item.createdAt.toDate().toISOString().slice(0, 10) : item.verifiedOn || item.lastChecked || "";
  if (!dateText) return false;
  const date = new Date(`${dateText}T00:00:00`);
  if (Number.isNaN(date.getTime())) return false;
  const current = new Date(now);
  return date.getFullYear() === current.getFullYear() && date.getMonth() === current.getMonth();
}
