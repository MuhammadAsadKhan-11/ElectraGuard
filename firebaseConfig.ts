import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
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
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
export const actionCodeSettings = {
  url: 'https://electraguard-43b18.firebaseapp.com/__/auth/action',
  handleCodeInApp: true,
  android: {
    packageName: 'com.electraguard.app',
    installIfNotInstalled: true,
  },
  iOS: {
    bundleId: 'com.electraguard.app',
  },
};