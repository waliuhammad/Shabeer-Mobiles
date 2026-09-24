#!/usr/bin/env node
/**
 * Create or delete a THROWAWAY staff account, for testing the admin
 * panel end to end.
 *
 *   node scripts/temp-staff.mjs create
 *   node scripts/temp-staff.mjs delete
 *
 * WHY THIS EXISTS
 * ---------------
 * Some admin behaviour cannot be checked with curl, because every admin
 * route is behind requireStaff() and a signed session cookie. Claiming
 * "the sidebar looks right" without signing in is a guess. This makes
 * signing in cheap, so the claim can be tested instead.
 *
 * SAFETY: the address is fixed and obviously disposable, so `delete`
 * cannot remove a real person's account by mistake. It refuses to touch
 * any uid that does not carry this exact email.
 */

import { readFileSync } from "node:fs";
import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const TEMP_EMAIL = "temp-verify-bot@shabbir-mobiles.invalid";
const TEMP_PASSWORD = "TempVerify!2026";

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

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const privateKey = (process.env.FIREBASE_ADMIN_PRIVATE_KEY ?? "")
  .replace(/^["']|["']$/g, "")
  .replace(/\\n/g, "\n");

if (!projectId || !clientEmail || !privateKey) {
  console.error("Missing FIREBASE_ADMIN_* values in .env.local.");
  process.exit(1);
}

initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
const auth = getAuth();

const action = process.argv[2];

async function findTemp() {
  try {
    return await auth.getUserByEmail(TEMP_EMAIL);
  } catch {
    return null;
  }
}

if (action === "create") {
  let user = await findTemp();
  if (!user) {
    user = await auth.createUser({
      email: TEMP_EMAIL,
      password: TEMP_PASSWORD,
      displayName: "Verify Bot",
      emailVerified: true,
    });
  } else {
    await auth.updateUser(user.uid, { password: TEMP_PASSWORD });
  }

  // The same claims scripts/set-role.mjs grants, so this account is
  // exactly as privileged as a real owner - no more.
  await auth.setCustomUserClaims(user.uid, { staff: true, role: "SUPER_ADMIN" });

  console.log(`uid=${user.uid}`);
  console.log(`email=${TEMP_EMAIL}`);
  console.log(`password=${TEMP_PASSWORD}`);
  process.exit(0);
}

if (action === "delete") {
  const user = await findTemp();
  if (!user) {
    console.log("Nothing to delete.");
    process.exit(0);
  }
  if (user.email !== TEMP_EMAIL) {
    console.error("Refusing: that uid is not the throwaway account.");
    process.exit(1);
  }
  await auth.revokeRefreshTokens(user.uid);
  await auth.deleteUser(user.uid);
  console.log(`Deleted ${TEMP_EMAIL} (${user.uid}).`);
  process.exit(0);
}

console.error("Usage: node scripts/temp-staff.mjs create|delete");
process.exit(1);
