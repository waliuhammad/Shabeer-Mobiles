import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ONLINE_ORDERING_ENABLED } from "@/lib/feature-flags";
import { AuthShell } from "@/components/auth/AuthShell";
import { RegisterForm } from "@/components/auth/RegisterForm";

export const metadata: Metadata = {
  title: "Create Account",
  description: "Create a Shabbir Mobiles account to track your orders.",
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
 * /register - a Server Component shell around the interactive form.
 *
 * DISABLED while ONLINE_ORDERING_ENABLED is false. Public sign-up exists
 * so a customer can track orders and keep addresses; with no ordering
 * there is nothing for a customer account to hold, and an open sign-up
 * form would just collect accounts nobody uses.
 *
 * STAFF accounts are not created here in any case - they are made in
 * Firebase and granted a role with scripts/set-role.mjs, so nothing
 * about staff sign-in depends on this page.
 */
export default function RegisterPage() {
  if (!ONLINE_ORDERING_ENABLED) notFound();

  return (
    <AuthShell
      title="Create Account"
      subtitle="Join Shabbir Mobiles to track your orders"
      footerPrompt="Already have an account?"
      footerLinkLabel="Login"
      footerLinkHref="/login"
    >
      <Suspense fallback={<AuthFormFallback />}>
        <RegisterForm />
      </Suspense>
    </AuthShell>
  );
}
