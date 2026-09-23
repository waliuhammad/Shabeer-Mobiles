import "server-only";

import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebase/admin";

/**
 * Server-side Firestore. BYPASSES SECURITY RULES.
 *
 * WHY THIS IS A SEPARATE MODULE FROM admin.ts
 * -------------------------------------------
 * firebase-admin/firestore drags in @google-cloud/firestore, gRPC and
 * protobufjs - over 300 files. When it sat in the same module as the
 * auth helper, every route that only wanted to verify a token pulled the
 * entire Firestore stack in with it, and the session endpoint failed to
 * start on Vercel.
 *
 * Keeping them apart means /api/auth/session loads auth only, and the
 * heavy dependency is paid for only where Firestore is genuinely used.
 *
 * It must NOT become the way admin writes happen. Those go through the
 * client SDK so firestore.rules is actually exercised. A rule that is
 * never evaluated is a rule nobody knows is broken.
 */
export function getAdminDb(): Firestore {
  return getFirestore(getAdminApp());
}
