"use client";

import { useState } from "react";
import Link from "next/link";
import { notFound, useRouter } from "next/navigation";
import { ArrowLeft, Pencil, Trash2, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { DeleteExpenseDialog } from "@/components/admin/expenses/DeleteExpenseDialog";
import { useAuth } from "@/context/AuthContext";
import { useExpenses } from "@/context/ExpensesContext";
import {
  EXPENSE_CATEGORY_CONFIG,
  expensePaymentLabel,
  EXPENSE_STATUS_CONFIG,
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
  const { getExpense, isHydrated } = useExpenses();
  const { user } = useAuth();
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  // Set once the delete lands, so the vanished record does not 404
  // in the moment before the redirect.
  const [deleted, setDeleted] = useState(false);

  const expense = getExpense(expenseId);

  // Before hydration the store holds only the seed, so an expense created
  // in this browser would briefly look missing. Waiting avoids a 404
  // flashing up on a record that does exist.
  if (!expense) {
    if (!isHydrated || deleted) return null;
    notFound();
  }

  // Re-bound so the narrowing survives into the closures below -
  // TypeScript does not carry a narrowed outer binding into a closure.
  const record: Expense = expense;

  const category = EXPENSE_CATEGORY_CONFIG[record.category];
  const status = EXPENSE_STATUS_CONFIG[record.status];
  const cancelled = record.status === "CANCELLED";

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
            {user?.role === "SUPER_ADMIN" && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirmOpen(true)}
                className="h-10 gap-1.5 px-4 text-sm text-destructive hover:text-destructive"
              >
                <Trash2 className="size-4" aria-hidden="true" />
                Delete
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
              {expensePaymentLabel(record)}
            </Row>
            <Row label="Expense Date">
              {formatOrderDate(record.expenseDate)}
              <span className="block text-[11px] text-muted-foreground">
                The period this cost belongs to
              </span>
            </Row>
            <Row label="Paid By">{record.paidBy || "-"}</Row>
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
              here so the correction stays visible. Delete it if it should
              not be listed at all.
            </p>
          )}
        </div>
      </div>

      <DeleteExpenseDialog
        expense={confirmOpen ? record : null}
        onClose={() => setConfirmOpen(false)}
        onDeleted={() => {
          setDeleted(true);
          router.push("/admin/expenses");
        }}
      />
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
