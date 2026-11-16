import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { Auth, getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey:            process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain:        process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL:       process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL,
  projectId:         process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId:     process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// On Android/iOS plain getAuth() keeps the session in memory only. Use the
// React Native persistence so a signed-in (and 2FA-verified) session survives
// an app restart. The web build keeps Firebase's default browser persistence.
function createAuth(): Auth {
  if (Platform.OS === 'web') return getAuth(app);
  try {
    // getReactNativePersistence only exists in the React Native build of firebase/auth.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const rnAuth = require('firebase/auth');
    return rnAuth.initializeAuth(app, {
      persistence: rnAuth.getReactNativePersistence(AsyncStorage),
    });
  } catch {
    // Already initialised (fast refresh) or persistence unavailable.
    return getAuth(app);
  }
}

export const auth    = createAuth();
export const db      = getFirestore(app);
export const rtdb    = getDatabase(app);
export const storage = getStorage(app);
export default app;
