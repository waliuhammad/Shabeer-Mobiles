#!/usr/bin/env node
/**
 * Can a signed-in owner read productCosts through the CLIENT SDK?
 *
 *   node scripts/temp-staff.mjs create
 *   node scripts/verify-cost-read.mjs
 *   node scripts/temp-staff.mjs delete
 *
 * The Admin SDK bypasses Security Rules, so every script that has read
 * these documents so far proves nothing about whether the BROWSER can.
 * This signs in as a real user and reads the same way the app does, so a
 * rules problem and a React problem stop looking alike.
 */

import { readFileSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, getDocs, collection } from "firebase/firestore";

function loadEnv() {
  const text = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    let value = t.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}
loadEnv();

const app = initializeApp({
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
});

const auth = getAuth(app);
const db = getFirestore(app);

const cred = await signInWithEmailAndPassword(
  auth,
  "temp-verify-bot@shabbir-mobiles.invalid",
  "TempVerify!2026"
);

const token = await cred.user.getIdTokenResult();
console.log("signed in as", cred.user.email);
console.log("claims:", JSON.stringify({ staff: token.claims.staff, role: token.claims.role }));

try {
  const snap = await getDocs(collection(db, "productCosts"));
  console.log(`\nproductCosts readable: ${snap.size} documents`);
  for (const d of snap.docs.slice(0, 3)) {
    console.log(`  ${d.id}  ${JSON.stringify(d.data())}`);
  }
  console.log("\nRules ALLOW the read - so an empty list in the app is a client-side problem.");
} catch (err) {
  console.log(`\nREAD REFUSED: ${err.code ?? err.message}`);
  console.log("Rules are the problem, not React.");
}

process.exit(0);
