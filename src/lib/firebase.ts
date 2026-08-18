import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeFirestore, getFirestore } from "firebase/firestore";
import firebaseConfigData from "../../firebase-applet-config.json";

const firebaseConfig = {
  apiKey: firebaseConfigData.apiKey,
  authDomain: firebaseConfigData.authDomain,
  projectId: firebaseConfigData.projectId,
  storageBucket: firebaseConfigData.storageBucket,
  messagingSenderId: firebaseConfigData.messagingSenderId,
  appId: firebaseConfigData.appId,
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Use named database if specified, otherwise default
const databaseId = firebaseConfigData.firestoreDatabaseId && firebaseConfigData.firestoreDatabaseId !== "(default)"
  ? firebaseConfigData.firestoreDatabaseId
  : undefined;

let firestoreDb;
try {
  firestoreDb = initializeFirestore(app, { ignoreUndefinedProperties: true }, databaseId);
} catch {
  firestoreDb = getFirestore(app, databaseId);
}

export const db = firestoreDb;
export default app;
