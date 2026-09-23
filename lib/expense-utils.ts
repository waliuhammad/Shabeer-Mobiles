import { now } from "@/lib/demo-clock";
import {
  isWithinRange,
  parseLocalDate,
  startOfMonth,
  endOfDay,
  type DateRange,
} from "@/lib/date-range";
import type {
  Expense,
  ExpenseCategory,
  ExpenseCategoryTotal,
  ExpenseFilterState,
  ExpenseFormData,
  ExpensePaymentMethod,
  ExpenseStatus,
  ExpenseSummary,
} from "@/types/expense";

/**
 * Expense rules and maths. No React in here on purpose - the same
 * functions are used by the list page, the P&L page and the dashboard,
 * and a pure function is the only kind you can check with a calculator.
 */

export const EXPENSE_CATEGORY_CONFIG: Record<
  ExpenseCategory,
  { label: string; badgeClass: string }
> = {
  RENT: { label: "Rent", badgeClass: "bg-primary/10 text-primary" },
  ELECTRICITY: { label: "Electricity", badgeClass: "bg-warning/15 text-gold-deep" },
  INTERNET: { label: "Internet", badgeClass: "bg-cyan-soft text-secondary" },
  SALARIES: { label: "Salaries", badgeClass: "bg-primary/10 text-primary" },
  MARKETING: { label: "Marketing", badgeClass: "bg-accent/20 text-gold-deep" },
  TRANSPORT: { label: "Transport", badgeClass: "bg-cyan-soft text-secondary" },
  REPAIR: { label: "Repair", badgeClass: "bg-muted text-muted-foreground" },
  UTILITIES: { label: "Utilities", badgeClass: "bg-warning/15 text-gold-deep" },
  OFFICE: { label: "Office", badgeClass: "bg-muted text-muted-foreground" },
  OTHER: { label: "Other", badgeClass: "bg-muted text-muted-foreground" },
};

export const EXPENSE_STATUS_CONFIG: Record<
  ExpenseStatus,
  { label: string; badgeClass: string; note: string }
> = {
  PAID: {
    label: "Paid",
    badgeClass: "bg-success/10 text-success",
    note: "Settled. Counts towards operating expenses.",
  },
  PENDING: {
    label: "Pending",
    badgeClass: "bg-warning/15 text-gold-deep",
    note: "Owed but not yet paid. Still counts as a cost of this period.",
  },
  CANCELLED: {
    label: "Cancelled",
    badgeClass: "bg-destructive/10 text-destructive",
    note: "Excluded from every total. Kept for the audit trail.",
  },
};

export const EXPENSE_PAYMENT_METHOD_LABELS: Record<ExpensePaymentMethod, string> = {
  CASH: "Cash",
  BANK_TRANSFER: "Bank Transfer",
  OTHER: "Other",
};

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  "RENT",
  "ELECTRICITY",
  "INTERNET",
  "SALARIES",
  "MARKETING",
  "TRANSPORT",
  "REPAIR",
  "UTILITIES",
  "OFFICE",
  "OTHER",
];

export const EXPENSE_STATUSES: ExpenseStatus[] = ["PAID", "PENDING", "CANCELLED"];

export const EXPENSE_PAYMENT_METHODS: ExpensePaymentMethod[] = [
  "CASH",
  "BANK_TRANSFER",
  "OTHER",
];

export const EMPTY_EXPENSE_FILTERS: ExpenseFilterState = {
  query: "",
  category: "all",
  paymentMethod: "all",
  status: "all",
  from: "",
  to: "",
};

/**
 * THE rule for whether an expense affects profit.
 *
 * PAID and PENDING both count. An unpaid electricity bill is still a
 * cost the business has incurred this period - waiting until the money
 * physically leaves would flatter every month in which a bill is late,
 * then punish the month it is finally settled.
 *
 * CANCELLED never counts. It was entered in error or called off, so it
 * stays visible in the list for the audit trail but contributes zero.
 */
export function countsAsOperatingExpense(expense: Expense): boolean {
  return expense.status !== "CANCELLED";
}

/** A cancelled expense is frozen - editing it would rewrite history. */
export function canEditExpense(expense: Expense): boolean {
  return expense.status !== "CANCELLED";
}

export function canCancelExpense(expense: Expense): boolean {
  return expense.status !== "CANCELLED";
}

/** Total of everything that counts, inside the range. */
export function getTotalExpenses(expenses: Expense[], range?: DateRange): number {
  return getExpensesForPeriod(expenses, range).reduce((sum, e) => sum + e.amount, 0);
}

