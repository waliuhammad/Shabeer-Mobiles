#!/usr/bin/env node
/**
 * Give a category its picture.
 *
 *   node scripts/set-category-image.mjs <slug> <public-path>
 *   node scripts/set-category-image.mjs airpods /images/categories/airpods.png
 *
 * Category documents have always carried an `image` field. Nothing read
 * it until now, so a picture could be set and never appear - the card
 * drew its icon regardless. CategoryCard reads it, falling back to the
 * icon, so a grid of photographed and un-photographed categories still
 * lines up.
 *
 * Refuses a path whose file is not in public/, because a category
 * pointing at a missing image renders a broken tile - worse than the
 * icon it replaced.
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const [, , slug, publicPath] = process.argv;
if (!slug || !publicPath) {
  console.error("Usage: node scripts/set-category-image.mjs <slug> <public-path>");
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
const snap = await db.collection("categories").where("slug", "==", slug).limit(1).get();

if (snap.empty) {
  console.error(`No category with slug "${slug}".`);
  process.exit(1);
}

const doc = snap.docs[0];
await doc.ref.update({ image: publicPath });
console.log(`${doc.id} (${doc.data().name}) -> ${publicPath}`);

const all = await db.collection("categories").get();
const withImage = all.docs.filter((d) => d.data().image);
console.log(`\n${withImage.length} of ${all.size} categories have a picture:`);
for (const d of all.docs) {
  console.log(`  ${d.data().slug.padEnd(14)} ${d.data().image ?? "(icon)"}`);
}
process.exit(0);
