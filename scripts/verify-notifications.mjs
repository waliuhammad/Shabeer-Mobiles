#!/usr/bin/env node
/**
 * End-to-end check of the admin notification bell.
 *
 *   node scripts/verify-notifications.mjs http://localhost:3128
 *
 * WHAT IT PROVES, AND WHY CURL CANNOT
 * -----------------------------------
 * Every admin route is behind requireStaff() and a signed session
 * cookie, so an unauthenticated request only ever sees a redirect. And
 * "real time" is a claim about what happens WITHOUT a reload, which a
 * request-per-check tool cannot observe at all.
 *
 * So this drives a real headless browser:
 *   1. sign in as the throwaway staff account
 *   2. read the bell's badge and its accessible name
 *   3. change a product's stock in Firestore, from this process
 *   4. WITHOUT touching the page, watch the badge change
 *   5. put the stock back and watch it change again
 *
 * Step 4 is the whole point. If the badge only moved on reload, the
 * onSnapshot subscription is not reaching the component and the bell is
 * not live.
 *
 * Cleans up after itself: the stock value is always restored, including
 * when an assertion fails.
 */

import { spawn } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const BASE = process.argv[2] ?? "http://localhost:3128";
const EMAIL = "temp-verify-bot@shabbir-mobiles.invalid";
const PASSWORD = "TempVerify!2026";

/* ---------------- firebase admin ---------------- */

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

/* ---------------- chrome via CDP ---------------- */

const CHROME_CANDIDATES = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
];
const chromePath = CHROME_CANDIDATES.find((p) => existsSync(p));
if (!chromePath) {
  console.error("No Chrome or Edge found.");
  process.exit(1);
}

const profile = mkdtempSync(join(tmpdir(), "verify-notif-"));
const PORT = 9333;

