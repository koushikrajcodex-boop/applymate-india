import { auth, db } from "./firebase-config.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

import {
  collection,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

let currentUser = null;

onAuthStateChanged(auth, (user) => {
  currentUser = user;
});

function addSaveButtonsToResults() {
  const resultCards = document.querySelectorAll(".scholarship");

  resultCards.forEach((card) => {
    if (card.querySelector(".save-scholarship-btn")) return;

    const titleElement = card.querySelector("h3");
    const officialLink = card.querySelector("a[target='_blank']");

    if (!titleElement) return;

    const button = document.createElement("button");
    button.className = "secondary-btn save-scholarship-btn";
    button.textContent = "Save to Dashboard";
    button.style.marginTop = "12px";

    button.addEventListener("click", async () => {
      if (!currentUser) {
        alert("Please login first to save scholarships.");
        window.location.href = "login.html";
        return;
      }

      const scholarshipName = titleElement.textContent.trim();
      const scholarshipLink = officialLink ? officialLink.href : "";

      try {
        button.disabled = true;
        button.textContent = "Saving...";

        await addDoc(collection(db, "users", currentUser.uid, "savedScholarships"), {
          name: scholarshipName,
          link: scholarshipLink,
          source: "homepage-finder",
          createdAt: serverTimestamp()
        });

        button.textContent = "Saved ✅";
      } catch (error) {
        console.error("Save scholarship error:", error);
        button.disabled = false;
        button.textContent = "Save to Dashboard";
        alert("Could not save scholarship. Please try again.");
      }
    });

    card.appendChild(button);
  });
}

const resultsContainer = document.getElementById("results");

if (resultsContainer) {
  const observer = new MutationObserver(() => {
    addSaveButtonsToResults();
  });

  observer.observe(resultsContainer, {
    childList: true,
    subtree: true
  });
}
