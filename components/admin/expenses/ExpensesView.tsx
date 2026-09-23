"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Receipt, CalendarDays, CheckCircle2, Clock, Search, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { KpiCard } from "@/components/admin/KpiCard";
import { ExpenseTable } from "@/components/admin/expenses/ExpenseTable";
import { useExpenses } from "@/context/ExpensesContext";
import {
  EMPTY_EXPENSE_FILTERS,
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_CONFIG,
  EXPENSE_PAYMENT_METHODS,
  EXPENSE_PAYMENT_METHOD_LABELS,
  EXPENSE_STATUSES,
  EXPENSE_STATUS_CONFIG,
  calculateExpenseSummary,
  filterExpenses,
  hasActiveExpenseFilters,
} from "@/lib/expense-utils";
import { formatPrice } from "@/lib/utils";
import type { Expense, ExpenseFilterState } from "@/types";

/**
 * /admin/expenses.
 *
 * Every KPI is derived from the expense list on each render. None is
 * stored, so a cancelled expense drops out of the totals the instant it
 * is cancelled - there is no second number to remember to update.
 */
export function ExpensesView() {
  const { expenses, cancelExpense } = useExpenses();

  const [filters, setFilters] = useState<ExpenseFilterState>(EMPTY_EXPENSE_FILTERS);
  const [pendingCancel, setPendingCancel] = useState<Expense | null>(null);

  const set = <K extends keyof ExpenseFilterState>(
    key: K,
    value: ExpenseFilterState[K]
  ) => setFilters((f) => ({ ...f, [key]: value }));

  const summary = useMemo(() => calculateExpenseSummary(expenses), [expenses]);
  const visible = useMemo(
    () => filterExpenses(expenses, filters),
    [expenses, filters]
  );

  function confirmCancel() {
    if (!pendingCancel) return;
    cancelExpense(pendingCancel.id);
    toast.success("Expense cancelled.", {
      description: `${pendingCancel.title} no longer counts towards operating expenses.`,
    });
    setPendingCancel(null);
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        <KpiCard
          title="Total Expenses"
          value={formatPrice(summary.total)}
          Icon={Receipt}
          tone="navy"
          description="All time, excluding cancelled"
        />
        <KpiCard
          title="This Month"
          value={formatPrice(summary.thisMonth)}
          Icon={CalendarDays}
          tone="cyan"
          description="By expense date, not entry date"
        />
        <KpiCard
          title="Paid Expenses"
          value={formatPrice(summary.paid)}
          Icon={CheckCircle2}
          tone="success"
          description="Already settled"
        />
        <KpiCard
          title="Pending Expenses"
          value={formatPrice(summary.pending)}
          Icon={Clock}
          tone="gold"
          description="Owed but still counted as cost"
        />
      </div>

      {/* ---------------- FILTERS ---------------- */}
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <label htmlFor="expense-search" className="sr-only">
            Search by title, description or category
          </label>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            id="expense-search"
            type="search"
            value={filters.query}
            onChange={(e) => set("query", e.target.value)}
            placeholder="Search title, description or category..."
            className="h-10 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-secondary focus:ring-2 focus:ring-ring/30"
          />
        </div>

        <Button
          asChild
          className="h-10 shrink-0 gap-1.5 bg-accent px-4 text-sm font-semibold text-accent-foreground hover:bg-gold-deep"
        >
          <Link href="/admin/expenses/new">
            <Plus className="size-4" aria-hidden="true" />
            Add Expense
          </Link>
        </Button>
      </div>

      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Select
          value={filters.category}
          onValueChange={(v) => set("category", v as ExpenseFilterState["category"])}
        >
          <SelectTrigger className="h-10 sm:w-44" aria-label="Filter by category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {EXPENSE_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {EXPENSE_CATEGORY_CONFIG[c].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.paymentMethod}
          onValueChange={(v) =>
            set("paymentMethod", v as ExpenseFilterState["paymentMethod"])
          }
        >
          <SelectTrigger className="h-10 sm:w-44" aria-label="Filter by payment method">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Payment Methods</SelectItem>
            {EXPENSE_PAYMENT_METHODS.map((m) => (
              <SelectItem key={m} value={m}>
                {EXPENSE_PAYMENT_METHOD_LABELS[m]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.status}
          onValueChange={(v) => set("status", v as ExpenseFilterState["status"])}
        >
          <SelectTrigger className="h-10 sm:w-36" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {EXPENSE_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {EXPENSE_STATUS_CONFIG[s].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <label htmlFor="expense-from" className="sr-only">
            Expenses from date
          </label>
          <input
            id="expense-from"
            type="date"
            value={filters.from}
            onChange={(e) => set("from", e.target.value)}
            className="h-10 rounded-lg border border-border bg-card px-3 text-sm outline-none transition-colors focus:border-secondary focus:ring-2 focus:ring-ring/30"
          />
          <span className="text-xs text-muted-foreground">to</span>
          <label htmlFor="expense-to" className="sr-only">
            Expenses to date
          </label>
          <input
            id="expense-to"
            type="date"
            value={filters.to}
            onChange={(e) => set("to", e.target.value)}
            className="h-10 rounded-lg border border-border bg-card px-3 text-sm outline-none transition-colors focus:border-secondary focus:ring-2 focus:ring-ring/30"
          />
        </div>

        {hasActiveExpenseFilters(filters) && (
          <Button
            type="button"
            variant="outline"
            onClick={() => setFilters(EMPTY_EXPENSE_FILTERS)}
            className="h-10 px-4 text-sm"
          >
            Clear
          </Button>
        )}
      </div>

      <p className="mt-2 text-xs text-muted-foreground" aria-live="polite">
        Showing {visible.length} of {expenses.length} expenses
      </p>

      <ExpenseTable
        expenses={visible}
        onCancel={setPendingCancel}
        emptyMessage={
          expenses.length === 0
            ? "Record the shop's rent, bills and wages to see them counted against profit."
            : "Try a different search, category or date range."
        }
      />

      {/* ---------------- CANCEL CONFIRMATION ---------------- */}
      <AlertDialog
        open={pendingCancel !== null}
        onOpenChange={(open) => !open && setPendingCancel(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this expense?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingCancel?.title} ({formatPrice(pendingCancel?.amount ?? 0)}) will
              stop counting towards operating expenses, so net profit for its period
              will rise. The record stays in the list for the audit trail - expenses
              are never deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCancel}>
              Cancel expense
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
