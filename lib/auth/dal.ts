import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAdminAuth, isAdminConfigured } from "@/lib/firebase/admin";
import type { AdminRole } from "@/lib/admin-nav";
import type { SessionUser } from "@/types/auth";

/**
 * THE Data Access Layer - the real authorization boundary.
 *
 * WHY THIS EXISTS AND proxy.ts DOES NOT REPLACE IT
 * ------------------------------------------------
 * proxy.ts runs before every request and can redirect someone who has no
 * session cookie. That is an OPTIMISTIC check: it makes the app behave
 * sensibly, and it is trivially defeated, because it only looks at
 * whether a cookie is present - not whether it is genuine.
 *
 * This file does the real work. verifySession() hands the cookie to the
 * Admin SDK, which checks the cryptographic signature against Google's
 * public keys and the revocation list. A forged or stolen-and-revoked
 * cookie fails here. Every server component, route handler and server
 * action that touches protected data calls one of these functions.
 *
 * Next.js's own authentication guide puts it plainly: security checks
 * belong as close as possible to the data source, and Proxy "should not
 * be your only line of defense".
 *
 * WHY cache()
 * -----------
 * A single page render may call verifySession() from a layout, a page
 * and two components. React's cache() memoises it for that render pass,
 * so the cookie is verified once instead of four times.
 */

const SESSION_COOKIE = "shabbir_session";

export { SESSION_COOKIE };

/**
 * The signed-in user, or null.
 *
 * NEVER THROWS on a bad cookie. An expired or tampered cookie means "not
 * signed in", which is a normal state, not an error page.
 */
export const verifySession = cache(async (): Promise<SessionUser | null> => {
  if (!isAdminConfigured()) return null;

  const store = await cookies();
  const cookie = store.get(SESSION_COOKIE)?.value;
  if (!cookie) return null;

  try {
    // checkRevoked: true costs a lookup but means "sign out everywhere"
    // and "disable this account" take effect immediately, rather than
    // whenever the cookie happens to expire. For a shop where a former
    // employee must lose access the moment they are removed, that is
    // worth the round trip.
    const decoded = await getAdminAuth().verifySessionCookie(cookie, true);

    const role = decoded.role as AdminRole | undefined;

    return {
      uid: decoded.uid,
      email: decoded.email ?? null,
      phone: decoded.phone_number ?? null,
      displayName: (decoded.name as string | undefined) ?? null,
      emailVerified: Boolean(decoded.email_verified),
      role,
      isStaff: Boolean(decoded.staff) && Boolean(role),
    };
  } catch {
    // Expired, revoked, forged, or the clock is wrong. All of these mean
    // the same thing to the caller.
    return null;
  }
});

/** Signed in, or bounced to the login page. */
export async function requireUser(returnTo?: string): Promise<SessionUser> {
  const user = await verifySession();
  if (!user) {
    const next = returnTo ? `?next=${encodeURIComponent(returnTo)}` : "";
    redirect(`/login${next}`);
  }
  return user;
}

/**
 * Staff, or bounced.
 *
 * A signed-in CUSTOMER who types /admin lands here and is sent to the
 * storefront - not to the login page, because they are already signed
 * in and asking them to sign in again would be nonsense.
 */
export async function requireStaff(): Promise<SessionUser> {
  const user = await verifySession();
  if (!user) redirect("/login?next=%2Fadmin");
  if (!user.isStaff) redirect("/?denied=staff");
  return user;
}

/**
 * Staff holding one of the listed roles.
 *
 * This is what makes "cashiers cannot open Profit & Loss" true rather
 * than merely hidden. lib/admin-nav.ts already declares which roles each
 * page expects; this enforces the same list on the server.
 */
export async function requireRole(allowed: AdminRole[]): Promise<SessionUser> {
  const user = await requireStaff();
  if (!user.role || !allowed.includes(user.role)) {
    redirect("/admin?denied=role");
  }
  return user;
}

/**
 * True when the session belongs to this customer.
 *
 * Used before showing an order: a signed-in shopper may read their own
 * orders and nobody else's. The Firestore rule will say the same thing,
 * so the check exists in both places on purpose - defence in depth.
 */
export async function ownsCustomerRecord(customerId: string): Promise<boolean> {
  const user = await verifySession();
  if (!user) return false;
  if (user.isStaff) return true; // staff may read any customer
  return user.uid === customerId;
}
