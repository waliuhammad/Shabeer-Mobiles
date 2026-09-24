#!/usr/bin/env node
/**
 * Does /shop still honour ?category= and ?q= after hydration?
 *
 *   node scripts/verify-shop-filters.mjs http://localhost:3131
 *
 * WHY A BROWSER
 * -------------
 * The query string used to be read on the server, which made the page
 * uncacheable. It is now read in the browser, so the filtered result
 * only exists AFTER hydration - curl sees the full catalogue by design.
 * Checking this with curl would either look like a pass (the HTML has
 * products) or a fail (it has all of them); neither answers the
 * question. Only a real browser does.
 */

import { spawn } from "node:child_process";
import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const BASE = process.argv[2] ?? "http://localhost:3131";

const CHROME = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
].find((p) => existsSync(p));
if (!CHROME) {
  console.error("No Chrome or Edge found.");
  process.exit(1);
}

const profile = mkdtempSync(join(tmpdir(), "verify-shop-"));
const PORT = 9334;
const chrome = spawn(
  CHROME,
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

async function wsUrl() {
  for (let i = 0; i < 50; i++) {
    try {
      const tabs = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      const page = tabs.find((t) => t.type === "page");
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch {
      /* not up yet */
    }
    await sleep(200);
  }
  throw new Error("Chrome did not start.");
}

let id = 1;
function connect(ws) {
  const pending = new Map();
  ws.addEventListener("message", (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) {
      const { resolve, reject } = pending.get(m.id);
      pending.delete(m.id);
      m.error ? reject(new Error(m.error.message)) : resolve(m.result);
    }
  });
  return (method, params = {}) =>
    new Promise((resolve, reject) => {
      const n = id++;
      pending.set(n, { resolve, reject });
      ws.send(JSON.stringify({ id: n, method, params }));
    });
}

async function evaluate(send, expression) {
  const r = await send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description);
  return r.result.value;
}

/** Product slugs currently on screen. */
const SLUGS = `JSON.stringify([...new Set([...document.querySelectorAll('a[href^="/product/"]')]
  .map(a => a.getAttribute('href').replace('/product/','')))])`;

/** Wait until the visible set stops changing, i.e. hydration has settled. */
async function settled(send) {
  let last = null;
  let since = Date.now();
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    const now = await evaluate(send, SLUGS);
    if (now !== last) {
      last = now;
      since = Date.now();
    } else if (Date.now() - since >= 1200) {
      return JSON.parse(last);
    }
    await sleep(200);
  }
  return JSON.parse(last ?? "[]");
}

const CASES = [
  { path: "/shop", expect: (s) => s.length === 11, describe: "all 11 products" },
  {
    path: "/shop?category=chargers",
    expect: (s) =>
      s.length > 0 && s.every((x) => x.includes("charger")),
    describe: "only chargers",
  },
  {
    path: "/shop?q=cover",
    expect: (s) => s.length > 0 && s.every((x) => x.includes("cover")),
    describe: "only items matching 'cover'",
  },
];

let failed = false;

try {
  const ws = new WebSocket(await wsUrl());
  await new Promise((r) => ws.addEventListener("open", r, { once: true }));
  const send = connect(ws);
  await send("Page.enable");
  await send("Runtime.enable");

  for (const c of CASES) {
    await send("Page.navigate", { url: `${BASE}${c.path}` });
    await sleep(600);
    const slugs = await settled(send);
    const ok = c.expect(slugs);
    if (!ok) failed = true;
    console.log(`${ok ? "PASS" : "FAIL"}  ${c.path}`);
    console.log(`      expected ${c.describe}, got ${slugs.length}: ${slugs.join(", ") || "(none)"}`);
  }
} catch (err) {
  failed = true;
  console.error("FAIL -", err.message);
} finally {
  chrome.kill();
}

console.log(failed ? "\nSome filters are broken." : "\nAll filters work after hydration.");
process.exit(failed ? 1 : 0);
