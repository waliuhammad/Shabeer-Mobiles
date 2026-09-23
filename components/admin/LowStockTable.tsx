import Link from "next/link";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { lowStockProducts } from "@/data/admin";
import { cn } from "@/lib/utils";
import type { StockLevel } from "@/types";

/**
 * Status colours are RESERVED - warning/serious/critical - and are never
 * reused as chart series colours. Each badge also carries its own words,
 * so the state is never communicated by colour alone.
 */
const LEVELS: Record<StockLevel, { label: string; className: string }> = {
  low: { label: "Low", className: "bg-warning/15 text-gold-deep" },
  critical: { label: "Critical", className: "bg-destructive/10 text-destructive" },
  "out-of-stock": {
    label: "Out of Stock",
    className: "bg-destructive text-destructive-foreground",
  },
};

/**
 * Products at or below their reorder threshold.
 *
 * The stock figure is the CENTRAL number - what the counter and the
 * website both draw from. There is no separate "online stock", which is
 * the whole point of the architecture.
 *
 * RESPONSIVE: a real table from sm up, stacked rows below. Four columns
 * squeezed into 360px would either overflow the page or shrink the text
 * past legibility, so small screens get different markup, not a smaller
 * table.
 *
 * A Server Component.
 */
export function LowStockTable() {
  return (
    <section className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3.5 sm:px-5">
        <h2 className="flex items-center gap-2 font-heading text-base font-bold text-primary">
          <AlertTriangle className="size-4 text-warning" aria-hidden="true" />
          Low Stock Products
        </h2>
        <Link
          href="/admin/inventory"
          className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-secondary transition-colors hover:text-primary"
        >
          Inventory
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      </div>

      {lowStockProducts.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-muted-foreground">
          Every product is above its reorder threshold.
        </p>
      ) : (
        <>
          {/* ---------- sm and up: real table ---------- */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">
                Products at or below their low-stock threshold
              </caption>
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th scope="col" className="px-5 py-2.5 font-medium">Product</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-medium">Stock</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-medium">Threshold</th>
                  <th scope="col" className="px-5 py-2.5 text-right font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {lowStockProducts.map((product) => (
                  <tr key={product.id} className="transition-colors hover:bg-muted/40">
                    <th scope="row" className="px-5 py-3 text-left font-medium text-foreground">
                      {product.name}
                    </th>
                    <td className="px-3 py-3 text-right font-semibold tabular-nums text-foreground">
                      {product.stock}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">
                      {product.lowStockThreshold}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <StockBadge level={product.level} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ---------- below sm: stacked rows ---------- */}
          <ul className="divide-y divide-border sm:hidden">
            {lowStockProducts.map((product) => (
              <li key={product.id} className="flex items-start justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {product.name}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    <span className="font-semibold tabular-nums text-foreground">
                      {product.stock}
                    </span>{" "}
                    in stock &middot; reorder at {product.lowStockThreshold}
                  </p>
                </div>
                <StockBadge level={product.level} />
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function StockBadge({ level }: { level: StockLevel }) {
  const { label, className } = LEVELS[level];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold",
        className
      )}
    >
      {label}
    </span>
  );
}
