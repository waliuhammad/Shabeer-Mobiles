"use client";

import { useState } from "react";
import { CheckCircle2, Send } from "lucide-react";
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
 * It does NOT send anything. There is no email service connected, and a
 * form that silently discards a customer's message would be worse than no
 * form - the customer would wait for a reply that never comes. So the
 * success state says plainly that nothing was sent, and points at the phone
 * number instead.
 *
 * PHASE 2+:
 *     Contact Form -> Cloud Function -> Email Service -> shop inbox
 * The Cloud Function matters: an email API key can never live in the
 * browser, and a public endpoint needs rate limiting and spam protection
 * that only trusted server code can enforce.
 */
export function ContactForm() {
  const [fields, setFields] = useState<ContactFields>(EMPTY);
  const [errors, setErrors] = useState<ContactErrors>({});
  const [touched, setTouched] = useState<Set<keyof ContactFields>>(new Set());
  const [sent, setSent] = useState(false);

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

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const found = validate(fields);
    if (Object.keys(found).length > 0) {
      setTouched(new Set(Object.keys(fields) as (keyof ContactFields)[]));
      setErrors(found);
      return;
    }

    setSent(true);
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
          <strong className="font-semibold">Development note:</strong> no email
          was actually sent - the messaging service is connected in a later
          phase. For anything urgent, please call or WhatsApp the shop directly.
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setFields(EMPTY);
            setTouched(new Set());
            setErrors({});
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

      <Button
        type="submit"
        className="mt-5 h-11 w-full gap-2 bg-accent font-semibold text-accent-foreground hover:bg-gold-deep sm:w-auto sm:px-8"
      >
        <Send className="size-4" aria-hidden="true" />
        Send Message
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