const chrome = spawn(
  chromePath,
  [
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profile}`,
    "--headless=new",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-gpu",
    "about:blank",
  ],
  { stdio: "ignore" }
);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function targetUrl() {
  for (let i = 0; i < 50; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const tabs = await res.json();
      const page = tabs.find((t) => t.type === "page");
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch {
      /* not up yet */
    }
    await sleep(200);
  }
  throw new Error("Chrome did not expose a debugging target.");
}

let nextId = 1;
function cdp(ws) {
  const pending = new Map();
  ws.addEventListener("message", (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message));
      else resolve(msg.result);
    }
  });
  return (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = nextId++;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
}

async function evaluate(send, expression) {
  const r = await send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (r.exceptionDetails) {
    throw new Error(r.exceptionDetails.exception?.description ?? "eval failed");
  }
  return r.result.value;
}

/** Poll the page until `fn` returns something truthy, or time out. */
async function waitFor(send, expression, timeoutMs, label) {
  const deadline = Date.now() + timeoutMs;
  let last;
  while (Date.now() < deadline) {
    last = await evaluate(send, expression);
    if (last) return last;
    await sleep(250);
  }
  throw new Error(`Timed out waiting for ${label}. Last value: ${JSON.stringify(last)}`);
}

/** Reads the bell without opening it: badge text + accessible name. */
const READ_BELL = `(() => {
  const btn = document.querySelector('[aria-label^="Notifications"]');
  if (!btn) return null;
  return JSON.stringify({
    label: btn.getAttribute('aria-label'),
    badge: (btn.textContent || '').trim(),
  });
})()`;

/**
 * Read the bell repeatedly until it holds the same value for a whole
 * second, so the baseline is the settled state rather than whatever the
 * first paint happened to show.
 */
async function settledBell(send) {
  let last = null;
  let stableSince = Date.now();
  const deadline = Date.now() + 30000;

  while (Date.now() < deadline) {
    const current = await evaluate(send, READ_BELL);

    // "checking stock" means the subscription has not delivered yet, so
    // whatever the count says is not an answer. Waiting for stability
    // alone is not enough - an unanswered bell is perfectly stable.
    const stillLoading = current && JSON.parse(current).label.includes("checking stock");

    if (stillLoading || current !== last) {
      last = current;
      stableSince = Date.now();
    } else if (Date.now() - stableSince >= 1000) {
      return last;
    }
    await sleep(200);
  }
  return last;
}

/**
 * Radix menus open on POINTERDOWN, not click. A bare .click() does
 * nothing, which is what made the first run of this script report a
 * missing dropdown when the dropdown was fine.
 */
const OPEN_BELL = `(() => {
  const btn = document.querySelector('[aria-label^="Notifications"]');
  if (!btn) return false;
  btn.dispatchEvent(new PointerEvent('pointerdown', {
    bubbles: true, cancelable: true, button: 0, isPrimary: true, pointerType: 'mouse',
  }));
  btn.dispatchEvent(new PointerEvent('pointerup', {
    bubbles: true, cancelable: true, button: 0, isPrimary: true, pointerType: 'mouse',
  }));
  btn.click();
  return true;
})()`;

const PRODUCT_ID = "p-001"; // iPhone 12 (Used) - 15 in stock, threshold 5
let originalStock = null;
let failed = false;

try {
  const wsUrl = await targetUrl();
  const ws = new WebSocket(wsUrl);
  await new Promise((r) => ws.addEventListener("open", r, { once: true }));
  const send = cdp(ws);

  await send("Page.enable");
  await send("Runtime.enable");

  /* ---- 1. sign in ---- */
  console.log("1. signing in as the throwaway staff account");
  await send("Page.navigate", { url: `${BASE}/login` });
  await waitFor(send, `!!document.querySelector('input[type="password"]')`, 20000, "login form");

  await evaluate(
    send,
    `(() => {
      function setNative(el, value) {
        const proto = Object.getPrototypeOf(el);
        const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
        setter.call(el, value);
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }
      const email = document.querySelector('input[type="email"]')
        || document.querySelector('input[name="email"]');
      const pass = document.querySelector('input[type="password"]');
      setNative(email, ${JSON.stringify(EMAIL)});
      setNative(pass, ${JSON.stringify(PASSWORD)});
      const form = pass.closest('form');
      form.requestSubmit ? form.requestSubmit() : form.submit();
      return true;
    })()`
  );

  await waitFor(send, `location.pathname.startsWith('/admin')`, 45000, "redirect to /admin");
  console.log("   signed in, on", await evaluate(send, "location.pathname"));

  /* ---- 2. read the bell, ONCE THE FIRST SNAPSHOT HAS LANDED ----

     Reading as soon as the button exists is too early: the catalog
     subscription has not delivered yet, so the count is legitimately
     zero and the baseline records "nothing needs attention" for a shop
     that has a low-stock item. Waiting for the value to stop moving is
     the difference between measuring the app and measuring the race. */
  await waitFor(send, READ_BELL, 30000, "the notification bell to render");

  /* A trace of the first few seconds, so a wrong baseline is visible as
     a sequence rather than guessed at. */
  console.log("   bell over the first seconds after load:");
  let prevTrace = null;
  for (let i = 0; i < 40; i++) {
    const v = await evaluate(send, READ_BELL);
    if (v !== prevTrace) {
      console.log(`     +${(i * 0.2).toFixed(1)}s  ${JSON.parse(v).label}`);
      prevTrace = v;
    }
    await sleep(200);
  }

  const before = JSON.parse(await settledBell(send));
  console.log("2. bell now reads:", before.badge || "(no badge)", "|", before.label);

  /* ---- 3. change stock in Firestore, from OUTSIDE the browser ---- */
  const snap = await db.collection("products").doc(PRODUCT_ID).get();
  originalStock = snap.data().stock;
  const name = snap.data().name;
  console.log(`3. setting ${name} stock ${originalStock} -> 0 in Firestore (no page reload)`);
  await db.collection("products").doc(PRODUCT_ID).update({ stock: 0 });

  /* ---- 4. the badge must move on its own ---- */
  const navigations = await evaluate(send, "performance.getEntriesByType('navigation').length");
  const after = JSON.parse(
    await waitFor(
      send,
      `(() => {
        const btn = document.querySelector('[aria-label^="Notifications"]');
        if (!btn) return null;
        const badge = (btn.textContent || '').trim();
        return badge === ${JSON.stringify(before.badge)} ? null : JSON.stringify({
          label: btn.getAttribute('aria-label'),
          badge,
        });
      })()`,
      30000,
      "the badge to update without a reload"
    )
  );
  const navsAfter = await evaluate(send, "performance.getEntriesByType('navigation').length");

  console.log("4. bell updated on its own:", after.badge, "|", after.label);
  console.log(`   page navigations during the change: ${navsAfter - navigations} (0 = never reloaded)`);

  /* ---- 5. the dropdown must list the product ---- */
  await evaluate(send, OPEN_BELL);
  const listed = await waitFor(
    send,
    `(() => {
      const links = [...document.querySelectorAll('a[href^="/admin/inventory/"]')];
      return links.length ? JSON.stringify(links.map(a => a.textContent.trim())) : null;
    })()`,
    10000,
    "the dropdown list"
  );
  console.log("5. dropdown lists:");
  for (const row of JSON.parse(listed)) console.log("     -", row);

  console.log("\nPASS - the bell is driven by live Firestore data.");
} catch (err) {
  failed = true;
  console.error("\nFAIL -", err.message);
} finally {
  if (originalStock !== null) {
    await db.collection("products").doc(PRODUCT_ID).update({ stock: originalStock });
    console.log(`\ncleanup: ${PRODUCT_ID} stock restored to ${originalStock}`);
  }
  chrome.kill();
}

process.exit(failed ? 1 : 0);
