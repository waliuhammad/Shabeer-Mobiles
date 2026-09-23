"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { UserPlus, Loader2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/shared/FormField";
import { SocialAuthButtons } from "@/components/auth/SocialAuthButtons";
import { DEFAULT_SIGNED_IN_ROUTE } from "@/lib/feature-flags";
import { useAuth } from "@/context/AuthContext";
import { authErrorMessage } from "@/types/auth";
import {
  MIN_PASSWORD_LENGTH,
  isValidEmail,
  isValidPakistaniPhone,
  isValidPassword,
} from "@/lib/validation";

interface RegisterFields {
  fullName: string;
  phone: string;
  email: string;
  password: string;
  confirmPassword: string;
}

type RegisterErrors = Partial<Record<keyof RegisterFields, string>>;

function validate(fields: RegisterFields): RegisterErrors {
  const errors: RegisterErrors = {};

  if (fields.fullName.trim().length < 3) {
    errors.fullName = "Please enter your full name.";
  }

  if (!fields.phone.trim()) {
    errors.phone = "Phone number is required.";
  } else if (!isValidPakistaniPhone(fields.phone)) {
    errors.phone = "Enter a valid mobile number, e.g. 0300 1234567.";
  }

  if (!fields.email.trim()) {
    errors.email = "Email is required to recover your account.";
  } else if (!isValidEmail(fields.email.trim())) {
    errors.email = "That email address does not look right.";
  }

  if (!isValidPassword(fields.password)) {
    errors.password = `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  }

  // Checked only once the first password is itself valid, so the customer
  // is not fighting two errors at once.
  if (!errors.password && fields.confirmPassword !== fields.password) {
    errors.confirmPassword = "Passwords do not match.";
  }

  return errors;
}

export function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { registerWithEmail, configError } = useAuth();
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [fields, setFields] = useState<RegisterFields>({
    fullName: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<RegisterErrors>({});
  const [touched, setTouched] = useState<Set<keyof RegisterFields>>(new Set());

  function setField(name: keyof RegisterFields, value: string) {
    const next = { ...fields, [name]: value };
    setFields(next);
    setFormError(null);
    if (touched.has(name)) setErrors(visibleErrors(validate(next), touched));
  }

  function blurField(name: keyof RegisterFields) {
    const nextTouched = new Set(touched).add(name);
    setTouched(nextTouched);
    setErrors(visibleErrors(validate(fields), nextTouched));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const found = validate(fields);
    if (Object.keys(found).length > 0) {
      setTouched(new Set(Object.keys(fields) as (keyof RegisterFields)[]));
      setErrors(found);
      return;
    }

    setBusy(true);
    setFormError(null);
    try {
      /**
       * The raw password goes straight to Firebase and is never stored
       * by this app - not in state beyond this call, not in a cookie,
       * not in a log. Firebase hashes it server-side with scrypt.
       *
       * NOTE the phone number collected here is NOT yet attached to the
       * Firebase account: linking a phone requires an SMS verification
       * of its own. It is kept for the customer record, which is
       * written once Firestore lands in the next step.
       */
      await registerWithEmail(fields.fullName, fields.email, fields.password);
      toast.success("Account created.", { description: "You are now signed in." });
      router.push(params.get("next") ?? DEFAULT_SIGNED_IN_ROUTE);
      router.refresh();
    } catch (error) {
      setFormError(authErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  if (configError) {
    return (
      <p className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-xs leading-relaxed text-foreground">
        <TriangleAlert className="mt-px size-4 shrink-0 text-destructive" aria-hidden="true" />
        {configError}
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <FormField
          label="Full Name"
          value={fields.fullName}
          onChange={(v) => setField("fullName", v)}
          onBlur={() => blurField("fullName")}
          error={errors.fullName}
          placeholder="Muhammad Ahmed"
          autoComplete="name"
          required
        />

        <FormField
          label="Phone Number"
          type="tel"
          value={fields.phone}
          onChange={(v) => setField("phone", v)}
          onBlur={() => blurField("phone")}
          error={errors.phone}
          placeholder="0300 1234567"
          autoComplete="tel"
          required
        />

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

        <FormField
          label="Password"
          type="password"
          value={fields.password}
          onChange={(v) => setField("password", v)}
          onBlur={() => blurField("password")}
          error={errors.password}
          placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
          autoComplete="new-password"
          required
        />

        <FormField
          label="Confirm Password"
          type="password"
          value={fields.confirmPassword}
          onChange={(v) => setField("confirmPassword", v)}
          onBlur={() => blurField("confirmPassword")}
          error={errors.confirmPassword}
          placeholder="Re-enter your password"
          autoComplete="new-password"
          required
        />

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
            <UserPlus className="size-4" aria-hidden="true" />
          )}
          {busy ? "Creating account..." : "Create Account"}
        </Button>
      </form>

      <SocialAuthButtons />
    </div>
  );
}

function visibleErrors(
  all: RegisterErrors,
  touched: Set<keyof RegisterFields>
): RegisterErrors {
  const out: RegisterErrors = {};
  for (const key of Object.keys(all) as (keyof RegisterFields)[]) {
    if (touched.has(key)) out[key] = all[key];
  }
  return out;
}
