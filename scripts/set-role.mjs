#!/usr/bin/env node
/**
 * Grant or revoke a staff role.
 *
 *   node scripts/set-role.mjs owner@example.com SUPER_ADMIN
 *   node scripts/set-role.mjs manager@example.com MANAGER
 *   node scripts/set-role.mjs counter@example.com CASHIER
 *   node scripts/set-role.mjs someone@example.com none     <- revoke
 *
 * WHY THIS IS A LOCAL SCRIPT AND NOT AN ADMIN PAGE
 * ------------------------------------------------
 * Granting SUPER_ADMIN is the most dangerous operation in the system:
 * it hands over the purchase costs, the profit reports and the ability
 * to grant more admins. An HTTP endpoint that can do that is an
 * endpoint someone can attack, and the very first admin has to be
 * created before any admin exists to authorise it - the bootstrap
 * problem.
 *
 * A script solves both. It runs on your machine, authenticates with the
 * service account key that only you hold, and is never reachable from
 * the internet. Once a SUPER_ADMIN exists, a guarded in-app screen for
 * managing the OTHER roles becomes reasonable - but this stays the way
 * the first one is made.
 *
 * WHAT A CUSTOM CLAIM IS
 * ----------------------
 * A small piece of data Google signs into the user's ID token. Because
 * it is inside the signature, the browser cannot alter it - unlike a
 * role kept in a Firestore document, which a user could attempt to
 * write to. Firestore Security Rules read it directly as
 * request.auth.token.role, so "cashiers cannot read costs" becomes a
 * rule the database enforces rather than a button the UI hides.
 *
 * THE CLAIM DOES NOT APPLY INSTANTLY. It lands in the token on the next
 * refresh (about an hour), or immediately if the person signs out and
 * back in. This script revokes their refresh tokens to force that.
 */

import { readFileSync } from "node:fs";
import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const VALID_ROLES = ["SUPER_ADMIN", "MANAGER", "CASHIER"];

/** Minimal .env.local reader - no dependency, and this runs outside Next. */
function loadEnv() {
  try {
    const text = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    console.error("Could not read .env.local - is it in the project root?");
    process.exit(1);
  }
}

loadEnv();

const [, , email, roleArg] = process.argv;

if (!email || !roleArg) {
  console.error("Usage: node scripts/set-role.mjs <email> <SUPER_ADMIN|MANAGER|CASHIER|none>");
  process.exit(1);
}

const role = roleArg.toUpperCase();
const revoking = role === "NONE";

if (!revoking && !VALID_ROLES.includes(role)) {
  console.error(`Role must be one of: ${VALID_ROLES.join(", ")}, or "none" to revoke.`);
  process.exit(1);
}

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const privateKey = (process.env.FIREBASE_ADMIN_PRIVATE_KEY ?? "")
  .replace(/^["']|["']$/g, "")
  .replace(/\\n/g, "\n");

if (!projectId || !clientEmail || !privateKey) {
  console.error(
    "Missing FIREBASE_ADMIN_* values in .env.local.\n" +
      "Firebase Console -> Project settings -> Service accounts -> Generate new private key."
  );
  process.exit(1);
}

initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
const auth = getAuth();

try {
  const user = await auth.getUserByEmail(email);

  // Claims REPLACE wholesale, they do not merge. Passing {} removes them.
  const claims = revoking ? {} : { staff: true, role };
  await auth.setCustomUserClaims(user.uid, claims);

  // Force the change to take effect now rather than at the next hourly
  // token refresh. The person will have to sign in again.
  await auth.revokeRefreshTokens(user.uid);

  console.log(
    revoking
      ? `Revoked staff access for ${email} (${user.uid}).`
      : `Granted ${role} to ${email} (${user.uid}).`
  );
  console.log("They must sign out and sign in again for this to take effect.");
} catch (error) {
  if (error?.code === "auth/user-not-found") {
    console.error(
      `No Firebase user with the email ${email}.\n` +
        "Create the account first by registering at /register, then run this again."
    );
  } else {
    console.error("Failed:", error?.message ?? error);
  }
  process.exit(1);
}
