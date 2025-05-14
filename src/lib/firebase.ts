
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp;

if (!getApps().length) {
  app = initializeApp(firebaseConfig);
  console.log("Firebase initialized successfully in firebase.ts (new app instance). Project ID:", firebaseConfig.projectId);
} else {
  app = getApps()[0];
  console.log("Firebase already initialized in firebase.ts (existing app instance). Project ID:", firebaseConfig.projectId);
}

const db = getFirestore(app);

// If you want to use the Firestore emulator during development, uncomment the following line:
// if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true') {
//   try {
//     connectFirestoreEmulator(db, 'localhost', 8080);
//     console.log("Firestore emulator connected");
//   } catch (error) {
//     console.error("Error connecting to Firestore emulator:", error);
//   }
// }

export { db, app };
