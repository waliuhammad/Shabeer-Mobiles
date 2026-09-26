#!/usr/bin/env node
/**
 * Send a password-reset email to a staff account.
 *
 *   node scripts/send-password-reset.mjs someone@example.com
 *
 * WHY THIS EXISTS
 * ---------------
 * An account created through "Continue with Google" has NO password.
 * Signing in with email and password against it fails with "incorrect",
 * which is accurate and completely unhelpful - there is nothing to be
 * incorrect about.
 *
 * Firebase's reset flow fixes that: completing it ADDS a password to
 * the account, so it can then be used from any computer without
 * depending on being signed into Google there.
 *
 * It sends through Firebase's own mailer, so no email provider is
 * needed, and the password is chosen by the person - it is never typed
 * into a terminal or a chat window by anyone else.
 */

import { readFileSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getAuth, sendPasswordResetEmail } from "firebase/auth";

const email = process.argv[2];
if (!email) {
  console.error("Usage: node scripts/send-password-reset.mjs <email>");
  process.exit(1);
}

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

try {
  await sendPasswordResetEmail(getAuth(app), email);
  console.log(`Sent. Check the inbox for ${email} (and the spam folder).`);
  console.log("Opening that link and setting a password ADDS a password to the");
  console.log("account, so email + password then works on any computer.");
} catch (err) {
  console.log(`Could not send: ${err.code ?? err.message}`);
  if (String(err.code).includes("user-not-found")) {
    console.log("No account with that email, or email enumeration protection is on.");
  }
}

process.exit(0);
