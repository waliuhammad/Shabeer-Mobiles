"use client";

import Link from "next/link";
import { Eye, SlidersHorizontal, PackageSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductImage } from "@/components/shared/ProductImage";
import { STOCK_STATUS_STYLES } from "@/lib/stock";
import { formatTransactionDate } from "@/lib/inventory-utils";
import { cn } from "@/lib/utils";
import type { InventoryRow } from "@/types";

interface InventoryTableProps {
  rows: InventoryRow[];
  onAdjust: (row: InventoryRow) => void;
}

/**
 * The inventory list.
 *
 * RESPONSIVE: a real table from lg up, stacked cards below. Eight columns
 * on a phone would overflow or shrink past legibility, so small screens
 * get different markup carrying the same facts.
 *
 * Stock status comes from lib/stock.ts via the row, never recomputed here.
 */
export function InventoryTable({ rows, onAdjust }: InventoryTableProps) {
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card py-16 text-center">
        <PackageSearch className="size-8 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm font-semibold text-foreground">No products match</p>
        <p className="max-w-xs text-xs text-muted-foreground">
          Try a different search, category or stock status.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {/* ---------- lg and up: table ---------- */}
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full text-sm">
          <caption className="sr-only">
            Stock level and status for every product
          </caption>
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th scope="col" className="px-4 py-2.5 font-medium">Product</th>
              <th scope="col" className="px-3 py-2.5 font-medium">SKU</th>
              <th scope="col" className="px-3 py-2.5 font-medium">Category</th>
              <th scope="col" className="px-3 py-2.5 text-right font-medium">Stock</th>
              <th scope="col" className="px-3 py-2.5 text-right font-medium">Threshold</th>
              <th scope="col" className="px-3 py-2.5 font-medium">Status</th>
              <th scope="col" className="px-3 py-2.5 font-medium">Last Updated</th>
              <th scope="col" className="px-4 py-2.5 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => {
              const style = STOCK_STATUS_STYLES[row.status];
              return (
                <tr key={row.productId} className="transition-colors hover:bg-muted/40">
                  <th scope="row" className="px-4 py-3 text-left font-normal">
                    <div className="flex items-center gap-2.5">
                      <ProductImage
                        src={row.image}
                        alt={row.name}
                        sizes="48px"
                        wrapperClassName="size-9 shrink-0 rounded-md border border-border"
                        iconClassName="size-3"
                      />
                      <div className="min-w-0">
                        <span className="block truncate font-medium text-foreground">
                          {row.name}
                        </span>
                        <span className="block text-[11px] text-muted-foreground">
                          {row.brand}
                        </span>
                      </div>
                    </div>
                  </th>
                  <td className="px-3 py-3 font-mono text-xs text-muted-foreground">
                    {row.sku}
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">{row.categoryName}</td>
                  <td className="px-3 py-3 text-right font-semibold tabular-nums text-foreground">
                    {row.stock}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">
                    {row.lowStockThreshold}
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={cn(
                        "inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold",
                        style.badgeClass
                      )}
                    >
                      {style.label}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-xs text-muted-foreground">
                    {formatTransactionDate(row.lastUpdated)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1 px-2 text-xs"
                      >
                        <Link href={`/admin/inventory/${row.productId}`}>
                          <Eye className="size-3.5" aria-hidden="true" />
                          View
                        </Link>
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => onAdjust(row)}
                        className="h-8 gap-1 bg-accent px-2 text-xs font-semibold text-accent-foreground hover:bg-gold-deep"
                      >
                        <SlidersHorizontal className="size-3.5" aria-hidden="true" />
                        Adjust
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ---------- below lg: cards ---------- */}
      <ul className="divide-y divide-border lg:hidden">
        {rows.map((row) => {
          const style = STOCK_STATUS_STYLES[row.status];
          return (
            <li key={row.productId} className="space-y-3 p-4">
              <div className="flex items-start gap-3">
                <ProductImage
                  src={row.image}
                  alt={row.name}
                  sizes="56px"
                  wrapperClassName="size-11 shrink-0 rounded-md border border-border"
                  iconClassName="size-4"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {row.name}
                  </p>
                  <p className="truncate font-mono text-[11px] text-muted-foreground">
                    {row.sku} &middot; {row.categoryName}
                  </p>
                </div>
                <span
                  className={cn(
                    "shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold",
                    style.badgeClass
                  )}
                >
                  {style.label}
                </span>
              </div>

              <div className="flex items-center justify-between gap-3 text-xs">
                <p className="text-muted-foreground">
                  <span className="font-heading text-base font-bold tabular-nums text-foreground">
                    {row.stock}
                  </span>{" "}
                  in stock &middot; reorder at {row.lowStockThreshold}
                </p>
              </div>

              <div className="flex gap-2">
                <Button asChild variant="outline" size="sm" className="h-9 flex-1 gap-1.5 text-xs">
                  <Link href={`/admin/inventory/${row.productId}`}>
                    <Eye className="size-3.5" aria-hidden="true" />
                    View
                  </Link>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => onAdjust(row)}
                  className="h-9 flex-1 gap-1.5 bg-accent text-xs font-semibold text-accent-foreground hover:bg-gold-deep"
                >
                  <SlidersHorizontal className="size-3.5" aria-hidden="true" />
                  Adjust
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
