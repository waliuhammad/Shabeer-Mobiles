"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  SlidersHorizontal,
  ArrowLeft,
  Layers,
  AlertTriangle,
  Wallet,
  Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductImage } from "@/components/shared/ProductImage";
import { InventoryTransactionTable } from "@/components/admin/inventory/InventoryTransactionTable";
import { StockAdjustmentDialog } from "@/components/admin/inventory/StockAdjustmentDialog";
import { useInventory } from "@/context/InventoryContext";
import { useCatalog } from "@/context/CatalogContext";
import {
  sortTransactionsNewestFirst,
  toInventoryRow,
} from "@/lib/inventory-utils";
import { STOCK_STATUS_STYLES } from "@/lib/stock";
import { formatPrice, cn } from "@/lib/utils";
import type { InventoryRow, Product } from "@/types";

interface ProductInventoryViewProps {
  product: Product;
}

/**
 * /admin/inventory/[productId].
 *
 * One product's stock position, then everything that produced it.
 *
 * The product comes from the server (the one catalogue); live stock and
 * the ledger come from the client context. Reading the history top to
 * bottom answers "why is it 3?" - which a bare number never can.
 */
export function ProductInventoryView({ product }: ProductInventoryViewProps) {
  const { getCost } = useCatalog();
  const { getStock, getProductTransactions } = useInventory();
  const [adjusting, setAdjusting] = useState<InventoryRow | null>(null);

  const history = useMemo(
    () => getProductTransactions(product.id),
    [getProductTransactions, product.id]
  );

  const row = useMemo(
    () =>
      toInventoryRow(
        product,
        getStock(product.id),
        history.at(-1)?.createdAt
      ),
    [product, getStock, history]
  );

  const style = STOCK_STATUS_STYLES[row.status];
  // Live cost from the protected collection. Returns 0 for a cashier,
  // who is not permitted to read it - the UI shows a dash rather than
  // pretending the cost is zero.
  const cost = getCost(product.id);

  return (
    <>
      <Button asChild variant="outline" size="sm" className="mb-4 h-9 gap-1.5 text-xs">
        <Link href="/admin/inventory">
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          Back to Inventory
        </Link>
      </Button>

      {/* ---------------- PRODUCT HEADER ---------------- */}
      <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 gap-3">
            <ProductImage
              src={row.image}
              alt={row.name}
              sizes="80px"
              wrapperClassName="size-16 shrink-0 rounded-lg border border-border"
              iconClassName="size-5"
            />
            <div className="min-w-0">
              <h2 className="truncate font-heading text-lg font-bold text-primary">
                {row.name}
              </h2>
              <p className="truncate font-mono text-xs text-muted-foreground">
                {row.sku}
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                    style.badgeClass
                  )}
                >
                  {style.label}
                </span>
                {/*
                  PRODUCT STATUS vs STOCK STATUS - two different things.
                  A product can be ACTIVE and have zero stock: it still
                  exists, still has a page, and can be restocked. Out of
                  stock never means inactive.
                */}
                <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium capitalize text-muted-foreground">
                  Product: {row.productStatus}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {row.brand} &middot; {row.categoryName}
                </span>
              </div>
            </div>
          </div>

          <Button
            type="button"
            onClick={() => setAdjusting(row)}
            className="h-10 shrink-0 gap-1.5 bg-accent px-4 text-sm font-semibold text-accent-foreground hover:bg-gold-deep"
          >
            <SlidersHorizontal className="size-4" aria-hidden="true" />
            Adjust Stock
          </Button>
        </div>
      </section>

      {/* ---------------- STOCK SUMMARY ---------------- */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Stat
          label="Current Stock"
          value={String(row.stock)}
          Icon={Layers}
          tone="navy"
        />
        <Stat
          label="Low Stock Threshold"
          value={String(row.lowStockThreshold)}
          Icon={AlertTriangle}
          tone="gold"
        />
        <Stat
          label="Selling Price"
          value={formatPrice(row.price)}
          Icon={Tag}
          tone="cyan"
        />
        {/*
          Admin-only. Cost comes from data/product-costs.ts, which is NOT
          on the Product type and is never imported by the POS or the
          storefront. See that file for why.
        */}
        <Stat
          label="Stock Cost Value"
          value={formatPrice(row.stock * cost)}
          Icon={Wallet}
          tone="success"
          hint={`${formatPrice(cost)} per unit`}
        />
      </div>

      {/* ---------------- LEDGER ---------------- */}
      <section className="mt-5">
        <h2 className="mb-1 font-heading text-base font-bold text-primary">
          Inventory Transaction History
        </h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Every movement that produced the current stock of {row.stock}, newest
          first. Each row shows the figure before and after.
        </p>

        <InventoryTransactionTable
          transactions={sortTransactionsNewestFirst(history)}
          showProduct={false}
          emptyMessage="This product has no recorded movements yet."
        />
      </section>

      <StockAdjustmentDialog
        row={adjusting}
        onOpenChange={(open) => { if (!open) setAdjusting(null); }}
      />
    </>
  );
}

const TONES = {
  navy: "bg-primary text-accent",
  cyan: "bg-cyan-soft text-secondary",
  gold: "bg-accent text-accent-foreground",
  success: "bg-success/10 text-success",
} as const;

function Stat({
  label,
  value,
  Icon,
  tone,
  hint,
}: {
  label: string;
  value: string;
  Icon: typeof Layers;
  tone: keyof typeof TONES;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <span
        className={cn(
          "mb-2.5 flex size-9 items-center justify-center rounded-lg",
          TONES[tone]
        )}
      >
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <p className="font-heading text-xl font-bold tabular-nums text-primary">
        {value}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
      {hint && <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
