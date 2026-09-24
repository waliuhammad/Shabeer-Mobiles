"use client";

import { useState } from "react";
import { CheckCircle2, Send, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/shared/FormField";
import { isValidEmail, isValidPakistaniPhone } from "@/lib/validation";

interface ContactFields {
  name: string;
  phone: string;
  email: string;
  subject: string;
  message: string;
}

type ContactErrors = Partial<Record<keyof ContactFields, string>>;

const EMPTY: ContactFields = {
  name: "",
  phone: "",
  email: "",
  subject: "",
  message: "",
};

function validate(fields: ContactFields): ContactErrors {
  const errors: ContactErrors = {};

  if (fields.name.trim().length < 3) {
    errors.name = "Please enter your name.";
  }

  if (!fields.phone.trim()) {
    errors.phone = "Phone number is required so we can reply.";
  } else if (!isValidPakistaniPhone(fields.phone)) {
    errors.phone = "Enter a valid mobile number, e.g. 0300 1234567.";
  }

  // Optional, but must be plausible if given.
  if (fields.email.trim() && !isValidEmail(fields.email.trim())) {
    errors.email = "That email address does not look right.";
  }

  if (!fields.subject.trim()) {
    errors.subject = "Please add a short subject.";
  }

  if (fields.message.trim().length < 10) {
    errors.message = "Please describe your question in a little more detail.";
  }

  return errors;
}

/**
 * The contact form.
 *
 * IT NOW ACTUALLY SENDS. It used to validate the fields, call
 * setSent(true) and stop - the enquiry went nowhere, while the customer
 * read "your message has been received" and waited for a reply that
 * could never come. Every enquiry typed into this form was lost.
 *
 * It POSTs to /api/contact, which validates again on the server and
 * writes to Firestore. The shop reads them in /admin/messages.
 *
 * WHY NOT EMAIL: an email provider needs an account and an API key
 * nobody has supplied, and the key could never live in the browser
 * anyway. Storing the enquiry where the shop already looks is worth
 * more than a delivery route that does not exist yet. If email is
 * wanted later, the route handler is the one place to add it.
 *
 * A FAILED SEND NOW SAYS SO. The submit button reports the error and
 * offers the phone number, instead of showing a success screen over a
 * message that never arrived.
 */
export function ContactForm() {
  const [fields, setFields] = useState<ContactFields>(EMPTY);
  const [errors, setErrors] = useState<ContactErrors>({});
  const [touched, setTouched] = useState<Set<keyof ContactFields>>(new Set());
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  function setField(name: keyof ContactFields, value: string) {
    const next = { ...fields, [name]: value };
    setFields(next);
    if (touched.has(name)) setErrors(visibleErrors(validate(next), touched));
  }

  function blurField(name: keyof ContactFields) {
    const nextTouched = new Set(touched).add(name);
    setTouched(nextTouched);
    setErrors(visibleErrors(validate(fields), nextTouched));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const found = validate(fields);
    if (Object.keys(found).length > 0) {
      setTouched(new Set(Object.keys(fields) as (keyof ContactFields)[]));
      setErrors(found);
      return;
    }

    setSending(true);
    setSendError(null);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fields.name.trim(),
          phone: fields.phone.trim(),
          email: fields.email.trim(),
          subject: fields.subject.trim(),
          message: fields.message.trim(),
        }),
      });

      if (!response.ok) {
        // The success screen is shown ONLY on a confirmed write. Showing
        // it on a failure is what the old version effectively did, and
        // it is the one outcome a contact form must never produce.
        throw new Error(String(response.status));
      }

      setSent(true);
    } catch {
      setSendError(
        "Your message could not be sent. Please call or WhatsApp the shop instead."
      );
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card px-6 py-12 text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-success/10 text-success">
          <CheckCircle2 className="size-7" aria-hidden="true" />
        </span>
        <p className="text-base font-semibold text-foreground">
          Thanks! Your message has been received.
        </p>
        <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
          The shop has it and will get back to you on the number you gave.
          For anything urgent, please call or WhatsApp instead - that
          reaches the counter straight away.
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setFields(EMPTY);
            setTouched(new Set());
            setErrors({});
            setSendError(null);
            setSent(false);
          }}
          className="mt-1 h-10 px-4 text-sm font-medium"
        >
          Send another message
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="rounded-xl border border-border bg-card p-5 sm:p-6"
    >
      <h2 className="mb-1 font-heading text-lg font-bold text-primary">
        Send Us a Message
      </h2>
      <p className="mb-5 text-sm text-muted-foreground">
        Ask about a product, a repair or the status of an order.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="Name"
          value={fields.name}
          onChange={(v) => setField("name", v)}
          onBlur={() => blurField("name")}
          error={errors.name}
          placeholder="Muhammad Ahmed"
          autoComplete="name"
          required
        />

        <FormField
          label="Phone"
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
          label="Email (optional)"
          type="email"
          value={fields.email}
          onChange={(v) => setField("email", v)}
          onBlur={() => blurField("email")}
          error={errors.email}
          placeholder="you@example.com"
          autoComplete="email"
        />

        <FormField
          label="Subject"
          value={fields.subject}
          onChange={(v) => setField("subject", v)}
          onBlur={() => blurField("subject")}
          error={errors.subject}
          placeholder="Screen replacement enquiry"
          required
        />

        <FormField
          label="Message"
          value={fields.message}
          onChange={(v) => setField("message", v)}
          onBlur={() => blurField("message")}
          error={errors.message}
          placeholder="Tell us your phone model and what you need."
          textarea
          rows={5}
          required
          className="sm:col-span-2"
        />
      </div>

      {/* A failure has to be visible and has to offer a way through.
          role="alert" so it is announced rather than silently appearing
          above a button the customer is already pressing again. */}
      {sendError && (
        <p
          role="alert"
          className="mt-5 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs leading-relaxed text-foreground"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
          {sendError}
        </p>
      )}

      <Button
        type="submit"
        disabled={sending}
        className="mt-5 h-11 w-full gap-2 bg-accent font-semibold text-accent-foreground hover:bg-gold-deep sm:w-auto sm:px-8"
      >
        {sending ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Sending...
          </>
        ) : (
          <>
            <Send className="size-4" aria-hidden="true" />
            Send Message
          </>
        )}
      </Button>
    </form>
  );
}

function visibleErrors(
  all: ContactErrors,
  touched: Set<keyof ContactFields>
): ContactErrors {
  const out: ContactErrors = {};
  for (const key of Object.keys(all) as (keyof ContactFields)[]) {
    if (touched.has(key)) out[key] = all[key];
  }
  return out;
}
