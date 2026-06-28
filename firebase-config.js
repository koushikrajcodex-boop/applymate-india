import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyC5nxqToklTkAPJn4CYrs_kK4OCmpqp5WI",
  authDomain: "applymate-india.firebaseapp.com",
  projectId: "applymate-india",
  storageBucket: "applymate-india.firebasestorage.app",
  messagingSenderId: "701122859944",
  appId: "1:701122859944:web:694e19d91b2723b1eb439d",
  measurementId: "G-5PFZLVERNF"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
