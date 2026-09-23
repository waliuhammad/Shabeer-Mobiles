"use client";

import Link from "next/link";
import { notFound } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft, Pencil, Archive, RotateCcw, ExternalLink, Warehouse, Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { useCatalog } from "@/context/CatalogContext";
import { useInventory } from "@/context/InventoryContext";
import {
  PRODUCT_CONDITION_CONFIG, PRODUCT_STATUS_CONFIG, currentMargin,
} from "@/lib/catalog-utils";
import { getStockStatus } from "@/lib/stock";
import { formatOrderDate } from "@/lib/order-utils";
import { formatPrice, cn } from "@/lib/utils";
import type { Product } from "@/types";

interface ProductDetailViewProps {
  productId: string;
}

/** /admin/products/[id] */
export function ProductDetailView({ productId }: ProductDetailViewProps) {
  const { getProduct, getCost, setProductStatus, isHydrated } = useCatalog();
  const { getStock, getProductTransactions } = useInventory();

  const found = getProduct(productId);
  if (!found) {
    // Before hydration the store holds only the seed, so a product created
    // in this browser would briefly look missing.
    if (!isHydrated) return null;
    notFound();
  }
  const product: Product = found;

  const cost = getCost(product.id);
  const stock = getStock(product.id);
  const level = getStockStatus(stock, product.lowStockThreshold);
  const status = PRODUCT_STATUS_CONFIG[product.status];
  const condition = PRODUCT_CONDITION_CONFIG[product.condition];
  const margin = currentMargin(product.price, cost);
  const movements = getProductTransactions(product.id);
  const archived = product.status === "archived";

  function toggleArchive() {
    setProductStatus(product.id, archived ? "draft" : "archived");
    toast.success(archived ? "Product restored as a draft." : "Product archived.");
  }

  return (
    <>
      <AdminPageHeader
        title={product.name}
        description={`${product.sku} · ${product.categoryName}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" className="h-10 gap-1.5 px-4 text-sm">
              <Link href="/admin/products">
                <ArrowLeft className="size-4" aria-hidden="true" />Back
              </Link>
            </Button>
            {product.status === "active" && (
              <Button asChild variant="outline" className="h-10 gap-1.5 px-4 text-sm">
                <Link href={`/product/${product.slug}`} target="_blank">
                  <ExternalLink className="size-4" aria-hidden="true" />View on store
                </Link>
              </Button>
            )}
            <Button asChild variant="outline" className="h-10 gap-1.5 px-4 text-sm">
              <Link href={`/admin/products/${product.id}/edit`}>
                <Pencil className="size-4" aria-hidden="true" />Edit
              </Link>
            </Button>
            <Button type="button" variant="outline" onClick={toggleArchive} className="h-10 gap-1.5 px-4 text-sm">
              {archived ? <RotateCcw className="size-4" aria-hidden="true" /> : <Archive className="size-4" aria-hidden="true" />}
              {archived ? "Restore" : "Archive"}
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* ---------------- MONEY ---------------- */}
        <div className="space-y-4 lg:col-span-1">
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Selling Price</p>
            <p className="mt-1 font-heading text-3xl font-bold tabular-nums text-primary">
              {formatPrice(product.price)}
            </p>
            {product.originalPrice && (
              <p className="text-xs text-muted-foreground line-through">
                {formatPrice(product.originalPrice)}
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <span className={cn("inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold", status.badgeClass)}>
                {status.label}
              </span>
              <span className={cn("inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold", condition.badgeClass)}>
                {condition.label}
              </span>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{status.note}</p>
          </div>

          {/* Admin-only block. */}
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
              <Lock className="size-3.5" aria-hidden="true" />Cost &amp; Margin
            </p>
            <dl className="mt-2 space-y-1.5 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Current cost</dt>
                <dd className="tabular-nums text-foreground">{cost > 0 ? formatPrice(cost) : "Not set"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Profit per unit</dt>
                <dd className="tabular-nums text-foreground">
                  {cost > 0 ? formatPrice(product.price - cost) : "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Margin</dt>
                <dd className="tabular-nums text-foreground">
                  {margin !== null ? `${margin.toFixed(1)}%` : "—"}
                </dd>
              </div>
            </dl>
            <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
              Never shown to a cashier or a customer. This is today&apos;s cost - past
              sales keep the cost they were made at.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <p className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
              <Warehouse className="size-3.5" aria-hidden="true" />Stock
            </p>
            <p className={cn(
              "mt-1 font-heading text-3xl font-bold tabular-nums",
              level === "out-of-stock" ? "text-destructive"
                : level === "low-stock" ? "text-gold-deep" : "text-foreground"
            )}>
              {stock}
            </p>
            <p className="text-xs text-muted-foreground">
              Low-stock threshold {product.lowStockThreshold} · {movements.length} ledger{" "}
              {movements.length === 1 ? "entry" : "entries"}
            </p>
            <Button asChild variant="outline" className="mt-3 h-9 w-full text-xs">
              <Link href={`/admin/inventory/${product.id}`}>Adjust stock</Link>
            </Button>
          </div>
        </div>

        {/* ---------------- DETAILS ---------------- */}
        <div className="rounded-xl border border-border bg-card p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold text-foreground">Catalogue</h3>
          <dl className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2">
            <Row label="SKU"><span className="font-mono text-xs">{product.sku}</span></Row>
            <Row label="Brand">{product.brand || "—"}</Row>
            <Row label="Category">{product.categoryName}</Row>
            <Row label="URL Slug"><span className="font-mono text-xs">{product.slug}</span></Row>
            <Row label="Added">{formatOrderDate(product.createdAt)}</Row>
            <Row label="Highlights">
              {[product.isFeatured && "Featured", product.isBestSeller && "Best seller"]
                .filter(Boolean).join(" · ") || "None"}
            </Row>
          </dl>

          {product.description && (
            <>
              <h3 className="mt-5 text-sm font-semibold text-foreground">Description</h3>
              <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                {product.description}
              </p>
            </>
          )}

          {product.features.length > 0 && (
            <>
              <h3 className="mt-5 text-sm font-semibold text-foreground">Features</h3>
              <ul className="mt-1.5 list-inside list-disc space-y-1 text-sm text-muted-foreground">
                {product.features.map((f) => <li key={f}>{f}</li>)}
              </ul>
            </>
          )}

          {product.images.length === 0 && (
            <p className="mt-5 rounded-lg bg-muted/60 p-3 text-[11px] leading-relaxed text-muted-foreground">
              No images yet. The storefront renders a branded placeholder tile, which
              is a valid state - image uploads arrive with Cloudinary in a later phase.
            </p>
          )}
        </div>
      </div>
    </>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm text-foreground">{children}</dd>
    </div>
  );
}
