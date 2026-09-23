"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Save, ArrowLeft, Info, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { FormField } from "@/components/shared/FormField";
import { useCatalog } from "@/context/CatalogContext";
import { useInventory } from "@/context/InventoryContext";
import {
  PRODUCT_CONDITIONS, PRODUCT_CONDITION_CONFIG,
  PRODUCT_STATUSES, PRODUCT_STATUS_CONFIG,
  currentMargin, slugify, validateProduct,
} from "@/lib/catalog-utils";
import { formatPrice } from "@/lib/utils";
import type {
  Product, ProductCondition, ProductErrors, ProductFormData, ProductStatus,
} from "@/types";

interface ProductFormProps {
  /** Present = edit mode, absent = create mode. */
  product?: Product;
}

/**
 * ONE form, two modes - as with CustomerForm, SupplierForm and
 * ExpenseForm. Create and edit differ only in what they start with and
 * where they go afterwards.
 *
 * Cost is collected here but does NOT become a field on Product. The
 * context writes it to the separate cost store, because a Product that
 * cannot carry cost cannot leak it to the storefront.
 */
export function ProductForm({ product }: ProductFormProps) {
  const router = useRouter();
  const { products, categories, getCost, createProduct, updateProduct } = useCatalog();
  const { getStock } = useInventory();
  const isEdit = Boolean(product);

  const [data, setData] = useState<ProductFormData>(() =>
    product
      ? {
          name: product.name,
          slug: product.slug,
          brand: product.brand,
          sku: product.sku,
          categoryId: product.categoryId,
          description: product.description,
          features: product.features.join("\n"),
          price: String(product.price),
          originalPrice: product.originalPrice ? String(product.originalPrice) : "",
          purchasePrice: getCost(product.id) ? String(getCost(product.id)) : "",
          lowStockThreshold: String(product.lowStockThreshold),
          condition: product.condition,
          status: product.status,
          isFeatured: product.isFeatured,
          isBestSeller: product.isBestSeller,
        }
      : {
          name: "", slug: "", brand: "", sku: "",
          categoryId: categories[0]?.id ?? "",
          description: "", features: "",
          price: "", originalPrice: "", purchasePrice: "",
          lowStockThreshold: "5",
          condition: "new",
          // New products start as drafts: nothing reaches customers until
          // it has been checked over.
          status: "draft",
          isFeatured: false, isBestSeller: false,
        }
  );
  const [errors, setErrors] = useState<ProductErrors>({});
  const [slugTouched, setSlugTouched] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  const run = (next: ProductFormData) => validateProduct(next, products, product?.id);

  const set = <K extends keyof ProductFormData>(field: K, value: ProductFormData[K]) => {
    const next = { ...data, [field]: value };
    // The slug follows the name until someone edits it by hand. On an
    // existing product it never auto-changes: the slug is the public URL
    // and every saved link depends on it.
    if (field === "name" && !slugTouched && !isEdit) {
      next.slug = slugify(String(value));
    }
    setData(next);
    setErrors(run(next));
  };

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = run(data);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      toast.error("Check the highlighted fields.");
      return;
    }

    // Writes go to Firestore through Security Rules, so they can be
    // refused (wrong role) or fail (offline). Either must be shown -
    // a form that navigates away on a failed save loses the work.
    setSaving(true);
    try {
      if (isEdit && product) {
        await updateProduct(product.id, data);
        toast.success("Product updated.", { description: data.name });
        router.push(`/admin/products/${product.id}`);
        return;
      }

      const created = await createProduct(data);
      toast.success("Product created as a draft.", {
        description: "Add stock through inventory, then set it Active.",
      });
      router.push(`/admin/products/${created.id}`);
    } catch (error) {
      toast.error("Could not save.", {
        description: error instanceof Error ? error.message : "Unknown error.",
      });
    } finally {
      setSaving(false);
    }
  }

  const price = Number(data.price) || 0;
  const cost = Number(data.purchasePrice) || 0;
  const margin = currentMargin(price, cost);

  return (
    <form onSubmit={handleSubmit} noValidate className="max-w-4xl">
      {/* ---------------- IDENTITY ---------------- */}
      <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <h3 className="text-sm font-semibold text-foreground">Product Details</h3>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <FormField
            label="Product Name" value={data.name}
            onChange={(v) => set("name", v)} error={errors.name}
            placeholder="iPhone 12 (Used)" required className="sm:col-span-2"
          />
          <FormField
            label="URL Slug" value={data.slug}
            onChange={(v) => { setSlugTouched(true); set("slug", v); }}
            error={errors.slug} placeholder="iphone-12-used" required
          />
          <FormField
            label="SKU" value={data.sku}
            onChange={(v) => set("sku", v)} error={errors.sku}
            placeholder="APL-IP12-64U" required
          />
          <FormField
            label="Brand" value={data.brand}
            onChange={(v) => set("brand", v)} placeholder="Apple"
          />
          <div>
            <label htmlFor="product-category" className="mb-1.5 block text-sm font-medium text-foreground">
              Category <span className="text-destructive">*</span>
            </label>
            <Select value={data.categoryId} onValueChange={(v) => set("categoryId", v)}>
              <SelectTrigger id="product-category" className="h-10 w-full">
                <SelectValue placeholder="Choose a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.categoryId && (
              <p role="alert" className="mt-1.5 text-xs font-medium text-destructive">{errors.categoryId}</p>
            )}
          </div>
          <FormField
            label="Description" value={data.description}
            onChange={(v) => set("description", v)}
            placeholder="What the customer needs to know" textarea rows={3}
            className="sm:col-span-2"
          />
          <FormField
            label="Features (one per line)" value={data.features}
            onChange={(v) => set("features", v)}
            placeholder={"64GB storage\nBattery health 89%\n30-day checking warranty"}
            textarea rows={4} className="sm:col-span-2"
          />
        </div>
      </section>

      {/* ---------------- MONEY ---------------- */}
      <section className="mt-4 rounded-xl border border-border bg-card p-4 sm:p-6">
        <h3 className="text-sm font-semibold text-foreground">Pricing</h3>
        <div className="mt-3 grid gap-4 sm:grid-cols-3">
          <FormField
            label="Selling Price (Rs)" type="number" value={data.price}
            onChange={(v) => set("price", v)} error={errors.price}
            placeholder="28999" required
          />
          <FormField
            label="Original Price (Rs)" type="number" value={data.originalPrice}
            onChange={(v) => set("originalPrice", v)} error={errors.originalPrice}
            placeholder="Leave blank if not on sale"
          />
          <FormField
            label="Purchase Cost (Rs)" type="number" value={data.purchasePrice}
            onChange={(v) => set("purchasePrice", v)} error={errors.purchasePrice}
            placeholder="23800"
          />
        </div>

        {margin !== null && (
          <p className="mt-3 text-xs text-muted-foreground">
            Current margin:{" "}
            <span className="font-semibold text-foreground">{margin.toFixed(1)}%</span>{" "}
            ({formatPrice(price - cost)} per unit)
          </p>
        )}

        <p className="mt-3 flex items-start gap-2 rounded-lg bg-muted/60 p-3 text-[11px] leading-relaxed text-muted-foreground">
          <Lock className="mt-px size-3.5 shrink-0 text-secondary" aria-hidden="true" />
          Purchase cost is stored separately from the product, never on the record
          the storefront reads. Changing it affects what stock on hand is worth and
          the margin shown above - it does <strong className="font-semibold">not</strong>{" "}
          change the profit on sales already made, because each sale froze its own
          cost at the time.
        </p>
      </section>

      {/* ---------------- VISIBILITY & STOCK ---------------- */}
      <section className="mt-4 rounded-xl border border-border bg-card p-4 sm:p-6">
        <h3 className="text-sm font-semibold text-foreground">Availability</h3>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="product-status" className="mb-1.5 block text-sm font-medium text-foreground">
              Status
            </label>
            <Select value={data.status} onValueChange={(v) => set("status", v as ProductStatus)}>
              <SelectTrigger id="product-status" className="h-10 w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PRODUCT_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{PRODUCT_STATUS_CONFIG[s].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              {PRODUCT_STATUS_CONFIG[data.status].note}
            </p>
          </div>

          <div>
            <label htmlFor="product-condition" className="mb-1.5 block text-sm font-medium text-foreground">
              Condition
            </label>
            <Select value={data.condition} onValueChange={(v) => set("condition", v as ProductCondition)}>
              <SelectTrigger id="product-condition" className="h-10 w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PRODUCT_CONDITIONS.map((c) => (
                  <SelectItem key={c} value={c}>{PRODUCT_CONDITION_CONFIG[c].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <FormField
            label="Low Stock Threshold" type="number" value={data.lowStockThreshold}
            onChange={(v) => set("lowStockThreshold", v)} error={errors.lowStockThreshold}
            placeholder="5" required
          />

          {/* Stock is shown, not edited. */}
          <div>
            <span className="mb-1.5 block text-sm font-medium text-foreground">Current Stock</span>
            <div className="flex h-10 items-center justify-between rounded-lg border border-dashed border-border bg-muted/40 px-3">
              <span className="text-sm tabular-nums text-foreground">
                {product ? getStock(product.id) : 0}
              </span>
              {product ? (
                <Link href={`/admin/inventory/${product.id}`} className="text-xs font-medium text-secondary hover:underline">
                  Adjust in inventory
                </Link>
              ) : (
                <span className="text-xs text-muted-foreground">Starts at 0</span>
              )}
            </div>
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
            <input type="checkbox" checked={data.isFeatured}
              onChange={(e) => set("isFeatured", e.target.checked)}
              className="size-4 accent-[var(--secondary)]" />
            Feature on the home page
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
            <input type="checkbox" checked={data.isBestSeller}
              onChange={(e) => set("isBestSeller", e.target.checked)}
              className="size-4 accent-[var(--secondary)]" />
            Mark as a best seller
          </label>
        </div>

        <p className="mt-4 flex items-start gap-2 rounded-lg bg-muted/60 p-3 text-[11px] leading-relaxed text-muted-foreground">
          <Info className="mt-px size-3.5 shrink-0 text-secondary" aria-hidden="true" />
          Stock cannot be typed in here. It changes only through receiving a
          purchase or a recorded inventory adjustment, so every unit can be traced
          to a reason. A form that could set it to any number would let stock be
          created from nothing, and the ledger would stop matching the shelf.
        </p>
      </section>

      <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button asChild variant="outline" className="h-10 gap-1.5 px-4 text-sm">
          <Link href={product ? `/admin/products/${product.id}` : "/admin/products"}>
            <ArrowLeft className="size-4" aria-hidden="true" />Cancel
          </Link>
        </Button>
        <Button
          type="submit"
          disabled={saving}
          className="h-10 gap-1.5 bg-accent px-6 text-sm font-semibold text-accent-foreground hover:bg-gold-deep"
        >
          <Save className="size-4" aria-hidden="true" />
          {saving ? "Saving..." : isEdit ? "Save Changes" : "Create Product"}
        </Button>
      </div>
    </form>
  );
}
