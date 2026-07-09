import { auth } from "./firebase-config.js";
import { checkAdminAccess } from "./admin-access.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

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
    const access = await checkAdminAccess(user);

    if (!access.allowed) {
      resolved = true;
      window.clearTimeout(timeout);
      window.location.replace("dashboard.html?adminAccess=denied");
      return;
    }

    window.applymateAdminClaimReady = true;
    window.applymateAdminClaim = access.allowed;
    window.applymateAdminAccess = access;
    window.dispatchEvent(new CustomEvent("applymate:admin-claim-ready", { detail: access }));
    resolved = true;
    window.clearTimeout(timeout);
  } catch (error) {
    console.error("Admin access check failed", error);
    resolved = true;
    window.clearTimeout(timeout);
    window.location.replace("dashboard.html?adminAccess=error");
  }
});

function showGuardMessage(message) {
  const adminEmail = document.getElementById("adminEmail") || document.getElementById("healthAdminEmail") || document.getElementById("discoveryAdminEmail");
  if (adminEmail) adminEmail.textContent = message;
}
