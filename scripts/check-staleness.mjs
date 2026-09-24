#!/usr/bin/env node
/**
 * Does the public site reflect a Firestore change without a redeploy?
 *
 *   node scripts/check-staleness.mjs https://shabeer-mobiles.vercel.app
 *
 * WHY THIS QUESTION MATTERS
 * -------------------------
 * The build marks "/" and every product page as prerendered. If no
 * revalidation is configured, those pages are frozen at deploy time -
 * the owner changes a price in the admin panel and the shop's own
 * website keeps advertising the old one until somebody redeploys.
 *
 * That is not a performance question, it is a correctness one, so it is
 * worth measuring rather than reasoning about.
 *
 * WHAT IT TOUCHES: one product's DESCRIPTION, which is display text
 * only - no price, no stock, nothing the POS or the ledger reads. The
 * original is restored on every exit path, including failure.
 */

import { readFileSync } from "node:fs";
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const BASE = process.argv[2] ?? "https://shabeer-mobiles.vercel.app";
const PRODUCT_ID = "p-009"; // Power Bank 20,000 mAh
const SLUG = "power-bank-20000-mah";

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

const marker = `FRESHNESS-PROBE-${Date.now()}`;
const ref = db.collection("products").doc(PRODUCT_ID);
const snap = await ref.get();
const original = snap.data().description;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function pageHasMarker(path) {
  const res = await fetch(`${BASE}${path}`, { cache: "no-store" });
  const html = await res.text();
  return html.includes(marker);
}

try {
  console.log(`Writing a marker into ${PRODUCT_ID} description...`);
  await ref.update({ description: `${original} ${marker}` });

  // Long enough that any sane revalidation window would have elapsed.
  const WAIT_SECONDS = 90;
  console.log(`Polling ${BASE}/product/${SLUG} for up to ${WAIT_SECONDS}s\n`);

  let seen = false;
  for (let t = 0; t < WAIT_SECONDS; t += 15) {
    const onProduct = await pageHasMarker(`/product/${SLUG}`);
    console.log(`  +${t}s  product page shows the change: ${onProduct ? "YES" : "no"}`);
    if (onProduct) {
      seen = true;
      break;
    }
    await sleep(15000);
  }

  console.log("");
  if (seen) {
    console.log("FRESH - the public site picks up Firestore changes on its own.");
  } else {
    console.log(`STALE - after ${WAIT_SECONDS}s the public site still shows the old text.`);
    console.log("The page is frozen at build time; only a redeploy would update it.");
  }
} finally {
  await ref.update({ description: original });
  console.log(`\ncleanup: ${PRODUCT_ID} description restored.`);
}

process.exit(0);
