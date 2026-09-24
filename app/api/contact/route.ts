import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin-db";
import { COLLECTIONS } from "@/lib/firebase/firestore";
import { MESSAGE_LIMITS } from "@/types/message";

/**
 * POST /api/contact - receive an enquiry from the public contact form.
 *
 * WHY A SERVER ROUTE AND NOT A CLIENT WRITE
 * -----------------------------------------
 * Anyone can submit this form, so the alternative was a Firestore rule
 * allowing unauthenticated creates on a collection. That opens the
 * shop's database to the open internet and leaves the shape of every
 * document to whatever the caller sends.
 *
 * Going through the Admin SDK here means firestore.rules can keep
 * `allow write: if false` on messages - nothing outside this file can
 * write one - and every field is checked and trimmed before it is
 * stored. The same reasoning as app/api/sales/route.ts: the trusted
 * path is on the server.
 *
 * WHAT IT DOES NOT DO: send email. That needs an email provider and a
 * credential nobody has supplied. The enquiry lands in /admin/messages
 * instead, which is a place the shop already looks.
 */

/** Trim, coerce to string, and cap. Returns "" for anything unusable. */
function clean(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

/**
 * Deliberately permissive - one @ with something either side.
 *
 * A stricter pattern rejects real addresses, and the cost of being
 * wrong is asymmetric: a bounced reply is a nuisance, a rejected
 * customer is a lost sale.
 */
function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid-json" }, { status: 400 });
  }

  const raw = (body ?? {}) as Record<string, unknown>;

  const name = clean(raw.name, MESSAGE_LIMITS.name);
  const email = clean(raw.email, MESSAGE_LIMITS.email);
  const phone = clean(raw.phone, MESSAGE_LIMITS.phone);
  const subject = clean(raw.subject, MESSAGE_LIMITS.subject);
  const message = clean(raw.message, MESSAGE_LIMITS.message);

  /**
   * PHONE is the required one, not email - and that follows the form,
   * which asks for a number "so we can reply". This is a Multan mobile
   * shop: the reply is a phone call or a WhatsApp message, and plenty
   * of customers have no email address to give. Requiring one here
   * would reject the enquiries the shop most wants.
   */
  if (!name || !phone || !subject || !message) {
    return NextResponse.json({ error: "missing-fields" }, { status: 400 });
  }
  if (email && !looksLikeEmail(email)) {
    return NextResponse.json({ error: "invalid-email" }, { status: 400 });
  }

  try {
    const db = getAdminDb();
    const ref = db.collection(COLLECTIONS.messages).doc();

    await ref.set({
      id: ref.id,
      name,
      email,
      phone,
      subject,
      message,
      status: "NEW",
      // Server clock. A device with the wrong date cannot file an
      // enquiry under last year and have it sink down the list.
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true, id: ref.id });
  } catch (error) {
    // The code, never the message or stack - those can carry
    // configuration details that should not reach a public caller.
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? String((error as { code: unknown }).code)
        : "unknown";

    console.error("[api/contact] failed to store message:", code);
    return NextResponse.json({ error: "store-failed", code }, { status: 503 });
  }
}
