
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCNX0_cLYjrXTa4rrYq5YvFHXzE8uTrGtM",
  authDomain: "easy-pin-csv.firebaseapp.com",
  projectId: "easy-pin-csv",
  storageBucket: "easy-pin-csv.firebasestorage.app",
  messagingSenderId: "844286152234",
  appId: "1:844286152234:web:cd94a33e25dedc11e0fd53",
  measurementId: "G-NMY15ME7Z1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
