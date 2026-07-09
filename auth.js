import { auth, db } from "./firebase-config.js";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

import {
  doc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const registerBtn = document.getElementById("registerBtn");
const loginBtn = document.getElementById("loginBtn");
const forgotPasswordBtn = document.getElementById("forgotPasswordBtn");
const authMessage = document.getElementById("authMessage");
const redirectNotice = document.getElementById("redirectNotice");
const redirectTarget = getSafeRedirectTarget();

registerBtn?.addEventListener("click", register);
loginBtn?.addEventListener("click", login);
forgotPasswordBtn?.addEventListener("click", resetPassword);
showRedirectNotice();

passwordInput?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    login();
  }
});

emailInput?.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !passwordInput?.value) {
    event.preventDefault();
    resetPassword();
  }
});

async function register() {
  const credentials = readCredentials();
  if (!credentials) return;

  if (credentials.password.length < 6) {
    showMessage("Password must be at least 6 characters.", true);
    passwordInput?.focus();
    return;
  }

  setAuthButtonsBusy(true);
  showMessage("Creating account...");

  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      credentials.email,
      credentials.password
    );

    const user = userCredential.user;

    await setDoc(doc(db, "users", user.uid), {
      email: user.email || credentials.email,
      name: "",
      state: "",
      education: "",
      category: "",
      gender: "",
      disability: "",
      income: "",
      percentage: "",
      profileCompleted: false,
      createdAt: serverTimestamp()
    });

    showMessage("Account created successfully. Redirecting...");

    window.setTimeout(() => {
      redirectAfterAuth();
    }, 500);
  } catch (error) {
    console.error("Registration error:", error);
    showMessage(getFriendlyError(error.code), true);
    setAuthButtonsBusy(false);
  }
}

async function login() {
  const credentials = readCredentials();
  if (!credentials) return;

  setAuthButtonsBusy(true);
  showMessage("Logging in...");

  try {
    await signInWithEmailAndPassword(
      auth,
      credentials.email,
      credentials.password
    );

    showMessage("Login successful. Redirecting...");

    window.setTimeout(() => {
      redirectAfterAuth();
    }, 500);
  } catch (error) {
    console.error("Login error:", error);
    showMessage(getFriendlyError(error.code), true);
    setAuthButtonsBusy(false);
  }
}

async function resetPassword() {
  const email = readEmailOnly();
  if (!email) return;

  setAuthButtonsBusy(true);
  showMessage("Sending password reset email...");

  try {
    await sendPasswordResetEmail(auth, email);

    showMessage("Password reset email sent. Check your inbox or spam folder.");
    setAuthButtonsBusy(false);
  } catch (error) {
    console.error("Password reset error:", error);
    showMessage(getFriendlyError(error.code), true);
    setAuthButtonsBusy(false);
  }
}

function readCredentials() {
  const email = emailInput?.value.trim() || "";
  const password = passwordInput?.value || "";

  if (!email || !password) {
    showMessage("Please enter your email and password.", true);
    return null;
  }

  if (!isValidEmail(email)) {
    showMessage("Please enter a valid email address.", true);
    emailInput?.focus();
    return null;
  }

  return { email, password };
}

function readEmailOnly() {
  const email = emailInput?.value.trim() || "";

  if (!email) {
    showMessage("Enter your registered email to reset your password.", true);
    emailInput?.focus();
    return null;
  }

  if (!isValidEmail(email)) {
    showMessage("Please enter a valid email address.", true);
    emailInput?.focus();
    return null;
  }

  return email;
}

function isValidEmail(email) {
  if (!emailInput) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  emailInput.value = email;
  return emailInput.checkValidity();
}

function redirectAfterAuth() {
  window.location.replace(redirectTarget || "dashboard.html");
}

function showRedirectNotice() {
  if (!redirectNotice || !redirectTarget) return;

  if (redirectTarget.startsWith("admin")) {
    redirectNotice.textContent = "Admin login required. Use the approved admin email to continue to the secret admin page.";
    return;
  }

  redirectNotice.textContent = "Login required. You will be sent back after successful login.";
}

function getSafeRedirectTarget() {
  const params = new URLSearchParams(window.location.search);
  const requestedTarget = params.get("redirect") || params.get("next") || params.get("continue") || getReferrerRedirectTarget();
  return sanitizeRedirectTarget(requestedTarget);
}

function getReferrerRedirectTarget() {
  try {
    if (!document.referrer) return "";

    const referrerUrl = new URL(document.referrer);
    if (referrerUrl.origin !== window.location.origin) return "";

    const referrerFile = referrerUrl.pathname.split("/").pop() || "";
    const adminPages = new Set([
      "admin.html",
      "admin-health.html",
      "scholarship-discovery.html"
    ]);

    if (!adminPages.has(referrerFile)) return "";
    return `${referrerFile}${referrerUrl.search}${referrerUrl.hash}`;
  } catch (error) {
    console.warn("Could not read redirect referrer", error);
    return "";
  }
}

function sanitizeRedirectTarget(target) {
  const value = String(target || "").trim();
  if (!value) return "";

  if (
    value.includes("://") ||
    value.startsWith("//") ||
    value.startsWith("/") ||
    value.includes("..") ||
    /[\r\n]/.test(value)
  ) {
    return "";
  }

  try {
    const url = new URL(value, window.location.href);
    if (url.origin !== window.location.origin) return "";

    const page = url.pathname.split("/").pop() || "";
    const allowedPages = new Set([
      "dashboard.html",
      "admin.html",
      "admin-health.html",
      "scholarship-discovery.html"
    ]);

    if (!allowedPages.has(page)) return "";
    return `${page}${url.search}${url.hash}`;
  } catch (error) {
    console.warn("Invalid redirect target", error);
    return "";
  }
}

function setAuthButtonsBusy(isBusy) {
  if (registerBtn) registerBtn.disabled = isBusy;
  if (loginBtn) loginBtn.disabled = isBusy;
  if (forgotPasswordBtn) forgotPasswordBtn.disabled = isBusy;
}

function showMessage(message, isError = false) {
  if (!authMessage) return;

  authMessage.textContent = message;
  authMessage.style.color = isError ? "#b42318" : "#067647";
}

function getFriendlyError(code) {
  switch (code) {
    case "auth/email-already-in-use":
      return "This email is already registered. Try logging in.";

    case "auth/invalid-email":
      return "Please enter a valid email address.";

    case "auth/missing-email":
      return "Enter your registered email address.";

    case "auth/weak-password":
      return "Use a stronger password with at least 6 characters.";

    case "auth/operation-not-allowed":
      return "Email/password login is not enabled in Firebase.";

    case "auth/configuration-not-found":
      return "Firebase Authentication is not configured properly.";

    case "auth/unauthorized-domain":
      return "This website domain is not authorized in Firebase.";

    case "auth/user-disabled":
      return "This account has been disabled.";

    case "auth/user-not-found":
      return "No account found with this email.";

    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Incorrect email or password.";

    case "auth/too-many-requests":
      return "Too many attempts. Please wait and try again.";

    case "auth/network-request-failed":
      return "Network error. Check your internet connection.";

    case "permission-denied":
    case "firestore/permission-denied":
      return "Your account was created, but the profile could not be saved. Deploy the Firestore rules and then log in.";

    default:
      return "Something went wrong. Please try again.";
  }
}