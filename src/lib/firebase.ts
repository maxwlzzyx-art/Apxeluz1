import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getAuth, browserLocalPersistence, setPersistence } from 'firebase/auth';
import localFirebaseConfig from '../../firebase-applet-config.json';

// Support Vercel production environment variables with seamless fallback to firebase-applet-config.json
export const effectiveFirebaseConfig = {
  apiKey: (import.meta.env?.VITE_FIREBASE_API_KEY as string) || localFirebaseConfig.apiKey,
  authDomain: (import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN as string) || localFirebaseConfig.authDomain,
  projectId: (import.meta.env?.VITE_FIREBASE_PROJECT_ID as string) || localFirebaseConfig.projectId,
  storageBucket: (import.meta.env?.VITE_FIREBASE_STORAGE_BUCKET as string) || localFirebaseConfig.storageBucket,
  messagingSenderId: (import.meta.env?.VITE_FIREBASE_MESSAGING_SENDER_ID as string) || localFirebaseConfig.messagingSenderId,
  appId: (import.meta.env?.VITE_FIREBASE_APP_ID as string) || localFirebaseConfig.appId,
  firestoreDatabaseId: (import.meta.env?.VITE_FIREBASE_DATABASE_ID as string) || localFirebaseConfig.firestoreDatabaseId,
};

// Prevent duplicate initialization
const app = !getApps().length ? initializeApp(effectiveFirebaseConfig) : getApp();

export const db = effectiveFirebaseConfig.firestoreDatabaseId
  ? getFirestore(app, effectiveFirebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

export const auth = getAuth(app);

// Retain Firebase Auth state so the user remains logged in across sessions
if (typeof window !== 'undefined') {
  setPersistence(auth, browserLocalPersistence).catch((err) => {
    console.warn('Firebase Auth persistence setup notice:', err);
  });
}

// Critical constraint: Validate connection to Firestore on initialization
export async function testFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore offline status:', error.message);
    }
  }
}

// Boot connection check asynchronously
testFirestoreConnection();

export default app;
