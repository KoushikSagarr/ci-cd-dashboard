// src/firebase.ts

// ✅ Import necessary Firebase modules
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore"; // ✅ This was missing

// ✅ Your Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyCceCRVJOq65rySzKtHOP2BJdMoybQpnSg",
  authDomain: "ci-cd-dashboard-c4071.firebaseapp.com",
  projectId: "ci-cd-dashboard-c4071",
  storageBucket: "ci-cd-dashboard-c4071.firebasestorage.app",
  messagingSenderId: "967725892866",
  appId: "1:967725892866:web:b811b0e842bf28fcbdee1b",
  measurementId: "G-2EWY500ZQP"
};

// ✅ Initialize Firebase
const app = initializeApp(firebaseConfig);

// Optional: analytics (only works in browser with HTTPS)
const analytics = getAnalytics(app);

// ✅ Export Firestore database
export const db = getFirestore(app);
