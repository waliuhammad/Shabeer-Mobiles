#!/usr/bin/env node
/**
 * Who can sign in, and what is each account allowed to do?
 *
 *   node scripts/list-users.mjs
 *
 * Access to the admin panel is decided by CUSTOM CLAIMS on the account
 * - `staff: true` plus a `role` - not by anything stored in Firestore
 * and not by which machine you are on. If the panel works on one
 * computer and not another with the same email, the claims are the
 * first thing to check, because they are the same everywhere and
 * therefore rule themselves out or in immediately.
 *
 * Reads only.
 */

import { readFileSync } from "node:fs";
import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

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

const auth = getAuth();
const { users } = await auth.listUsers(1000);

console.log(`${users.length} account(s) in Firebase Auth\n`);
console.log(
  `${"EMAIL / PHONE".padEnd(42)} ${"STAFF".padEnd(6)} ${"ROLE".padEnd(12)} ${"DISABLED".padEnd(9)} PROVIDERS`
);

for (const u of users) {
  const claims = u.customClaims ?? {};
  const who = u.email ?? u.phoneNumber ?? u.uid;
  const providers = u.providerData.map((p) => p.providerId).join(",") || "none";
  const staff = claims.staff === true;
  const role = typeof claims.role === "string" ? claims.role : "-";

  console.log(
    `${who.padEnd(42)} ${(staff ? "yes" : "NO").padEnd(6)} ${role.padEnd(12)} ` +
      `${(u.disabled ? "YES" : "no").padEnd(9)} ${providers}`
  );
}

const canReachAdmin = users.filter(
  (u) => u.customClaims?.staff === true && typeof u.customClaims?.role === "string" && !u.disabled
);

console.log(`\n${canReachAdmin.length} account(s) can reach /admin:`);
for (const u of canReachAdmin) {
  console.log(`  ${u.email ?? u.phoneNumber ?? u.uid}  (${u.customClaims.role})`);
}

if (canReachAdmin.length === 0) {
  console.log("\n  NONE. Grant one with:  node scripts/set-role.mjs <email> SUPER_ADMIN");
}

console.log(`
Claims travel with the ACCOUNT, not the computer. An account that works
on one machine and not another is almost never a claims problem - look
at the sign-in itself, or at a session cookie that predates a change.
`);

process.exit(0);
