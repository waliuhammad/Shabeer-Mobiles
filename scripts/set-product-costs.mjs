#!/usr/bin/env node
/**
 * Record what each product COST the shop.
 *
 *   node scripts/set-product-costs.mjs          # dry run, shows margins
 *   node scripts/set-product-costs.mjs --write  # apply
 *
 * WHY THIS MATTERS MORE THAN IT LOOKS
 * -----------------------------------
 * Cost of goods is stamped onto every sale line at the moment of sale,
 * read from productCosts. A product with no cost row stamps zero, so the
 * sale records its full price as profit. With the collection empty:
 *
 *   - stock is valued at Rs 0
 *   - gross margin reads 100% on everything
 *   - Profit & Loss reports a number the shop never made
 *
 * None of that announces itself. The figures simply look very good.
 *
 * THE NUMBERS BELOW ARE BLANK ON PURPOSE. Nobody but the shop knows what
 * it paid, and a plausible-looking guess would be indistinguishable from
 * a real figure once it is in the database - it would quietly corrupt
 * every margin, every stock valuation and every P&L from then on. Fill
 * them in, then run with --write.
 *
 * Each entry can also be set one at a time in the admin panel:
 * Products -> a product -> Edit -> Purchase Cost.
 */

import { readFileSync } from "node:fs";
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const WRITE = process.argv.includes("--write");

/**
 * What the shop PAID per unit, in rupees. null means "not known yet"
 * and is skipped rather than written as zero - a recorded zero is
 * indistinguishable from a free product and would be worse than the
 * empty collection this is meant to fix.
 */
const COSTS = {
  "p-001": null, // iPhone 12 (Used)              sells 28,999
  "p-002": null, // iPhone 11 (Used)              sells 22,999
  "p-003": null, // Samsung Galaxy A52 (Used)     sells 18,999
  "p-004": null, // Samsung Original Charger 25W  sells  1,499
  "p-005": null, // Fast Charger 33W              sells    899
  "p-006": null, // Silicone Phone Cover          sells    999
  "p-007": null, // Tempered Glass Protector      sells    349
  "p-008": null, // AirPods Pro (2nd Gen)         sells  8,999
  "p-009": null, // Power Bank 20,000 mAh         sells  4,299
  "p-010": null, // Wired Handsfree               sells    599
  "p-011": null, // Type-C Fast Charging Cable    sells    449
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

const products = await db.collection("products").get();
if (products.empty) {
  console.error("No products in Firestore.");
  process.exit(1);
}

const rs = (n) => `Rs ${n.toLocaleString("en-GB")}`;
const plan = [];
const missing = [];

for (const doc of products.docs) {
  const p = doc.data();
  const cost = COSTS[doc.id];
  const price = typeof p.price === "number" ? p.price : 0;

  if (typeof cost !== "number" || cost <= 0) {
    missing.push(`${doc.id}  ${p.name}`);
    continue;
  }
  if (cost >= price) {
    // Not refused, but it is almost always a typo, and selling at a loss
    // should be a decision rather than a slip.
    console.warn(`  WARNING ${doc.id} cost ${rs(cost)} is not below price ${rs(price)}`);
  }

  const margin = price > 0 ? ((price - cost) / price) * 100 : 0;
  plan.push({ id: doc.id, name: p.name, cost, price, margin });
}

console.log(`Mode: ${WRITE ? "WRITE" : "DRY RUN (pass --write to apply)"}\n`);

if (plan.length > 0) {
  console.log("  ID      COST        PRICE       MARGIN  PRODUCT");
  for (const r of plan) {
    console.log(
      `  ${r.id}  ${rs(r.cost).padEnd(11)} ${rs(r.price).padEnd(11)} ${
        r.margin.toFixed(1).padStart(5)
      }%  ${r.name}`
    );
  }
}

if (missing.length > 0) {
  console.log(`\n  ${missing.length} still have no cost and will be SKIPPED:`);
  for (const m of missing) console.log(`    ${m}`);
  console.log("\n  Fill these into the COSTS map at the top of this file.");
}

if (plan.length === 0) {
  console.log("\nNothing to write.");
  process.exit(0);
}

if (!WRITE) {
  console.log("\nNothing written. Check the margins above, then re-run with --write.");
  process.exit(0);
}

const now = new Date().toISOString();
const batch = db.batch();
for (const r of plan) {
  batch.set(
    db.collection("productCosts").doc(r.id),
    { productId: r.id, purchasePrice: r.cost, updatedAt: now },
    { merge: true }
  );
}
await batch.commit();

console.log(`\nWrote ${plan.length} costs.`);
console.log("Past sales are NOT rewritten - each one keeps the cost it was");
console.log("stamped with, which is what makes old invoices still add up.");
process.exit(0);
