
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCP8pBzo7qDff1RzpMSAwMz4-rDx9ghmmI",
  authDomain: "studymate-caa73.firebaseapp.com",
  projectId: "studymate-caa73",
  storageBucket: "studymate-caa73.firebasestorage.app",
  messagingSenderId: "462341988201",
  appId: "1:462341988201:web:7d9ad561f80222305267f8",
  measurementId: "G-2GTBLPVLEG"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
