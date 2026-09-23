import "server-only";

import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";

/**
 * THE trusted server Firebase app.
 *
 * ================== READ THIS BEFORE IMPORTING ==================
 * The Admin SDK BYPASSES EVERY SECURITY RULE. It can read and write any
 * document, mint tokens for any user, and delete the whole database. It
 * is the shop's master key.
 *
 * The `import "server-only"` on the first line is not decoration: it
 * makes the build FAIL if any client component imports this file, even
 * transitively. That is deliberate. A leaked service account key is not
 * a bug you patch - it is a key someone else now owns, and the only fix
 * is revoking it and rotating everything.
 *
 * Note none of the variables below carry NEXT_PUBLIC_. Adding that
 * prefix to FIREBASE_ADMIN_PRIVATE_KEY would inline the private key into
 * the browser bundle and hand full database access to every visitor.
 * ================================================================
 *
 * WHERE THE CREDENTIALS COME FROM
 *   Firebase Console -> Project settings -> Service accounts
 *   -> Generate new private key -> a JSON file downloads
 * Copy three values out of that JSON into .env.local:
 *   project_id   -> FIREBASE_ADMIN_PROJECT_ID
 *   client_email -> FIREBASE_ADMIN_CLIENT_EMAIL
 *   private_key  -> FIREBASE_ADMIN_PRIVATE_KEY
 * Never commit the JSON file itself.
 */

/**
 * The private key arrives from .env as a single line with the newlines
 * written literally as the two characters \ and n. PEM parsing requires
 * REAL newlines, so they have to be put back.
 *
 * This is the single most common reason a working key throws
 * "error:0909006C:PEM routines:get_name:no start line".
 */
function readPrivateKey(): string {
  const raw = process.env.FIREBASE_ADMIN_PRIVATE_KEY ?? "";
  // Some hosts (and pasting into a .env with surrounding quotes) wrap the
  // value in quotes. Strip them before repairing the newlines.
  const unquoted = raw.replace(/^["']|["']$/g, "");
  return unquoted.replace(/\\n/g, "\n");
}

export function isAdminConfigured(): boolean {
  return Boolean(
    process.env.FIREBASE_ADMIN_PROJECT_ID &&
      process.env.FIREBASE_ADMIN_CLIENT_EMAIL &&
      process.env.FIREBASE_ADMIN_PRIVATE_KEY
  );
}

const ADMIN_APP_NAME = "shabbir-admin";

function getAdminApp(): App {
  if (!isAdminConfigured()) {
    throw new Error(
      "Firebase Admin is not configured. Add FIREBASE_ADMIN_PROJECT_ID, " +
        "FIREBASE_ADMIN_CLIENT_EMAIL and FIREBASE_ADMIN_PRIVATE_KEY to " +
        ".env.local from your service account JSON, then restart the server."
    );
  }

  // A named app, kept apart from the default one, and reused across hot
  // reloads - initializing twice throws.
  const existing = getApps().find((a) => a.name === ADMIN_APP_NAME);
  if (existing) return existing;

  return initializeApp(
    {
      credential: cert({
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey: readPrivateKey(),
      }),
    },
    ADMIN_APP_NAME
  );
}

/** Server-side auth: verify tokens, mint session cookies, set claims. */
export function getAdminAuth(): Auth {
  return getAuth(getAdminApp());
}
