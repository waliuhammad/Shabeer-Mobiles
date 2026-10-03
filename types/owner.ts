/**
 * Owner / stakeholder domain types.
 *
 * WHO THIS IS FOR, and why it is not the staff directory.
 *
 * The shop has two working owners who stand at the counter, and it
 * rents its premises from the people who own the plaza. Neither is
 * "staff": staff is about who may sign in and what they may do, which
 * is a Firebase custom claim and lives nowhere near this. This is a
 * record of the people with a stake in the business and the building -
 * who they are, how to reach them, and what share they hold.
 *
 * It grants NOTHING. Adding somebody here does not give them a login,
 * and removing them does not take one away. That separation is
 * deliberate: a contact record that silently carried access would be a
 * way to grant access without anyone realising they had.
 */

/**
 * What this person is to the business.
 *
 * A short fixed list rather than free text, so the page can be grouped
 * and filtered by it later. "Other" exists so an unusual arrangement -
 * a silent investor, a family member with a claim - can still be
 * written down rather than squeezed into the wrong label.
 */
export const OWNER_ROLES = [
  "Shop Owner",
  "Partner",
  "Plaza Owner",
  "Landlord",
  "Investor",
  "Other",
] as const;

export type OwnerRole = (typeof OWNER_ROLES)[number];

/**
 * INACTIVE IS NOT DELETION, for the same reason it is not on suppliers:
 * a former partner is part of the shop's history, and the agreements
 * that mention them do not stop existing when the arrangement ends.
 */
export type OwnerStatus = "active" | "inactive";

export interface Owner {
  /** Internal id. Becomes a Firestore document id. */
  id: string;
  name: string;
  role: OwnerRole;
  phone: string;
  email: string;
  address: string;
  /**
   * Share of the business or the property, as a percentage.
   *
   * A STRING-FREE number, and optional: plenty of real arrangements
   * have no agreed percentage at all - a landlord owns the building
   * outright and holds no share of the shop. Storing 0 for "not
   * applicable" would make the totals below lie, so absent means
   * absent.
   */
  sharePercent: number | null;
  notes: string;
  status: OwnerStatus;
  /** ISO 8601. */
  createdAt: string;
  updatedAt: string;
}

/** What the add/edit form collects. No id, no timestamps. */
export interface OwnerFormData {
  name: string;
  role: OwnerRole;
  phone: string;
  email: string;
  address: string;
  /** Raw input, so an empty box and a typed 0 stay distinguishable. */
  sharePercent: string;
  notes: string;
  status: OwnerStatus;
}

export type OwnerErrors = Partial<Record<keyof OwnerFormData, string>>;

/* ====================================================================
   MONEY PAID TO THE PLAZA OWNERS

   Five things, and they are NOT all the same kind of money:

     ADVANCE and SECURITY are deposits. The shop handed money over and
     is owed it back when it leaves. That is not a cost - nothing was
     consumed - so expensing it would understate profit now and
     overstate it on the day it is refunded.

     RENT and MAINTENANCE are costs. The month is gone and so is the
     money. These belong in Profit & Loss, and recording one here
     creates the matching Expense so it is entered once and cannot
     drift from a second hand-typed copy.

     REFUND is a deposit coming back. It reduces what the landlord
     holds; it is not income.

   This is the same distinction lib/finance-utils.ts already makes
   about stock purchases - money moving is not the same as money spent.
   ==================================================================== */

export const OWNER_PAYMENT_KINDS = [
  "advance",
  "security",
  "rent",
  "maintenance",
  "refund",
] as const;

export type OwnerPaymentKind = (typeof OWNER_PAYMENT_KINDS)[number];

export interface OwnerPayment {
  id: string;
  ownerId: string;
  /** Snapshot, so renaming a person cannot rewrite the ledger. */
  ownerName: string;
  kind: OwnerPaymentKind;
  /** Rupees, whole numbers like every other amount here. */
  amount: number;
  /** ISO. The date the money moved - back-datable, for history. */
  paidOn: string;
  /**
   * Which month a recurring charge covers, as "YYYY-MM".
   *
   * Separate from paidOn because they genuinely differ: April's rent
   * paid late on 3 May is an April charge. Empty for one-off deposits,
   * which cover no period.
   */
  periodMonth: string;
  notes: string;
  /**
   * WHICH OWNER handed the money over.
   *
   * The same question "Sold by" answers on the till, and for the same
   * reason: the two owners share a sign-in, so the account cannot say
   * which of them paid the landlord this month. Optional, because
   * entries written before this existed have no answer and inventing
   * one would be worse than showing none.
   */
  paidBy?: string;
  /**
   * The Expense this created, for rent and maintenance.
   *
   * Stored so the two can never be counted twice and so the link is
   * visible rather than implied. Absent on deposits and refunds,
   * which are not costs.
   */
  expenseId?: string;
  createdAt: string;
}

export interface OwnerPaymentFormData {
  kind: OwnerPaymentKind;
  amount: string;
  paidOn: string;
  periodMonth: string;
  notes: string;
  paidBy: string;
}
