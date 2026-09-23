import { NextResponse, type NextRequest } from "next/server";

/**
 * proxy.ts - what Next.js 15 and earlier called middleware.ts.
 *
 * Renamed in Next.js 16. middleware.ts still works but is deprecated;
 * this file is the current convention and lives at the project root,
 * beside app/.
 *
 * ===================== WHAT THIS IS FOR =====================
 * OPTIMISTIC checks only. It looks at whether a session cookie is
 * PRESENT - never at whether it is genuine.
 *
 * It cannot verify the cookie, because verifying means calling the
 * Firebase Admin SDK, and this runs on every single request including
 * prefetches. Next.js's authentication guide is explicit about this:
 * read the cookie, redirect, and leave real checks to code that sits
 * next to the data.
 *
 * ===================== WHAT SECURES THE APP =====================
 * lib/auth/dal.ts. requireStaff() and requireRole() verify the cookie's
 * signature with the Admin SDK on the server, and every protected page
 * calls one of them. If this file were deleted entirely, /admin would
 * still be protected - the experience would just be worse, because an
 * unauthenticated visitor would reach the page before being redirected.
 *
 * Put the other way round: forging a cookie value gets you past THIS
 * file and no further.
 */

/** Must match SESSION_COOKIE in lib/auth/dal.ts. */
const SESSION_COOKIE = "shabbir_session";

/** Signed-in visitors do not need these. */
const AUTH_PAGES = ["/login", "/register"];

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Presence only. This says "a cookie was sent", not "it is valid".
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  // ---- admin area ----
  if (pathname.startsWith("/admin")) {
    if (!hasSession) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      // Remember where they were going so login can send them back.
      url.search = `?next=${encodeURIComponent(pathname + search)}`;
      return NextResponse.redirect(url);
    }
    // A cookie exists. Whether it is genuine, unexpired, and belongs to
    // STAFF is decided by requireStaff() in the admin layout.
    return NextResponse.next();
  }

  // ---- customer account area ----
  if (pathname.startsWith("/account")) {
    if (!hasSession) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.search = `?next=${encodeURIComponent(pathname + search)}`;
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // ---- already signed in? skip the sign-in pages ----
  if (hasSession && AUTH_PAGES.includes(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/account";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

/**
 * Where this runs.
 *
 * Everything except Next's own internals, the auth API (which must stay
 * reachable so a signed-out browser can create a session), and static
 * files. Auth guidance is to run on all routes; the exclusions here are
 * the ones that would otherwise break the sign-in flow itself.
 */
export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
