import { db } from "./firebase-config.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

window.applymateLiveFinderData = [];

async function loadApplyMateLiveFinderData() {
  try {
    const snapshot = await getDocs(collection(db, "scholarships"));
    window.applymateLiveFinderData = snapshot.docs
      .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
      .filter((item) => item.status === "active")
      .filter((item) => item.applicationWindow !== "closed")
      .filter((item) => !isExpired(item.deadlineDate));

    const finder = document.getElementById("finder");
    if (finder && !document.getElementById("liveFinderDataNote")) {
      const note = document.createElement("div");
      note.id = "liveFinderDataNote";
      note.className = "notice-box";
      note.textContent = `Live Firestore data loaded: ${window.applymateLiveFinderData.length} active scholarships available.`;
      finder.appendChild(note);
    }
  } catch (error) {
    console.warn("ApplyMate live finder data unavailable", error);
  }
}

function isExpired(deadlineDate) {
  if (!deadlineDate) return false;
  const date = new Date(`${deadlineDate}T23:59:59`);
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() < Date.now();
}

loadApplyMateLiveFinderData();
