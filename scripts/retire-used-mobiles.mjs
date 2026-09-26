#!/usr/bin/env node
/**
 * Take used handsets off the shop.
 *
 *   node scripts/retire-used-mobiles.mjs          # dry run
 *   node scripts/retire-used-mobiles.mjs --write  # apply
 *
 * ARCHIVED, NOT DELETED, and the distinction matters here.
 *
 * Each of these products has stock on the shelf and a row in the
 * inventory ledger recording how it got there. Deleting the product
 * document would leave those ledger rows pointing at nothing, so the
 * stock history stops adding up and the movements can never be
 * explained again. If one of them was ever sold, the invoice would
 * name a product that no longer exists.
 *
 * Archiving achieves what was actually asked: getActiveProducts()
 * filters on status === "active", so an archived product vanishes from
 * the storefront, the category grid, featured and best sellers - while
 * the ledger stays honest and the decision stays reversible.
 *
 * The featured and best-seller flags are cleared too, so turning one
 * back on later does not silently promote it to the front page again.
 *
 * The CATEGORY is deleted outright. It holds no history - it is a name
 * and a slug - and an empty category on the shop page is a link to
 * nothing.
 */

import { readFileSync } from "node:fs";
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const WRITE = process.argv.includes("--write");
const CATEGORY_ID = "cat-mobiles";

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

const snap = await db.collection("products").get();
const affected = snap.docs.filter((d) => d.data().categoryId === CATEGORY_ID);

console.log(`Mode: ${WRITE ? "WRITE" : "DRY RUN (pass --write to apply)"}\n`);

if (affected.length === 0) {
  console.log("No products in that category. Nothing to archive.");
} else {
  console.log("Products to archive:");
  for (const d of affected) {
    const p = d.data();
    console.log(
      `  ${d.id}  ${String(p.name).padEnd(28)} status ${p.status} -> archived` +
        `${p.isFeatured ? ", unfeature" : ""}${p.isBestSeller ? ", unflag best seller" : ""}` +
        `  (stock ${p.stock} stays recorded)`
    );
  }
}

const cat = await db.collection("categories").doc(CATEGORY_ID).get();
console.log(
  cat.exists
    ? `\nCategory to delete: ${CATEGORY_ID} "${cat.data().name}"`
    : `\nCategory ${CATEGORY_ID} already gone.`
);

if (!WRITE) {
  console.log("\nNothing written. Re-run with --write to apply.");
  process.exit(0);
}

const batch = db.batch();
for (const d of affected) {
  batch.update(d.ref, { status: "archived", isFeatured: false, isBestSeller: false });
}
if (cat.exists) batch.delete(cat.ref);
await batch.commit();

console.log(`\nArchived ${affected.length} product(s)${cat.exists ? " and deleted the category" : ""}.`);
console.log("Stock and ledger rows are untouched - the products are simply off sale.");
process.exit(0);
