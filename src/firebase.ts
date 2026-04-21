import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDb0iHAZiZoTHVTk38husmShpmRTw9JTEk",
  authDomain: "ai-frontend-fbc5f.firebaseapp.com",
  projectId: "ai-frontend-fbc5f",
  storageBucket: "ai-frontend-fbc5f.firebasestorage.app",
  messagingSenderId: "872802788440",
  appId: "1:872802788440:web:5a70e480a423f1f32d162d",
  measurementId: "G-XTTSPBSQTL"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);