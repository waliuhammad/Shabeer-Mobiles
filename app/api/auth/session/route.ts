import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getAdminAuth, isAdminConfigured } from "@/lib/firebase/admin";
import { SESSION_COOKIE } from "@/lib/auth/dal";

/**
 * The session endpoint. This is where a browser sign-in becomes a
 * server-trusted session.
 *
 * WHY A SESSION COOKIE AT ALL, WHEN FIREBASE ALREADY HAS A TOKEN
 * --------------------------------------------------------------
 * The Firebase client SDK keeps an ID token in IndexedDB. That works
 * fine for client components, and not at all for anything rendered on
 * the server: a server component cannot read IndexedDB, so /admin would
 * have to render, flash, and then redirect in the browser. Anyone could
 * read the page source in between.
 *
 * So the client posts its ID token here ONCE, the Admin SDK verifies it
 * and mints a session cookie, and that cookie is sent with every request
 * from then on. Server components, route handlers and proxy.ts can all
 * see it.
 *
 * WHY THE COOKIE FLAGS MATTER
 *   httpOnly  JavaScript cannot read it, so an XSS bug cannot steal the
 *             session. This is the single most valuable flag here.
 *   secure    HTTPS only in production. Off in development because
 *             localhost is not served over HTTPS.
 *   sameSite  "lax" blocks the cookie on cross-site POSTs, which is what
 *             a CSRF attack looks like, while keeping normal navigation
 *             from an external link working.
 *   path      "/" so the whole app sees it.
 */

/** Five days, in milliseconds. Firebase caps session cookies at 14 days. */
const SESSION_DURATION_MS = 60 * 60 * 24 * 5 * 1000;

export async function POST(request: Request) {
  if (!isAdminConfigured()) {
    return NextResponse.json(
      {
        error:
          "Server auth is not configured. Add the FIREBASE_ADMIN_* values to .env.local.",
      },
      { status: 503 }
    );
  }

  let idToken: string;
  try {
    const body: unknown = await request.json();
    if (
      typeof body !== "object" ||
      body === null ||
      typeof (body as { idToken?: unknown }).idToken !== "string"
    ) {
      return NextResponse.json({ error: "Missing idToken." }, { status: 400 });
    }
    idToken = (body as { idToken: string }).idToken;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  try {
    const auth = getAdminAuth();

    /**
     * VERIFY BEFORE TRUSTING. The browser sent this string; until the
     * signature is checked it is just a string. checkRevoked catches a
     * token belonging to an account that was disabled moments ago.
     */
    const decoded = await auth.verifyIdToken(idToken, true);

    /**
     * A freshly signed-in user only. Firebase requires the ID token to
     * be under 5 minutes old before it will mint a session cookie, and
     * that is a good rule: it means a long-lived session can only be
     * created by someone who just proved who they are.
     */
    const authAgeMs = Date.now() - decoded.auth_time * 1000;
    if (authAgeMs > 5 * 60 * 1000) {
      return NextResponse.json(
        { error: "Please sign in again." },
        { status: 401 }
      );
    }

    const sessionCookie = await auth.createSessionCookie(idToken, {
      expiresIn: SESSION_DURATION_MS,
    });

    const store = await cookies();
    store.set(SESSION_COOKIE, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_DURATION_MS / 1000,
    });

    return NextResponse.json({
      uid: decoded.uid,
      isStaff: Boolean(decoded.staff),
      role: decoded.role ?? null,
    });
  } catch {
    // Deliberately vague to the caller: telling an attacker WHY a token
    // failed helps them craft the next one. The detail stays server-side.
    return NextResponse.json({ error: "Could not create a session." }, { status: 401 });
  }
}

/**
 * Sign out.
 *
 * Clears the cookie AND revokes the user's refresh tokens, so an
 * attacker holding a copy of the session cookie cannot keep using it.
 * Clearing the cookie alone would only log out this browser.
 */
export async function DELETE() {
  const store = await cookies();
  const existing = store.get(SESSION_COOKIE)?.value;

  if (existing && isAdminConfigured()) {
    try {
      const auth = getAdminAuth();
      const decoded = await auth.verifySessionCookie(existing, false);
      await auth.revokeRefreshTokens(decoded.sub);
    } catch {
      // Already expired or invalid - nothing to revoke. Still clear it.
    }
  }

  store.delete(SESSION_COOKIE);
  return NextResponse.json({ ok: true });
}
