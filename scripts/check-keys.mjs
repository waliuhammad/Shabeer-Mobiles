#!/usr/bin/env node
/**
 * Check every credential this project uses - locally AND on the
 * deployment.
 *
 *   node scripts/check-keys.mjs
 *   node scripts/check-keys.mjs https://shabeer-mobiles.vercel.app
 *
 * WHY NOT JUST "IS THE VARIABLE SET"
 * ----------------------------------
 * A key can be present and wrong, present and revoked, or present in
 * .env.local and absent from Vercel - and all three look identical to
 * `if (process.env.X)`. The Google Maps key was a case in point: the
 * variable existed in .env.local, so it read as configured, and it was
 * an empty string, so the map had been quietly falling back to the
 * keyless embed the whole time.
 *
 * So this AUTHENTICATES where it can, and where it cannot it says so
 * rather than implying a pass.
 *
 * NEXT_PUBLIC_* values are compiled into the browser bundle, so this can
 * also check what the LIVE site is actually running with, by reading
 * them back out of the deployed JavaScript. Server-only secrets can
 * never be checked that way - correctly - so the report says "not
 * visible from outside" instead of pretending.
 *
 * Secrets are never printed. Only a masked fingerprint.
 */

import { readFileSync } from "node:fs";

const LIVE = process.argv[2] ?? null;

/* ------------------------------------------------------------------ */

function loadEnv() {
  const env = {};
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
    env[key] = value;
  }
  return env;
}

/** Never print a secret. Enough to tell two keys apart, not to use one. */
function mask(v) {
  if (!v) return "(empty)";
  if (v.length <= 8) return `${v.length} chars`;
  return `${v.slice(0, 4)}...${v.slice(-2)} (${v.length} chars)`;
}

const env = loadEnv();
const rows = [];
function report(name, status, detail) {
  rows.push({ name, status, detail });
}

/* ---------------- 1. Firebase Admin (server) ---------------- */

const adminKeys = [
  "FIREBASE_ADMIN_PROJECT_ID",
  "FIREBASE_ADMIN_CLIENT_EMAIL",
  "FIREBASE_ADMIN_PRIVATE_KEY",
];
const adminMissing = adminKeys.filter((k) => !env[k]);

