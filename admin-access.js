import { getIdTokenResult } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

export const ADMIN_EMAILS = Object.freeze([
  "koushikrajcodex@gmail.com"
]);

export function isAdminEmail(email) {
  return ADMIN_EMAILS.includes(String(email || "").trim().toLowerCase());
}

export async function checkAdminAccess(user) {
  if (!user) {
    return {
      allowed: false,
      reason: "not-signed-in",
      email: "",
      viaClaim: false,
      viaEmail: false
    };
  }

  const email = String(user.email || "").trim().toLowerCase();
  let token = null;
  let viaClaim = false;

  try {
    token = await getIdTokenResult(user, true);
    viaClaim = token?.claims?.admin === true;
  } catch (error) {
    console.warn("Admin custom claim check failed; falling back to admin email allow-list.", error);
  }

  const viaEmail = isAdminEmail(email);

  return {
    allowed: viaClaim || viaEmail,
    reason: viaClaim ? "custom-claim" : viaEmail ? "admin-email" : "denied",
    email,
    viaClaim,
    viaEmail,
    token
  };
}
