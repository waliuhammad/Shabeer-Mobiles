#!/usr/bin/env node
/**
 * Record an opening stock count.
 *
 *   node scripts/set-opening-stock.mjs          # dry run
 *   node scripts/set-opening-stock.mjs --write  # apply
 *
 * WHY THIS IS NOT JUST "SET products.stock = 20"
 * ----------------------------------------------
 * Stock in this system is the running total of recorded movements, not a
 * number somebody typed. Writing the field directly would make the
 * inventory page disagree with its own ledger on day one - the figure
 * would be there with nothing explaining where it came from.
 *
 * So each product gets an INITIAL_STOCK ledger entry AND its stock
 * field, written in one batch. They cannot drift, and every unit on the
 * shelf traces back to a row that says how it got there.
 *
 * SAFE TO RE-RUN: entries use a fixed id per product, so a second run
 * replaces rather than doubling. It refuses to touch a product that
 * already has stock, so it cannot quietly overwrite real counting.
 */

import { readFileSync } from "node:fs";
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const WRITE = process.argv.includes("--write");

/**
 * Opening quantities, by product.
 *
 * THESE ARE ESTIMATES, chosen to be plausible for a small mobile shop in
 * Multan: used handsets arrive in ones and twos and sell slowly, while
 * protectors and cables move constantly and are bought by the box.
 *
 * They are NOT a count of your shelf. Correct them here before running
 * with --write, or adjust each product afterwards in
 * /admin/inventory - which records the correction in the ledger, as it
 * should.
 */
const OPENING = {
  "p-001": 2,   // iPhone 12 (Used) - used handset, ones and twos
  "p-002": 3,   // iPhone 11 (Used)
  "p-003": 3,   // Samsung Galaxy A52 (Used)
  "p-004": 25,  // Samsung Original Charger 25W
  "p-005": 30,  // Fast Charger 33W
  "p-006": 60,  // Silicone Phone Cover - many models, high turnover
  "p-007": 100, // Tempered Glass Screen Protector - fastest moving item
  "p-008": 6,   // AirPods Pro (2nd Gen) - higher value, fewer held
  "p-009": 10,  // Power Bank 20,000 mAh
  "p-010": 40,  // Wired Handsfree
  "p-011": 50,  // Type-C Fast Charging Cable
};

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

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const privateKey = (process.env.FIREBASE_ADMIN_PRIVATE_KEY ?? "")
  .replace(/^["']|["']$/g, "")
  .replace(/\\n/g, "\n");

if (!projectId || !clientEmail || !privateKey) {
  console.error("Missing FIREBASE_ADMIN_* values in .env.local.");
  process.exit(1);
}

initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
const db = getFirestore();

const snap = await db.collection("products").get();
if (snap.empty) {
  console.error("No products in Firestore. Run scripts/seed-catalog.mjs first.");
  process.exit(1);
}

const createdAt = new Date().toISOString();
const plan = [];
const skipped = [];

for (const doc of snap.docs) {
  const p = doc.data();
  const target = OPENING[doc.id];

  if (target === undefined) {
    skipped.push(`${doc.id} ${p.name} - no opening quantity listed`);
    continue;
  }

  const current = typeof p.stock === "number" ? p.stock : 0;
  if (current > 0) {
    // Never overwrite a real count. Someone has already adjusted this.
    skipped.push(`${doc.id} ${p.name} - already has ${current} in stock`);
    continue;
  }

  plan.push({
    id: doc.id,
    name: p.name ?? doc.id,
    sku: p.sku ?? "",
    quantity: target,
  });
}

console.log(`Project: ${projectId}`);
console.log(`Mode:    ${WRITE ? "WRITE" : "DRY RUN (pass --write to apply)"}\n`);

for (const row of plan) {
  console.log(`  ${row.id}  ${String(row.quantity).padStart(4)}  ${row.name}`);
}
for (const s of skipped) console.log(`  SKIP  ${s}`);

if (plan.length === 0) {
  console.log("\nNothing to do.");
  process.exit(0);
}

console.log(`\n${plan.length} products, ${plan.reduce((n, r) => n + r.quantity, 0)} units total.`);

if (!WRITE) {
  console.log("\nNothing written. Edit OPENING above if the numbers are wrong,");
  console.log("then re-run with --write.");
  process.exit(0);
}

const batch = db.batch();
for (const row of plan) {
  const txnId = `txn_opening_${row.id}`;
  batch.set(db.collection("inventoryTransactions").doc(txnId), {
    id: txnId,
    productId: row.id,
    productName: row.name,
    productSku: row.sku,
    type: "INITIAL_STOCK",
    quantity: row.quantity,
    previousStock: 0,
    newStock: row.quantity,
    note: "Opening stock count.",
    createdBy: "Owner",
    createdAt,
  });
  batch.update(db.collection("products").doc(row.id), { stock: row.quantity });
}

await batch.commit();
console.log(`\nWrote ${plan.length} opening entries. Each one appears in the`);
console.log("inventory ledger, so the figures have an explanation behind them.");
process.exit(0);
