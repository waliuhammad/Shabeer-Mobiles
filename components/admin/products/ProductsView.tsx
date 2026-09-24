"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  Package, CheckCircle2, TriangleAlert, Warehouse,
  Search, Plus, Eye, Pencil, Archive, RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { KpiCard } from "@/components/admin/KpiCard";
import { useCatalog } from "@/context/CatalogContext";
import { useInventory } from "@/context/InventoryContext";
import {
  EMPTY_PRODUCT_FILTERS, PRODUCT_CONDITIONS, PRODUCT_CONDITION_CONFIG,
  PRODUCT_STATUSES, PRODUCT_STATUS_CONFIG,
  calculateCatalogSummary, filterProducts, hasActiveProductFilters,
} from "@/lib/catalog-utils";
import { getStockStatus } from "@/lib/stock";
import { formatPrice, cn } from "@/lib/utils";
import type { ProductFilterState } from "@/types";

/**
 * /admin/products.
 *
 * Stock is READ here but never written - the number comes from the
 * inventory ledger, and changing it is the ledger's job. That is why the
 * stock cell links to the adjustment page instead of being editable.
 */
export function ProductsView() {
  const { products, categories, getCost, setProductStatus } = useCatalog();
  const { getStock } = useInventory();

  /**
   * Seeded from ?q= so the topbar search can actually land somewhere.
   *
   * That box used to be decoration - `onSubmit={e => e.preventDefault()}`
   * with no handler - so typing in it and pressing Enter did nothing at
   * all. It now navigates here with the term.
   *
   * Read once, as an initial value, not derived on every render: after
   * arriving, this box belongs to the person typing in it, and rederiving
   * from the URL would fight them on every keystroke.
   */
  const initialQuery = useSearchParams().get("q") ?? "";
  const [filters, setFilters] = useState<ProductFilterState>({
    ...EMPTY_PRODUCT_FILTERS,
    query: initialQuery,
  });

  const set = <K extends keyof ProductFilterState>(key: K, value: ProductFilterState[K]) =>
    setFilters((f) => ({ ...f, [key]: value }));

  const summary = useMemo(
    () => calculateCatalogSummary(products, getStock, getCost),
    [products, getStock, getCost]
  );

  const visible = useMemo(
    () => filterProducts(products, filters, getStock),
    [products, filters, getStock]
  );

  function toggleArchive(id: string, name: string, archived: boolean) {
    setProductStatus(id, archived ? "draft" : "archived");
    toast.success(archived ? "Product restored as a draft." : "Product archived.", {
      description: archived
        ? `${name} is hidden from customers until you set it active.`
        : `${name} is off the storefront. Past orders still reference it.`,
    });
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        <KpiCard
          title="Total Products" value={String(summary.total)}
          Icon={Package} tone="navy"
          description={`${summary.draft} draft · ${summary.archived} archived`}
        />
        <KpiCard
          title="Active" value={String(summary.active)}
          Icon={CheckCircle2} tone="success" description="Visible on the storefront"
        />
        <KpiCard
          title="Needs Restocking" value={String(summary.lowStock + summary.outOfStock)}
          Icon={TriangleAlert} tone="gold"
          description={`${summary.outOfStock} out of stock`}
        />
        <KpiCard
          title="Stock Value" value={formatPrice(summary.stockValue)}
          Icon={Warehouse} tone="cyan" description="At current cost"
        />
      </div>

      {/* ---------------- FILTERS ---------------- */}
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <label htmlFor="product-search" className="sr-only">
            Search by name, SKU, brand or category
          </label>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            id="product-search" type="search" value={filters.query}
            onChange={(e) => set("query", e.target.value)}
            placeholder="Search name, SKU, brand or category..."
            className="h-10 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-secondary focus:ring-2 focus:ring-ring/30"
          />
        </div>
        <Button asChild className="h-10 shrink-0 gap-1.5 bg-accent px-4 text-sm font-semibold text-accent-foreground hover:bg-gold-deep">
          <Link href="/admin/products/new">
            <Plus className="size-4" aria-hidden="true" />
            Add Product
          </Link>
        </Button>
      </div>

      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Select value={filters.categoryId} onValueChange={(v) => set("categoryId", v)}>
          <SelectTrigger className="h-10 sm:w-48" aria-label="Filter by category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.status} onValueChange={(v) => set("status", v as ProductFilterState["status"])}>
          <SelectTrigger className="h-10 sm:w-36" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {PRODUCT_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{PRODUCT_STATUS_CONFIG[s].label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.condition} onValueChange={(v) => set("condition", v as ProductFilterState["condition"])}>
          <SelectTrigger className="h-10 sm:w-36" aria-label="Filter by condition">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">New &amp; Used</SelectItem>
            {PRODUCT_CONDITIONS.map((c) => (
              <SelectItem key={c} value={c}>{PRODUCT_CONDITION_CONFIG[c].label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <label className="flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm text-muted-foreground">
          <input
            type="checkbox" checked={filters.lowStockOnly}
            onChange={(e) => set("lowStockOnly", e.target.checked)}
            className="size-4 accent-[var(--secondary)]"
          />
          Needs restocking
        </label>

        {hasActiveProductFilters(filters) && (
          <Button type="button" variant="outline" onClick={() => setFilters(EMPTY_PRODUCT_FILTERS)} className="h-10 px-4 text-sm">
            Clear
          </Button>
        )}
      </div>

      <p className="mt-2 text-xs text-muted-foreground" aria-live="polite">
        Showing {visible.length} of {products.length} products
      </p>

      {/* ---------------- TABLE ---------------- */}
      {visible.length === 0 ? (
        <div className="mt-3 flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-card py-16 text-center">
          <Package className="size-8 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm font-semibold text-foreground">No products found</p>
          <p className="max-w-xs text-xs text-muted-foreground">
            {products.length === 0
              ? "Add your first product to start selling."
              : "Try a different search, category or status."}
          </p>
        </div>
      ) : (
        <div className="mt-3 overflow-hidden rounded-xl border border-border bg-card">
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full text-sm">
              <caption className="sr-only">Product catalogue with price, cost and stock</caption>
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th scope="col" className="px-4 py-2.5 font-medium">Product</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Category</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-medium">Price</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-medium">Cost</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-medium">Stock</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Condition</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Status</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visible.map((p) => {
                  const stock = getStock(p.id);
                  const level = getStockStatus(stock, p.lowStockThreshold);
                  const status = PRODUCT_STATUS_CONFIG[p.status];
                  const condition = PRODUCT_CONDITION_CONFIG[p.condition];
                  const archived = p.status === "archived";
                  return (
                    <tr key={p.id} className={cn("transition-colors hover:bg-muted/40", archived && "opacity-60")}>
                      <th scope="row" className="px-4 py-3 text-left">
                        <Link href={`/admin/products/${p.id}`} className="font-semibold text-primary hover:text-secondary">
                          {p.name}
                        </Link>
                        <span className="block font-mono text-[10px] text-muted-foreground">{p.sku}</span>
                      </th>
                      <td className="px-3 py-3 text-muted-foreground">{p.categoryName}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-right font-semibold tabular-nums text-foreground">
                        {formatPrice(p.price)}
                      </td>
                      {/* Cost: admin-only, never on a cashier screen. */}
                      <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums text-muted-foreground">
                        {getCost(p.id) > 0 ? formatPrice(getCost(p.id)) : "—"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-right">
                        <Link
                          href={`/admin/inventory/${p.id}`}
                          className={cn(
                            "tabular-nums hover:underline",
                            level === "out-of-stock" ? "font-semibold text-destructive"
                              : level === "low-stock" ? "font-semibold text-gold-deep"
                              : "text-foreground"
                          )}
                        >
                          {stock}
                        </Link>
                      </td>
                      <td className="px-3 py-3">
                        <span className={cn("inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold", condition.badgeClass)}>
                          {condition.label}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span className={cn("inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold", status.badgeClass)}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button asChild variant="outline" size="sm" className="h-8 gap-1 px-2 text-xs">
                            <Link href={`/admin/products/${p.id}`}>
                              <Eye className="size-3.5" aria-hidden="true" />View
                            </Link>
                          </Button>
                          <Button asChild variant="outline" size="sm" className="h-8 gap-1 px-2 text-xs">
                            <Link href={`/admin/products/${p.id}/edit`}>
                              <Pencil className="size-3.5" aria-hidden="true" />Edit
                            </Link>
                          </Button>
                          {/* Archive, never delete - orders reference this id. */}
                          <Button
                            type="button" variant="outline" size="sm"
                            onClick={() => toggleArchive(p.id, p.name, archived)}
                            aria-label={archived ? `Restore ${p.name}` : `Archive ${p.name}`}
                            className="h-8 gap-1 px-2 text-xs"
                          >
                            {archived ? <RotateCcw className="size-3.5" aria-hidden="true" /> : <Archive className="size-3.5" aria-hidden="true" />}
                          </Button>
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
            {visible.map((p) => {
              const stock = getStock(p.id);
              const level = getStockStatus(stock, p.lowStockThreshold);
              const status = PRODUCT_STATUS_CONFIG[p.status];
              return (
                <li key={p.id} className={cn("space-y-2.5 p-4", p.status === "archived" && "opacity-60")}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link href={`/admin/products/${p.id}`} className="font-semibold text-primary">{p.name}</Link>
                      <p className="truncate font-mono text-[11px] text-muted-foreground">{p.sku} · {p.categoryName}</p>
                    </div>
                    <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold", status.badgeClass)}>
                      {status.label}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className={cn(
                      level === "out-of-stock" ? "font-semibold text-destructive"
                        : level === "low-stock" ? "font-semibold text-gold-deep"
                        : "text-muted-foreground"
                    )}>
                      {stock} in stock
                    </span>
                    <span className="font-heading text-base font-bold tabular-nums text-primary">
                      {formatPrice(p.price)}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button asChild variant="outline" size="sm" className="h-9 flex-1 text-xs">
                      <Link href={`/admin/products/${p.id}`}>View</Link>
                    </Button>
                    <Button asChild variant="outline" size="sm" className="h-9 flex-1 text-xs">
                      <Link href={`/admin/products/${p.id}/edit`}>Edit</Link>
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <p className="mt-3 rounded-lg bg-muted/60 p-3 text-[11px] leading-relaxed text-muted-foreground">
        Stock is not editable here. It belongs to the inventory ledger, where every
        change records who made it and why - click a stock number to adjust it there.
        Cost is admin-only and never reaches a cashier screen or the storefront.
      </p>
    </>
  );
}
