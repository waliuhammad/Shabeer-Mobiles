"use client";

import { createContext, useCallback, useContext, useMemo } from "react";
import type { QueryDocumentSnapshot } from "firebase/firestore";
import { COLLECTIONS } from "@/lib/firebase/firestore";
import { useFirestoreCollection } from "@/hooks/use-firestore-collection";
import { writeDoc } from "@/lib/firebase/write";
import { createExpenseId } from "@/lib/expense-utils";
import { useAuth } from "@/context/AuthContext";
import type { Expense, ExpenseFormData, ExpenseStatus } from "@/types";

/**
 * Operating expenses - live Firestore.
 *
 * THERE IS NO DELETE. An expense entered in error is CANCELLED, which
 * removes it from every total while leaving it visible in the list.
 * firestore.rules enforces the same thing (`allow delete: if false`), so
 * this is not merely a UI convention - the database refuses it.
 *
 * Cashiers cannot read this collection at all. Expenses reveal the
 * shop's cost base.
 */

interface ExpensesContextValue {
  expenses: Expense[];
  getExpense: (id: string) => Expense | undefined;
  createExpense: (data: ExpenseFormData) => Promise<Expense>;
  updateExpense: (id: string, data: ExpenseFormData) => Promise<Expense | undefined>;
  cancelExpense: (id: string) => Promise<void>;
  setExpenseStatus: (id: string, status: ExpenseStatus) => Promise<void>;
  loading: boolean;
  error: string | null;
  isHydrated: boolean;
}

const ExpensesContext = createContext<ExpensesContextValue | null>(null);

function mapExpense(doc: QueryDocumentSnapshot): Expense | null {
  const d = doc.data();
  if (typeof d.title !== "string" || typeof d.amount !== "number") return null;
  const status: ExpenseStatus =
    d.status === "PAID" || d.status === "PENDING" || d.status === "CANCELLED"
      ? d.status
      : "PENDING";
  return {
    id: doc.id,
    title: d.title,
    category: typeof d.category === "string" ? (d.category as Expense["category"]) : "OTHER",
    amount: d.amount,
    paymentMethod:
      d.paymentMethod === "BANK_TRANSFER" || d.paymentMethod === "OTHER"
        ? d.paymentMethod
        : "CASH",
    description: typeof d.description === "string" ? d.description : "",
    status,
    expenseDate: typeof d.expenseDate === "string" ? d.expenseDate : new Date(0).toISOString(),
    createdBy: typeof d.createdBy === "string" ? d.createdBy : "",
    createdAt: typeof d.createdAt === "string" ? d.createdAt : new Date(0).toISOString(),
    updatedAt: typeof d.updatedAt === "string" ? d.updatedAt : new Date(0).toISOString(),
  };
}

export function ExpensesProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const enabled =
    !authLoading && Boolean(user?.isStaff) && user?.role !== "CASHIER";

  const state = useFirestoreCollection<Expense>(COLLECTIONS.expenses, mapExpense, {
    enabled,
  });

  // Newest cost first. The list is read far more often than searched,
  // and the most recent bill is usually the one wanted.
  const expenses = useMemo(
    () => [...state.items].sort((a, b) => b.expenseDate.localeCompare(a.expenseDate)),
    [state.items]
  );

  const getExpense = useCallback(
    (id: string) => expenses.find((e) => e.id === id),
    [expenses]
  );

  const createExpense = useCallback(
    async (data: ExpenseFormData): Promise<Expense> => {
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
        createdBy: user?.displayName ?? user?.email ?? "Staff",
        createdAt: stamp,
        updatedAt: stamp,
      };
      await writeDoc(COLLECTIONS.expenses, expense.id, expense);
      return expense;
    },
    [user]
  );

  const updateExpense = useCallback(
    async (id: string, data: ExpenseFormData): Promise<Expense | undefined> => {
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
      await writeDoc(COLLECTIONS.expenses, id, updated);
      return updated;
    },
    [getExpense]
  );

  const setExpenseStatus = useCallback(async (id: string, status: ExpenseStatus) => {
    await writeDoc(COLLECTIONS.expenses, id, {
      status,
      updatedAt: new Date().toISOString(),
    });
  }, []);

  const cancelExpense = useCallback(
    (id: string) => setExpenseStatus(id, "CANCELLED"),
    [setExpenseStatus]
  );

  const value = useMemo(
    () => ({
      expenses,
      getExpense,
      createExpense,
      updateExpense,
      cancelExpense,
      setExpenseStatus,
      loading: state.loading,
      error: state.error,
      isHydrated: !state.loading,
    }),
    [
      expenses, getExpense, createExpense, updateExpense, cancelExpense,
      setExpenseStatus, state.loading, state.error,
    ]
  );

  return <ExpensesContext.Provider value={value}>{children}</ExpensesContext.Provider>;
}

export function useExpenses(): ExpensesContextValue {
  const context = useContext(ExpensesContext);
  if (!context) {
    throw new Error("useExpenses must be used inside an <ExpensesProvider>");
  }
  return context;
}
