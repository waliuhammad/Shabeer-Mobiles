"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  GoogleAuthProvider,
  RecaptchaVerifier,
  createUserWithEmailAndPassword,
  onIdTokenChanged,
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile,
  type ConfirmationResult,
  type User,
} from "firebase/auth";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase/client";
import type { AdminRole } from "@/lib/admin-nav";
import type { SessionUser } from "@/types/auth";

/**
 * Client-side auth state, and the only place sign-in is performed.
 *
 * TWO PLACES TRACK WHO YOU ARE, ON PURPOSE
 * ----------------------------------------
 *   1. Firebase, in the browser  -> drives the UI (this file)
 *   2. The session cookie, on the server -> drives authorization
 *      (lib/auth/dal.ts)
 *
 * They are kept in step by syncSession() below: whenever Firebase issues
 * a new ID token, it is posted to /api/auth/session, which mints a fresh
 * httpOnly cookie. Without that, signing in would update the header but
 * leave every server component still thinking you were a stranger.
 *
 * The UI must never make a security decision from this context. It is
 * here so the header can show a name and the account menu can appear -
 * nothing more. Anyone can set `user` in their own browser devtools.
 */

interface AuthContextValue {
  user: SessionUser | null;
  loading: boolean;
  configError: string | null;

  signInWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (
    name: string,
    email: string,
    password: string
  ) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  /** Step 1 of phone sign-in: sends the SMS. */
  startPhoneSignIn: (
    phoneNumber: string,
    recaptchaContainerId: string
  ) => Promise<ConfirmationResult>;
  /** Step 2: exchanges the typed code for a session. */
  confirmPhoneCode: (
    confirmation: ConfirmationResult,
    code: string
  ) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Firebase user + its claims -> the shape the UI uses. */
async function toSessionUser(user: User): Promise<SessionUser> {
  // Claims live inside the signed token, so they are read from it rather
  // than from a database document a user could try to write to.
  const token = await user.getIdTokenResult();
  const role = token.claims.role as AdminRole | undefined;

  return {
    uid: user.uid,
    email: user.email,
    phone: user.phoneNumber,
    displayName: user.displayName,
    emailVerified: user.emailVerified,
    role,
    isStaff: Boolean(token.claims.staff) && Boolean(role),
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);

  /**
   * Whether Firebase is configured is decided during RENDER, not in an
   * effect. It reads build-time environment variables, so the answer is
   * identical on the server and the client and cannot change while the
   * app is running - there is nothing to synchronise, and setting state
   * in an effect for a constant is what the React Compiler lint rule
   * exists to catch.
   *
   * It also means loading starts as false when config is missing, so the
   * UI shows the explanation immediately instead of spinning forever
   * waiting for a listener that will never be attached.
   */
  const configured = isFirebaseConfigured();
  const configError = configured
    ? null
    : "Firebase is not configured. Add the NEXT_PUBLIC_FIREBASE_* values to .env.local and restart the dev server.";

  const [loading, setLoading] = useState(configured);

  /**
   * Hand the current ID token to the server so it can mint the cookie.
   * Called on every token change, which includes sign-in and the silent
   * hourly refresh - so the cookie never drifts out of date.
   */
  const syncSession = useCallback(
    async (firebaseUser: User | null, { strict = false } = {}) => {
      try {
        if (!firebaseUser) {
          await fetch("/api/auth/session", { method: "DELETE" });
          return;
        }
        const idToken = await firebaseUser.getIdToken();
        const response = await fetch("/api/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken }),
        });

        /**
         * A FAILED SESSION IS NOT A SILENT FAILURE.
         *
         * This used to ignore the response entirely. If the server could
         * not mint a cookie - missing admin credentials, a clock skew,
         * a revoked account - Firebase had still signed the user in, so
         * the UI said "Signed in" while every server-rendered page
         * treated them as a stranger. The symptom was landing straight
         * back on the login page with no explanation.
         *
         * On an explicit sign-in (strict) that now throws, so the form
         * can say what went wrong. On a background token refresh it
         * stays quiet, because the user is not waiting on it and the
         * next refresh will try again.
         */
        if (strict && !response.ok) {
          const body: { error?: string } = await response.json().catch(() => ({}));
          throw new Error(
            body.error ?? "Signed in, but the server could not start a session."
          );
        }
      } catch (error) {
        if (strict) throw error;
        // Background refresh - the next one will try again.
      }
    },
    []
  );

