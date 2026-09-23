"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { LogIn, Smartphone, Loader2, TriangleAlert } from "lucide-react";
import { sendPasswordResetEmail } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/shared/FormField";
import { SocialAuthButtons } from "@/components/auth/SocialAuthButtons";
import { PhoneSignIn } from "@/components/auth/PhoneSignIn";
import { useAuth } from "@/context/AuthContext";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { isValidEmail } from "@/lib/validation";
import { authErrorMessage } from "@/types/auth";

interface LoginFields {
  email: string;
  password: string;
}

type LoginErrors = Partial<Record<keyof LoginFields, string>>;

function validate(fields: LoginFields): LoginErrors {
  const errors: LoginErrors = {};
  if (!fields.email.trim()) errors.email = "Enter your email address.";
  else if (!isValidEmail(fields.email)) errors.email = "That is not a valid email address.";
  if (!fields.password) errors.password = "Password is required.";
  return errors;
}

/**
 * The login form - now backed by real Firebase Authentication.
 *
 * WHY EMAIL AND PHONE ARE SEPARATE MODES
 * --------------------------------------
 * This form used to take "phone or email" in one box, because neither
 * did anything. They cannot share a box any more: an email sign-in needs
 * a password, and a phone sign-in has no password at all - it sends a
 * code. Pretending otherwise would mean showing a password field that
 * does nothing for half the people using it.
 *
 * WHAT HAPPENS ON SUCCESS
 * Firebase signs the user in, AuthContext's onIdTokenChanged listener
 * fires, and the ID token is posted to /api/auth/session which sets an
 * httpOnly cookie. router.refresh() then re-renders the server
 * components so the page comes back knowing who you are.
 */
export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { signInWithEmail, configError } = useAuth();

  const [mode, setMode] = useState<"email" | "phone">("email");
  const [fields, setFields] = useState<LoginFields>({ email: "", password: "" });
  const [errors, setErrors] = useState<LoginErrors>({});
  const [touched, setTouched] = useState<Set<keyof LoginFields>>(new Set());
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function setField(name: keyof LoginFields, value: string) {
    const next = { ...fields, [name]: value };
    setFields(next);
    setFormError(null);
    if (touched.has(name)) setErrors(visibleErrors(validate(next), touched));
  }

  function blurField(name: keyof LoginFields) {
    const nextTouched = new Set(touched).add(name);
    setTouched(nextTouched);
    setErrors(visibleErrors(validate(fields), nextTouched));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validate(fields);
    if (Object.keys(found).length > 0) {
      setTouched(new Set(Object.keys(fields) as (keyof LoginFields)[]));
      setErrors(found);
      return;
    }

    setBusy(true);
    setFormError(null);
    try {
      await signInWithEmail(fields.email, fields.password);
      toast.success("Signed in.");
      // `next` is set by proxy.ts when it bounced an unauthenticated
      // visitor, so they land where they were actually going.
      router.push(params.get("next") ?? "/account");
      router.refresh();
    } catch (error) {
      setFormError(authErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function handleReset() {
    if (!isValidEmail(fields.email)) {
      setFormError("Enter your email address first, then tap reset.");
      return;
    }
    try {
      await sendPasswordResetEmail(getFirebaseAuth(), fields.email.trim());
      toast.success("Reset email sent.", {
        description: "Check your inbox for a link to choose a new password.",
      });
    } catch (error) {
      setFormError(authErrorMessage(error));
    }
  }

  // Without config nothing below can work, so say so rather than letting
  // every button throw.
  if (configError) {
    return (
      <p className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-xs leading-relaxed text-foreground">
        <TriangleAlert className="mt-px size-4 shrink-0 text-destructive" aria-hidden="true" />
        {configError}
      </p>
    );
  }

  if (mode === "phone") {
    return <PhoneSignIn onBack={() => setMode("email")} />;
  }

  return (
    <div className="space-y-5">
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <FormField
          label="Email"
          type="email"
          value={fields.email}
          onChange={(v) => setField("email", v)}
          onBlur={() => blurField("email")}
          error={errors.email}
          placeholder="you@example.com"
          autoComplete="email"
          required
        />

        <div>
          <FormField
            label="Password"
            type="password"
            value={fields.password}
            onChange={(v) => setField("password", v)}
            onBlur={() => blurField("password")}
            error={errors.password}
            placeholder="Your password"
            autoComplete="current-password"
            required
          />
          <button
            type="button"
            onClick={handleReset}
            className="mt-1.5 block w-full text-right text-xs font-medium text-secondary hover:underline"
          >
            Forgot password?
          </button>
        </div>

        {formError && (
          <p role="alert" className="text-xs font-medium text-destructive">
            {formError}
          </p>
        )}

        <Button
          type="submit"
          disabled={busy}
          className="h-11 w-full gap-2 bg-accent font-semibold text-accent-foreground hover:bg-gold-deep"
        >
          {busy ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <LogIn className="size-4" aria-hidden="true" />
          )}
          {busy ? "Signing in..." : "Login"}
        </Button>
      </form>

      <Button
        type="button"
        variant="outline"
        onClick={() => setMode("phone")}
        className="h-10 w-full gap-1.5 text-sm"
      >
        <Smartphone className="size-4" aria-hidden="true" />
        Sign in with phone number
      </Button>

      <SocialAuthButtons />
    </div>
  );
}

/** Only show errors for fields the customer has already left. */
function visibleErrors(
  all: LoginErrors,
  touched: Set<keyof LoginFields>
): LoginErrors {
  const out: LoginErrors = {};
  for (const key of Object.keys(all) as (keyof LoginFields)[]) {
    if (touched.has(key)) out[key] = all[key];
  }
  return out;
}
