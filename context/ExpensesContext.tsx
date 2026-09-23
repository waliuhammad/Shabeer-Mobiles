"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { seedExpenses } from "@/data/expenses";
import { createExpenseId } from "@/lib/expense-utils";
import { useIsHydrated } from "@/hooks/use-is-hydrated";
import type { Expense, ExpenseFormData, ExpenseStatus } from "@/types";

const STORAGE_KEY = "shabbir-mobiles:expenses:v1";

/**
 * The operating-expense store.
 *
 * Same overlay shape as CustomersContext: rows created or edited in this
 * browser are layered over the shared seed in data/expenses.ts, keyed by
 * id, so editing one expense does not copy the other twelve.
 *
 * THERE IS NO DELETE. An expense that was wrong is CANCELLED, which
 * removes it from every total while leaving it visible in the list.
 * Deleting would make the correction invisible, and a financial record
 * nobody can audit is worse than a wrong one everybody can see.
 *
 * KNOWN LIMITATION, as with every mock store here: this lives in one
 * browser. Expenses recorded on the shop machine do not reach the
 * owner's laptop until Firestore replaces it.
 */
interface ExpensesContextValue {
  expenses: Expense[];
  getExpense: (id: string) => Expense | undefined;
  createExpense: (data: ExpenseFormData) => Expense;
  updateExpense: (id: string, data: ExpenseFormData) => Expense | undefined;
  /** Sets status to CANCELLED. Never removes the row. */
  cancelExpense: (id: string) => void;
  setExpenseStatus: (id: string, status: ExpenseStatus) => void;
  resetExpenses: () => void;
  localChangeCount: number;
  isHydrated: boolean;
}

const ExpensesContext = createContext<ExpensesContextValue | null>(null);

function readStored(): Expense[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is Expense =>
        typeof e === "object" &&
        e !== null &&
        typeof (e as Expense).id === "string" &&
        typeof (e as Expense).amount === "number"
    );
  } catch {
    return [];
  }
}

export function ExpensesProvider({ children }: { children: React.ReactNode }) {
  const [local, setLocal] = useState<Expense[]>(readStored);
  const isHydrated = useIsHydrated();

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(local));
    } catch {
      // Storage blocked or full - still works for this session.
    }
  }, [local]);

  const expenses = useMemo(() => {
    if (!isHydrated) return seedExpenses;

    const merged = seedExpenses.map(
      (seed) => local.find((l) => l.id === seed.id) ?? seed
    );
    const brandNew = local.filter(
      (l) => !seedExpenses.some((s) => s.id === l.id)
    );

    // Newest cost first - the list is read far more often than it is
    // searched, and the most recent bill is usually the one wanted.
    return [...merged, ...brandNew].sort((a, b) =>
      b.expenseDate.localeCompare(a.expenseDate)
    );
  }, [local, isHydrated]);

  const getExpense = useCallback(
    (id: string) => expenses.find((e) => e.id === id),
    [expenses]
  );

  const upsert = useCallback((expense: Expense) => {
    setLocal((current) => [...current.filter((e) => e.id !== expense.id), expense]);
  }, []);

  const createExpense = useCallback(
    (data: ExpenseFormData): Expense => {
      const stamp = new Date().toISOString();
      const expense: Expense = {
        id: createExpenseId(),
        title: data.title.trim(),
        category: data.category,
        // The form holds a string because inputs are strings. Number
        // conversion happens ONCE, here, on the way in.
        amount: Math.round(Number(data.amount)),
        paymentMethod: data.paymentMethod,
        description: data.description.trim(),
        status: data.status,
        expenseDate: new Date(data.expenseDate).toISOString(),
        createdBy: "Owner",
        createdAt: stamp,
        updatedAt: stamp,
      };
      upsert(expense);
      return expense;
    },
    [upsert]
  );

  const updateExpense = useCallback(
    (id: string, data: ExpenseFormData): Expense | undefined => {
      const existing = getExpense(id);
      if (!existing) return undefined;
      // A cancelled expense is frozen. Editing it would quietly change a
      // financial record that has already been corrected once.
      if (existing.status === "CANCELLED") return undefined;

      const updated: Expense = {
        ...existing,
        title: data.title.trim(),
        category: data.category,
        amount: Math.round(Number(data.amount)),
        paymentMethod: data.paymentMethod,
        description: data.description.trim(),
        status: data.status,
        expenseDate: new Date(data.expenseDate).toISOString(),
        // createdAt and createdBy are never touched.
        updatedAt: new Date().toISOString(),
      };
      upsert(updated);
      return updated;
    },
    [getExpense, upsert]
  );

  const setExpenseStatus = useCallback(
    (id: string, status: ExpenseStatus) => {
      const existing = getExpense(id);
      if (!existing) return;
      upsert({ ...existing, status, updatedAt: new Date().toISOString() });
    },
    [getExpense, upsert]
  );

  const cancelExpense = useCallback(
    (id: string) => setExpenseStatus(id, "CANCELLED"),
    [setExpenseStatus]
  );

  const resetExpenses = useCallback(() => setLocal([]), []);

  const value = useMemo(
    () => ({
      expenses,
      getExpense,
      createExpense,
      updateExpense,
      cancelExpense,
      setExpenseStatus,
      resetExpenses,
      localChangeCount: isHydrated ? local.length : 0,
      isHydrated,
    }),
    [
      expenses,
      getExpense,
      createExpense,
      updateExpense,
      cancelExpense,
      setExpenseStatus,
      resetExpenses,
      local.length,
      isHydrated,
    ]
  );

  return (
    <ExpensesContext.Provider value={value}>{children}</ExpensesContext.Provider>
  );
}

export function useExpenses(): ExpensesContextValue {
  const context = useContext(ExpensesContext);
  if (!context) {
    throw new Error("useExpenses must be used inside an <ExpensesProvider>");
  }
  return context;
}
