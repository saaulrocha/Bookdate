
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getAuth, type Auth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration using environment variables
// Make sure to prefix client-side accessible variables with NEXT_PUBLIC_
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID, // Optional
};

// Initialize Firebase
let app: FirebaseApp | undefined;
let db: Firestore | undefined;
let auth: Auth | undefined;

// Check if all necessary config values are present
export const hasRequiredConfig =
  firebaseConfig.apiKey &&
  firebaseConfig.authDomain &&
  firebaseConfig.projectId &&
  firebaseConfig.storageBucket &&
  firebaseConfig.messagingSenderId &&
  firebaseConfig.appId;

// Initialize only on the client-side or ensure config is present
if (typeof window !== "undefined") {
  if (hasRequiredConfig) {
    if (!getApps().length) {
      try {
        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);
      } catch (error) {
        console.error("Failed to initialize Firebase:", error);
        // Handle initialization error, maybe show a message to the user
      }
    } else {
      app = getApp();
      db = getFirestore(app);
      auth = getAuth(app);
    }
  } else {
    console.warn(
      "Firebase configuration is incomplete or missing in environment variables. Firebase features will be unavailable. Ensure all NEXT_PUBLIC_FIREBASE_ variables are set in your .env.local file."
    );
  }
} else if (hasRequiredConfig && typeof window === 'undefined') {
  // Allow server-side initialization if needed, though auth might primarily be client-side
   if (!getApps().length) {
     try {
       app = initializeApp(firebaseConfig);
       db = getFirestore(app);
       // Auth might not be needed server-side in this setup, but initialize if required
       auth = getAuth(app);
     } catch (error) {
       console.error("Failed to initialize Firebase (server-side):", error);
     }
   } else {
     app = getApp();
     db = getFirestore(app);
     auth = getAuth(app); // Get existing auth instance
   }
}


// Export initialized services. They will be `undefined` if config is invalid or not initialized.
export { app, db, auth };
