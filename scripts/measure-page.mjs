#!/usr/bin/env node
/**
 * What does a page ACTUALLY download?
 *
 *   node scripts/measure-page.mjs http://localhost:3133 / /shop /login
 *
 * WHY NOT grep THE HTML
 * ---------------------
 * Counting `/_next/static/chunks/*.js` strings in the served HTML looks
 * like a measurement and is not one. Next.js prefetches routes the page
 * links to, so the markup mentions chunks belonging to OTHER pages - the
 * sign-in route's Firebase chunk shows up in the home page's HTML
 * because the header links to /login. Three separate "optimisations"
 * measured identical with that method, because it was never measuring
 * this page.
 *
 * This drives a real browser and sums what the network actually
 * transferred, which is the only number a visitor pays.
 */

import { spawn } from "node:child_process";
import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const [, , base, ...paths] = process.argv;
const BASE = base ?? "http://localhost:3133";
const PATHS = paths.length ? paths : ["/"];

const CHROME = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
].find((p) => existsSync(p));
if (!CHROME) {
  console.error("No Chrome or Edge found.");
  process.exit(1);
}

const profile = mkdtempSync(join(tmpdir(), "measure-"));
const PORT = 9335;
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

function human(n) {
  return n >= 1024 ? `${(n / 1024).toFixed(1)} KB` : `${n} B`;
}

try {
  const ws = new WebSocket(await wsUrl());
  await new Promise((r) => ws.addEventListener("open", r, { once: true }));

  let id = 1;
  const pending = new Map();
  /** requestId -> { url, type, bytes } */
  let received = new Map();

  ws.addEventListener("message", (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) {
      const { resolve, reject } = pending.get(m.id);
      pending.delete(m.id);
      m.error ? reject(new Error(m.error.message)) : resolve(m.result);
      return;
    }
    if (m.method === "Network.responseReceived") {
      received.set(m.params.requestId, {
        url: m.params.response.url,
        type: m.params.type,
        bytes: 0,
      });
    }
    if (m.method === "Network.dataReceived") {
      const r = received.get(m.params.requestId);
      // encodedDataLength is what crossed the wire, i.e. after gzip.
      if (r) r.bytes += m.params.encodedDataLength || m.params.dataLength || 0;
    }
  });

  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const n = id++;
      pending.set(n, { resolve, reject });
      ws.send(JSON.stringify({ id: n, method, params }));
    });

  await send("Network.enable");
  await send("Page.enable");

  console.log(`${"PATH".padEnd(26)} ${"SCRIPT".padStart(10)} ${"TOTAL".padStart(10)}   firebase   googleReqs`);

  for (const p of PATHS) {
    received = new Map();
    await send("Network.clearBrowserCache");
    await send("Page.navigate", { url: `${BASE}${p}` });
    // Let the page settle: hydration pulls further chunks.
    await sleep(4000);

    let script = 0;
    let total = 0;
    let firebase = 0;
    for (const r of received.values()) {
      total += r.bytes;
      if (r.type === "Script") {
        script += r.bytes;
        // The Auth SDK's chunk is identifiable by the endpoint it calls.
        if (/chunks/.test(r.url)) firebase += 0;
      }
    }

    // Ask the page itself which of its loaded scripts mention the Auth
    // endpoint - cheaper and more reliable than refetching each chunk.
    const fb = await send("Runtime.evaluate", {
      expression: `(async () => {
        const urls = performance.getEntriesByType('resource')
          .filter(e => e.initiatorType === 'script' || /\\.js(\\?|$)/.test(e.name))
          .map(e => e.name);
        let bytes = 0;
        for (const u of urls) {
          try {
            const t = await (await fetch(u)).text();
            if (t.includes('identitytoolkit')) {
              const e = performance.getEntriesByName(u)[0];
              bytes += e ? (e.encodedBodySize || e.transferSize || 0) : 0;
            }
          } catch {}
        }
        return bytes;
      })()`,
      awaitPromise: true,
      returnByValue: true,
    });
    firebase = fb.result?.value ?? 0;

    // Requests that actually reach Google - i.e. the Auth SDK not just
    // shipped but RUNNING. Bytes in a shared chunk are one cost; opening
    // a token listener for every visitor is a different one.
    const googleCalls = [...received.values()].filter((r) =>
      /identitytoolkit|googleapis\.com|firebaseinstallations/.test(r.url)
    );

    console.log(
      `${p.padEnd(26)} ${human(script).padStart(10)} ${human(total).padStart(10)}   ${
        (firebase ? human(firebase) : "-").padStart(8)
      }   ${googleCalls.length}`
    );
  }
} catch (err) {
  console.error("FAILED -", err.message);
  process.exitCode = 1;
} finally {
  chrome.kill();
}
