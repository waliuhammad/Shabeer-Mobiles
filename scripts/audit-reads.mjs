#!/usr/bin/env node
/**
 * What does a page view cost in Firestore reads?
 *
 *   node scripts/audit-reads.mjs
 *
 * WHY THIS IS WORTH MEASURING
 * ---------------------------
 * Every admin page is wrapped in the same eight providers, so opening
 * ANY of them - the dashboard, settings, a single product - opens every
 * subscription the panel has. A listener bills a read for each document
 * it first receives, so the cost of looking at one screen is the size of
 * the whole database, not the size of that screen.
 *
 * That is invisible while the collections are empty. It stops being
 * invisible after a few thousand sales, because the ledger and the
 * invoices only ever grow.
 *
 * Reads only. This script writes nothing.
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

/**
 * Every subscription the admin shell opens, in provider order, with
 * whether it grows without bound as the shop trades.
 */
const ADMIN_SUBSCRIPTIONS = [
  { collection: "settings", grows: false, note: "one document" },
  { collection: "products", grows: false, note: "catalogue size" },
  { collection: "categories", grows: false, note: "catalogue size" },
  { collection: "productCosts", grows: false, note: "one per product" },
  { collection: "inventoryTransactions", grows: true, note: "one per stock movement, for ever" },
  { collection: "orders", grows: true, note: "online orders (disabled)" },
  { collection: "suppliers", grows: false, note: "a handful" },
  { collection: "purchases", grows: true, note: "one per purchase" },
  { collection: "customers", grows: true, note: "one per customer" },
  { collection: "invoices", grows: true, note: "ONE PER COUNTER SALE" },
  { collection: "expenses", grows: true, note: "one per expense" },
];

/** Opened by the notification bell, on every admin page. */
const BELL = { collection: "messages", filter: ["status", "==", "NEW"] };

/** Opened by every PUBLIC visitor to the home page. */
const PUBLIC = { collection: "products", filter: ["status", "==", "active"] };

console.log("ADMIN PANEL - documents read when ANY admin page is opened\n");
console.log(`${"COLLECTION".padEnd(24)} ${"DOCS".padStart(6)}  GROWS  NOTE`);

let adminTotal = 0;
let growing = 0;
for (const s of ADMIN_SUBSCRIPTIONS) {
  const snap = await db.collection(s.collection).count().get();
  const n = snap.data().count;
  adminTotal += n;
  if (s.grows) growing += n;
  console.log(
    `${s.collection.padEnd(24)} ${String(n).padStart(6)}  ${s.grows ? " yes " : "  no "}  ${s.note}`
  );
}

const bellSnap = await db
  .collection(BELL.collection)
  .where(...BELL.filter)
  .count()
  .get();
const bellCount = bellSnap.data().count;
adminTotal += bellCount;
console.log(
  `${"messages (NEW only)".padEnd(24)} ${String(bellCount).padStart(6)}  ${" yes "}  notification bell`
);

console.log(`\n  ONE admin page view costs about ${adminTotal} document reads today.`);
console.log(`  Of those, ${growing + bellCount} come from collections that only grow.`);

const publicSnap = await db
  .collection(PUBLIC.collection)
  .where(...PUBLIC.filter)
  .count()
  .get();
const publicCount = publicSnap.data().count;

console.log("\nPUBLIC SITE - documents read per visitor to the home page\n");
console.log(`  active products (live stock tile): ${publicCount}`);

/* ---- what this becomes ---- */
console.log("\nPROJECTION\n");
const SALES_PER_DAY = 20;
const ADMIN_VIEWS_PER_DAY = 100;
const VISITORS_PER_DAY = 50;
const FREE_READS_PER_DAY = 50000;

for (const months of [1, 6, 12, 24]) {
  const days = months * 30;
  // Each sale writes an invoice AND an inventory movement.
  const accumulated = SALES_PER_DAY * days * 2;
  const perAdminView = adminTotal + accumulated;
  const daily = perAdminView * ADMIN_VIEWS_PER_DAY + publicCount * VISITORS_PER_DAY;
  const pct = ((daily / FREE_READS_PER_DAY) * 100).toFixed(0);
  console.log(
    `  after ${String(months).padStart(2)} months  ~${String(perAdminView).padStart(6)} reads per admin view` +
      `  ->  ~${String(daily).padStart(8)} reads/day  (${pct}% of the free 50,000)`
  );
}

console.log(`
  Assumes ${SALES_PER_DAY} sales/day, ${ADMIN_VIEWS_PER_DAY} admin page views/day,
  ${VISITORS_PER_DAY} public visitors/day. The admin figure is what matters:
  it multiplies the whole database by how often anyone opens a screen.
`);

process.exit(0);
