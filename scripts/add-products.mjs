#!/usr/bin/env node
/**
 * Add the remaining products the shop asked for.
 *
 *   node scripts/add-products.mjs          # dry run
 *   node scripts/add-products.mjs --write  # apply
 *
 * IMAGES ARE LEFT EMPTY ON PURPOSE. The photos for these had not
 * reached the machine when they were created, and an image path that
 * points at nothing renders a broken tile, which is worse than the
 * branded "Image coming soon" placeholder the storefront already has
 * for exactly this state. Drop the files in, run
 * scripts/prepare-product-image.mjs with the matching slug, and the
 * placeholder is replaced with no further change.
 *
 * PRICES ARE MINE, at the shop's instruction. They are placed for a
 * Multan counter and sit sensibly beside the existing catalogue rather
 * than at import prices. A price has nowhere in the data to record
 * that it was estimated - the customer simply reads it as the price -
 * so these want confirming before anyone acts on them. Costs DO carry
 * an estimate flag, and are marked accordingly.
 */

import { readFileSync } from "node:fs";
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const WRITE = process.argv.includes("--write");

const PRODUCTS = [
  {
    id: "p-014",
    name: "USB Flash Drive 32GB",
    slug: "usb-flash-drive",
    brand: "Generic",
    sku: "GEN-USB-32G",
    categoryId: "cat-accessories",
    description:
      "Swivel-body USB flash drive with a metal casing and no cap to lose. Handy for moving photos and files off a phone or laptop.",
    features: [
      "32GB storage",
      "Swivel metal body, no cap",
      "USB-A, works with any computer",
      "Keyring loop",
    ],
    price: 1299,
    cost: 950,
    stock: 10,
    lowStockThreshold: 4,
  },
  {
    id: "p-015",
    name: "HP Wired Keyboard",
    slug: "hp-wired-keyboard",
    brand: "HP",
    sku: "HP-KBD-USB",
    categoryId: "cat-accessories",
    description:
      "Full-size wired USB keyboard with a number pad. Plug it in and it works - no drivers, no pairing, no batteries.",
    features: [
      "Full size with number pad",
      "Wired USB, no batteries",
      "Spill-resistant body",
      "Works with any computer",
    ],
    price: 1999,
    cost: 1550,
    stock: 6,
    lowStockThreshold: 3,
  },
  {
    id: "p-016",
    name: "Wireless Mouse",
    slug: "wireless-mouse",
    brand: "Generic",
    sku: "GEN-MSE-WL",
    categoryId: "cat-accessories",
    description:
      "Wireless optical mouse with a USB receiver and a silent scroll wheel. Runs for months on one battery.",
    features: [
      "2.4GHz wireless with USB receiver",
      "Adjustable tracking speed",
      "Silent scroll wheel",
      "Contoured for right-hand use",
    ],
    price: 1199,
    cost: 900,
    stock: 8,
    lowStockThreshold: 3,
  },
  {
    id: "p-017",
    name: "Smart Watch",
    slug: "smart-watch",
    brand: "Generic",
    sku: "GEN-WCH-BT",
    categoryId: "cat-watches",
    description:
      "Bluetooth smartwatch with a square colour display, call notifications and step, heart-rate and distance tracking. Silicone strap.",
    features: [
      "Square colour touch display",
      "Steps, heart rate and distance",
      "Call and message notifications",
      "Soft silicone strap",
    ],
    price: 3499,
    cost: 2650,
    stock: 6,
    lowStockThreshold: 3,
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

/* Categories must exist, or a product lands in one that does not. */
const catSnap = await db.collection("categories").get();
const cats = new Map(catSnap.docs.map((d) => [d.id, d.data()]));

const missing = PRODUCTS.filter((p) => !cats.has(p.categoryId));
if (missing.length) {
  console.error("Missing categories:");
  for (const p of missing) console.error(`  ${p.id} wants ${p.categoryId}`);
  process.exit(1);
}

console.log(`Mode: ${WRITE ? "WRITE" : "DRY RUN (pass --write to apply)"}\n`);
console.log(`${"ID".padEnd(7)} ${"PRICE".padStart(8)} ${"COST".padStart(7)} ${"MARGIN".padStart(7)} ${"STOCK".padStart(6)}  CATEGORY        NAME`);
for (const p of PRODUCTS) {
  const margin = (((p.price - p.cost) / p.price) * 100).toFixed(0) + "%";
  console.log(
    `${p.id.padEnd(7)} ${String(p.price).padStart(8)} ${String(p.cost).padStart(7)} ${margin.padStart(7)} ` +
      `${String(p.stock).padStart(6)}  ${cats.get(p.categoryId).name.padEnd(15)} ${p.name}`
  );
}
console.log("\nImages: none yet - each shows the placeholder tile until a photo is added.");

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
    images: [],
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
