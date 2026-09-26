#!/usr/bin/env node
/**
 * Add the Headphones and Speakers categories, and a product in each.
 *
 *   node scripts/add-audio-products.mjs          # dry run
 *   node scripts/add-audio-products.mjs --write  # apply
 *
 * Categories are created either way once --write is given; they carry
 * no figures to get wrong.
 *
 * PRODUCTS ARE ONLY CREATED ONCE THEY HAVE A PRICE. Everything else
 * about a product can be edited later without consequence, but a price
 * is what a customer reads and what a sale is recorded at. Guessing one
 * puts a number on a real shop's website that the shop never agreed to,
 * and it would look exactly as authoritative as a real one.
 *
 * Fill in price, cost and stock below, then run with --write.
 */

import { readFileSync } from "node:fs";
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const WRITE = process.argv.includes("--write");

const CATEGORIES = [
  {
    id: "cat-headphones",
    name: "Headphones",
    slug: "headphones",
    description: "Wireless and wired over-ear headphones",
    image: null,
  },
  {
    id: "cat-speakers",
    name: "Speakers",
    slug: "speakers",
    description: "Portable Bluetooth speakers",
    image: null,
  },
];

/**
 * null price = not created. Fill these in from what the shop charges.
 *
 * `cost` is what the shop paid; leaving it null means the product is
 * created without one, and Profit & Loss will flag it - better than a
 * guessed cost, which quietly corrupts every margin.
 */
const PRODUCTS = [
  {
    id: "p-012",
    name: "JBL Wireless Headphones",
    slug: "jbl-wireless-headphones",
    brand: "JBL",
    sku: "JBL-HP-BT",
    categoryId: "cat-headphones",
    description:
      "On-ear Bluetooth headphones with a folding band and on-cup controls. Tested in the shop before handover.",
    features: [
      "Bluetooth wireless",
      "On-ear folding design",
      "Controls and microphone on the cup",
      "Rechargeable battery",
    ],
    images: ["/images/products/jbl-wireless-headphones.png"],
    price: null, // <- what the shop sells it for
    cost: null, //  <- what the shop paid
    stock: null, //  <- units on the shelf
    lowStockThreshold: 3,
    condition: "new",
    isFeatured: true, // the shop asked for one featured
    isBestSeller: false,
  },
  {
    id: "p-013",
    name: "Sony Bluetooth Speaker",
    slug: "sony-bluetooth-speaker",
    brand: "Sony",
    sku: "SNY-SPK-BT",
    categoryId: "cat-speakers",
    description:
      "Compact portable Bluetooth speaker with a rubberised body. Pairs with any phone and holds a charge for a day out.",
    features: [
      "Bluetooth wireless",
      "Compact portable body",
      "Rechargeable battery",
      "Pairs with any phone",
    ],
    images: ["/images/products/sony-bluetooth-speaker.png"],
    price: null,
    cost: null,
    stock: null,
    lowStockThreshold: 3,
    condition: "new",
    isFeatured: false,
    isBestSeller: true, // and one best seller
  },
];

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

const catById = new Map(CATEGORIES.map((c) => [c.id, c]));
const ready = PRODUCTS.filter((p) => typeof p.price === "number" && p.price > 0);
const waiting = PRODUCTS.filter((p) => !(typeof p.price === "number" && p.price > 0));

console.log(`Mode: ${WRITE ? "WRITE" : "DRY RUN (pass --write to apply)"}\n`);

console.log("Categories:");
for (const c of CATEGORIES) console.log(`  ${c.id.padEnd(16)} ${c.name}`);

if (ready.length) {
  console.log("\nProducts to create:");
  for (const p of ready) {
    const margin = p.cost ? (((p.price - p.cost) / p.price) * 100).toFixed(1) + "%" : "no cost set";
    console.log(
      `  ${p.id}  ${p.name.padEnd(26)} Rs ${String(p.price).padStart(6)}  stock ${p.stock ?? 0}  ${margin}` +
        `${p.isFeatured ? "  [featured]" : ""}${p.isBestSeller ? "  [best seller]" : ""}`
    );
  }
}

if (waiting.length) {
  console.log("\nWaiting on a price (not created):");
  for (const p of waiting) console.log(`  ${p.id}  ${p.name}`);
  console.log("\n  Fill price, cost and stock in the PRODUCTS list at the top of this file.");
}

if (!WRITE) {
  console.log("\nNothing written.");
  process.exit(0);
}

const batch = db.batch();

for (const c of CATEGORIES) {
  batch.set(db.collection("categories").doc(c.id), {
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description,
    image: c.image,
  });
}

const now = new Date().toISOString();
for (const p of ready) {
  const cat = catById.get(p.categoryId);
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
    images: p.images,
    price: p.price,
    stock: p.stock ?? 0,
    lowStockThreshold: p.lowStockThreshold,
    condition: p.condition,
    status: "active",
    isFeatured: p.isFeatured,
    isBestSeller: p.isBestSeller,
    createdAt: now,
  });

  if (typeof p.cost === "number" && p.cost > 0) {
    batch.set(db.collection("productCosts").doc(p.id), {
      cost: p.cost,
      isEstimate: false,
      updatedAt: now,
    });
  }

  if (typeof p.stock === "number" && p.stock > 0) {
    // Stock arrives through a recorded movement, never by being typed
    // into a form - the same rule the opening-stock script follows.
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
}

await batch.commit();
console.log(`\nWrote ${CATEGORIES.length} categories and ${ready.length} product(s).`);
process.exit(0);
