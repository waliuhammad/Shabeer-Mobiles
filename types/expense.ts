/**
 * An operating expense: what it costs to keep the shop open.
 *
 * WHAT THIS IS NOT
 * ----------------
 * This is NOT a supplier purchase. Buying 10 phones for Rs 500,000 does
 * not make the business Rs 500,000 poorer that day - it converts cash
 * into stock of equal value. That cost only becomes a cost of SALE when
 * a phone is actually sold, and it arrives in the accounts as COGS, not
 * as an operating expense. See types/purchase.ts for that side.
 *
 * Rent, electricity and salaries are different: nothing of value comes
 * back. They are consumed. Those are the rows that live here.
 *
 * Keeping the two apart is the whole reason this file exists separately
 * from Purchase, and it is why lib/finance-utils.ts never adds purchases
 * into operating expenses.
 */

export type ExpenseCategory =
  | "RENT"
  | "ELECTRICITY"
  | "INTERNET"
  | "SALARIES"
  | "MARKETING"
  | "TRANSPORT"
  | "REPAIR"
  | "UTILITIES"
  | "OFFICE"
  | "OTHER";

export type ExpenseStatus = "PAID" | "PENDING" | "CANCELLED";

/**
 * Deliberately NOT reusing POSPaymentMethod: a cashier takes "card", but
 * the shop does not pay its landlord by card terminal. Sharing the union
 * would put a meaningless option in both dropdowns.
 */
export type ExpensePaymentMethod = "CASH" | "BANK_TRANSFER" | "OTHER";

export interface Expense {
  id: string;

  title: string;
  category: ExpenseCategory;

  /** Rupees. Integer, like every other amount in this project. */
  amount: number;

  paymentMethod: ExpensePaymentMethod;

  description: string;

  status: ExpenseStatus;

  /**
   * WHEN THE COST BELONGS TO THE BUSINESS - not when the row was typed.
   *
   * September's electricity bill entered on 2 October is a September
   * expense. Every period filter uses this field, never createdAt, or
   * the P&L would move costs into whichever month the data entry
   * happened to be done.
   */
  expenseDate: string;

  /** Free text for now. Becomes a real user id once Auth exists. */
  createdBy: string;

  createdAt: string;
  updatedAt: string;
}

/** What the form collects. Amount is a string because inputs are strings. */
export interface ExpenseFormData {
  title: string;
  category: ExpenseCategory;
  amount: string;
  paymentMethod: ExpensePaymentMethod;
  description: string;
  status: ExpenseStatus;
  expenseDate: string;
}

export interface ExpenseFilterState {
  query: string;
  category: ExpenseCategory | "all";
  paymentMethod: ExpensePaymentMethod | "all";
  status: ExpenseStatus | "all";
  /** "YYYY-MM-DD", empty string = unset. */
  from: string;
  to: string;
}

export interface ExpenseSummary {
  /** PAID + PENDING. Cancelled rows never count. */
  total: number;
  thisMonth: number;
  paid: number;
  pending: number;
  cancelled: number;
  count: number;
}

/** One slice of the operating-expense breakdown on the P&L page. */
export interface ExpenseCategoryTotal {
  category: ExpenseCategory;
  label: string;
  amount: number;
  /** Share of operating expenses, 0-100. */
  percent: number;
}
