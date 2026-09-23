"use client";

import Link from "next/link";
import { notFound } from "next/navigation";
import { Ban, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ExpenseForm } from "@/components/admin/expenses/ExpenseForm";
import { useExpenses } from "@/context/ExpensesContext";
import { canEditExpense } from "@/lib/expense-utils";

interface EditExpenseViewProps {
  expenseId: string;
}

/**
 * /admin/expenses/[id]/edit
 *
 * Guards the form rather than letting it render and fail on submit. A
 * CANCELLED expense is a corrected financial record, and quietly
 * allowing it to be edited would let someone rewrite a correction - so
 * the route refuses up front and explains why, instead of presenting
 * fields that cannot be saved.
 */
export function EditExpenseView({ expenseId }: EditExpenseViewProps) {
  const { getExpense, isHydrated } = useExpenses();
  const expense = getExpense(expenseId);

  if (!expense) {
    if (!isHydrated) return null;
    notFound();
  }


  // HYDRATION GATE - load-bearing, not a loading spinner.
  //
  // Before hydration the store holds only the seed, so a record that has
  // been edited in this browser still reads with its ORIGINAL values. The
  // form seeds its useState from what it is handed on first render, so
  // mounting it now would freeze those stale values into the form and
  // quietly discard the saved edit on the next save.
  //
  // Waiting one paint means the form always mounts with the real record.
  if (!isHydrated) return null;

  if (!canEditExpense(expense)) {
    return (
      <>
        <AdminPageHeader
          title="Cannot edit this expense"
          description="Cancelled expenses are kept exactly as they were."
        />
        <div className="flex max-w-xl flex-col items-start gap-3 rounded-xl border border-dashed border-border bg-card p-6">
          <Ban className="size-8 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm font-semibold text-foreground">
            {expense.title} was cancelled
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            A cancelled expense already represents a correction. Editing it would
            change a financial record that has been settled, and the audit trail
            would no longer show what actually happened. If this cost was real,
            record it as a new expense instead.
          </p>
          <Button asChild variant="outline" className="h-10 gap-1.5 px-4 text-sm">
            <Link href={`/admin/expenses/${expense.id}`}>
              <ArrowLeft className="size-4" aria-hidden="true" />
              Back to expense
            </Link>
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      <AdminPageHeader
        title="Edit Expense"
        description={expense.title}
      />
      <ExpenseForm expense={expense} />
    </>
  );
}
