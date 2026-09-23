import { Suspense } from "react";
import type { Metadata } from "next";
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

/** /login - a Server Component shell around the interactive form. */
export default function LoginPage() {
  return (
    <AuthShell
      title="Welcome Back"
      subtitle="Login to your account"
      footerPrompt="Don't have an account?"
      footerLinkLabel="Register"
      footerLinkHref="/register"
    >
      <Suspense fallback={<AuthFormFallback />}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
