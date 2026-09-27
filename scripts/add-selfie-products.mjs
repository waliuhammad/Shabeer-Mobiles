#!/usr/bin/env node
/**
 * Add the selfie stick and the clip-on ring light.
 *
 *   node scripts/add-selfie-products.mjs          # dry run
 *   node scripts/add-selfie-products.mjs --write  # apply
 *
 * THREE PICTURES ARRIVED, TWO PRODUCTS ARE HERE. The third was the
 * foldable phone stand - byte-identical to the file added as p-018 a
 * few minutes earlier, mean per-channel difference 0.00 over the whole
 * 736x736 frame. Adding it again would have put the same stand in the
 * shop twice at the same price, which reads as two different items to
 * anyone browsing. The duplicate check below would have caught the
 * slug, but only because the slug happened to match; the comparison is
 * what actually established it.
 *
 * PRICES ARE MINE, at the shop's standing instruction, at roughly the
 * 25% margin the rest of the catalogue runs at. A price has nowhere to
 * record that it was estimated - the customer reads it as the price -
 * so these want confirming. Costs carry isEstimate: true.
 *
 * DESCRIPTIONS SAY ONLY WHAT THE PHOTOGRAPH SHOWS, which for the
 * selfie stick means NOT saying how it triggers the shutter. There is
 * a button on the grip and no cable in the frame, and "Bluetooth" is
 * the single thing a buyer most wants to know - so it is the last
 * thing to guess at. Confirm it and the description can say so.
 */

import { readFileSync, existsSync } from "node:fs";
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const WRITE = process.argv.includes("--write");

const PRODUCTS = [
  {
    id: "p-023",
    name: "Selfie Stick",
    slug: "selfie-stick",
    brand: "Generic",
    sku: "GEN-SLF-STK",
    categoryId: "cat-accessories",
    description:
      "Telescopic selfie stick with a sprung clamp that grips the phone across the middle and a shutter button on the handle. Collapses to about the length of a hand and has a wrist strap so it does not get dropped.",
    features: [
      "Extends and collapses telescopically",
      "Sprung clamp holds the phone",
      "Shutter button on the grip",
      "Wrist strap",
    ],
    price: 899,
    cost: 670,
    stock: 8,
    lowStockThreshold: 3,
  },
  {
    id: "p-024",
    name: "Selfie Ring Light",
    slug: "selfie-ring-light",
    brand: "Generic",
    sku: "GEN-RNG-LGT",
    categoryId: "cat-accessories",
    description:
      "An LED ring that clips over the top of a phone so the light comes from the same side as the camera. Even, shadowless light for video calls and selfies indoors. Fits over a case, and works on either camera.",
    features: [
      "Clips over the top of the phone",
      "Even, shadowless light",
      "Works with the front or rear camera",
      "Fits over a case",
    ],
    price: 699,
    cost: 520,
    stock: 10,
    lowStockThreshold: 4,
  },
];

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

const catSnap = await db.collection("categories").get();
const cats = new Map(catSnap.docs.map((d) => [d.id, d.data()]));
const missingCat = PRODUCTS.filter((p) => !cats.has(p.categoryId));
if (missingCat.length) {
  console.error("Missing categories:");
  for (const p of missingCat) console.error(`  ${p.id} wants ${p.categoryId}`);
  process.exit(1);
}

const missingImg = PRODUCTS.filter(
  (p) => !existsSync(`public/images/products/${p.slug}.png`)
);
if (missingImg.length) {
  console.error("\nMissing images - run scripts/prepare-product-image.mjs first:");
  for (const p of missingImg) console.error(`  public/images/products/${p.slug}.png`);
  process.exit(1);
}

const existing = await db.collection("products").get();
const byId = new Set(existing.docs.map((d) => d.id));
const bySlug = new Set(existing.docs.map((d) => d.data().slug));
const clashes = PRODUCTS.filter((p) => byId.has(p.id) || bySlug.has(p.slug));
if (clashes.length) {
  console.error("\nAlready exist - refusing to overwrite:");
  for (const p of clashes) console.error(`  ${p.id} / ${p.slug}`);
  process.exit(1);
}

console.log(`Mode: ${WRITE ? "WRITE" : "DRY RUN (pass --write to apply)"}\n`);
console.log(
  `${"ID".padEnd(7)} ${"PRICE".padStart(7)} ${"COST".padStart(7)} ${"MARGIN".padStart(7)} ${"STOCK".padStart(6)}  ${"CATEGORY".padEnd(17)} NAME`
);
for (const p of PRODUCTS) {
  const margin = `${(((p.price - p.cost) / p.price) * 100).toFixed(0)}%`;
  console.log(
    `${p.id.padEnd(7)} ${String(p.price).padStart(7)} ${String(p.cost).padStart(7)} ${margin.padStart(7)} ` +
      `${String(p.stock).padStart(6)}  ${cats.get(p.categoryId).name.padEnd(17)} ${p.name}`
  );
}
console.log("\nPrices are estimates and carry no flag saying so. Confirm them.");
console.log("The selfie stick's description does not say how it triggers the shutter.");

if (!WRITE) {
  console.log("\nNothing written.");
  process.exit(0);
}

const now = new Date().toISOString();
const batch = db.batch();

for (const p of PRODUCTS) {
  const cat = cats.get(p.categoryId);
  batch.set(db.collection("products").doc(p.id), {
    id: p.id,
    name: p.name,
    slug: p.slug,
    brand: p.brand,
    sku: p.sku,
    categoryId: p.categoryId,
    categorySlug: cat.slug,
    categoryName: cat.name,
    description: p.description,
    features: p.features,
    images: [`/images/products/${p.slug}.png`],
    price: p.price,
    stock: p.stock,
    lowStockThreshold: p.lowStockThreshold,
    condition: "new",
    status: "active",
    isFeatured: false,
    isBestSeller: false,
    createdAt: now,
  });

  batch.set(db.collection("productCosts").doc(p.id), {
    cost: p.cost,
    isEstimate: true,
    updatedAt: now,
  });

  const txnId = `txn_opening_${p.id}`;
  batch.set(db.collection("inventoryTransactions").doc(txnId), {
    id: txnId,
    productId: p.id,
    productName: p.name,
    productSku: p.sku,
    type: "INITIAL_STOCK",
    quantity: p.stock,
    previousStock: 0,
    newStock: p.stock,
    note: "Opening stock count.",
    createdBy: "Owner",
    createdAt: now,
  });
}

await batch.commit();
console.log(`\nWrote ${PRODUCTS.length} products, their costs, and an opening stock row for each.`);
process.exit(0);