if (adminMissing.length) {
  report("Firebase Admin SDK", "FAIL", `missing ${adminMissing.join(", ")}`);
} else {
  try {
    const { cert, initializeApp } = await import("firebase-admin/app");
    const { getFirestore } = await import("firebase-admin/firestore");
    initializeApp({
      credential: cert({
        projectId: env.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey: env.FIREBASE_ADMIN_PRIVATE_KEY
          .replace(/^["']|["']$/g, "")
          .replace(/\\n/g, "\n"),
      }),
    });
    // A real read - proves the credential is accepted, not merely parsed.
    const snap = await getFirestore().collection("products").limit(1).get();
    report("Firebase Admin SDK", "OK", `authenticated, read ${snap.size} doc`);
  } catch (e) {
    report("Firebase Admin SDK", "FAIL", e.code ?? e.message);
  }
}

/* ---------------- 2. Firebase client (browser) ---------------- */

const webKey = env.NEXT_PUBLIC_FIREBASE_API_KEY;
if (!webKey) {
  report("Firebase Web API key", "FAIL", "empty");
} else {
  try {
    /* Ask Identity Toolkit which sign-in methods this key allows. A bad
       or restricted key is rejected here; a good one answers. */
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/projects?key=${webKey}`
    );
    if (res.ok) {
      const data = await res.json();
      const signIn = data.signIn ?? {};
      const methods = [
        signIn.email?.enabled && "email/password",
        signIn.phoneNumber?.enabled && "phone",
      ].filter(Boolean);
      report(
        "Firebase Web API key",
        "OK",
        `valid${methods.length ? ` - sign-in: ${methods.join(", ")}` : ""}`
      );
    } else {
      const body = await res.json().catch(() => ({}));
      report("Firebase Web API key", "FAIL", body?.error?.message ?? `HTTP ${res.status}`);
    }
  } catch (e) {
    report("Firebase Web API key", "WARN", `could not reach Google: ${e.message}`);
  }
}

/* ---------------- 3. Google Maps ---------------- */

const mapsKey = env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
if (!mapsKey) {
  report(
    "Google Maps API key",
    "EMPTY",
    "map uses the keyless embed - works, but cannot place an exact pin"
  );
} else {
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=Multan&key=${mapsKey}`
    );
    const data = await res.json();
    if (data.status === "OK") report("Google Maps API key", "OK", "geocoding works");
    else report("Google Maps API key", "FAIL", data.error_message ?? data.status);
  } catch (e) {
    report("Google Maps API key", "WARN", e.message);
  }
}

/* ---------------- 4. Cloudinary ---------------- */

const cloud = env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const cldKey = env.CLOUDINARY_API_KEY;
const cldSecret = env.CLOUDINARY_API_SECRET;

if (!cloud || !cldKey || !cldSecret) {
  report("Cloudinary", "EMPTY", "one or more values missing");
} else {
  try {
    /* Basic auth against the usage endpoint: the cheapest call that
       proves the key/secret pair is real and belongs to this cloud. */
    const auth = Buffer.from(`${cldKey}:${cldSecret}`).toString("base64");
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/usage`, {
      headers: { Authorization: `Basic ${auth}` },
    });
    if (res.ok) {
      const data = await res.json();
      report(
        "Cloudinary",
        "OK",
        `credentials valid - plan ${data.plan ?? "?"}, ${data.resources ?? 0} assets stored`
      );
    } else {
      report("Cloudinary", "FAIL", `HTTP ${res.status} - key, secret or cloud name is wrong`);
    }
  } catch (e) {
    report("Cloudinary", "WARN", e.message);
  }
}

/* ---------------- 5. Keys that are set but unused ---------------- */

const usedInCode = new Set([
  "FIREBASE_ADMIN_PROJECT_ID",
  "FIREBASE_ADMIN_CLIENT_EMAIL",
  "FIREBASE_ADMIN_PRIVATE_KEY",
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
  "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY",
]);

const unused = Object.keys(env).filter((k) => env[k] && !usedInCode.has(k));

/* ---------------- print ---------------- */

console.log("CREDENTIALS IN .env.local\n");
console.log(`${"".padEnd(26)} ${"STATUS".padEnd(7)} DETAIL`);
for (const r of rows) {
  console.log(`${r.name.padEnd(26)} ${r.status.padEnd(7)} ${r.detail}`);
}

console.log("\nVALUES (masked)\n");
for (const k of Object.keys(env).sort()) {
  console.log(`  ${k.padEnd(40)} ${mask(env[k])}`);
}

if (unused.length) {
  console.log("\nSET BUT NEVER READ BY ANY CODE\n");
  for (const k of unused) console.log(`  ${k}`);
}

/* ---------------- 6. what the LIVE site is running with ---------------- */

if (LIVE) {
  console.log(`\nDEPLOYED AT ${LIVE}\n`);
  console.log("  Whether a key is set on Vercel CANNOT be answered by");
  console.log("  downloading the page and grepping its scripts, and an earlier");
  console.log("  version of this script did exactly that and reported every");
  console.log("  Firebase value as missing - while the live site was signing");
  console.log("  people in with those very values. Next.js splits the bundle,");
  console.log("  and the chunk holding the Firebase config is fetched at");
  console.log("  runtime, so it is not named anywhere in the initial HTML.");
  console.log("");
  console.log("  Server-only secrets are correctly invisible from outside in");
  console.log("  any case.");
  console.log("");
  console.log("  The honest test is a functional one:");
  console.log("");
  console.log("    node scripts/temp-staff.mjs create");
  console.log(`    node scripts/verify-notifications.mjs ${LIVE}`);
  console.log("    node scripts/temp-staff.mjs delete");
  console.log("");
  console.log("  A successful sign-in proves the browser Firebase config is");
  console.log("  set; the admin panel reading Firestore proves FIREBASE_ADMIN_*");
  console.log("  is set. Anything less is inference.");

  /* One thing that IS observable from outside: whether the map fell back
     to the keyless embed, which is what an unset Maps key looks like. */
  try {
    const contact = await fetch(`${LIVE}/contact`, { cache: "no-store" }).then((r) => r.text());
    const keyed = contact.includes("maps/embed/v1/place?key=");
    console.log("");
    console.log(
      `  Map on /contact: ${keyed ? "using an API key" : "keyless embed (no Maps key on the deployment)"}`
    );
  } catch {
    /* Network trouble - not worth failing the whole report over. */
  }
}

process.exit(0);
