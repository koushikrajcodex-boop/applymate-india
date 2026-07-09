import { db } from "./firebase-config.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

window.applymateLiveFinderData = [];
window.applymateLiveFinderLoaded = false;
window.applymateLiveFinderError = "";

async function loadApplyMateLiveFinderData() {
  try {
    const snapshot = await getDocs(collection(db, "scholarships"));
    window.applymateLiveFinderData = snapshot.docs
      .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
      .filter((item) => item.status === "active")
      .filter((item) => item.applicationWindow !== "closed")
      .filter((item) => !isExpired(item.deadlineDate));

    updateFinderDataNote(`Live Firestore data loaded: ${window.applymateLiveFinderData.length} active scholarships available.`);
  } catch (error) {
    window.applymateLiveFinderError = error?.message || "Firestore unavailable";
    console.warn("ApplyMate live finder data unavailable", error);
    updateFinderDataNote("Live Firestore scholarships could not be loaded right now. Try again later or open the Scholarship Hub.");
  } finally {
    window.applymateLiveFinderLoaded = true;
    window.dispatchEvent(new CustomEvent("applymate:finder-data-loaded"));
  }
}

function updateFinderDataNote(message) {
  const finder = document.getElementById("finder");
  if (!finder) return;

  let note = document.getElementById("liveFinderDataNote");
  if (!note) {
    note = document.createElement("div");
    note.id = "liveFinderDataNote";
    note.className = "notice-box";
    finder.appendChild(note);
  }

  note.textContent = message;
}

function isExpired(deadlineDate) {
  if (!deadlineDate) return false;
  const date = new Date(`${deadlineDate}T23:59:59`);
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() < Date.now();
}

loadApplyMateLiveFinderData();
