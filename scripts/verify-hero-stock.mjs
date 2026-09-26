#!/usr/bin/env node
/**
 * Does the hero's stock figure update without a page reload?
 *
 *   node scripts/verify-hero-stock.mjs http://localhost:3190
 *
 * Checks three things that are easy to confuse:
 *   1. the number is in the SERVER-RENDERED HTML (crawlers, no-JS)
 *   2. it matches what Firestore actually holds
 *   3. changing stock in Firestore moves it WITHOUT a navigation
 *
 * It also checks the "Same Day / Repair service" badge is gone.
 *
 * Restores the stock value on every exit path.
 */

import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const BASE = process.argv[2] ?? "http://localhost:3190";

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

/** What the hero should be showing: active products, positive stock. */
async function trueTotal() {
  const snap = await db.collection("products").where("status", "==", "active").get();
  let total = 0;
  for (const d of snap.docs) {
    const s = d.data().stock;
    if (typeof s === "number" && s > 0) total += s;
  }
  return total;
}

const CHROME = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
].find((p) => existsSync(p));
if (!CHROME) {
  console.error("No Chrome or Edge found.");
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PRODUCT_ID = "p-007"; // Tempered glass: 100 units, a visible change
let original = null;
let failed = false;

const profile = mkdtempSync(join(tmpdir(), "verify-hero-"));
const PORT = 9343;
const chrome = spawn(
  CHROME,
  [
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profile}`,
    "--headless=new",
    "--no-first-run",
    "--disable-gpu",
    "about:blank",
  ],
  { stdio: "ignore" }
);

async function wsUrl() {
  for (let i = 0; i < 50; i++) {
    try {
      const tabs = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      const p = tabs.find((t) => t.type === "page");
      if (p?.webSocketDebuggerUrl) return p.webSocketDebuggerUrl;
    } catch {
      /* not up yet */
    }
    await sleep(200);
  }
  throw new Error("Chrome did not start.");
}

try {
  const expected = await trueTotal();
  console.log(`Firestore says ${expected} units in stock across active products.`);

  /* ---- 1. the server-rendered HTML ---- */
  const html = await fetch(BASE, { cache: "no-store" }).then((r) => r.text());
  const formatted = expected.toLocaleString("en-GB");
  const inHtml = html.includes(`>${formatted}<`) || html.includes(formatted);
  console.log(`1. server HTML contains "${formatted}": ${inHtml ? "yes" : "NO"}`);
  if (!inHtml) failed = true;

  const badgeGone = !html.includes("Repair service") && !html.includes("Same Day");
  console.log(`2. "Same Day / Repair service" badge removed: ${badgeGone ? "yes" : "NO"}`);
  if (!badgeGone) failed = true;

  /* ---- 3. live update, no reload ---- */
  let id = 1;
  const ws = new WebSocket(await wsUrl());
  await new Promise((r) => ws.addEventListener("open", r, { once: true }));
  const pending = new Map();
  ws.addEventListener("message", (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) {
      const { resolve, reject } = pending.get(m.id);
      pending.delete(m.id);
      m.error ? reject(new Error(m.error.message)) : resolve(m.result);
    }
  });
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const n = id++;
      pending.set(n, { resolve, reject });
      ws.send(JSON.stringify({ id: n, method, params }));
    });
  const evaluate = async (expr) => {
    const r = await send("Runtime.evaluate", {
      expression: expr,
      awaitPromise: true,
      returnByValue: true,
    });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description);
    return r.result.value;
  };

  await send("Page.enable");
  await send("Runtime.enable");
  await send("Page.navigate", { url: BASE });

  const READ = `(() => {
    const els = [...document.querySelectorAll('p')];
    const label = els.find(p => (p.textContent || '').trim() === 'Items in stock');
    if (!label) return null;
    const value = label.previousElementSibling;
    return value ? value.textContent.trim() : null;
  })()`;

  const shown = await (async () => {
    const deadline = Date.now() + 25000;
    while (Date.now() < deadline) {
      const v = await evaluate(READ);
      if (v) return v;
      await sleep(250);
    }
    return null;
  })();
  console.log(`3. tile on screen shows: ${shown ?? "NOTHING"}`);
  if (shown !== formatted) failed = true;

  const navsBefore = await evaluate("performance.getEntriesByType('navigation').length");

  const snap = await db.collection("products").doc(PRODUCT_ID).get();
  original = snap.data().stock;
  const changed = original + 50;
  console.log(`4. changing ${PRODUCT_ID} stock ${original} -> ${changed} in Firestore`);
  await db.collection("products").doc(PRODUCT_ID).update({ stock: changed });

  const wantAfter = (expected + 50).toLocaleString("en-GB");
  const updated = await (async () => {
    const deadline = Date.now() + 25000;
    while (Date.now() < deadline) {
      const v = await evaluate(READ);
      if (v === wantAfter) return v;
      await sleep(250);
    }
    return await evaluate(READ);
  })();

  const navsAfter = await evaluate("performance.getEntriesByType('navigation').length");
  console.log(`5. tile now shows: ${updated} (wanted ${wantAfter})`);
  console.log(`   navigations during the change: ${navsAfter - navsBefore} (0 = never reloaded)`);
  if (updated !== wantAfter || navsAfter !== navsBefore) failed = true;

  chrome.kill();
} catch (err) {
  failed = true;
  console.error("\nFAIL -", err.message);
  chrome.kill();
} finally {
  if (original !== null) {
    await db.collection("products").doc(PRODUCT_ID).update({ stock: original });
    console.log(`\ncleanup: ${PRODUCT_ID} stock restored to ${original}`);
  }
}

console.log(failed ? "\nFAIL" : "\nPASS - the hero stock figure is server-rendered and live.");
process.exit(failed ? 1 : 0);
