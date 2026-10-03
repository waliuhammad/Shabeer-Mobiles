import { OWNER_PAYMENT_KINDS, OWNER_ROLES } from "@/types";
import type {
  ExpenseCategory,
  Owner,
  OwnerErrors,
  OwnerFormData,
  OwnerPayment,
  OwnerPaymentFormData,
  OwnerPaymentKind,
  OwnerRole,
} from "@/types";

export const EMPTY_OWNER_FORM: OwnerFormData = {
  name: "",
  role: "Shop Owner",
  phone: "",
  email: "",
  address: "",
  sharePercent: "",
  notes: "",
  status: "active",
};

/** "own_..." - matches the exp_/pur_/cus_ id convention used elsewhere. */
export function createOwnerId(): string {
  return `own_${Math.random().toString(36).slice(2, 10)}`;
}

export function toOwnerFormData(owner: Owner): OwnerFormData {
  return {
    name: owner.name,
    role: owner.role,
    phone: owner.phone,
    email: owner.email,
    address: owner.address,
    // null round-trips to an empty box, not to "0" - see the note on
    // Owner.sharePercent for why those must stay different.
    sharePercent: owner.sharePercent === null ? "" : String(owner.sharePercent),
    notes: owner.notes,
    status: owner.status,
  };
}

export function isOwnerRole(value: unknown): value is OwnerRole {
  return (OWNER_ROLES as readonly string[]).includes(String(value));
}

/**
 * The share as a number, or null when the box was left empty.
 *
 * Used by the form and by the context, so "blank means no agreed
 * share" is decided once rather than at each call site.
 */
export function parseSharePercent(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

export function validateOwner(data: OwnerFormData): OwnerErrors {
  const errors: OwnerErrors = {};

  if (!data.name.trim()) {
    errors.name = "Enter the person's name.";
  }

  if (!isOwnerRole(data.role)) {
    errors.role = "Choose what they are to the business.";
  }

  /**
   * A phone number is required and an email is not, which is the right
   * way round here: this record exists so somebody can be REACHED, and
   * in Multan that means a phone. An email address is a nicety.
   */
  if (!data.phone.trim()) {
    errors.phone = "Enter a phone number - this is how they are reached.";
  }

  if (data.email.trim() && !data.email.includes("@")) {
    errors.email = "That does not look like an email address.";
  }

  const raw = data.sharePercent.trim();
  if (raw) {
    const share = Number(raw);
    if (!Number.isFinite(share)) {
      errors.sharePercent = "Share must be a number.";
    } else if (share < 0 || share > 100) {
      errors.sharePercent = "Share must be between 0 and 100.";
    }
  }

  return errors;
}

/**
 * Total share across the ACTIVE owners.
 *
 * Shown rather than enforced. Real arrangements do not always add to
 * 100 - a landlord holds none of the shop, two partners may have
 * agreed 60/30 with the rest unallocated - so a form that refused to
 * save unless the numbers summed exactly would be wrong more often
 * than it was right. Saying "these add up to 110%" lets whoever knows
 * the agreement decide whether that is a typo.
 */
export function totalSharePercent(owners: Owner[]): number {
  return owners
    .filter((o) => o.status === "active" && o.sharePercent !== null)
    .reduce((sum, o) => sum + (o.sharePercent ?? 0), 0);
}

/* ====================================================================
   MONEY PAID TO THE PLAZA OWNERS
   ==================================================================== */

export const OWNER_PAYMENT_LABELS: Record<OwnerPaymentKind, string> = {
  advance: "Advance",
  security: "Security deposit",
  rent: "Rent",
  maintenance: "Maintenance",
  refund: "Refund received",
};

/**
 * Money the landlord is HOLDING and owes back. Not a cost.
 */
const DEPOSIT_KINDS: OwnerPaymentKind[] = ["advance", "security"];

/**
 * Money that is GONE - the month was used up. These become Expenses.
 */
const COST_KINDS: OwnerPaymentKind[] = ["rent", "maintenance"];

export function isDepositKind(kind: OwnerPaymentKind): boolean {
  return DEPOSIT_KINDS.includes(kind);
}

export function isCostKind(kind: OwnerPaymentKind): boolean {
  return COST_KINDS.includes(kind);
}

/** Does this kind cover a month, or is it a one-off? */
export function isRecurringKind(kind: OwnerPaymentKind): boolean {
  return isCostKind(kind);
}

/**
 * Which Expense category a cost lands in.
 *
 * Rent is RENT. Maintenance is UTILITIES - a recurring service charge
 * on the building, which is the closest existing category and keeps it
 * out of OTHER, where it would be invisible among odds and ends.
 */
export function expenseCategoryFor(kind: OwnerPaymentKind): ExpenseCategory {
  return kind === "rent" ? "RENT" : "UTILITIES";
}

export function createOwnerPaymentId(): string {
  return `opay_${Math.random().toString(36).slice(2, 10)}`;
}

export function isOwnerPaymentKind(v: unknown): v is OwnerPaymentKind {
  return (OWNER_PAYMENT_KINDS as readonly string[]).includes(String(v));
}

/**
 * What the landlord is holding of the shop's money.
 *
 * Deposits in, refunds out. Rent and maintenance are NOT in this
 * figure - they were spent, not lodged, and adding them would turn a
 * refundable balance into a meaningless running total of everything
 * ever handed over.
 */
export function depositHeld(payments: OwnerPayment[]): number {
  return payments.reduce((sum, p) => {
    if (isDepositKind(p.kind)) return sum + p.amount;
    if (p.kind === "refund") return sum - p.amount;
    return sum;
  }, 0);
}

export function totalOfKind(payments: OwnerPayment[], kind: OwnerPaymentKind): number {
  return payments
    .filter((p) => p.kind === kind)
    .reduce((sum, p) => sum + p.amount, 0);
}

export function validateOwnerPayment(
  data: OwnerPaymentFormData
): Partial<Record<keyof OwnerPaymentFormData, string>> {
  const errors: Partial<Record<keyof OwnerPaymentFormData, string>> = {};

  const amount = Number(data.amount);
  if (!data.amount.trim()) {
    errors.amount = "Enter the amount.";
  } else if (!Number.isFinite(amount) || amount <= 0) {
    // A negative payment is a refund, which is its own kind above -
    // allowing one here would let the same thing be recorded two ways.
    errors.amount = "Amount must be more than zero.";
  }

  if (!data.paidOn) {
    errors.paidOn = "Pick the date the money moved.";
  }

  /**
   * Rent and maintenance must say WHICH MONTH. April's rent paid late
   * on 3 May is an April cost, and without this the expense would land
   * in May and quietly move a cost between months.
   */
  if (isRecurringKind(data.kind) && !data.periodMonth) {
    errors.periodMonth = "Say which month this covers.";
  }

  return errors;
}
