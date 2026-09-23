"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InventoryTransactionTable } from "@/components/admin/inventory/InventoryTransactionTable";
import { useInventory } from "@/context/InventoryContext";
import {
  TRANSACTION_TYPES,
  TRANSACTION_TYPE_LABELS,
  filterTransactions,
  sortTransactionsNewestFirst,
} from "@/lib/inventory-utils";
import type { InventoryTransactionType } from "@/types";

/**
 * /admin/inventory/transactions - the full ledger.
 *
 * Every filter narrows the same list; they combine rather than replace,
 * so "POS Sale" + "23 Sep" + "charger" answers a real question a shop
 * owner asks: what left the counter that day, and why.
 */
export function TransactionLedgerView() {
  const { transactions } = useInventory();

  const [query, setQuery] = useState("");
  const [type, setType] = useState<InventoryTransactionType | "all">("all");
  const [date, setDate] = useState("");

  const visible = useMemo(
    () =>
      sortTransactionsNewestFirst(
        filterTransactions(transactions, { query, type, date })
      ),
    [transactions, query, type, date]
  );

  const hasFilters = Boolean(query.trim() || date) || type !== "all";

  return (
    <>
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <label htmlFor="txn-search" className="sr-only">
            Search by product name, SKU or reference
          </label>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            id="txn-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search product, SKU or reference..."
            className="h-10 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-secondary focus:ring-2 focus:ring-ring/30"
          />
        </div>

        <Select
          value={type}
          onValueChange={(v) => setType(v as InventoryTransactionType | "all")}
        >
          <SelectTrigger className="h-10 sm:w-44" aria-label="Filter by movement type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {TRANSACTION_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {TRANSACTION_TYPE_LABELS[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div>
          <label htmlFor="txn-date" className="sr-only">
            Filter by date
          </label>
          <input
            id="txn-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none transition-colors focus:border-secondary focus:ring-2 focus:ring-ring/30 sm:w-44"
          />
        </div>

        {hasFilters && (
          <Button
            type="button"
            variant="outline"
            onClick={() => { setQuery(""); setType("all"); setDate(""); }}
            className="h-10 shrink-0 gap-1.5 px-3 text-xs"
          >
            <X className="size-3.5" aria-hidden="true" />
            Clear
          </Button>
        )}
      </div>

      <p className="mt-2 text-xs text-muted-foreground" aria-live="polite">
        {visible.length} {visible.length === 1 ? "movement" : "movements"}
        {hasFilters && ` of ${transactions.length}`}
      </p>

      <div className="mt-3">
        <InventoryTransactionTable transactions={visible} />
      </div>
    </>
  );
}
