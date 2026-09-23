"use client";

import Link from "next/link";
import { Receipt, Eye, Pencil, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  EXPENSE_CATEGORY_CONFIG,
  EXPENSE_PAYMENT_METHOD_LABELS,
  EXPENSE_STATUS_CONFIG,
  canCancelExpense,
  canEditExpense,
} from "@/lib/expense-utils";
import { formatOrderDate } from "@/lib/order-utils";
import { formatPrice, cn } from "@/lib/utils";
import type { Expense } from "@/types";

interface ExpenseTableProps {
  expenses: Expense[];
  onCancel: (expense: Expense) => void;
  emptyMessage?: string;
}

/**
 * Table above lg, cards below - the same two-layout pattern the purchase
 * and customer tables use. A financial table squeezed onto a phone is
 * unreadable, and horizontal scrolling hides exactly the column that
 * matters (the amount).
 */
export function ExpenseTable({
  expenses,
  onCancel,
  emptyMessage = "Try a different search or filter.",
}: ExpenseTableProps) {
  if (expenses.length === 0) {
    return (
      <div className="mt-3 flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-card py-16 text-center">
        <Receipt className="size-8 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm font-semibold text-foreground">No expenses found</p>
        <p className="max-w-xs text-xs text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-border bg-card">
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full text-sm">
          <caption className="sr-only">
            Business operating expenses with category, amount and status
          </caption>
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th scope="col" className="px-4 py-2.5 font-medium">Expense</th>
              <th scope="col" className="px-3 py-2.5 font-medium">Category</th>
              <th scope="col" className="px-3 py-2.5 text-right font-medium">Amount</th>
              <th scope="col" className="px-3 py-2.5 font-medium">Payment</th>
              <th scope="col" className="px-3 py-2.5 font-medium">Status</th>
              <th scope="col" className="px-3 py-2.5 font-medium">Expense Date</th>
              <th scope="col" className="px-3 py-2.5 font-medium">Created By</th>
              <th scope="col" className="px-4 py-2.5 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {expenses.map((e) => {
              const category = EXPENSE_CATEGORY_CONFIG[e.category];
              const status = EXPENSE_STATUS_CONFIG[e.status];
              const cancelled = e.status === "CANCELLED";
              return (
                <tr
                  key={e.id}
                  className={cn(
                    "transition-colors hover:bg-muted/40",
                    // A cancelled row is visibly inert, not merely badged.
                    cancelled && "opacity-60"
                  )}
                >
                  <th scope="row" className="px-4 py-3 text-left">
                    <Link
                      href={`/admin/expenses/${e.id}`}
                      className="font-semibold text-primary hover:text-secondary"
                    >
                      {e.title}
                    </Link>
                    {e.description && (
                      <span className="block max-w-[18rem] truncate text-xs font-normal text-muted-foreground">
                        {e.description}
                      </span>
                    )}
                  </th>
                  <td className="px-3 py-3">
                    <span
                      className={cn(
                        "inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold",
                        category.badgeClass
                      )}
                    >
                      {category.label}
                    </span>
                  </td>
                  <td
                    className={cn(
                      "whitespace-nowrap px-3 py-3 text-right font-semibold tabular-nums",
                      cancelled
                        ? "text-muted-foreground line-through"
                        : "text-foreground"
                    )}
                  >
                    {formatPrice(e.amount)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-muted-foreground">
                    {EXPENSE_PAYMENT_METHOD_LABELS[e.paymentMethod]}
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={cn(
                        "inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold",
                        status.badgeClass
                      )}
                    >
                      {status.label}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-xs text-muted-foreground">
                    {formatOrderDate(e.expenseDate)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-xs text-muted-foreground">
                    {e.createdBy}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Button asChild variant="outline" size="sm" className="h-8 gap-1 px-2 text-xs">
                        <Link href={`/admin/expenses/${e.id}`}>
                          <Eye className="size-3.5" aria-hidden="true" />
                          View
                        </Link>
                      </Button>
                      {canEditExpense(e) && (
                        <Button asChild variant="outline" size="sm" className="h-8 gap-1 px-2 text-xs">
                          <Link href={`/admin/expenses/${e.id}/edit`}>
                            <Pencil className="size-3.5" aria-hidden="true" />
                            Edit
                          </Link>
                        </Button>
                      )}
                      {canCancelExpense(e) && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => onCancel(e)}
                          aria-label={`Cancel ${e.title}`}
                          className="h-8 gap-1 px-2 text-xs"
                        >
                          <Ban className="size-3.5" aria-hidden="true" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* below lg: cards */}
      <ul className="divide-y divide-border lg:hidden">
        {expenses.map((e) => {
          const category = EXPENSE_CATEGORY_CONFIG[e.category];
          const status = EXPENSE_STATUS_CONFIG[e.status];
          const cancelled = e.status === "CANCELLED";
          return (
            <li key={e.id} className={cn("space-y-2.5 p-4", cancelled && "opacity-60")}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    href={`/admin/expenses/${e.id}`}
                    className="font-semibold text-primary"
                  >
                    {e.title}
                  </Link>
                  <p className="truncate text-xs text-muted-foreground">
                    {category.label} · {formatOrderDate(e.expenseDate)}
                  </p>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                    status.badgeClass
                  )}
                >
                  {status.label}
                </span>
              </div>

              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="text-muted-foreground">
                  {EXPENSE_PAYMENT_METHOD_LABELS[e.paymentMethod]}
                </span>
                <span
                  className={cn(
                    "font-heading text-base font-bold tabular-nums",
                    cancelled ? "text-muted-foreground line-through" : "text-primary"
                  )}
                >
                  {formatPrice(e.amount)}
                </span>
              </div>

              <div className="flex gap-2">
                <Button asChild variant="outline" size="sm" className="h-9 flex-1 text-xs">
                  <Link href={`/admin/expenses/${e.id}`}>View</Link>
                </Button>
                {canEditExpense(e) && (
                  <Button asChild variant="outline" size="sm" className="h-9 flex-1 text-xs">
                    <Link href={`/admin/expenses/${e.id}/edit`}>Edit</Link>
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
