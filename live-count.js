import { db } from "./firebase-config.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const countBox = document.getElementById("activeScholarshipHomeCount");
const labelBox = document.getElementById("activeScholarshipHomeLabel");
const updatedBox = document.getElementById("activeScholarshipHomeUpdated");

if (countBox || labelBox || updatedBox) {
  loadCount();
}

async function loadCount() {
  try {
    const snapshot = await getDocs(collection(db, "scholarships"));
    const active = snapshot.docs
      .map((item) => item.data())
      .filter((item) => item.status === "active")
      .filter((item) => item.applicationWindow !== "closed")
      .filter((item) => !isExpired(item.deadlineDate));

    if (countBox) countBox.textContent = active.length > 0 ? `${active.length}+` : "0";
    if (labelBox) labelBox.textContent = active.length === 1 ? "Active scholarship" : "Active scholarships";
    if (updatedBox) updatedBox.textContent = `Live count from Firestore • ${new Date().toLocaleString("en-IN")}`;
  } catch (error) {
    console.warn("Live scholarship count failed", error);
    if (countBox) countBox.textContent = "Live";
    if (labelBox) labelBox.textContent = "Active scholarships";
    if (updatedBox) updatedBox.textContent = "Open the scholarship directory for the latest active list.";
  }
}

function isExpired(deadlineDate) {
  if (!deadlineDate) return false;
  const date = new Date(`${deadlineDate}T23:59:59`);
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() < Date.now();
}