/**
 * The expenses that belong to a period.
 *
 * Filters on expenseDate, NOT createdAt - see the comment on the
 * Expense type. An omitted range means all time.
 */
export function getExpensesForPeriod(expenses: Expense[], range?: DateRange): Expense[] {
  const counted = expenses.filter(countsAsOperatingExpense);
  if (!range) return counted;
  return counted.filter((e) => isWithinRange(e.expenseDate, range));
}

/** Operating expenses split by category, largest first, with shares. */
export function getExpensesByCategory(
  expenses: Expense[],
  range?: DateRange
): ExpenseCategoryTotal[] {
  const counted = getExpensesForPeriod(expenses, range);
  const total = counted.reduce((sum, e) => sum + e.amount, 0);

  const byCategory = new Map<ExpenseCategory, number>();
  for (const e of counted) {
    byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + e.amount);
  }

  return [...byCategory.entries()]
    .map(([category, amount]) => ({
      category,
      label: EXPENSE_CATEGORY_CONFIG[category].label,
      amount,
      percent: total > 0 ? (amount / total) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
}

/** The four KPI cards on /admin/expenses. All derived, none stored. */
export function calculateExpenseSummary(expenses: Expense[]): ExpenseSummary {
  const today = now();
  const monthRange: DateRange = {
    start: startOfMonth(today),
    end: endOfDay(today),
  };

  let total = 0;
  let thisMonth = 0;
  let paid = 0;
  let pending = 0;
  let cancelled = 0;

  for (const e of expenses) {
    if (e.status === "CANCELLED") {
      cancelled += e.amount;
      continue;
    }
    total += e.amount;
    if (isWithinRange(e.expenseDate, monthRange)) thisMonth += e.amount;
    if (e.status === "PAID") paid += e.amount;
    if (e.status === "PENDING") pending += e.amount;
  }

  return {
    total,
    thisMonth,
    paid,
    pending,
    cancelled,
    count: expenses.filter(countsAsOperatingExpense).length,
  };
}

export function filterExpenses(
  expenses: Expense[],
  filters: ExpenseFilterState
): Expense[] {
  const q = filters.query.trim().toLowerCase();

  return expenses.filter((e) => {
    if (filters.category !== "all" && e.category !== filters.category) return false;
    if (filters.status !== "all" && e.status !== filters.status) return false;
    if (
      filters.paymentMethod !== "all" &&
      e.paymentMethod !== filters.paymentMethod
    ) {
      return false;
    }

    if (filters.from) {
      const from = parseLocalDate(filters.from);
      if (new Date(e.expenseDate).getTime() < from.getTime()) return false;
    }
    if (filters.to) {
      const to = endOfDay(parseLocalDate(filters.to));
      if (new Date(e.expenseDate).getTime() > to.getTime()) return false;
    }

    if (!q) return true;

    // Category is searchable by its LABEL, because "electricity" is what
    // someone types, not "ELECTRICITY".
    return (
      e.title.toLowerCase().includes(q) ||
      e.description.toLowerCase().includes(q) ||
      EXPENSE_CATEGORY_CONFIG[e.category].label.toLowerCase().includes(q)
    );
  });
}

export function hasActiveExpenseFilters(filters: ExpenseFilterState): boolean {
  return (
    filters.query.trim() !== "" ||
    filters.category !== "all" ||
    filters.paymentMethod !== "all" ||
    filters.status !== "all" ||
    filters.from !== "" ||
    filters.to !== ""
  );
}

export interface ExpenseErrors {
  title?: string;
  amount?: string;
  expenseDate?: string;
}

/**
 * ONE validator, used by the create page and the edit page alike, the
 * same arrangement customer-utils uses.
 */
export function validateExpense(data: ExpenseFormData): ExpenseErrors {
  const errors: ExpenseErrors = {};

  if (!data.title.trim()) {
    errors.title = "Give the expense a title.";
  }

  const amount = Number(data.amount);
  if (!data.amount.trim()) {
    errors.amount = "Enter the amount.";
  } else if (!Number.isFinite(amount)) {
    errors.amount = "Amount must be a number.";
  } else if (amount <= 0) {
    // Zero is not a real expense, and a negative one is a refund - a
    // different concept this project does not model yet.
    errors.amount = "Amount must be greater than zero.";
  }

  if (!data.expenseDate) {
    errors.expenseDate = "Pick the date the cost belongs to.";
  }

  return errors;
}

/** "exp_..." - matches the cus_/pur_ id convention used elsewhere. */
export function createExpenseId(): string {
  return `exp_${Math.random().toString(36).slice(2, 10)}`;
}
