#!/usr/bin/env node
/**
 * Add the five accessories the shop photographed.
 *
 *   node scripts/add-accessory-products.mjs          # dry run
 *   node scripts/add-accessory-products.mjs --write  # apply
 *
 * PRICES ARE MINE, at the shop's standing instruction to set them.
 * They are placed for a Multan counter and sit at roughly the 25%
 * margin the rest of the catalogue runs at, rather than at import
 * prices. A price has nowhere in the data to record that it was
 * estimated - the customer simply reads it as the price - so these
 * want confirming before anyone trades on them. Costs DO carry an
 * estimate flag and are marked accordingly, so Profit & Loss keeps
 * saying so until the shop replaces them.
 *
 * DESCRIPTIONS SAY ONLY WHAT THE PHOTOGRAPH SHOWS. No wattage on the
 * SUPERVOOC charger, no cable length, no claimed transfer speed: none
 * of that is visible, and a specification invented here would read as
 * authoritative on a real shop's website. The existing Type-C cable
 * listing already claims a "braided nylon jacket" for a cable whose
 * photograph shows smooth rubber, which is the mistake this avoids.
 */

import { readFileSync, existsSync } from "node:fs";
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const WRITE = process.argv.includes("--write");

const PRODUCTS = [
  {
    id: "p-018",
    name: "Foldable Phone Stand",
    slug: "foldable-phone-stand",
    brand: "Generic",
    sku: "GEN-STD-FLD",
    categoryId: "cat-accessories",
    description:
      "Folding desk stand with a textured cradle and a weighted base. The arm and the cradle both hinge, so the height and the angle set independently, and it folds flat to pocket size.",
    features: [
      "Height and angle both adjustable",
      "Folds flat to carry",
      "Textured pad so the phone does not slide",
      "Weighted base",
    ],
    price: 899,
    cost: 670,
    stock: 8,
    lowStockThreshold: 3,
  },
  {
    id: "p-019",
    name: "Braided Fast Charging Cable",
    slug: "braided-fast-charging-cable",
    brand: "Generic",
    sku: "GEN-CBL-BRD",
    categoryId: "cat-accessories",
    description:
      "USB-A to Type-C cable in a braided jacket, which resists the kinking and splitting that kills a plain rubber cable at the plug. Supports fast charging.",
    features: [
      "USB-A to Type-C",
      "Braided jacket",
      "Fast charging",
      "Reinforced at both plugs",
    ],
    price: 599,
    cost: 450,
    stock: 12,
    lowStockThreshold: 4,
  },
  {
    id: "p-020",
    name: "SUPERVOOC Charger with Type-C Cable",
    slug: "supervooc-charger-cable",
    brand: "SUPERVOOC",
    sku: "SVC-CHG-SET",
    categoryId: "cat-chargers",
    /* No wattage claimed. The photograph does not show one, and the
       number is the entire reason someone buys one charger over
       another - it is not a detail to guess at. Fill it in from the
       box and this description can say it. */
    description:
      "SUPERVOOC wall charger supplied with its own Type-C cable. Two-pin plug for Pakistani sockets.",
    features: [
      "Includes the matching Type-C cable",
      "Two-pin plug",
      "Compact body",
    ],
    price: 2499,
    cost: 1900,
    stock: 6,
    lowStockThreshold: 3,
  },
  {
    id: "p-021",
    name: "USB-C OTG Adapter with PD",
    slug: "usb-c-otg-adapter",
    brand: "Generic",
    sku: "GEN-OTG-PD",
    categoryId: "cat-accessories",
    description:
      "Plugs into a phone's Type-C port and gives you two: a full-size USB socket for a flash drive, keyboard or mouse, and a Type-C socket that still takes a charger. Braided lead, metal housings.",
    features: [
      "USB-A socket for drives, keyboards and mice",
      "Type-C socket marked PD, so it charges while in use",
      "Braided lead",
      "Metal housings",
    ],
    price: 749,
    cost: 560,
    stock: 8,
    lowStockThreshold: 3,
  },
  {
    id: "p-022",
    name: "Phone Grip & Stand Ring",
    slug: "phone-grip-ring",
    brand: "Generic",
    sku: "GEN-GRP-RNG",
    categoryId: "cat-accessories",
    description:
      "A flat ring grip that sticks to the back of the phone. Slip two fingers through it to hold the phone one-handed, or fold it out and it props the phone up on a desk.",
    features: [
      "One-handed grip",
      "Folds out into a stand",
      "Sits flat when not in use",
      "Adhesive backing",
    ],
    price: 499,
    cost: 370,
    stock: 15,
    lowStockThreshold: 5,
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

/* Every referenced category must exist, or a product lands in one
   that does not and is unreachable from the shop's own navigation. */
const catSnap = await db.collection("categories").get();
const cats = new Map(catSnap.docs.map((d) => [d.id, d.data()]));
const missingCat = PRODUCTS.filter((p) => !cats.has(p.categoryId));
if (missingCat.length) {
  console.error("Missing categories:");
  for (const p of missingCat) console.error(`  ${p.id} wants ${p.categoryId}`);
  process.exit(1);
}

/* An image path that points at nothing renders the placeholder tile,
   which looks like an oversight rather than a broken link. */
const missingImg = PRODUCTS.filter(
  (p) => !existsSync(`public/images/products/${p.slug}.png`)
);
if (missingImg.length) {
  console.error("\nMissing images - run scripts/prepare-product-image.mjs first:");
  for (const p of missingImg) console.error(`  public/images/products/${p.slug}.png`);
  process.exit(1);
}

/* Never silently overwrite. These IDs and slugs are meant to be new. */
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
console.log("Costs are written with isEstimate: true, so P&L will keep flagging them.");

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

  /* Stock arrives through a recorded movement, never by being typed
     into a form - the same rule the rest of the catalogue follows, so
     the ledger and the product agree from the first day. */
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
