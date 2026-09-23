import { DEMO_NOW } from "@/lib/demo-clock";
import type { Expense, ExpenseCategory, ExpensePaymentMethod, ExpenseStatus } from "@/types";

/**
 * THE operating-expense dataset.
 *
 * These are costs that are CONSUMED: the month passes and the rent is
 * gone, the electricity is burnt, the wages are paid. Nothing of value
 * remains on the shelf.
 *
 * That is what separates this file from data/mock-purchases.ts. Buying
 * stock is not consumption - it is one asset traded for another, and it
 * only becomes a cost when the goods are sold, as COGS. Nothing in this
 * file may ever describe a supplier purchase.
 *
 * All values are invented demo figures. Replace them with the shop's
 * real bills before drawing any conclusion from the Profit and Loss
 * page - the arithmetic is real, but these inputs are not.
 *
 * PHASE 2: becomes `expenses/{expenseId}`, readable only by OWNER and
 * MANAGER roles.
 */

const daysAgo = (d: number) => new Date(DEMO_NOW - d * 86_400_000).toISOString();

interface SeedExpense {
  id: string;
  title: string;
  category: ExpenseCategory;
  amount: number;
  paymentMethod: ExpensePaymentMethod;
  description: string;
  status: ExpenseStatus;
  /** Days before the demo clock that the cost BELONGS to. */
  daysAgo: number;
  /** Days before the demo clock the row was typed in. Usually the same. */
  enteredDaysAgo?: number;
}

const SEED: SeedExpense[] = [
  // Cleared. Real records are entered through the admin panel.
];

function buildExpenses(): Expense[] {
  return SEED.map((seed) => ({
    id: seed.id,
    title: seed.title,
    category: seed.category,
    amount: seed.amount,
    paymentMethod: seed.paymentMethod,
    description: seed.description,
    status: seed.status,
    expenseDate: daysAgo(seed.daysAgo),
    createdBy: "Owner",
    createdAt: daysAgo(seed.enteredDaysAgo ?? seed.daysAgo),
    updatedAt: daysAgo(seed.enteredDaysAgo ?? seed.daysAgo),
  }));
}

export const seedExpenses: Expense[] = buildExpenses();

export function getSeedExpense(id: string): Expense | undefined {
  return seedExpenses.find((e) => e.id === id);
}
