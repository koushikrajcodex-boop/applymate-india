import { auth } from "./firebase-config.js";
import {
  getIdTokenResult,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

const LOCK_TIMEOUT_MS = 4000;
let resolved = false;

const timeout = window.setTimeout(() => {
  if (resolved) return;
  showGuardMessage("Still checking admin access...");
}, LOCK_TIMEOUT_MS);

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    resolved = true;
    window.clearTimeout(timeout);
    window.location.replace("login.html");
    return;
  }

  try {
    const token = await getIdTokenResult(user, true);
    const isAdmin = token?.claims?.admin === true;

    if (!isAdmin) {
      resolved = true;
      window.clearTimeout(timeout);
      window.location.replace("dashboard.html?adminAccess=denied");
      return;
    }

    window.applymateAdminClaimReady = true;
    window.applymateAdminClaim = true;
    window.dispatchEvent(new CustomEvent("applymate:admin-claim-ready"));
    resolved = true;
    window.clearTimeout(timeout);
  } catch (error) {
    console.error("Admin claim check failed", error);
    resolved = true;
    window.clearTimeout(timeout);
    window.location.replace("dashboard.html?adminAccess=error");
  }
});

function showGuardMessage(message) {
  const adminEmail = document.getElementById("adminEmail") || document.getElementById("healthAdminEmail");
  if (adminEmail) adminEmail.textContent = message;
}
