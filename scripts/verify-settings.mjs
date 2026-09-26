#!/usr/bin/env node
/**
 * What does the Settings page actually offer?
 *
 *   node scripts/temp-staff.mjs create
 *   node scripts/verify-settings.mjs http://localhost:3195
 *   node scripts/temp-staff.mjs delete
 *
 * Checks that the delivery fields are gone - they only apply to online
 * orders, which the shop does not take - and that the two fields that
 * remain are still there. Every admin route redirects when signed out,
 * so this needs a real session.
 */

import { spawn } from "node:child_process";
import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const BASE = process.argv[2] ?? "http://localhost:3195";
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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const profile = mkdtempSync(join(tmpdir(), "verify-settings-"));
const PORT = 9344;
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

let id = 1;
let failed = false;

try {
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
  const waitFor = async (expr, ms, label) => {
    const deadline = Date.now() + ms;
    while (Date.now() < deadline) {
      const v = await evaluate(expr);
      if (v) return v;
      await sleep(250);
    }
    throw new Error(`Timed out waiting for ${label}.`);
  };

  await send("Page.enable");
  await send("Runtime.enable");

  await send("Page.navigate", { url: `${BASE}/login` });
  await waitFor(`!!document.querySelector('input[type="password"]')`, 20000, "login form");
  await evaluate(`(() => {
    function set(el, v) {
      Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value').set.call(el, v);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }
    set(document.querySelector('input[type="email"]'), ${JSON.stringify(EMAIL)});
    const p = document.querySelector('input[type="password"]');
    set(p, ${JSON.stringify(PASSWORD)});
    const f = p.closest('form');
    f.requestSubmit ? f.requestSubmit() : f.submit();
    return true;
  })()`);
  await waitFor(`location.pathname.startsWith('/admin')`, 45000, "sign-in");
  console.log("signed in");

  await send("Page.navigate", { url: `${BASE}/admin/settings` });
  // Wait for the section itself, not merely the page shell.
  await waitFor(
    `((document.body && document.body.textContent) || '').includes('Trading Rules')`,
    25000,
    "the Trading Rules section"
  );

  const body = await evaluate(
    `((document.body && document.body.textContent) || '')`
  );

  const checks = [
    { label: "Delivery Charge (Rs)", want: false },
    { label: "Free Delivery Above (Rs)", want: false },
    { label: "Default Low-Stock Threshold", want: true },
    { label: "Receipt Footer", want: true },
  ];

  console.log("\nTrading Rules section:\n");
  for (const c of checks) {
    const present = body.includes(c.label);
    const ok = present === c.want;
    if (!ok) failed = true;
    console.log(
      `  ${c.label.padEnd(30)} ${present ? "shown" : "gone "}   ${ok ? "ok" : "PROBLEM"}`
    );
  }
} catch (err) {
  failed = true;
  console.error("\nFAIL -", err.message);
} finally {
  chrome.kill();
}

console.log(failed ? "\nFAIL" : "\nPASS - only the settings that do something are offered.");
process.exit(failed ? 1 : 0);
