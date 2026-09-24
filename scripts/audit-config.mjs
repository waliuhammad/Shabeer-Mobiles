#!/usr/bin/env node
/**
 * What is configured, and what is still empty?
 *
 *   node scripts/audit-config.mjs
 *
 * Reads only - it writes nothing. Counts documents per collection and
 * reports the fields whose absence quietly changes what the admin panel
 * shows, so "the profit figures look wrong" has an answer before
 * anybody goes looking through code.
 */

import { readFileSync } from "node:fs";
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

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

initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: (process.env.FIREBASE_ADMIN_PRIVATE_KEY ?? "")
      .replace(/^["']|["']$/g, "")
      .replace(/\\n/g, "\n"),
  }),
});
const db = getFirestore();

const COLLECTIONS = [
  "products",
  "categories",
  "productCosts",
  "inventoryTransactions",
  "purchases",
  "suppliers",
  "customers",
  "invoices",
  "orders",
  "expenses",
  "staff",
  "messages",
  "settings",
  "counters",
];

console.log("COLLECTION                DOCS");
const counts = {};
for (const name of COLLECTIONS) {
  const snap = await db.collection(name).count().get();
  const n = snap.data().count;
  counts[name] = n;
  console.log(`${name.padEnd(24)}  ${String(n).padStart(4)}${n === 0 ? "   <- empty" : ""}`);
}

/* ---- the fields whose absence changes a number on screen ---- */

const products = await db.collection("products").get();
let noImage = 0;
let noCost = 0;
const costs = await db.collection("productCosts").get();
const costIds = new Set(costs.docs.map((d) => d.id));

for (const d of products.docs) {
  const p = d.data();
  if (!Array.isArray(p.images) || p.images.filter(Boolean).length === 0) noImage++;
  if (!costIds.has(d.id)) noCost++;
}

console.log("\nPRODUCT FIELDS");
console.log(`  products total            ${products.size}`);
console.log(`  without an image          ${noImage}`);
console.log(`  without a purchase cost   ${noCost}${noCost ? "   <- stock value reads 0, every sale looks 100% profit" : ""}`);

const messages = await db.collection("messages").get();
const unanswered = messages.docs.filter((d) => d.data().status === "NEW");

console.log("\nCONTACT FORM");
console.log(`  enquiries received        ${messages.size}`);
console.log(`  unanswered                ${unanswered.length}`);
for (const d of messages.docs.slice(0, 5)) {
  const m = d.data();
  console.log(`    ${String(m.status).padEnd(8)} ${m.name} | ${m.phone} | ${m.subject}`);
}

console.log("\nAUTH");
console.log(`  staff documents           ${counts.staff}`);

process.exit(0);
