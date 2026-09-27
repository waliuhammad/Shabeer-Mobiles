#!/usr/bin/env node
/**
 * Give one product its picture.
 *
 *   node scripts/set-product-image.mjs <slug> <public-path>
 *   node scripts/set-product-image.mjs fast-charger-33w /images/products/fast-charger-33w.png
 *
 * The SIBLING of set-product-images.mjs (plural), and deliberately not
 * the same thing. That one fills in whatever is missing across the
 * whole catalogue and REFUSES to touch a product that already has an
 * image, so real photographs are never overwritten by generated ones.
 * This one replaces a single named product's picture, which is the
 * case that rule exists to prevent by accident and the shop asks for
 * on purpose.
 *
 * REFUSES A PATH WHOSE FILE IS NOT IN public/. A product pointing at a
 * missing image renders the "Image coming soon" placeholder, which
 * looks like an oversight rather than a broken link and so goes
 * unnoticed.
 *
 * PREFER A NEW FILENAME over overwriting the old file. Next.js and
 * Vercel cache an optimised image against its URL, never its bytes, so
 * replacing products/x.png in place serves the PREVIOUS picture - it
 * happened with the hero and took a screenshot to notice. Passing a
 * path that differs from the current one makes that impossible, and
 * this script prints the old path so the superseded file can be
 * deleted once the new one is live.
 *
 * On Git Bash, prefix with MSYS_NO_PATHCONV=1 or the leading slash is
 * rewritten into a Windows path before Node ever sees it.
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const [, , slug, publicPath] = process.argv;
if (!slug || !publicPath) {
  console.error("Usage: node scripts/set-product-image.mjs <slug> <public-path>");
  process.exit(1);
}

const onDisk = join("public", publicPath.replace(/^\//, ""));
if (!existsSync(onDisk)) {
  console.error(`No such file: ${onDisk}`);
  process.exit(1);
}

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
const snap = await db.collection("products").where("slug", "==", slug).limit(1).get();

if (snap.empty) {
  console.error(`No product with slug "${slug}".`);
  process.exit(1);
}

const doc = snap.docs[0];
const before = doc.data().images ?? [];

/* Only the FIRST image is replaced; any others a product carries are
   kept. The card and the gallery both lead with images[0]. */
const after = [publicPath, ...before.slice(1)];
await doc.ref.update({ images: after });

console.log(`${doc.id} (${doc.data().name})`);
console.log(`  was: ${before[0] ?? "(none)"}`);
console.log(`  now: ${publicPath}`);
if (before[0] && before[0] !== publicPath) {
  console.log(`\n  Once the new one is live, delete public${before[0]}`);
}
process.exit(0);
