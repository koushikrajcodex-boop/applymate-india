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

function showMessage(message, isError = false) {
  if (!authMessage) return;
  authMessage.textContent = message;
  authMessage.style.color = isError ? "#b42318" : "#067647";
}

registerBtn?.addEventListener("click", async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!email || !password) {
    showMessage("Please enter email and password.", true);
    return;
  }

  if (password.length < 6) {
    showMessage("Password must be at least 6 characters.", true);
    return;
  }

  registerBtn.disabled = true;
  loginBtn.disabled = true;
  showMessage("Creating account...");

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    await setDoc(doc(db, "users", user.uid), {
      email: user.email,
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
    setTimeout(() => {
      window.location.href = "dashboard.html";
    }, 800);
  } catch (error) {
    console.error("Register error:", error);
    showMessage(`${getFriendlyError(error.code)} (${error.code})`, true);
  } finally {
    registerBtn.disabled = false;
    loginBtn.disabled = false;
  }
});

loginBtn?.addEventListener("click", async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!email || !password) {
    showMessage("Please enter email and password.", true);
    return;
  }

  registerBtn.disabled = true;
  loginBtn.disabled = true;
  showMessage("Logging in...");

  try {
    await signInWithEmailAndPassword(auth, email, password);

    showMessage("Login successful. Redirecting...");
    setTimeout(() => {
      window.location.href = "dashboard.html";
    }, 800);
  } catch (error) {
    console.error("Login error:", error);
    showMessage(`${getFriendlyError(error.code)} (${error.code})`, true);
  } finally {
    registerBtn.disabled = false;
    loginBtn.disabled = false;
  }
});

function getFriendlyError(code) {
  switch (code) {
    case "auth/email-already-in-use":
      return "This email is already registered. Try logging in.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/weak-password":
      return "Password is too weak. Use at least 6 characters.";
    case "auth/operation-not-allowed":
      return "Email/Password login is not enabled in Firebase.";
    case "auth/configuration-not-found":
      return "Firebase Authentication is not configured properly.";
    case "auth/unauthorized-domain":
      return "This website domain is not authorized in Firebase.";
    case "auth/user-not-found":
      return "No account found with this email. Please register first.";
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Incorrect email or password.";
    case "auth/network-request-failed":
      return "Network error. Check your internet connection.";
    case "permission-denied":
    case "firestore/permission-denied":
      return "Firestore permission denied. Check Firestore rules.";
    default:
      return "Something went wrong. Please try again.";
  }
}
