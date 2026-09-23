"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  Search,
  Plus,
  Trash2,
  Save,
  ArrowLeft,
  AlertCircle,
  PackageSearch,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProductImage } from "@/components/shared/ProductImage";
import { usePurchasing } from "@/context/PurchasingContext";
import { useInventory } from "@/context/InventoryContext";
import { getActiveProducts } from "@/data/products";
import { getProductCost } from "@/data/product-costs";
import {
  PURCHASE_PAYMENT_METHODS,
  PURCHASE_PAYMENT_METHOD_LABELS,
  PURCHASE_PAYMENT_STATUS_CONFIG,
  calculatePurchaseTotals,
} from "@/lib/purchase-utils";
import { formatPrice, cn } from "@/lib/utils";
import type { Product, PurchaseDraftItem, PurchasePaymentMethod } from "@/types";

/**
 * /admin/purchases/new.
 *
 * Reads the SAME product catalogue as the storefront, POS and inventory.
 * There is no purchaseProducts list.
 *
 * Every purchase is created as a DRAFT. Stock moves only when somebody
 * physically receives the boxes, which is a separate action on the
 * detail page.
 */
export function NewPurchaseView() {
  const router = useRouter();
  const { suppliers, createPurchase } = usePurchasing();
  const { getStock } = useInventory();

  const [supplierId, setSupplierId] = useState("");
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<PurchaseDraftItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [paid, setPaid] = useState(0);
  const [method, setMethod] = useState<PurchasePaymentMethod>("cash");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const products = useMemo(() => getActiveProducts(), []);

  // Only ACTIVE suppliers can receive new purchases. Inactive ones stay
  // in the system for their history but are not offered here.
  const activeSuppliers = useMemo(
    () => suppliers.filter((s) => s.status === "active"),
    [suppliers]
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products.slice(0, 6);
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.categoryName.toLowerCase().includes(q)
    );
  }, [products, query]);

  const totals = useMemo(
    () => calculatePurchaseTotals(items, discount, paid),
    [items, discount, paid]
  );

  /**
   * Add a product, or bump its quantity if already on the purchase.
   *
   * The default purchase price is the LAST KNOWN cost from
   * data/product-costs.ts - a starting point the buyer edits to whatever
   * the supplier actually charged. Whatever they type is what gets
   * frozen onto the line.
   */
  function addProduct(product: Product) {
    setError(null);
    setItems((current) => {
      const existing = current.find((i) => i.productId === product.id);
      if (existing) {
        return current.map((i) =>
          i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        {
          productId: product.id,
          name: product.name,
          sku: product.sku,
          quantity: 1,
          purchasePrice: getProductCost(product.id),
        },
        ...current,
      ];
    });
  }

  function updateItem(productId: string, patch: Partial<PurchaseDraftItem>) {
    setItems((current) =>
      current.map((i) => (i.productId === productId ? { ...i, ...patch } : i))
    );
    setError(null);
  }

  async function handleSave() {
    const result = await createPurchase({
      supplierId,
      items,
      discount,
      paidAmount: paid,
      paymentMethod: method,
      notes,
    });

    if (!result.ok) {
      setError(result.error);
      return;
    }

    toast.success("Purchase saved as draft.", {
      description: `${result.purchase.purchaseNumber} · stock not yet affected`,
    });
    router.push(`/admin/purchases/${result.purchase.id}`);
  }

  const paidTooHigh = paid > totals.total;
  const discountTooHigh = discount > totals.subtotal;
  const payment = PURCHASE_PAYMENT_STATUS_CONFIG[totals.paymentStatus];

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[1fr_400px] 2xl:grid-cols-[1fr_460px]">
      {/* ---------------- LEFT: supplier + products ---------------- */}
      <div className="min-w-0 space-y-4">
        {/* Supplier */}
        <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <h2 className="mb-3 font-heading text-base font-bold text-primary">
            1. Supplier
          </h2>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Select value={supplierId} onValueChange={(v) => { setSupplierId(v); setError(null); }}>
              <SelectTrigger className="h-10 flex-1" aria-label="Choose supplier">
                <SelectValue placeholder="Choose a supplier" />
              </SelectTrigger>
              <SelectContent>
                {activeSuppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button asChild variant="outline" className="h-10 shrink-0 gap-1.5 px-4 text-sm">
              <Link href="/admin/suppliers/new">
                <Plus className="size-4" aria-hidden="true" />
                Add New Supplier
              </Link>
            </Button>
          </div>

          {activeSuppliers.length === 0 && (
            <p className="mt-2 text-xs text-destructive">
              No active suppliers. Add one before creating a purchase.
            </p>
          )}
        </section>

        {/* Product search */}
        <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <h2 className="mb-3 font-heading text-base font-bold text-primary">
            2. Add Products
          </h2>

          <div className="relative">
            <label htmlFor="purchase-product-search" className="sr-only">
              Search products by name, SKU, brand or category
            </label>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              id="purchase-product-search"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, SKU, brand or category..."
              autoComplete="off"
              className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-secondary focus:ring-2 focus:ring-ring/30"
            />
          </div>

          <div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
            {results.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <PackageSearch className="size-6 text-muted-foreground" aria-hidden="true" />
                <p className="text-xs text-muted-foreground">No products found.</p>
              </div>
            ) : (
              results.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 rounded-lg border border-border p-2.5"
                >
                  <ProductImage
                    src={p.images[0]}
                    alt={p.name}
                    sizes="48px"
                    wrapperClassName="size-10 shrink-0 rounded-md border border-border"
                    iconClassName="size-3"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{p.name}</p>
                    <p className="truncate font-mono text-[11px] text-muted-foreground">
                      {p.sku} &middot; {getStock(p.id)} in stock
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => addProduct(p)}
                    className="h-9 shrink-0 gap-1 bg-accent px-3 text-xs font-semibold text-accent-foreground hover:bg-gold-deep"
                  >
                    <Plus className="size-3.5" aria-hidden="true" />
                    Add
                  </Button>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Purchase items */}
        <section className="overflow-hidden rounded-xl border border-border bg-card">
          <h2 className="border-b border-border px-4 py-3.5 font-heading text-base font-bold text-primary sm:px-5">
            3. Purchase Items ({totals.unitCount} units)
          </h2>

          {items.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-muted-foreground">
              No products added. Search above and add what the supplier delivered.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((item) => {
                const lineTotal = item.quantity * item.purchasePrice;
                const qtyBad = !Number.isInteger(item.quantity) || item.quantity < 1;
                const priceBad = !Number.isFinite(item.purchasePrice) || item.purchasePrice < 0;

                return (
                  <li key={item.productId} className="space-y-2 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {item.name}
                        </p>
                        <p className="font-mono text-[11px] text-muted-foreground">
                          {item.sku}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setItems((c) => c.filter((i) => i.productId !== item.productId))
                        }
                        aria-label={`Remove ${item.name}`}
                        className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      <div>
                        <label
                          htmlFor={`price-${item.productId}`}
                          className="mb-1 block text-[11px] text-muted-foreground"
                        >
                          Purchase Price
                        </label>
                        {/* EDITABLE - this is the cost the shop actually
                            agreed, and it is what gets frozen on the line. */}
                        <input
                          id={`price-${item.productId}`}
                          type="number"
                          min={0}
                          step={1}
                          inputMode="numeric"
                          value={item.purchasePrice === 0 ? "" : item.purchasePrice}
                          onChange={(e) =>
                            updateItem(item.productId, {
                              purchasePrice: Math.max(0, Number(e.target.value) || 0),
                            })
                          }
                          className={cn(
                            "h-9 w-full rounded-lg border bg-background px-2.5 text-sm tabular-nums outline-none",
                            priceBad ? "border-destructive" : "border-border focus:border-secondary"
                          )}
                        />
                      </div>

                      <div>
                        <label
                          htmlFor={`qty-${item.productId}`}
                          className="mb-1 block text-[11px] text-muted-foreground"
                        >
                          Quantity
                        </label>
                        <input
                          id={`qty-${item.productId}`}
                          type="number"
                          min={1}
                          step={1}
                          inputMode="numeric"
                          value={item.quantity === 0 ? "" : item.quantity}
                          onChange={(e) =>
                            updateItem(item.productId, {
                              quantity: Math.floor(Number(e.target.value)) || 0,
                            })
                          }
                          className={cn(
                            "h-9 w-full rounded-lg border bg-background px-2.5 text-sm tabular-nums outline-none",
                            qtyBad ? "border-destructive" : "border-border focus:border-secondary"
                          )}
                        />
                      </div>

                      <div className="col-span-2 flex items-end justify-end sm:col-span-1">
                        <div className="text-right">
                          <p className="text-[11px] text-muted-foreground">Line Total</p>
                          <p className="font-heading text-base font-bold tabular-nums text-primary">
                            {formatPrice(lineTotal)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {qtyBad && (
                      <p className="text-[11px] font-medium text-destructive">
                        Quantity must be a whole number of at least 1.
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {/* ---------------- RIGHT: totals + payment ---------------- */}
      <div className="min-w-0 space-y-4 lg:sticky lg:top-20">
        <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <h2 className="mb-3 font-heading text-base font-bold text-primary">
            4. Totals &amp; Payment
          </h2>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="pur-discount" className="mb-1 block text-xs font-medium text-muted-foreground">
                Discount (Rs)
              </label>
              <input
                id="pur-discount"
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                value={discount === 0 ? "" : discount}
                onChange={(e) => { setDiscount(Math.max(0, Number(e.target.value) || 0)); setError(null); }}
                placeholder="0"
                className={cn(
                  "h-10 w-full rounded-lg border bg-background px-3 text-sm tabular-nums outline-none",
                  discountTooHigh ? "border-destructive" : "border-border focus:border-secondary"
                )}
              />
            </div>
            <div>
              <label htmlFor="pur-paid" className="mb-1 block text-xs font-medium text-muted-foreground">
                Paid Amount (Rs)
              </label>
              <input
                id="pur-paid"
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                value={paid === 0 ? "" : paid}
                onChange={(e) => { setPaid(Math.max(0, Number(e.target.value) || 0)); setError(null); }}
                placeholder="0"
                className={cn(
                  "h-10 w-full rounded-lg border bg-background px-3 text-sm tabular-nums outline-none",
                  paidTooHigh ? "border-destructive" : "border-border focus:border-secondary"
                )}
              />
            </div>
          </div>

          {(paidTooHigh || discountTooHigh) && (
            <p role="alert" className="mt-2 flex items-start gap-1.5 rounded-md bg-destructive/10 p-2 text-xs font-medium text-destructive">
              <AlertCircle className="mt-px size-3.5 shrink-0" aria-hidden="true" />
              {discountTooHigh
                ? `Discount cannot exceed the subtotal (${formatPrice(totals.subtotal)}).`
                : `Paid cannot exceed the total (${formatPrice(totals.total)}).`}
            </p>
          )}

          <div className="mt-3">
            <label htmlFor="pur-method" className="mb-1 block text-xs font-medium text-muted-foreground">
              Payment Method
            </label>
            <Select value={method} onValueChange={(v) => setMethod(v as PurchasePaymentMethod)}>
              <SelectTrigger id="pur-method" className="h-10 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PURCHASE_PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {PURCHASE_PAYMENT_METHOD_LABELS[m]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <dl className="mt-4 space-y-2 rounded-lg border border-border bg-muted/30 p-3 text-sm">
            <Line label={`Subtotal (${totals.unitCount} units)`} value={formatPrice(totals.subtotal)} />
            <Line
              label="Discount"
              value={totals.discount > 0 ? `- ${formatPrice(totals.discount)}` : formatPrice(0)}
            />
            <div className="flex items-center justify-between border-t border-border pt-2">
              <dt className="font-heading text-base font-bold text-primary">Total</dt>
              <dd className="font-heading text-lg font-bold tabular-nums text-primary">
                {formatPrice(totals.total)}
              </dd>
            </div>
            <Line label="Paid" value={formatPrice(totals.paidAmount)} />
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">Due</dt>
              <dd className={cn("font-semibold tabular-nums", totals.dueAmount > 0 ? "text-destructive" : "text-success")}>
                {formatPrice(totals.dueAmount)}
              </dd>
            </div>
            <div className="flex items-center justify-between border-t border-border pt-2">
              <dt className="text-muted-foreground">Payment Status</dt>
              <dd>
                <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold", payment.badgeClass)}>
                  {payment.label}
                </span>
              </dd>
            </div>
          </dl>

          <div className="mt-3">
            <label htmlFor="pur-notes" className="mb-1 block text-xs font-medium text-muted-foreground">
              Notes
            </label>
            <textarea
              id="pur-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Delivery reference, agreed terms..."
              className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-secondary"
            />
          </div>

          {error && (
            <p role="alert" className="mt-3 flex items-start gap-1.5 rounded-md bg-destructive/10 p-2.5 text-xs font-medium text-destructive">
              <AlertCircle className="mt-px size-3.5 shrink-0" aria-hidden="true" />
              {error}
            </p>
          )}

          <Button
            type="button"
            onClick={handleSave}
            disabled={items.length === 0 || !supplierId}
            className="mt-4 h-12 w-full gap-2 bg-accent text-base font-semibold text-accent-foreground hover:bg-gold-deep"
          >
            <Save className="size-4" aria-hidden="true" />
            Save as Draft
          </Button>

          <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
            <Info className="mt-px size-3 shrink-0 text-secondary" aria-hidden="true" />
            Saving creates a DRAFT. Stock is not affected until you receive the
            purchase on its detail page - somebody has to count the boxes in.
          </p>

          <Button asChild variant="outline" className="mt-2 h-10 w-full gap-1.5 text-sm">
            <Link href="/admin/purchases">
              <ArrowLeft className="size-4" aria-hidden="true" />
              Cancel
            </Link>
          </Button>
        </section>
      </div>
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium tabular-nums text-foreground">{value}</dd>
    </div>
  );
}
