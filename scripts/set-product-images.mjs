#!/usr/bin/env node
/**
 * Point every product at its illustration.
 *
 *   node scripts/set-product-images.mjs          # dry run
 *   node scripts/set-product-images.mjs --write  # apply
 *
 * Run scripts/generate-product-images.mjs first - this only ever sets a
 * path whose file actually exists on disk, so a missing drawing is
 * skipped rather than written as a broken link.
 *
 * SAFE TO RE-RUN, and safe once real photographs arrive: it refuses to
 * touch a product that already has an image. Photograph the shelf,
 * upload, and this script will leave that product alone.
 */

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const HERE = dirname(fileURLToPath(import.meta.url));
const IMAGE_DIR = join(HERE, "..", "public", "images", "products");
const WRITE = process.argv.includes("--write");

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
if (snap.empty) {
  console.error("No products in Firestore.");
  process.exit(1);
}

const plan = [];
const skipped = [];

for (const doc of snap.docs) {
  const p = doc.data();
  const existing = Array.isArray(p.images) ? p.images.filter(Boolean) : [];

  if (existing.length > 0) {
    // Never overwrite a real photograph with a drawing.
    skipped.push(`${doc.id} ${p.name} - already has an image`);
    continue;
  }

  const file = `${p.slug}.png`;
  if (!existsSync(join(IMAGE_DIR, file))) {
    skipped.push(`${doc.id} ${p.name} - no drawing at public/images/products/${file}`);
    continue;
  }

  plan.push({ id: doc.id, name: p.name, path: `/images/products/${file}` });
}

console.log(`Mode: ${WRITE ? "WRITE" : "DRY RUN (pass --write to apply)"}\n`);
for (const row of plan) console.log(`  ${row.id}  ${row.path}`);
for (const s of skipped) console.log(`  SKIP  ${s}`);

if (plan.length === 0) {
  console.log("\nNothing to do.");
  process.exit(0);
}

console.log(`\n${plan.length} products would get an image.`);

if (!WRITE) {
  console.log("Nothing written. Re-run with --write to apply.");
  process.exit(0);
}

const batch = db.batch();
for (const row of plan) {
  batch.update(db.collection("products").doc(row.id), { images: [row.path] });
}
await batch.commit();

console.log(`\nWrote ${plan.length} image paths.`);
process.exit(0);
