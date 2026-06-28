import { auth, db } from "./firebase-config.js";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
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
const authMessage = document.getElementById("authMessage");

registerBtn?.addEventListener("click", register);
loginBtn?.addEventListener("click", login);

passwordInput?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    login();
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
      window.location.replace("dashboard.html");
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
      window.location.replace("dashboard.html");
    }, 500);
  } catch (error) {
    console.error("Login error:", error);
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

  if (emailInput && !emailInput.checkValidity()) {
    showMessage("Please enter a valid email address.", true);
    emailInput.focus();
    return null;
  }

  return { email, password };
}

function setAuthButtonsBusy(isBusy) {
  if (registerBtn) registerBtn.disabled = isBusy;
  if (loginBtn) loginBtn.disabled = isBusy;
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
