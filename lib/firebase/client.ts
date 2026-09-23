import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

/**
 * THE browser Firebase app.
 *
 * WHY THESE VALUES ARE PUBLIC
 * ---------------------------
 * Every NEXT_PUBLIC_FIREBASE_* value below is inlined into the JavaScript
 * bundle and anyone can read it with View Source. That is not a leak -
 * Firebase is designed this way. The config identifies WHICH project to
 * talk to; it grants no permission whatsoever.
 *
 * What actually protects the data is Firestore Security Rules and, for
 * anything the rules cannot express, a trusted server. If the rules are
 * wrong, hiding this config would not save you; if the rules are right,
 * publishing it costs nothing.
 *
 * The genuinely secret credential is the Admin SDK service account, which
 * lives in lib/firebase/admin.ts, has no NEXT_PUBLIC_ prefix, and must
 * never be imported from a client component.
 *
 * WHY getApps() IS CHECKED
 * ------------------------
 * Next.js hot-reloads modules in development, and React 19 may render a
 * component twice. Calling initializeApp() a second time throws
 * "Firebase App named '[DEFAULT]' already exists". Reusing the existing
 * app makes this module safe to import from anywhere, any number of
 * times.
 */
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/**
 * Is Firebase actually configured?
 *
 * The app must still run with an empty .env.local - a missing key should
 * show a clear message on the login page, not a white screen from a
 * constructor throwing during render. Every caller checks this first.
 */
export function isFirebaseConfigured(): boolean {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
}

let cachedApp: FirebaseApp | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (!isFirebaseConfigured()) {
    throw new Error(
      "Firebase is not configured. Copy .env.local.example to .env.local, " +
        "fill in the NEXT_PUBLIC_FIREBASE_* values from your Firebase " +
        "project settings, and restart the dev server."
    );
  }
  if (cachedApp) return cachedApp;
  cachedApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
  return cachedApp;
}

/** THE auth instance. Every sign-in path in the app goes through this. */
export function getFirebaseAuth(): Auth {
  return getAuth(getFirebaseApp());
}
