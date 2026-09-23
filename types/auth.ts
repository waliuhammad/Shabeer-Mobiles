import type { AdminRole } from "@/lib/admin-nav";

/**
 * Who is signed in.
 *
 * TWO KINDS OF PERSON, ONE AUTH SYSTEM
 * ------------------------------------
 * A CUSTOMER signs in to see their own orders. A STAFF MEMBER signs in
 * to run the shop. Both are Firebase Auth users; what separates them is
 * a custom claim on the token.
 *
 * The claim is the important part. It is set by the trusted server (the
 * Admin SDK), baked into the signed ID token, and cannot be altered by
 * the browser - unlike a role stored in a normal Firestore document,
 * which a determined user could try to write to. Firestore Security
 * Rules can read the claim directly, so "cashiers may not read costs"
 * becomes a rule the database enforces rather than a button the UI
 * hides.
 */

/** The custom claim shape the server writes onto a staff token. */
export interface StaffClaims {
  /** Present only on staff. Absent means "ordinary customer". */
  role?: AdminRole;
  /** Set alongside role so rules can test one boolean. */
  staff?: boolean;
}

/**
 * The session, as the server reconstructs it from the cookie.
 *
 * Deliberately small. This is a Data Transfer Object: it carries what
 * the app needs to make decisions and NOTHING else, so a careless
 * `{...session}` into a client component cannot leak a token.
 */
export interface SessionUser {
  uid: string;
  email: string | null;
  phone: string | null;
  displayName: string | null;
  emailVerified: boolean;
  /** undefined for a customer. */
  role?: AdminRole;
  isStaff: boolean;
}

/** What the client-side auth context exposes to the UI. */
export interface AuthState {
  user: SessionUser | null;
  /** True until Firebase has reported the initial auth state. */
  loading: boolean;
  /** Set when Firebase env vars are missing, so the UI can explain why. */
  configError: string | null;
}

/**
 * Firebase error codes worth translating.
 *
 * Firebase returns things like "auth/invalid-credential", which is
 * accurate and useless to a shopper. Mapping them in ONE place means
 * every form says the same thing for the same failure.
 */
export const AUTH_ERROR_MESSAGES: Record<string, string> = {
  "auth/invalid-credential": "That email and password do not match.",
  "auth/invalid-email": "That does not look like a valid email address.",
  "auth/user-disabled": "This account has been disabled. Contact the shop.",
  "auth/user-not-found": "No account exists for that email.",
  "auth/wrong-password": "That email and password do not match.",
  "auth/email-already-in-use": "An account already exists for that email.",
  "auth/weak-password": "Choose a longer password - at least 8 characters.",
  "auth/too-many-requests":
    "Too many attempts. Wait a few minutes and try again.",
  "auth/popup-closed-by-user": "Sign-in was cancelled.",
  "auth/popup-blocked": "Your browser blocked the sign-in popup. Allow popups and retry.",
  "auth/account-exists-with-different-credential":
    "This email is already registered using a different sign-in method.",
  "auth/invalid-phone-number": "Enter a valid phone number, including the country code.",
  "auth/invalid-verification-code": "That code is not correct. Check and try again.",
  "auth/code-expired": "That code has expired. Request a new one.",
  "auth/missing-phone-number": "Enter a phone number first.",
  "auth/quota-exceeded": "Too many codes requested. Try again later.",
  "auth/operation-not-allowed":
    "This sign-in method is not enabled in the Firebase console yet.",
  "auth/network-request-failed": "Network problem. Check your connection and retry.",
  "auth/requires-recent-login": "Please sign in again to complete this change.",
};

/** Turns any thrown value into something worth showing a person. */
export function authErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = String((error as { code: unknown }).code);
    if (AUTH_ERROR_MESSAGES[code]) return AUTH_ERROR_MESSAGES[code];
    // Unknown but clearly a Firebase code - show it rather than a lie,
    // so a bug report carries something actionable.
    if (code.startsWith("auth/")) return `Sign-in failed (${code}).`;
  }
  if (error instanceof Error && error.message) return error.message;
  return "Something went wrong. Please try again.";
}
