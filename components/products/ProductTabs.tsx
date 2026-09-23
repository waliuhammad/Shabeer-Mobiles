import { MessageSquare, Star } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import type { Product } from "@/types";

interface ProductTabsProps {
  product: Product;
}

/**
 * Description, Specifications and Reviews.
 *
 * Deliberately NOT a JavaScript tab widget. Three stacked sections with
 * real headings are a Server Component - zero JS - and they work with
 * Ctrl+F, screen readers and deep links. A tab bar would hide two thirds of
 * the content from search engines to save vertical space the page has
 * plenty of.
 */
export function ProductTabs({ product }: ProductTabsProps) {
  // Built from real product fields rather than a hand-written table, so a
  // product with different data still renders a complete spec sheet.
  const specifications: { label: string; value: string }[] = [
    { label: "Brand", value: product.brand },
    { label: "Category", value: product.categoryName },
    { label: "Condition", value: product.condition === "used" ? "Used" : "New" },
    { label: "Price", value: formatPrice(product.price) },
    { label: "Availability", value: product.stock > 0 ? `${product.stock} in stock` : "Out of stock" },
    { label: "Product Code", value: product.id.toUpperCase() },
  ];

  return (
    <div className="mt-12 space-y-10 border-t border-border pt-10 lg:mt-16">
      {/* ---------------- DESCRIPTION ---------------- */}
      <section id="description" className="scroll-mt-28">
        <h2 className="mb-3 text-lg font-bold text-primary sm:text-xl">Description</h2>
        <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          {product.description}
        </p>
      </section>

      {/* ---------------- SPECIFICATIONS ---------------- */}
      <section id="specifications" className="scroll-mt-28">
        <h2 className="mb-4 text-lg font-bold text-primary sm:text-xl">Specifications</h2>

        <div className="max-w-3xl overflow-hidden rounded-xl border border-border">
          <dl>
            {specifications.map((spec, index) => (
              <div
                key={spec.label}
                className={
                  index % 2 === 0
                    ? "grid grid-cols-3 gap-4 bg-muted/40 px-4 py-3 text-sm"
                    : "grid grid-cols-3 gap-4 px-4 py-3 text-sm"
                }
              >
                <dt className="font-medium text-muted-foreground">{spec.label}</dt>
                <dd className="col-span-2 text-foreground">{spec.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        {product.features.length > 0 && (
          <ul className="mt-4 max-w-3xl list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
            {product.features.map((feature) => (
              <li key={feature}>{feature}</li>
            ))}
          </ul>
        )}
      </section>

      {/* ---------------- REVIEWS ---------------- */}
      <section id="reviews" className="scroll-mt-28">
        <h2 className="mb-4 text-lg font-bold text-primary sm:text-xl">Reviews</h2>

        <div className="flex max-w-3xl flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center">
          <MessageSquare className="size-8 text-muted-foreground" aria-hidden="true" />
          <div className="flex items-center gap-0.5" aria-hidden="true">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star key={star} className="size-4 text-border" />
            ))}
          </div>
          <p className="text-sm font-semibold text-foreground">
            Customer reviews are coming soon
          </p>
          <p className="max-w-md text-xs text-muted-foreground">
            Reviews will be stored in a Firestore `reviews` collection and can only
            be written by a signed-in customer who actually bought the product.
            That rule is enforced by Firebase Security Rules, not by this page.
          </p>
        </div>
      </section>
    </div>
  );
}
