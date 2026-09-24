import { NextResponse } from "next/server";

/**
 * Zero-dependency health probe.
 *
 * Temporary. Exists to answer one question: does a route handler run at
 * all on this deployment? If this returns 200 and /api/auth/session
 * returns 500, the fault is in what that route imports, not in the
 * platform or the build.
 */
export async function GET() {
  return NextResponse.json({
    ok: true,
    node: process.version,
    hasAdminProjectId: Boolean(process.env.FIREBASE_ADMIN_PROJECT_ID),
    hasAdminClientEmail: Boolean(process.env.FIREBASE_ADMIN_CLIENT_EMAIL),
    hasAdminKey: Boolean(process.env.FIREBASE_ADMIN_PRIVATE_KEY),
    keyLength: (process.env.FIREBASE_ADMIN_PRIVATE_KEY ?? "").length,
    keyHasEscapedNewlines: (process.env.FIREBASE_ADMIN_PRIVATE_KEY ?? "").includes("\n"),
    keyHasRealNewlines: (process.env.FIREBASE_ADMIN_PRIVATE_KEY ?? "").includes("\n"),
  });
}
