"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Package,
  Layers,
  AlertTriangle,
  XCircle,
  Wallet,
  Search,
  FileClock,
  ArrowRight,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { KpiCard } from "@/components/admin/KpiCard";
import { InventoryTable } from "@/components/admin/inventory/InventoryTable";
import { StockAdjustmentDialog } from "@/components/admin/inventory/StockAdjustmentDialog";
import { useInventory } from "@/context/InventoryContext";
import { getActiveProducts } from "@/data/products";
import { categories } from "@/data/categories";
import {
  calculateInventorySummary,
  filterInventoryRows,
  sortTransactionsNewestFirst,
  toInventoryRow,
} from "@/lib/inventory-utils";
import { STOCK_STATUS_STYLES } from "@/lib/stock";
import { formatPrice, cn } from "@/lib/utils";
import type { InventoryRow, StockStatus } from "@/types";

/**
 * /admin/inventory.
 *
 * Builds every row from the ONE product catalogue plus live stock from
 * the ledger. There is no separate inventory product list - the same
 * records back the storefront, the product page and the POS.
 */
export function InventoryView() {
  const { getStock, transactions } = useInventory();

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState<StockStatus | "all">("all");
  const [adjusting, setAdjusting] = useState<InventoryRow | null>(null);

  /** Most recent movement per product, for the Last Updated column. */
  const latestByProduct = useMemo(() => {
    const map = new Map<string, string>();
    for (const txn of transactions) {
      const seen = map.get(txn.productId);
      if (!seen || txn.createdAt > seen) map.set(txn.productId, txn.createdAt);
    }
    return map;
  }, [transactions]);

  const rows = useMemo(
    () =>
      getActiveProducts().map((product) =>
        toInventoryRow(
          product,
          getStock(product.id),
          latestByProduct.get(product.id)
        )
      ),
    [getStock, latestByProduct]
  );

  // Summary is over EVERY product, not the filtered view - "4 low stock"
  // must mean four in the shop, not four on this screen.
  const summary = useMemo(() => calculateInventorySummary(rows), [rows]);

  const visibleRows = useMemo(
    () => filterInventoryRows(rows, { query, category, status }),
    [rows, query, category, status]
  );

  const recentMovements = useMemo(
    () => sortTransactionsNewestFirst(transactions).slice(0, 5),
    [transactions]
  );

  const lowStockRows = rows.filter((r) => r.status === "low-stock");
  const outOfStockRows = rows.filter((r) => r.status === "out-of-stock");

  return (
    <>
      {/* ---------------- SUMMARY ---------------- */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-5">
        <KpiCard
          title="Total Products"
          value={String(summary.totalProducts)}
          Icon={Package}
          tone="navy"
          description="Active products in the catalogue"
        />
        <KpiCard
          title="Total Units"
          value={summary.totalUnits.toLocaleString("en-PK")}
          Icon={Layers}
          tone="cyan"
          description="Across every product"
        />
        <KpiCard
          title="Low Stock Items"
          value={String(summary.lowStockCount)}
          Icon={AlertTriangle}
          tone="gold"
          description="At or below reorder level"
        />
        <KpiCard
          title="Out of Stock"
          value={String(summary.outOfStockCount)}
          Icon={XCircle}
          tone="navy"
          description="Still active, just empty"
        />
        {/* Labelled COST, not value - see lib/inventory-utils. */}
        <KpiCard
          title="Inventory Cost Value"
          value={formatPrice(summary.costValue)}
          Icon={Wallet}
          tone="success"
          description="Stock at purchase cost, not retail"
        />
      </div>

      {/* ---------------- FILTERS ---------------- */}
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <label htmlFor="inv-search" className="sr-only">
            Search by product name, SKU or brand
          </label>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            id="inv-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, SKU or brand..."
            className="h-10 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-secondary focus:ring-2 focus:ring-ring/30"
          />
        </div>

        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="h-10 sm:w-48" aria-label="Filter by category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.slug}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={status}
          onValueChange={(v) => setStatus(v as StockStatus | "all")}
        >
          <SelectTrigger className="h-10 sm:w-44" aria-label="Filter by stock status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stock Status</SelectItem>
            <SelectItem value="in-stock">In Stock</SelectItem>
            <SelectItem value="low-stock">Low Stock</SelectItem>
            <SelectItem value="out-of-stock">Out of Stock</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <p className="mt-2 text-xs text-muted-foreground" aria-live="polite">
        Showing {visibleRows.length} of {rows.length} products
      </p>

      {/* ---------------- TABLE ---------------- */}
      <div className="mt-3">
        <InventoryTable rows={visibleRows} onAdjust={setAdjusting} />
      </div>

      {/* ---------------- ATTENTION LISTS ---------------- */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <AttentionList
          title="Low Stock"
          icon={<AlertTriangle className="size-4 text-warning" aria-hidden="true" />}
          rows={lowStockRows}
          emptyText="Every product is above its reorder level."
          suffix={(row) => `${row.stock} left`}
        />
        <AttentionList
          title="Out of Stock"
          icon={<XCircle className="size-4 text-destructive" aria-hidden="true" />}
          rows={outOfStockRows}
          emptyText="Nothing is out of stock."
          // Out of stock is NOT the same as inactive - the product still
          // exists and can be restocked. See types/inventory.ts.
          suffix={() => "0 in stock"}
        />
      </div>

      {/* ---------------- RECENT MOVEMENTS ---------------- */}
      <section className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3.5">
          <h2 className="flex items-center gap-2 font-heading text-base font-bold text-primary">
            <FileClock className="size-4 text-secondary" aria-hidden="true" />
            Recent Movements
          </h2>
          <Link
            href="/admin/inventory/transactions"
            className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-secondary transition-colors hover:text-primary"
          >
            Full ledger
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        </div>

        <ul className="divide-y divide-border">
          {recentMovements.map((txn) => (
            <li
              key={txn.id}
              className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
            >
              <span className="min-w-0 flex-1 truncate text-foreground">
                {txn.productName}
              </span>
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                {txn.previousStock} &rarr; {txn.newStock}
              </span>
              <span
                className={cn(
                  "w-10 shrink-0 text-right font-semibold tabular-nums",
                  txn.quantity > 0 ? "text-success" : "text-destructive"
                )}
              >
                {txn.quantity > 0 ? `+${txn.quantity}` : txn.quantity}
              </span>
            </li>
          ))}
        </ul>
      </section>


      <StockAdjustmentDialog
        row={adjusting}
        onOpenChange={(open) => { if (!open) setAdjusting(null); }}
      />
    </>
  );
}

function AttentionList({
  title,
  icon,
  rows,
  emptyText,
  suffix,
}: {
  title: string;
  icon: React.ReactNode;
  rows: InventoryRow[];
  emptyText: string;
  suffix: (row: InventoryRow) => string;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <h2 className="flex items-center gap-2 border-b border-border px-4 py-3.5 font-heading text-base font-bold text-primary">
        {icon}
        {title}
        <span className="ml-auto text-xs font-normal tabular-nums text-muted-foreground">
          {rows.length}
        </span>
      </h2>

      {rows.length === 0 ? (
        <p className="px-4 py-8 text-center text-xs text-muted-foreground">
          {emptyText}
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {rows.map((row) => (
            <li key={row.productId}>
              <Link
                href={`/admin/inventory/${row.productId}`}
                className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-muted/40"
              >
                <span className="min-w-0 flex-1 truncate text-foreground">
                  {row.name}
                </span>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                    STOCK_STATUS_STYLES[row.status].badgeClass
                  )}
                >
                  {suffix(row)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
