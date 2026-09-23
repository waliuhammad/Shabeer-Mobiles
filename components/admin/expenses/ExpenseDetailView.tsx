"use client";

import { useState } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Pencil, Ban, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { useExpenses } from "@/context/ExpensesContext";
import {
  EXPENSE_CATEGORY_CONFIG,
  EXPENSE_PAYMENT_METHOD_LABELS,
  EXPENSE_STATUS_CONFIG,
  canCancelExpense,
  canEditExpense,
} from "@/lib/expense-utils";
import { formatOrderDateTime } from "@/lib/order-display";
import { formatOrderDate } from "@/lib/order-utils";
import { formatPrice, cn } from "@/lib/utils";
import type { Expense } from "@/types";

interface ExpenseDetailViewProps {
  expenseId: string;
}

/** /admin/expenses/[id] */
export function ExpenseDetailView({ expenseId }: ExpenseDetailViewProps) {
  const { getExpense, cancelExpense, isHydrated } = useExpenses();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const expense = getExpense(expenseId);

  // Before hydration the store holds only the seed, so an expense created
  // in this browser would briefly look missing. Waiting avoids a 404
  // flashing up on a record that does exist.
  if (!expense) {
    if (!isHydrated) return null;
    notFound();
  }

  // Re-bound so the narrowing survives into handleCancel below -
  // TypeScript does not carry a narrowed outer binding into a closure.
  const record: Expense = expense;

  const category = EXPENSE_CATEGORY_CONFIG[record.category];
  const status = EXPENSE_STATUS_CONFIG[record.status];
  const cancelled = record.status === "CANCELLED";

  function handleCancel() {
    cancelExpense(record.id);
    toast.success("Expense cancelled.", {
      description: "It no longer counts towards operating expenses.",
    });
    setConfirmOpen(false);
  }

  return (
    <>
      <AdminPageHeader
        title={record.title}
        description={`${category.label} · recorded by ${record.createdBy}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" className="h-10 gap-1.5 px-4 text-sm">
              <Link href="/admin/expenses">
                <ArrowLeft className="size-4" aria-hidden="true" />
                Back
              </Link>
            </Button>
            {canEditExpense(record) && (
              <Button asChild variant="outline" className="h-10 gap-1.5 px-4 text-sm">
                <Link href={`/admin/expenses/${record.id}/edit`}>
                  <Pencil className="size-4" aria-hidden="true" />
                  Edit
                </Link>
              </Button>
            )}
            {canCancelExpense(record) && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirmOpen(true)}
                className="h-10 gap-1.5 px-4 text-sm"
              >
                <Ban className="size-4" aria-hidden="true" />
                Cancel Expense
              </Button>
            )}
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* ---------------- THE AMOUNT ---------------- */}
        <div className="rounded-xl border border-border bg-card p-5 lg:col-span-1">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
            <Receipt className="size-4" aria-hidden="true" />
            Amount
          </div>
          <p
            className={cn(
              "mt-2 font-heading text-3xl font-bold tabular-nums",
              cancelled ? "text-muted-foreground line-through" : "text-primary"
            )}
          >
            {formatPrice(record.amount)}
          </p>
          <span
            className={cn(
              "mt-3 inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold",
              status.badgeClass
            )}
          >
            {status.label}
          </span>
          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
            {status.note}
          </p>
        </div>

        {/* ---------------- THE DETAILS ---------------- */}
        <div className="rounded-xl border border-border bg-card p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold text-foreground">Details</h3>
          <dl className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2">
            <Row label="Category">
              <span
                className={cn(
                  "inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold",
                  category.badgeClass
                )}
              >
                {category.label}
              </span>
            </Row>
            <Row label="Payment Method">
              {EXPENSE_PAYMENT_METHOD_LABELS[record.paymentMethod]}
            </Row>
            <Row label="Expense Date">
              {formatOrderDate(record.expenseDate)}
              <span className="block text-[11px] text-muted-foreground">
                The period this cost belongs to
              </span>
            </Row>
            <Row label="Created By">{record.createdBy}</Row>
            <Row label="Recorded">{formatOrderDateTime(record.createdAt)}</Row>
            <Row label="Last Updated">{formatOrderDateTime(record.updatedAt)}</Row>
          </dl>

          {record.description && (
            <>
              <h3 className="mt-5 text-sm font-semibold text-foreground">
                Description
              </h3>
              <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                {record.description}
              </p>
            </>
          )}

          {cancelled && (
            <p className="mt-5 rounded-lg bg-muted/60 p-3 text-[11px] leading-relaxed text-muted-foreground">
              This expense is cancelled. It contributes nothing to operating
              expenses or net profit, and can no longer be edited - but it is kept
              here so the correction stays visible. Financial records are never
              deleted.
            </p>
          )}
        </div>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this expense?</AlertDialogTitle>
            <AlertDialogDescription>
              {record.title} ({formatPrice(record.amount)}) will stop counting
              towards operating expenses, so net profit for its period will rise.
              The record stays visible for the audit trail.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel}>
              Cancel expense
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm text-foreground">{children}</dd>
    </div>
  );
}
