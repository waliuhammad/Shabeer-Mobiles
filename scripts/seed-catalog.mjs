#!/usr/bin/env node
/**
 * Push the product and category templates into Firestore.
 *
 *   node scripts/seed-catalog.mjs          # dry run - shows what it would write
 *   node scripts/seed-catalog.mjs --write  # actually write
 *
 * WHY A DRY RUN BY DEFAULT
 * ------------------------
 * This writes to a live database with the Admin SDK, which bypasses
 * every Security Rule. A script like that should not do anything on a
 * mistyped command. Run it, read what it says, then run it again with
 * --write.
 *
 * SAFE TO RE-RUN. Documents are written by a known id (p-001, cat-
 * mobiles), so a second run updates rather than duplicating. It will
 * NOT delete anything you have added yourself.
 *
 * WHAT IT DOES NOT SEED: stock, and cost. Stock stays at 0 because a
 * unit only exists once a movement records it arriving - see
 * data/mock-inventory.ts. Cost is entered per product in the admin,
 * because nobody but the shop knows what they actually paid.
 */

import { readFileSync } from "node:fs";
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const WRITE = process.argv.includes("--write");

/** Minimal .env.local reader - this runs outside Next.js. */
function loadEnv() {
  try {
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
  } catch {
    console.error("Could not read .env.local - is it in the project root?");
    process.exit(1);
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

/**
 * The templates are TypeScript, which Node cannot import directly. Rather
 * than add a build step for a one-off script, the arrays are parsed out
 * of the source with a tiny evaluator. Crude, but it keeps
 * data/products.ts as the single place the templates are written.
 */
function loadArrayFromTs(relPath, exportName) {
  const src = readFileSync(new URL(relPath, import.meta.url), "utf8");
  const marker = `export const ${exportName}`;
  const start = src.indexOf(marker);
  if (start === -1) throw new Error(`${exportName} not found in ${relPath}`);
  // Find the "=" first. Searching for "[" directly would match the one
  // in the TYPE annotation ("Product[]") rather than the array literal.
  const eq = src.indexOf("=", start);
  const open = src.indexOf("[", eq);
  // Walk the brackets so a nested array (features, images) does not end it early.
  let depth = 0, end = -1;
  for (let i = open; i < src.length; i++) {
    if (src[i] === "[") depth++;
    else if (src[i] === "]") { depth--; if (depth === 0) { end = i; break; } }
  }
  const literal = src.slice(open, end + 1);
  // The templates are plain object literals - no imports, no expressions.
  return Function(`"use strict"; return (${literal});`)();
}

const products = loadArrayFromTs("../data/products.ts", "products");
const categories = loadArrayFromTs("../data/categories.ts", "categories");

console.log(`Project:    ${projectId}`);
console.log(`Categories: ${categories.length}`);
console.log(`Products:   ${products.length}`);
console.log(`Mode:       ${WRITE ? "WRITE" : "DRY RUN (pass --write to apply)"}`);
console.log("");

for (const c of categories) console.log(`  category  ${c.id.padEnd(18)} ${c.name}`);
for (const p of products) {
  console.log(`  product   ${p.id.padEnd(18)} ${p.name}  (${p.status}, stock ${p.stock})`);
}

if (!WRITE) {
  console.log("\nNothing written. Re-run with --write to apply.");
  process.exit(0);
}

initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
const db = getFirestore();

// A batch so the catalogue arrives all at once rather than half-written
// if the connection drops partway.
const batch = db.batch();
for (const c of categories) batch.set(db.collection("categories").doc(c.id), c, { merge: true });
for (const p of products) {
  // undefined is not a legal Firestore value; originalPrice is optional.
  const doc = Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined));
  batch.set(db.collection("products").doc(p.id), doc, { merge: true });
}

await batch.commit();
console.log(`\nWrote ${categories.length} categories and ${products.length} products.`);
console.log("Stock stays at 0 - add it by receiving a purchase or a stock adjustment.");
console.log("Costs are not seeded - set each product's cost on its admin page.");
process.exit(0);
