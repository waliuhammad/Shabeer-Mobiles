import { Suspense } from "react";
import type { Metadata } from "next";
import { ONLINE_ORDERING_ENABLED } from "@/lib/feature-flags";
import { AuthShell } from "@/components/auth/AuthShell";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Login",
  description: "Sign in to your Shabbir Mobiles account.",
  robots: { index: false, follow: true },
};

/**
 * The Suspense boundary is REQUIRED, not stylistic.
 *
 * LoginForm reads useSearchParams() to honour the ?next= that proxy.ts
 * adds when it bounces an unauthenticated visitor. Search params are not
 * known at build time, so Next.js refuses to prerender the page without
 * a boundary telling it what to show while the client resolves them.
 *
 * Without this the production build fails outright with
 * "useSearchParams() should be wrapped in a suspense boundary".
 */
function AuthFormFallback() {
  return (
    <div className="space-y-4" aria-hidden="true">
      <div className="h-[72px] animate-pulse rounded-lg bg-muted" />
      <div className="h-[72px] animate-pulse rounded-lg bg-muted" />
      <div className="h-11 animate-pulse rounded-lg bg-muted" />
    </div>
  );
}

/**
 * /login - a Server Component shell around the interactive form.
 *
 * This page stays reachable whatever the flags say, because it is how
 * STAFF get into the admin panel. What changes is who it is addressed
 * to: with customer accounts off there is no public sign-up to offer, so
 * the Register line goes and the wording stops implying the visitor
 * should have an account.
 */
export default function LoginPage() {
  return (
    <AuthShell
      title={ONLINE_ORDERING_ENABLED ? "Welcome Back" : "Staff Login"}
      subtitle={
        ONLINE_ORDERING_ENABLED
          ? "Login to your account"
          : "Sign in to open the Shabbir Mobiles admin panel"
      }
      footerPrompt={ONLINE_ORDERING_ENABLED ? "Don't have an account?" : undefined}
      footerLinkLabel={ONLINE_ORDERING_ENABLED ? "Register" : undefined}
      footerLinkHref={ONLINE_ORDERING_ENABLED ? "/register" : undefined}
    >
      <Suspense fallback={<AuthFormFallback />}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
