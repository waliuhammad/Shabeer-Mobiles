#!/usr/bin/env node
/**
 * End-to-end check of product photo upload.
 *
 *   node scripts/temp-staff.mjs create
 *   node scripts/verify-upload.mjs http://localhost:3150
 *   node scripts/temp-staff.mjs delete
 *
 * WHY A BROWSER
 * -------------
 * The upload does not go through our server - that is the design. The
 * browser asks for a signature and then POSTs the file straight to
 * Cloudinary. So the parts that can break are the signature algorithm,
 * the staff check, and the cross-origin request from the page to
 * Cloudinary. Only a real browser exercises all three.
 *
 * It uploads a tiny generated PNG into a clearly-marked test folder and
 * DELETES IT AGAIN on the way out, including on failure.
 */

import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";

const BASE = process.argv[2] ?? "http://localhost:3150";
const EMAIL = "temp-verify-bot@shabbir-mobiles.invalid";
const PASSWORD = "TempVerify!2026";

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

const CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const KEY = process.env.CLOUDINARY_API_KEY;
const SECRET = process.env.CLOUDINARY_API_SECRET;

const CHROME = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
].find((p) => existsSync(p));
if (!CHROME) {
  console.error("No Chrome or Edge found.");
  process.exit(1);
}

const profile = mkdtempSync(join(tmpdir(), "verify-upload-"));
const PORT = 9336;
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
  if (r.exceptionDetails) {
    throw new Error(r.exceptionDetails.exception?.description ?? "eval failed");
  }
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

let publicId = null;
let failed = false;

try {
  const ws = new WebSocket(await wsUrl());
  await new Promise((r) => ws.addEventListener("open", r, { once: true }));
  const send = connect(ws);
  await send("Page.enable");
  await send("Runtime.enable");

  /* ---- sign in ---- */
  console.log("1. signing in as the throwaway staff account");
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
      const form = pass.closest('form');
      form.requestSubmit ? form.requestSubmit() : form.submit();
      return true;
    })()`
  );
  await waitFor(send, `location.pathname.startsWith('/admin')`, 45000, "redirect to /admin");
  console.log("   signed in");

  /* ---- ask for a signature ---- */
  console.log("2. requesting an upload signature");
  const sig = await evaluate(
    send,
    `(async () => {
      const r = await fetch('/api/upload/signature', { method: 'POST' });
      return JSON.stringify({ status: r.status, body: r.ok ? await r.json() : null });
    })()`
  );
  const { status, body } = JSON.parse(sig);

  if (status === 503) {
    console.log("   503 - Cloudinary keys are not set. The endpoint says so cleanly.");
    console.log("\nSKIP - nothing to upload to. Add the keys and re-run.");
    process.exit(0);
  }
  if (status !== 200) throw new Error(`signature endpoint returned ${status}`);

  console.log(`   signature issued for folder "${body.folder}" on cloud "${body.cloudName}"`);

  /* ---- upload a generated image straight to Cloudinary ---- */
  console.log("3. uploading a generated test image from the browser to Cloudinary");
  const uploaded = await evaluate(
    send,
    `(async () => {
      // Draw something rather than shipping a fixture file about.
      const c = document.createElement('canvas');
      c.width = 64; c.height = 64;
      const x = c.getContext('2d');
      x.fillStyle = '#0b1f3a'; x.fillRect(0, 0, 64, 64);
      x.fillStyle = '#f5b301'; x.fillRect(16, 16, 32, 32);
      const blob = await new Promise((res) => c.toBlob(res, 'image/png'));

      const form = new FormData();
      form.append('file', new File([blob], 'verify.png', { type: 'image/png' }));
      form.append('api_key', ${JSON.stringify("")} || '${""}');
      return await (async () => {
        const sigRes = await fetch('/api/upload/signature', { method: 'POST' });
        const s = await sigRes.json();
        const f = new FormData();
        f.append('file', new File([blob], 'verify.png', { type: 'image/png' }));
        f.append('api_key', s.apiKey);
        f.append('timestamp', String(s.timestamp));
        f.append('folder', s.folder);
        f.append('signature', s.signature);
        const up = await fetch('https://api.cloudinary.com/v1_1/' + s.cloudName + '/image/upload', {
          method: 'POST', body: f,
        });
        const data = await up.json();
        return JSON.stringify({ ok: up.ok, status: up.status, secure_url: data.secure_url, public_id: data.public_id, error: data.error?.message });
      })();
    })()`
  );

  const result = JSON.parse(uploaded);
  if (!result.ok) throw new Error(`Cloudinary rejected the upload: ${result.error ?? result.status}`);

  publicId = result.public_id;
  console.log(`   uploaded -> ${result.public_id}`);

  /* ---- the URL must actually serve an image ---- */
  console.log("4. checking the returned URL serves an image");
  const head = await fetch(result.secure_url);
  console.log(`   ${result.secure_url}`);
  console.log(`   HTTP ${head.status}, ${head.headers.get("content-type")}`);
  if (!head.ok) throw new Error("the secure_url did not serve");

  /* ---- and next/image must be willing to optimise it ---- */
  console.log("5. checking next/image will optimise a Cloudinary URL");
  const optimised = await fetch(
    `${BASE}/_next/image?url=${encodeURIComponent(result.secure_url)}&w=256&q=75`,
    { headers: { Accept: "image/avif,image/webp,image/*" } }
  );
  console.log(`   HTTP ${optimised.status}, ${optimised.headers.get("content-type")}`);
  if (!optimised.ok) {
    throw new Error("next/image refused the host - check images.remotePatterns");
  }

  console.log("\nPASS - signature, upload, delivery and optimisation all work.");
} catch (err) {
  failed = true;
  console.error("\nFAIL -", err.message);
} finally {
  /* Remove the test asset, whatever happened. */
  if (publicId && CLOUD && KEY && SECRET) {
    try {
      const timestamp = Math.round(Date.now() / 1000);
      const signature = createHash("sha1")
        .update(`public_id=${publicId}&timestamp=${timestamp}${SECRET}`)
        .digest("hex");
      const form = new URLSearchParams({
        public_id: publicId,
        timestamp: String(timestamp),
        api_key: KEY,
        signature,
      });
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/destroy`, {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      console.log(`\ncleanup: deleted ${publicId} (${data.result})`);
    } catch (e) {
      console.log(`\ncleanup FAILED for ${publicId}: ${e.message}`);
    }
  }
  chrome.kill();
}

process.exit(failed ? 1 : 0);
