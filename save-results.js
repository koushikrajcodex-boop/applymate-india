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
  document
    .querySelectorAll("#results .scholarship")
    .forEach((card) => {
      if (card.querySelector(".save-scholarship-btn")) {
        return;
      }

      const titleElement = card.querySelector("h3");

      const officialLink = card.querySelector(
        "a.text-btn[target='_blank']"
      );

      if (!titleElement) return;

      const button = document.createElement("button");

      button.type = "button";
      button.className =
        "secondary-btn save-scholarship-btn";

      button.textContent = "Save to Dashboard";
      button.style.marginTop = "12px";

      button.addEventListener("click", async () => {
        if (!currentUser) {
          alert(
            "Please log in first to save scholarships."
          );

          window.location.href = "login.html";
          return;
        }

        const name = titleElement.textContent
          .trim()
          .slice(0, 200);

        const link = normalizeHttpUrl(
          officialLink?.href
        );

        if (!name) {
          alert(
            "This scholarship does not have a valid name."
          );

          return;
        }

        if (officialLink?.href && !link) {
          alert(
            "This scholarship does not have a safe official link."
          );

          return;
        }

        button.disabled = true;
        button.textContent = "Saving...";

        try {
          await addDoc(
            collection(
              db,
              "users",
              currentUser.uid,
              "savedScholarships"
            ),
            {
              name,
              link,
              source: "homepage-finder",
              createdAt: serverTimestamp()
            }
          );

          button.textContent = "Saved ✅";
        } catch (error) {
          console.error(
            "Save scholarship error:",
            error
          );

          button.disabled = false;
          button.textContent = "Save to Dashboard";

          alert(
            "Could not save the scholarship. Please try again."
          );
        }
      });

      card.appendChild(button);
    });
}

function normalizeHttpUrl(value) {
  const text = String(value || "").trim();

  if (!text) return "";

  try {
    const url = new URL(text);

    if (
      url.protocol !== "https:" &&
      url.protocol !== "http:"
    ) {
      return "";
    }

    return url.href;
  } catch {
    return "";
  }
}

const resultsContainer =
  document.getElementById("results");

if (resultsContainer) {
  const observer = new MutationObserver(
    addSaveButtonsToResults
  );

  observer.observe(resultsContainer, {
    childList: true,
    subtree: true
  });

  addSaveButtonsToResults();
}
