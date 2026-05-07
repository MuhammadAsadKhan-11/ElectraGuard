import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database'; // ← ADD
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyD1F98ESsaDWGkeuqnJ76EuAKdhjYInQME",
  authDomain: "electraguard-43b18.firebaseapp.com",
  databaseURL: "https://electraguard-43b18-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "electraguard-43b18",
  storageBucket: "electraguard-43b18.firebasestorage.app",
  messagingSenderId: "915882563099",
  appId: "1:915882563099:web:9a34db5b39dc8a7f978abe",
  measurementId: "G-DQ6D41MHJ5"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
export const rtdb = getDatabase(app); // ← ADD
export default app;