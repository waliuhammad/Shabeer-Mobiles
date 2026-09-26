#!/usr/bin/env node
/**
 * What can a stranger on the internet read from, or write to, this
 * database?
 *
 *   node scripts/audit-exposure.mjs
 *
 * Signs in to NOTHING and attempts a read and a write against every
 * collection, exactly as anyone with the public Firebase config could -
 * and that config is in the page source of every visitor's browser, by
 * design. This is not a theoretical list of what the rules say; it is
 * what the rules actually do.
 *
 * Writes are attempted into a clearly-marked probe document and deleted
 * if any of them unexpectedly succeeds.
 */

import { readFileSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getFirestore, getDocs, collection, doc, setDoc, deleteDoc } from "firebase/firestore";

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
const db = getFirestore(app);

const COLLECTIONS = [
  { name: "products", expectRead: true, why: "the storefront shows them" },
  { name: "categories", expectRead: true, why: "the storefront shows them" },
  { name: "settings", expectRead: true, why: "the public footer needs address and hours" },
  { name: "productCosts", expectRead: false, why: "MARGINS - what the shop paid" },
  { name: "invoices", expectRead: false, why: "every counter sale" },
  { name: "customers", expectRead: false, why: "names and phone numbers" },
  { name: "messages", expectRead: false, why: "customer enquiries" },
  { name: "expenses", expectRead: false, why: "the shop's outgoings" },
  { name: "purchases", expectRead: false, why: "supplier prices" },
  { name: "suppliers", expectRead: false, why: "supplier list" },
  { name: "orders", expectRead: false, why: "customer orders" },
  { name: "inventoryTransactions", expectRead: false, why: "stock movements" },
  { name: "staff", expectRead: false, why: "who works here" },
  { name: "counters", expectRead: false, why: "invoice numbering" },
];

console.log("SIGNED OUT - what the open internet can do\n");
console.log(`${"COLLECTION".padEnd(24)} ${"READ".padEnd(10)} ${"WRITE".padEnd(10)} VERDICT`);

let problems = 0;

for (const c of COLLECTIONS) {
  let canRead = false;
  try {
    await getDocs(collection(db, c.name));
    canRead = true;
  } catch {
    canRead = false;
  }

  let canWrite = false;
  // NOT a double-underscore id: Firestore reserves those, and the
  // first version of this script used one. Every write then failed with
  // INVALID_ARGUMENT before the rules were ever consulted, and the
  // report said "nothing is writable" without having tested anything.
  const probeId = `exposure-probe-${Date.now()}`;
  try {
    await setDoc(doc(db, c.name, probeId), { probe: true });
    canWrite = true;
    await deleteDoc(doc(db, c.name, probeId)).catch(() => {});
  } catch {
    canWrite = false;
  }

  const readOk = canRead === c.expectRead;
  // Nothing should be writable by a stranger. Not one collection.
  const writeOk = canWrite === false;
  const verdict = readOk && writeOk ? "ok" : "PROBLEM";
  if (verdict === "PROBLEM") problems++;

  console.log(
    `${c.name.padEnd(24)} ${(canRead ? "yes" : "no").padEnd(10)} ${(canWrite ? "YES" : "no").padEnd(10)} ${verdict}` +
      (verdict === "PROBLEM" ? `  <- ${c.why}` : "")
  );
}

console.log(
  problems === 0
    ? "\nNothing is exposed that should not be, and nothing is writable from outside."
    : `\n${problems} collection(s) behave differently from what the design intends.`
);

process.exit(problems === 0 ? 0 : 1);
