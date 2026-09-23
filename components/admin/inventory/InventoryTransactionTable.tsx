"use client";

import Link from "next/link";
import { ArrowRight, FileClock } from "lucide-react";
import {
  TRANSACTION_TYPE_LABELS,
  TRANSACTION_TYPE_STYLES,
  formatSignedQuantity,
  formatTransactionDate,
} from "@/lib/inventory-utils";
import { cn } from "@/lib/utils";
import type { InventoryTransaction } from "@/types";

interface InventoryTransactionTableProps {
  transactions: InventoryTransaction[];
  /** Hide the Product column on a single-product history. */
  showProduct?: boolean;
  emptyMessage?: string;
}

/**
 * The ledger.
 *
 * Shows `previousStock -> newStock` on every row rather than just the
 * change. That is the difference between a log and an audit trail: "-2"
 * tells you what happened, "10 -> 8" lets you verify it against the row
 * above and catch the gap where something went unrecorded.
 *
 * The signed quantity is never shown alone - always beside its type
 * badge - because "-2" on its own does not say whether it was sold,
 * broken or written off.
 */
export function InventoryTransactionTable({
  transactions,
  showProduct = true,
  emptyMessage = "No inventory movements match these filters.",
}: InventoryTransactionTableProps) {
  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card py-14 text-center">
        <FileClock className="size-7 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm font-semibold text-foreground">No movements</p>
        <p className="max-w-xs text-xs text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {/* ---------- lg and up: table ---------- */}
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full text-sm">
          <caption className="sr-only">
            Every recorded stock movement, newest first
          </caption>
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th scope="col" className="px-4 py-2.5 font-medium">Date</th>
              {showProduct && (
                <th scope="col" className="px-3 py-2.5 font-medium">Product</th>
              )}
              <th scope="col" className="px-3 py-2.5 font-medium">Type</th>
              <th scope="col" className="px-3 py-2.5 text-right font-medium">Qty</th>
              <th scope="col" className="px-3 py-2.5 text-center font-medium">Stock</th>
              <th scope="col" className="px-3 py-2.5 font-medium">Reference</th>
              <th scope="col" className="px-4 py-2.5 font-medium">By</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {transactions.map((txn) => (
              <tr key={txn.id} className="transition-colors hover:bg-muted/40">
                <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                  {formatTransactionDate(txn.createdAt)}
                </td>

                {showProduct && (
                  <th scope="row" className="px-3 py-3 text-left font-normal">
                    <Link
                      href={`/admin/inventory/${txn.productId}`}
                      className="block truncate font-medium text-foreground hover:text-secondary"
                    >
                      {txn.productName}
                    </Link>
                    <span className="block font-mono text-[11px] text-muted-foreground">
                      {txn.productSku}
                    </span>
                  </th>
                )}

                <td className="px-3 py-3">
                  <TypeBadge type={txn.type} />
                </td>

                <td
                  className={cn(
                    "whitespace-nowrap px-3 py-3 text-right font-semibold tabular-nums",
                    txn.quantity > 0 ? "text-success" : "text-destructive"
                  )}
                >
                  {formatSignedQuantity(txn.quantity)}
                </td>

                {/* before -> after, the audit-trail bit */}
                <td className="whitespace-nowrap px-3 py-3 text-center text-xs tabular-nums text-muted-foreground">
                  {txn.previousStock}
                  <ArrowRight className="mx-1 inline size-3" aria-hidden="true" />
                  <span className="font-semibold text-foreground">{txn.newStock}</span>
                </td>

                <td className="px-3 py-3 font-mono text-[11px] text-muted-foreground">
                  {txn.referenceId ?? <span className="font-sans">&mdash;</span>}
                </td>

                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {txn.createdBy}
                  {txn.note && (
                    <span className="block max-w-[14rem] truncate text-[11px] italic">
                      {txn.note}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ---------- below lg: cards ---------- */}
      <ul className="divide-y divide-border lg:hidden">
        {transactions.map((txn) => (
          <li key={txn.id} className="space-y-2 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                {showProduct && (
                  <Link
                    href={`/admin/inventory/${txn.productId}`}
                    className="block truncate text-sm font-medium text-foreground"
                  >
                    {txn.productName}
                  </Link>
                )}
                <p className="text-[11px] text-muted-foreground">
                  {formatTransactionDate(txn.createdAt)} &middot; {txn.createdBy}
                </p>
              </div>
              <TypeBadge type={txn.type} />
            </div>

            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-xs tabular-nums text-muted-foreground">
                {txn.previousStock}
                <ArrowRight className="mx-1 inline size-3" aria-hidden="true" />
                <span className="font-semibold text-foreground">{txn.newStock}</span>
              </span>
              <span
                className={cn(
                  "font-heading text-base font-bold tabular-nums",
                  txn.quantity > 0 ? "text-success" : "text-destructive"
                )}
              >
                {formatSignedQuantity(txn.quantity)}
              </span>
            </div>

            {(txn.referenceId || txn.note) && (
              <p className="text-[11px] text-muted-foreground">
                {txn.referenceId && (
                  <span className="font-mono">{txn.referenceId}</span>
                )}
                {txn.referenceId && txn.note && " · "}
                {txn.note && <span className="italic">{txn.note}</span>}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function TypeBadge({ type }: { type: InventoryTransaction["type"] }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold",
        TRANSACTION_TYPE_STYLES[type]
      )}
    >
      {TRANSACTION_TYPE_LABELS[type]}
    </span>
  );
}
