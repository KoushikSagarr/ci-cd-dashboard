// src/firebase.ts

// ✅ Import necessary Firebase modules
import { initializeApp } from "firebase/app";
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

// ✅ Export Firestore database
export const db = getFirestore(app);
