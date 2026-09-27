#!/usr/bin/env node
/**
 * Set the Best Sellers row to an exact list of products.
 *
 *   node scripts/set-best-sellers.mjs                     # dry run
 *   node scripts/set-best-sellers.mjs --write             # apply
 *
 * SETS, not adds, and that is the whole point.
 *
 * The homepage calls getBestSellers(4), which filters the active
 * catalogue on isBestSeller and takes the FIRST FOUR in document-ID
 * order - there is no ordering field and no "position". So flagging a
 * fifth product does not lengthen the row; it just loses a race
 * against the lower IDs, and the product that was asked for silently
 * fails to appear. Anyone adding one has to decide what comes out.
 *
 * Naming the whole row makes that decision explicit and visible in the
 * dry run: the script prints what gains the flag, what loses it, and
 * what the row will actually render, in the order it will render.
 *
 * The admin panel can do the same thing one checkbox at a time, under
 * Products, and is the right tool for a single change. This exists for
 * setting the row as a set, and for leaving a record of why it holds
 * the products it does.
 */

import { readFileSync } from "node:fs";
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const WRITE = process.argv.includes("--write");

/**
 * The row, in the shop's words: earbuds, headphones, handsfree,
 * charger.
 *
 * The charger is the SAMSUNG one rather than the 33W - it is the card
 * the shop had just supplied a photograph for when they asked.
 */
const ROW = [
  "airpods-pro-2nd-gen",
  "jbl-wireless-headphones",
  "wired-handsfree",
  "samsung-original-charger-25w",
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
const snap = await db.collection("products").get();
const bySlug = new Map(snap.docs.map((d) => [d.data().slug, d]));

/* A slug that matches nothing would quietly shorten the row. */
const missing = ROW.filter((s) => !bySlug.has(s));
if (missing.length) {
  console.error(`No product with slug: ${missing.join(", ")}`);
  process.exit(1);
}

/* An archived product is filtered out downstream, so it would be
   flagged and still never render. */
const archived = ROW.filter((s) => bySlug.get(s).data().status !== "active");
if (archived.length) {
  console.error(`Not active, so it would never show: ${archived.join(", ")}`);
  process.exit(1);
}

const wanted = new Set(ROW);
const gaining = [];
const losing = [];

for (const doc of snap.docs) {
  const p = doc.data();
  const should = wanted.has(p.slug);
  if (should && !p.isBestSeller) gaining.push(doc);
  if (!should && p.isBestSeller) losing.push(doc);
}

console.log(`Mode: ${WRITE ? "WRITE" : "DRY RUN (pass --write to apply)"}\n`);

console.log("Gaining the flag:");
for (const d of gaining) console.log(`  + ${d.id}  ${d.data().name}`);
if (!gaining.length) console.log("  (none)");

console.log("\nLosing it:");
for (const d of losing) console.log(`  - ${d.id}  ${d.data().name}`);
if (!losing.length) console.log("  (none)");

/* What the page will actually render: active, flagged, first four by
   document ID - exactly what getBestSellers(4) does. */
const rendered = snap.docs
  .filter((d) => d.data().status === "active" && wanted.has(d.data().slug))
  .sort((a, b) => (a.id < b.id ? -1 : 1))
  .slice(0, 4);

console.log("\nThe row will render, in this order:");
for (const d of rendered) {
  const p = d.data();
  console.log(`  ${d.id}  ${String(p.categoryName).padEnd(18)} ${p.name}`);
}
if (rendered.length < ROW.length) {
  console.log(`\n  warning: ${ROW.length} named but only 4 slots - the rest never show.`);
}

/* Featured is a separate row on the same page, and a product may carry
   both flags. Say so rather than leaving it to be noticed in a
   screenshot. */
const alsoFeatured = rendered.filter((d) => d.data().isFeatured);
if (alsoFeatured.length) {
  console.log("\nAlso in the Featured row directly above:");
  for (const d of alsoFeatured) console.log(`  ${d.id}  ${d.data().name}`);
}

if (!WRITE) {
  console.log("\nNothing written.");
  process.exit(0);
}

const batch = db.batch();
for (const d of gaining) batch.update(d.ref, { isBestSeller: true });
for (const d of losing) batch.update(d.ref, { isBestSeller: false });
await batch.commit();

console.log(`\nWrote ${gaining.length + losing.length} change(s).`);
process.exit(0);