  useEffect(() => {
    if (!configured) return;

    /**
     * onIdTokenChanged, NOT onAuthStateChanged.
     *
     * onAuthStateChanged fires on sign-in and sign-out only.
     * onIdTokenChanged also fires when the token silently refreshes
     * (roughly hourly) and when custom claims change. Since the session
     * cookie is derived from that token, this is the event that keeps
     * the server side honest - and it is what makes a newly granted
     * staff role take effect without the person signing out.
     */
    const unsubscribe = onIdTokenChanged(getFirebaseAuth(), async (firebaseUser) => {
      if (firebaseUser) {
        setUser(await toSessionUser(firebaseUser));
      } else {
        setUser(null);
      }
      await syncSession(firebaseUser);
      setLoading(false);
    });

    return unsubscribe;
  }, [syncSession, configured]);

  /**
   * EVERY SIGN-IN AWAITS THE SESSION COOKIE BEFORE RESOLVING.
   *
   * The onIdTokenChanged listener also creates the cookie, but it runs
   * asynchronously - so a form that navigated as soon as signIn resolved
   * could arrive at /admin BEFORE the cookie existed. proxy.ts would see
   * no cookie and bounce it straight back to /login, which looked like
   * "it says signed in but nothing happens".
   *
   * It won the race locally and lost it on Vercel, where the round trip
   * is slower. Awaiting here removes the race rather than hiding it
   * behind a timeout.
   */
  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      const credential = await signInWithEmailAndPassword(
        getFirebaseAuth(),
        email.trim(),
        password
      );
      await syncSession(credential.user, { strict: true });
    },
    [syncSession]
  );

  const registerWithEmail = useCallback(
    async (name: string, email: string, password: string) => {
      const credential = await createUserWithEmailAndPassword(
        getFirebaseAuth(),
        email.trim(),
        password
      );
      if (name.trim()) {
        await updateProfile(credential.user, { displayName: name.trim() });
        // updateProfile does not re-fire the listener, so refresh the
        // local copy or the header would show an empty name until reload.
        setUser(await toSessionUser(credential.user));
      }
      // Same reason as signInWithEmail: the caller navigates as soon as
      // this resolves, so the cookie has to exist by then.
      await syncSession(credential.user, { strict: true });
    },
    [syncSession]
  );

  const signInWithGoogle = useCallback(async () => {
    const provider = new GoogleAuthProvider();
    // Always ask which account, rather than silently reusing the last
    // one - shared shop computers are the normal case here.
    provider.setCustomParameters({ prompt: "select_account" });
    const credential = await signInWithPopup(getFirebaseAuth(), provider);
    await syncSession(credential.user, { strict: true });
  }, [syncSession]);

  /**
   * Phone sign-in, step 1.
   *
   * Firebase requires a reCAPTCHA verifier before it will send an SMS -
   * without it anyone could burn through the SMS quota (and the shop's
   * money) with a loop. The "invisible" size means the shopper normally
   * sees nothing; the challenge only appears if Google is suspicious.
   *
   * The verifier is rebuilt for every attempt on purpose: a verifier
   * that has already been solved cannot be reused, and reusing one is
   * the usual cause of a second send failing silently.
   */
  const startPhoneSignIn = useCallback(
    async (phoneNumber: string, recaptchaContainerId: string) => {
      const auth = getFirebaseAuth();
      const verifier = new RecaptchaVerifier(auth, recaptchaContainerId, {
        size: "invisible",
      });
      try {
        return await signInWithPhoneNumber(auth, phoneNumber, verifier);
      } catch (error) {
        // Free the widget, or the container keeps a solved instance and
        // the next attempt throws "reCAPTCHA has already been rendered".
        verifier.clear();
        throw error;
      }
    },
    []
  );

  const confirmPhoneCode = useCallback(
    async (confirmation: ConfirmationResult, code: string) => {
      const credential = await confirmation.confirm(code.trim());
      await syncSession(credential.user, { strict: true });
    },
    [syncSession]
  );

  const signOut = useCallback(async () => {
    // Firebase first, so the listener fires and clears local state; then
    // the cookie, which also revokes refresh tokens server-side.
    await firebaseSignOut(getFirebaseAuth());
    await fetch("/api/auth/session", { method: "DELETE" });
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      configError,
      signInWithEmail,
      registerWithEmail,
      signInWithGoogle,
      startPhoneSignIn,
      confirmPhoneCode,
      signOut,
    }),
    [
      user, loading, configError, signInWithEmail, registerWithEmail,
      signInWithGoogle, startPhoneSignIn, confirmPhoneCode, signOut,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside an <AuthProvider>");
  }
  return context;
}
