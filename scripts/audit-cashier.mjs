#!/usr/bin/env node
/**
 * Can a CASHIER see what the shop paid?
 *
 *   node scripts/audit-cashier.mjs
 *
 * This is the privacy boundary the whole admin design rests on: a
 * cashier rings up sales and must never learn the purchase price, the
 * margin, the expenses or the profit. Every rule expresses that as
 * isOwnerOrManager(), so a cashier fails it - but a rule nobody has
 * exercised is a rule nobody knows is working.
 *
 * Creates a temporary CASHIER account, tries each protected collection
 * as that account, and deletes it again on every exit path.
 */

import { readFileSync } from "node:fs";
import { cert, initializeApp as initAdmin } from "firebase-admin/app";
import { getAuth as getAdminAuth } from "firebase-admin/auth";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, signOut } from "firebase/auth";
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

const EMAIL = "temp-cashier-probe@shabbir-mobiles.invalid";
const PASSWORD = "TempCashier!2026";

initAdmin({
  credential: cert({
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: (process.env.FIREBASE_ADMIN_PRIVATE_KEY ?? "")
      .replace(/^["']|["']$/g, "")
      .replace(/\\n/g, "\n"),
  }),
});
const adminAuth = getAdminAuth();

let uid = null;
let problems = 0;

try {
  let user;
  try {
    user = await adminAuth.getUserByEmail(EMAIL);
    await adminAuth.updateUser(user.uid, { password: PASSWORD });
  } catch {
    user = await adminAuth.createUser({
      email: EMAIL,
      password: PASSWORD,
      displayName: "Cashier Probe",
      emailVerified: true,
    });
  }
  uid = user.uid;
  await adminAuth.setCustomUserClaims(uid, { staff: true, role: "CASHIER" });

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

  const cred = await signInWithEmailAndPassword(auth, EMAIL, PASSWORD);
  const tok = await cred.user.getIdTokenResult();
  console.log(`signed in as a cashier - claims: ${JSON.stringify({ staff: tok.claims.staff, role: tok.claims.role })}\n`);

  const CHECKS = [
    { name: "productCosts", allowed: false, why: "what the shop paid" },
    { name: "expenses", allowed: false, why: "the shop's outgoings" },
    { name: "purchases", allowed: false, why: "supplier prices" },
    { name: "suppliers", allowed: false, why: "supplier list" },
    { name: "invoices", allowed: false, why: "sales history with margins" },
    { name: "inventoryTransactions", allowed: false, why: "stock movements" },
    { name: "products", allowed: true, why: "needed to ring up a sale" },
    { name: "customers", allowed: true, why: "needed to attach a sale" },
    { name: "messages", allowed: true, why: "may answer an enquiry" },
  ];

  console.log(`${"COLLECTION".padEnd(24)} ${"CASHIER READS".padEnd(15)} VERDICT`);
  for (const c of CHECKS) {
    let can = false;
    try {
      await getDocs(collection(db, c.name));
      can = true;
    } catch {
      can = false;
    }
    const ok = can === c.allowed;
    if (!ok) problems++;
    console.log(
      `${c.name.padEnd(24)} ${(can ? "yes" : "no").padEnd(15)} ${ok ? "ok" : "PROBLEM"}` +
        (ok ? "" : `  <- ${c.why}`)
    );
  }

  await signOut(auth);
} catch (err) {
  problems++;
  console.error("FAILED -", err.message);
} finally {
  if (uid) {
    await adminAuth.revokeRefreshTokens(uid);
    await adminAuth.deleteUser(uid);
    console.log("\ncleanup: cashier probe account deleted");
  }
}

console.log(
  problems === 0
    ? "\nPASS - a cashier cannot reach costs, margins, expenses or purchases."
    : `\n${problems} problem(s) - the cashier boundary does not hold.`
);
process.exit(problems === 0 ? 0 : 1);
