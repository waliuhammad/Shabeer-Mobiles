#!/usr/bin/env node
/**
 * Can the owner delete a customer message, through the real UI?
 *
 *   node scripts/temp-staff.mjs create
 *   node scripts/verify-message-delete.mjs http://localhost:3183
 *   node scripts/temp-staff.mjs delete
 *
 * Posts a throwaway enquiry through the public contact API, signs in,
 * finds it in the inbox, deletes it through the button and the
 * confirmation dialog, and checks it is actually gone.
 *
 * Doing it through the UI rather than the SDK is the point: the rule,
 * the button's visibility, the dialog and the write all have to agree.
 * A rule that allows the delete is worth nothing if the button is
 * hidden, and a button that calls a refused write is worse than no
 * button.
 */

import { spawn } from "node:child_process";
import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const BASE = process.argv[2] ?? "http://localhost:3183";
const EMAIL = "temp-verify-bot@shabbir-mobiles.invalid";
const PASSWORD = "TempVerify!2026";
const SUBJECT = `DELETE-TEST-${Date.now()}`;

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

/* ---- 1. post an enquiry the way a customer would ---- */
const posted = await fetch(`${BASE}/api/contact`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    name: "Delete Test",
    phone: "0300 0000000",
    subject: SUBJECT,
    message: "This message exists only to be deleted by the verification script.",
  }),
});
if (!posted.ok) {
  console.error(`Could not post the test enquiry: HTTP ${posted.status}`);
  process.exit(1);
}
console.log(`1. posted a test enquiry: ${SUBJECT}`);

const profile = mkdtempSync(join(tmpdir(), "verify-del-"));
const PORT = 9342;
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
  console.log("2. signed in as the owner");

  await send("Page.navigate", { url: `${BASE}/admin/messages` });
  await waitFor(
    `((document.body && document.body.textContent) || '').includes(${JSON.stringify(SUBJECT)})`,
    25000,
    "the test enquiry to appear in the inbox"
  );
  console.log("3. the enquiry is listed in /admin/messages");

  /* ---- click Delete on that row ---- */
  const clicked = await evaluate(`(() => {
    const row = [...document.querySelectorAll('li')]
      .find(li => (li.textContent || '').includes(${JSON.stringify(SUBJECT)}));
    if (!row) return 'NO ROW';
    const btn = [...row.querySelectorAll('button')]
      .find(b => (b.textContent || '').trim() === 'Delete');
    if (!btn) return 'NO DELETE BUTTON';
    btn.click();
    return 'clicked';
  })()`);
  if (clicked !== "clicked") throw new Error(clicked);
  console.log("4. clicked Delete");

  await waitFor(
    `((document.body && document.body.textContent) || '').includes('Delete this message?')`,
    10000,
    "the confirmation dialog"
  );
  console.log("5. confirmation dialog asks before deleting");

  await evaluate(`(() => {
    const btn = [...document.querySelectorAll('button')]
      .find(b => (b.textContent || '').trim() === 'Delete permanently');
    if (btn) btn.click();
    return true;
  })()`);

  await waitFor(
    `!((document.body && document.body.textContent) || '').includes(${JSON.stringify(SUBJECT)})`,
    20000,
    "the enquiry to disappear from the list"
  );
  console.log("6. the enquiry is gone from the list");

  // Whatever the app decided to tell the user - success or refusal -
  // lands in a toast. Read it rather than inferring from the DOM.
  await sleep(2500);
  const toastText = await evaluate(
    `(() => {
      const el = document.querySelector('[data-sonner-toaster]');
      return el ? (el.textContent || '').replace(/\s+/g, ' ').trim() : '(no toast)';
    })()`
  );
  console.log("   toast said:", toastText);
} catch (err) {
  failed = true;
  console.error("\nFAIL -", err.message);
} finally {
  chrome.kill();
}

/* ---- 7. gone from the DATABASE, not just the screen ----
 *
 * This step exists because the first version of this script stopped at
 * step 6 and reported PASS while the message was still in Firestore.
 * The SDK applies a delete locally before the server has agreed, so a
 * REFUSED delete still empties the row from the list for a moment. The
 * screen is not the system of record; check the record.
 */
const { cert, initializeApp } = await import("firebase-admin/app");
const { getFirestore } = await import("firebase-admin/firestore");
const { readFileSync } = await import("node:fs");

const envText = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const line of envText.split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const eq = t.indexOf("=");
  if (eq === -1) continue;
  const k = t.slice(0, eq).trim();
  let v = t.slice(eq + 1).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1);
  }
  if (!(k in process.env)) process.env[k] = v;
}

initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: (process.env.FIREBASE_ADMIN_PRIVATE_KEY ?? "")
      .replace(/^["']|["']$/g, "")
      .replace(/\\n/g, "\n"),
  }),
});

// A moment for the server to confirm, so this is not racing the write.
await sleep(3000);

const left = await getFirestore()
  .collection("messages")
  .where("subject", "==", SUBJECT)
  .get();

if (left.empty) {
  console.log("7. confirmed gone from Firestore, not just the screen");
} else {
  failed = true;
  console.log(`7. STILL IN FIRESTORE (${left.size}) - the delete was refused`);
  for (const d of left.docs) await d.ref.delete();
  console.log("   cleaned up the test message with admin rights");
}

console.log(failed ? "\nFAIL" : "\nPASS - the owner can delete a message, and it stays deleted.");
process.exit(failed ? 1 : 0);
