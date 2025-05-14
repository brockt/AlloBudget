
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getAuth } from "firebase/auth"; // Import getAuth

// Log all environment variables for debugging
console.log('All environment variables available to firebase.ts:');
for (const key in process.env) {
  // Be cautious about logging sensitive variables in production
  if (key.startsWith("NEXT_PUBLIC_")) { // Only log Next.js public variables for safety
    console.log(`${key}: ${process.env[key]}`);
  }
}

console.log("[firebase.ts] Value of process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID before use:", process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Explicitly log the projectId and apiKey being used by the config
console.log("[firebase.ts] Attempting to initialize Firebase with projectId from firebaseConfig:", firebaseConfig.projectId);
console.log("[firebase.ts] Attempting to initialize Firebase with apiKey from firebaseConfig:", firebaseConfig.apiKey ? "********" : undefined); // Mask API key in logs
console.log("[firebase.ts] firebaseConfig object constructed:", JSON.stringify(firebaseConfig, (key, value) => key === 'apiKey' ? '********' : value));


if (!firebaseConfig.projectId) {
  console.error("[firebase.ts] CRITICAL: firebaseConfig.projectId is undefined or empty. Firebase will not initialize correctly.");
}
if (!firebaseConfig.apiKey) {
  console.error("[firebase.ts] CRITICAL: firebaseConfig.apiKey is undefined or empty. Firebase will not initialize correctly.");
}

let app: FirebaseApp | undefined; // Allow app to be undefined initially
let auth; // Declare auth

if (!getApps().length) {
  try {
    if (!firebaseConfig.projectId || !firebaseConfig.apiKey) {
      throw new Error("Missing critical Firebase configuration (projectId or apiKey). Cannot initialize Firebase.");
    }
    app = initializeApp(firebaseConfig);
    console.log("Firebase initialized successfully in firebase.ts (new app instance). Project ID from SDK after init:", app.options.projectId);
  } catch (error) {
    console.error("Firebase initialization error in firebase.ts:", error);
    // app will remain undefined if initialization fails
  }
} else {
  app = getApps()[0];
  if (app && app.options) {
    console.log("Firebase already initialized in firebase.ts (existing app instance). Project ID from SDK:", app.options.projectId);
  } else {
    console.error("Firebase getApps()[0] returned an uninitialized or invalid app instance.");
  }
}

let db;

if (app) {
  db = getFirestore(app);
  auth = getAuth(app); // Initialize auth if app exists
  // If you want to use the Firestore emulator during development, uncomment the following line:
  // if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true') {
  //   try {
  //     connectFirestoreEmulator(db, 'localhost', 8080);
  //     console.log("Firestore emulator connected");
  //   } catch (error) {
  //     console.error("Error connecting to Firestore emulator:", error);
  //   }
  // }
} else {
  console.error("[firebase.ts] CRITICAL: Firebase app instance is not available. Firestore cannot be initialized.");
  // db will remain undefined
}

export { db, app, auth }; // Export auth
