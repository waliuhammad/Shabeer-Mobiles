import { NextResponse } from "next/server";

/**
 * Temporary probe: can firebase-admin be imported and initialised here?
 *
 * The import is DYNAMIC so a module-load failure becomes a catchable
 * error with a message, instead of crashing the function before any
 * handler code runs - which is exactly the failure mode that made the
 * session endpoint undiagnosable.
 */
export async function GET() {
  try {
    const { cert, initializeApp, getApps } = await import("firebase-admin/app");
    const { getAuth } = await import("firebase-admin/auth");

    const privateKey = (process.env.FIREBASE_ADMIN_PRIVATE_KEY ?? "")
      .replace(/^["']|["']$/g, "")
      .replace(/\n/g, "\n");

    const name = "probe";
    const existing = getApps().find((a) => a.name === name);
    const app =
      existing ??
      initializeApp(
        {
          credential: cert({
            projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
            clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
            privateKey,
          }),
        },
        name
      );

    // Touch the auth service so credentials are actually parsed.
    getAuth(app);
    return NextResponse.json({ ok: true, stage: "initialised" });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        name: error instanceof Error ? error.name : "unknown",
        message: error instanceof Error ? error.message.slice(0, 300) : String(error).slice(0, 300),
      },
      { status: 500 }
    );
  }
}
