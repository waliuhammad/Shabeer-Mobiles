#!/usr/bin/env node
/**
 * Do the purchase costs actually reach the finance screens, and is the
 * estimate labelled as one?
 *
 *   node scripts/temp-staff.mjs create
 *   node scripts/verify-costs.mjs http://localhost:3170
 *   node scripts/temp-staff.mjs delete
 *
 * WHY THIS EXISTS
 * ---------------
 * Costs have been written to Firestore before under the wrong field
 * name, where they stored perfectly and were read by nothing. The only
 * way to know a cost is doing its job is to look at the screen that is
 * supposed to have changed - Profit & Loss, which should stop saying
 * "these figures overstate profit" and start saying the numbers rest on
 * estimates.
 */

import { spawn } from "node:child_process";
import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const BASE = process.argv[2] ?? "http://localhost:3170";
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

const profile = mkdtempSync(join(tmpdir(), "verify-costs-"));
const PORT = 9338;
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
let pageErrorsOut = [];

try {
  const ws = new WebSocket(await wsUrl());
  await new Promise((r) => ws.addEventListener("open", r, { once: true }));
  const send = connect(ws);
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Log.enable");

  /* Surface what the page itself complains about. A silently empty
     subscription and a permission-denied one look identical from the
     outside, and only one of them is a bug in this code. */
  const pageErrors = pageErrorsOut;
  ws.addEventListener("message", (ev) => {
    const m = JSON.parse(ev.data);
    if (m.method === "Log.entryAdded" && m.params.entry.level === "error") {
      pageErrors.push(m.params.entry.text);
    }
    if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") {
      pageErrors.push(m.params.args.map((a) => a.value ?? a.description ?? "").join(" "));
    }
  });

  await send("Page.navigate", { url: `${BASE}/login` });
  await waitFor(send, `!!document.querySelector('input[type="password"]')`, 20000, "login form");
  await evaluate(
    send,
    `(() => {
      function setNative(el, v) {
        Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value').set.call(el, v);
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }
      setNative(document.querySelector('input[type="email"]'), ${JSON.stringify(EMAIL)});
      const p = document.querySelector('input[type="password"]');
      setNative(p, ${JSON.stringify(PASSWORD)});
      const f = p.closest('form');
      f.requestSubmit ? f.requestSubmit() : f.submit();
      return true;
    })()`
  );
  await waitFor(send, `location.pathname.startsWith('/admin')`, 45000, "sign-in");
  console.log("1. signed in");

  /* ---- Profit & Loss banners ---- */
  await send("Page.navigate", { url: `${BASE}/admin/profit-loss` });
  const banners = JSON.parse(
    await waitFor(
      send,
      // Wait for ONE OF THE BANNERS, not for the page. The heading
      // renders instantly; the banners depend on the costs subscription
      // delivering, and sampling before it does reports "no banner" for
      // a page that is merely still loading.
      `(() => {
        const t = (document.body && document.body.textContent) || '';
        const overstates = t.includes('These figures overstate profit');
        const estimated = t.includes('Based on estimated purchase costs');
        if (!overstates && !estimated) return null;
        return JSON.stringify({ overstates, estimated });
      })()`,
      30000,
      "a profit & loss banner"
    )
  );

  console.log("2. Profit & Loss banners:");
  console.log(`     "overstate profit" warning : ${banners.overstates ? "SHOWN" : "gone"}`);
  console.log(`     "estimated costs" notice   : ${banners.estimated ? "SHOWN" : "absent"}`);

  if (banners.overstates) {
    failed = true;
    console.log("     PROBLEM - costs are not reaching this page");
  }
  if (!banners.estimated) {
    failed = true;
    console.log("     PROBLEM - estimates are not being labelled");
  }

  /* ---- the product form flags the estimate ---- */
  await send("Page.navigate", { url: `${BASE}/admin/products/p-001/edit` });
  const form = JSON.parse(
    await waitFor(
      send,
      // Same again: wait for the COST to arrive, not for the label next
      // to the empty box it will eventually fill.
      `(() => {
        const input = [...document.querySelectorAll('input')]
          .find(i => i.value === '25800');
        if (!input) return null;
        const t = (document.body && document.body.textContent) || '';
        return JSON.stringify({
          costLoaded: true,
          flagged: t.includes('This is an estimate, not what the shop paid'),
        });
      })()`,
      30000,
      "the purchase cost to load in the form"
    )
  );

  console.log("3. Product form (iPhone 12):");
  console.log(`     purchase cost loaded (25800): ${form.costLoaded ? "yes" : "NO"}`);
  console.log(`     labelled as an estimate     : ${form.flagged ? "yes" : "NO"}`);
  if (!form.costLoaded || !form.flagged) failed = true;
} catch (err) {
  failed = true;
  console.error("\nFAIL -", err.message);
} finally {
  chrome.kill();
}

console.log(failed ? "\nFAIL" : "\nPASS - costs are live and estimates are labelled.");
process.exit(failed ? 1 : 0);
