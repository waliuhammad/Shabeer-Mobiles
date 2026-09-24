/**
 * An enquiry sent from the public contact form.
 *
 * Before this existed the form validated its fields, showed a success
 * message and threw the enquiry away - `setSent(true)` was the entire
 * submit handler. The customer believed they had contacted the shop.
 */

/** Where a message is in the shop's handling of it. */
export type MessageStatus = "NEW" | "READ" | "ARCHIVED";

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  /** Optional - the form asks for it but does not insist. */
  phone: string;
  subject: string;
  message: string;
  status: MessageStatus;
  /** ISO 8601, set on the server so a wrong device clock cannot lie. */
  createdAt: string;
}

/** What the browser is allowed to send. Everything else is server-set. */
export interface ContactMessageInput {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
}

/**
 * Limits applied on the SERVER, not just in the form.
 *
 * A public endpoint gets whatever anyone chooses to POST at it, so the
 * form's own validation is a convenience for honest users and nothing
 * more. These caps are what actually stop a 10 MB "message" from being
 * written into the shop's database.
 */
export const MESSAGE_LIMITS = {
  name: 80,
  email: 160,
  phone: 32,
  subject: 120,
  message: 2000,
} as const;
