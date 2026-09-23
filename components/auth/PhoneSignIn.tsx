"use client";

import { useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { MessageSquare, ArrowLeft, Loader2 } from "lucide-react";
import type { ConfirmationResult } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/shared/FormField";
import { useAuth } from "@/context/AuthContext";
import { isValidPakistaniPhone } from "@/lib/validation";
import { authErrorMessage } from "@/types/auth";

/**
 * Phone sign-in, in two steps.
 *
 * WHY THE NUMBER IS CONVERTED TO +92 FORMAT
 * -----------------------------------------
 * People here type 0300 1234567. Firebase requires E.164 - a plus sign,
 * the country code, no spaces: +923001234567. Converting silently is
 * kinder than rejecting a number the customer wrote perfectly correctly
 * by local convention.
 *
 * WHY THERE IS AN EMPTY DIV AT THE BOTTOM
 * ---------------------------------------
 * Firebase mounts its reCAPTCHA widget into that container by id. It is
 * invisible in normal use - the challenge only appears if Google finds
 * the request suspicious - but the element must exist in the DOM before
 * signInWithPhoneNumber is called, or the SDK throws.
 *
 * The reCAPTCHA is not decoration: without it, anyone could script a
 * loop that sends thousands of SMS messages, every one of them billed
 * to the shop.
 */

/** 0300 1234567 | 03001234567 | +923001234567  ->  +923001234567 */
export function toE164(raw: string): string {
  const digits = raw.replace(/[\s\-()]/g, "");
  if (digits.startsWith("+")) return digits;
  if (digits.startsWith("0092")) return `+${digits.slice(2)}`;
  if (digits.startsWith("92")) return `+${digits}`;
  if (digits.startsWith("0")) return `+92${digits.slice(1)}`;
  return `+92${digits}`;
}

const RECAPTCHA_CONTAINER_ID = "phone-recaptcha";

export function PhoneSignIn({ onBack }: { onBack: () => void }) {
  const router = useRouter();
  const params = useSearchParams();
  const { startPhoneSignIn, confirmPhoneCode } = useAuth();

  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const confirmation = useRef<ConfirmationResult | null>(null);
  const [codeSent, setCodeSent] = useState(false);

  async function handleSend(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isValidPakistaniPhone(phone)) {
      setError("Enter a valid Pakistani mobile number, e.g. 0300 1234567.");
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      confirmation.current = await startPhoneSignIn(
        toE164(phone),
        RECAPTCHA_CONTAINER_ID
      );
      setCodeSent(true);
      toast.success("Code sent.", { description: `Check ${phone} for a 6-digit code.` });
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!confirmation.current) {
      setError("Request a new code.");
      return;
    }
    if (code.trim().length < 6) {
      setError("The code is 6 digits.");
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      await confirmPhoneCode(confirmation.current, code);
      toast.success("Signed in.");
      router.push(params.get("next") ?? "/account");
      router.refresh();
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {!codeSent ? (
        <form onSubmit={handleSend} noValidate className="space-y-4">
          <FormField
            label="Phone Number"
            type="tel"
            value={phone}
            onChange={(v) => { setPhone(v); setError(undefined); }}
            error={error}
            placeholder="0300 1234567"
            autoComplete="tel"
            required
          />
          <p className="text-[11px] text-muted-foreground">
            We will send a 6-digit code by SMS. Standard rates apply.
          </p>
          <Button
            type="submit"
            disabled={busy}
            className="h-11 w-full gap-2 bg-accent font-semibold text-accent-foreground hover:bg-gold-deep"
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <MessageSquare className="size-4" aria-hidden="true" />
            )}
            {busy ? "Sending..." : "Send Code"}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleConfirm} noValidate className="space-y-4">
          <FormField
            label="6-Digit Code"
            type="text"
            value={code}
            onChange={(v) => { setCode(v); setError(undefined); }}
            error={error}
            placeholder="123456"
            autoComplete="one-time-code"
            required
          />
          <p className="text-[11px] text-muted-foreground">
            Sent to {toE164(phone)}.{" "}
            <button
              type="button"
              onClick={() => { setCodeSent(false); setCode(""); setError(undefined); }}
              className="font-medium text-secondary hover:underline"
            >
              Use a different number
            </button>
          </p>
          <Button
            type="submit"
            disabled={busy}
            className="h-11 w-full gap-2 bg-accent font-semibold text-accent-foreground hover:bg-gold-deep"
          >
            {busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            {busy ? "Verifying..." : "Verify & Sign In"}
          </Button>
        </form>
      )}

      <Button
        type="button"
        variant="outline"
        onClick={onBack}
        className="h-10 w-full gap-1.5 text-sm"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Use email instead
      </Button>

      {/* Firebase mounts the invisible reCAPTCHA here. Must exist in the
          DOM before a code can be requested. */}
      <div id={RECAPTCHA_CONTAINER_ID} />
    </div>
  );
}
