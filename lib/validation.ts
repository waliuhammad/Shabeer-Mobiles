/**
 * Shared field validators.
 *
 * Checkout, Register and Contact all ask for a phone number. Before this
 * file existed, the rule lived in lib/checkout-utils.ts and the other forms
 * would each have grown their own slightly different regex - which is how a
 * number that is accepted at checkout gets rejected on the contact form.
 *
 * One rule per concept, imported everywhere.
 *
 * IMPORTANT: every function here is CONVENIENCE validation. It tells an
 * honest customer they mistyped something. It stops nobody - anyone can
 * disable JavaScript or POST directly to an endpoint. When real endpoints
 * exist, the server must run its own validation before writing anything.
 * Client validation is a nicety; server validation is the actual rule.
 */

/**
 * Accepts the ways Pakistani mobile numbers are actually written:
 *   03001234567      0300-1234567
 *   +923001234567    0092 300 1234567
 * Spaces, dashes and brackets are stripped before matching.
 */
export function isValidPakistaniPhone(raw: string): boolean {
  const digits = raw.replace(/[\s\-()]/g, "");
  return /^(?:\+92|0092|92|0)3\d{9}$/.test(digits);
}

/**
 * Deliberately loose. Rejecting valid-but-unusual addresses annoys real
 * customers far more often than it catches typos.
 */
export function isValidEmail(raw: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(raw);
}

/** Minimum password length for the demo register form. */
export const MIN_PASSWORD_LENGTH = 8;

export function isValidPassword(raw: string): boolean {
  return raw.length >= MIN_PASSWORD_LENGTH;
}
