#!/usr/bin/env node
/**
 * Delete the three used-mobile products for good.
 *
 *   node scripts/delete-used-mobiles.mjs          # dry run
 *   node scripts/delete-used-mobiles.mjs --write  # apply
 *
 * They were ARCHIVED earlier, which took them off the storefront while
 * keeping the documents. The shop now wants them gone.
 *
 * WHAT IS SAFE ABOUT THIS, and what is not:
 *
 * An invoice or an order SNAPSHOTS the name, sku, price and cost of
 * what it sold - that is the whole point of the snapshot - so deleting
 * a product cannot rewrite a past sale. Past paperwork stays readable.
 *
 * What it does break is any link back to the product from that
 * paperwork: a line that pointed at p-001 now points at nothing. So
 * this refuses to delete anything still referenced by an order, an
 * invoice or a purchase unless --force is given, and prints what it
 * found. A dry run is the default.
 *
 * The inventory ledger rows and the cost record for each product are
 * deleted alongside, because they describe a product that no longer
 * exists and nothing else reads them.
 */

import { readFileSync } from "node:fs";
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const WRITE = process.argv.includes("--write");
const FORCE = process.argv.includes("--force");

function loadEnv() {
  const text = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!(k in process.env)) process.env[k] = v;
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

/* Identified by CONDITION, not by a hard-coded id list: the three are
   whatever the catalogue actually holds as used handsets, so this
   cannot delete the wrong row because an id was mistyped. */
const all = await db.collection("products").get();
const targets = all.docs.filter((d) => (d.data().condition ?? "") === "used");

if (targets.length === 0) {
  console.log("No used-condition products found. Nothing to do.");
  process.exit(0);
}

console.log(`Mode: ${WRITE ? "WRITE" : "DRY RUN (pass --write to apply)"}\n`);
console.log("Used-condition products:");
for (const d of targets) {
  const p = d.data();
  console.log(`  ${d.id}  ${String(p.status).padEnd(9)} ${p.name}`);
}

/* ---- who still points at them? ---- */
const ids = new Set(targets.map((d) => d.id));
const referenced = new Map();
const note = (id, where) => {
  if (!referenced.has(id)) referenced.set(id, []);
  referenced.get(id).push(where);
};

for (const [collection, field] of [
  ["invoices", "items"],
  ["orders", "items"],
  ["purchases", "items"],
]) {
  const snap = await db.collection(collection).get();
  for (const doc of snap.docs) {
    const lines = doc.data()[field];
    if (!Array.isArray(lines)) continue;
    for (const line of lines) {
      if (ids.has(line?.productId)) {
        note(line.productId, `${collection}/${doc.id}`);
      }
    }
  }
}

console.log("\nStill referenced by past paperwork:");
if (referenced.size === 0) {
  console.log("  nothing - these were never sold or purchased through the system");
} else {
  for (const [id, where] of referenced) {
    console.log(`  ${id}: ${where.join(", ")}`);
  }
  console.log(
    "\n  Those documents snapshot the name and price, so they stay readable.\n" +
      "  What breaks is the link back to the product."
  );
}

if (referenced.size > 0 && !FORCE) {
  console.log("\nRefusing to delete referenced products. Re-run with --force to override.");
  process.exit(1);
}

if (!WRITE) {
  console.log("\nNothing written.");
  process.exit(0);
}

const batch = db.batch();
let ledgerRows = 0;

for (const d of targets) {
  batch.delete(d.ref);
  batch.delete(db.collection("productCosts").doc(d.id));
  const ledger = await db
    .collection("inventoryTransactions")
    .where("productId", "==", d.id)
    .get();
  for (const row of ledger.docs) {
    batch.delete(row.ref);
    ledgerRows++;
  }
}

await batch.commit();
console.log(
  `\nDeleted ${targets.length} product(s), their cost records, and ${ledgerRows} inventory row(s).`
);
process.exit(0);
