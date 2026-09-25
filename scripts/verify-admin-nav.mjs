#!/usr/bin/env node
/**
 * What does a signed-in staff member actually see in the admin sidebar,
 * and which admin routes answer?
 *
 *   node scripts/temp-staff.mjs create
 *   node scripts/verify-admin-nav.mjs http://localhost:3160
 *   node scripts/temp-staff.mjs delete
 *
 * WHY A BROWSER
 * -------------
 * Every admin route redirects to /login when signed out, so curl can
 * only ever see a 307 and learns nothing about what is behind it. A
 * removed nav item and a removed page are different things, and both
 * need checking: deleting a link does not close a URL.
 */

import { spawn } from "node:child_process";
import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const BASE = process.argv[2] ?? "http://localhost:3160";
const EMAIL = "temp-verify-bot@shabbir-mobiles.invalid";
const PASSWORD = "TempVerify!2026";

const CHROME = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
].find((p) => existsSync(p));
if (!CHROME) {
  console.error("No Chrome or Edge found.");
  process.exit(1);
}

const profile = mkdtempSync(join(tmpdir(), "verify-nav-"));
const PORT = 9337;
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

async function waitFor(send, expression, timeoutMs, label) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const v = await evaluate(send, expression);
    if (v) return v;
    await sleep(250);
  }
  throw new Error(`Timed out waiting for ${label}.`);
}

let failed = false;

try {
  const ws = new WebSocket(await wsUrl());
  await new Promise((r) => ws.addEventListener("open", r, { once: true }));
  const send = connect(ws);
  await send("Page.enable");
  await send("Runtime.enable");

  await send("Page.navigate", { url: `${BASE}/login` });
  await waitFor(send, `!!document.querySelector('input[type="password"]')`, 20000, "login form");
  await evaluate(
    send,
    `(() => {
      function setNative(el, value) {
        const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value').set;
        setter.call(el, value);
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }
      setNative(document.querySelector('input[type="email"]'), ${JSON.stringify(EMAIL)});
      const pass = document.querySelector('input[type="password"]');
      setNative(pass, ${JSON.stringify(PASSWORD)});
      const f = pass.closest('form');
      f.requestSubmit ? f.requestSubmit() : f.submit();
      return true;
    })()`
  );
  await waitFor(send, `location.pathname.startsWith('/admin')`, 45000, "redirect to /admin");

  /* ---- what the sidebar offers ---- */
  const links = JSON.parse(
    await waitFor(
      send,
      `(() => {
        const a = [...document.querySelectorAll('a[href^="/admin"]')]
          .map(x => x.getAttribute('href'));
        return a.length ? JSON.stringify([...new Set(a)].sort()) : null;
      })()`,
      20000,
      "the admin sidebar"
    )
  );

  console.log("Admin navigation, as a signed-in owner sees it:\n");
  for (const href of links) console.log(`  ${href}`);

  /* ---- routes that should NOT be reachable ---- */
  const shouldBeGone = ["/admin/orders", "/admin/orders/SM-1001", "/admin/users"];
  console.log("\nRoutes that should be closed:\n");
  for (const path of shouldBeGone) {
    const status = await evaluate(
      send,
      `fetch(${JSON.stringify(path)}, { redirect: 'manual' }).then(r => r.status)`
    );
    const linked = links.includes(path);
    const ok = status === 404 && !linked;
    if (!ok) failed = true;
    console.log(
      `  ${path.padEnd(26)} HTTP ${status}   in sidebar: ${linked ? "YES" : "no"}   ${ok ? "OK" : "PROBLEM"}`
    );
  }
} catch (err) {
  failed = true;
  console.error("\nFAIL -", err.message);
} finally {
  chrome.kill();
}

console.log(failed ? "\nSomething is still reachable." : "\nPASS");
process.exit(failed ? 1 : 0);
