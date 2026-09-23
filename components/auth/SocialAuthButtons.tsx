"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FacebookIcon, GoogleIcon } from "@/components/shared/BrandIcons";
import { DEFAULT_SIGNED_IN_ROUTE } from "@/lib/feature-flags";
import { useAuth } from "@/context/AuthContext";
import { authErrorMessage } from "@/types/auth";

/**
 * Continue with Google.
 *
 * GOOGLE IS LIVE; FACEBOOK IS NOT, and it stays visibly disabled rather
 * than clickable-but-fake. A button that looks live and silently does
 * nothing is the worst of both worlds - a tester cannot tell a missing
 * integration from a broken one.
 *
 * Facebook needs a Meta developer app and review before it can be
 * enabled, which is a separate piece of work from Firebase itself. When
 * that is done, the handler mirrors the Google one exactly.
 *
 * NOTE: Google sign-in must also be enabled in the Firebase console
 * (Authentication -> Sign-in method). If it is not, Firebase returns
 * auth/operation-not-allowed, which authErrorMessage translates into a
 * message that says exactly that.
 */
export function SocialAuthButtons() {
  const router = useRouter();
  const params = useSearchParams();
  const { signInWithGoogle } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGoogle() {
    setBusy(true);
    setError(null);
    try {
      await signInWithGoogle();
      toast.success("Signed in with Google.");
      router.push(params.get("next") ?? DEFAULT_SIGNED_IN_ROUTE);
      router.refresh();
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="relative py-1">
        <span className="absolute inset-x-0 top-1/2 h-px bg-border" aria-hidden="true" />
        <span className="relative mx-auto block w-fit bg-card px-3 text-xs text-muted-foreground">
          or continue with
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Button
          type="button"
          variant="outline"
          onClick={handleGoogle}
          disabled={busy}
          className="h-11 w-full gap-2 font-medium"
        >
          {busy ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <GoogleIcon className="size-4" />
          )}
          Google
        </Button>

        <Button
          type="button"
          variant="outline"
          disabled
          title="Facebook sign-in needs a Meta developer app"
          className="h-11 w-full gap-2 font-medium"
        >
          <FacebookIcon className="size-4" />
          Facebook
        </Button>
      </div>

      {error ? (
        <p role="alert" className="text-center text-[11px] font-medium text-destructive">
          {error}
        </p>
      ) : (
        <p className="text-center text-[11px] text-muted-foreground">
          Facebook sign-in needs a Meta developer app - not set up yet.
        </p>
      )}
    </div>
  );
}
