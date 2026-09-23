import { Pencil, ShieldAlert } from "lucide-react";
import { ProductImage } from "@/components/products/ProductImage";
import { PAYMENT_METHODS } from "@/lib/checkout-utils";
import { formatPrice } from "@/lib/utils";
import type { CartItem, CheckoutFormData, PaymentMethod } from "@/types";

interface OrderReviewProps {
  items: CartItem[];
  form: CheckoutFormData;
  paymentMethod: PaymentMethod;
  /** Jumps back to an earlier step so the customer can correct something. */
  onEdit: (step: "shipping" | "payment") => void;
}

/**
 * The final confirm screen: what is being bought, where it is going, and
 * how it will be paid for.
 *
 * A Server Component - it only renders the props it is given. The buttons
 * call handlers that the client parent supplies.
 */
export function OrderReview({
  items,
  form,
  paymentMethod,
  onEdit,
}: OrderReviewProps) {
  const method = PAYMENT_METHODS.find((m) => m.value === paymentMethod);

  return (
    <div className="space-y-4">
      {/* --- Items --- */}
      <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
        <h2 className="mb-4 font-heading text-lg font-bold text-primary">
          Order Items ({items.length})
        </h2>

        <ul className="divide-y divide-border">
          {items.map((item) => (
            <li key={item.productId} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              <ProductImage
                src={item.image}
                alt={item.name}
                sizes="64px"
                wrapperClassName="size-14 shrink-0 rounded-lg border border-border"
                iconClassName="size-4"
              />

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {item.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatPrice(item.price)} x {item.quantity}
                </p>
              </div>

              <p className="shrink-0 text-sm font-semibold tabular-nums text-primary">
                {formatPrice(item.price * item.quantity)}
              </p>
            </li>
          ))}
        </ul>
      </section>

      {/* --- Delivery details --- */}
      <ReviewCard title="Delivery Details" onEdit={() => onEdit("shipping")}>
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <ReviewRow label="Name" value={form.fullName} />
          <ReviewRow label="Phone" value={form.phone} />
          {form.email.trim() && <ReviewRow label="Email" value={form.email} />}
          <ReviewRow label="City" value={form.city} />
          <ReviewRow label="Address" value={form.address} wide />
          {form.postalCode.trim() && (
            <ReviewRow label="Postal Code" value={form.postalCode} />
          )}
          {form.notes.trim() && <ReviewRow label="Notes" value={form.notes} wide />}
        </dl>
      </ReviewCard>

      {/* --- Payment --- */}
      <ReviewCard title="Payment Method" onEdit={() => onEdit("payment")}>
        <p className="text-sm font-medium text-foreground">{method?.label}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{method?.description}</p>
      </ReviewCard>

      {/* --- The honest disclaimer --- */}
      <p className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 p-4 text-xs leading-relaxed text-foreground">
        <ShieldAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
        <span>
          <strong className="font-semibold">Development mode.</strong> Placing this
          order will not create a real order, reserve stock or notify the shop. It
          shows a mock confirmation only. Real orders arrive once Firebase and the
          server-side order function are connected.
        </span>
      </p>
    </div>
  );
}

/* --- Local helpers: used only in this file, so they stay in this file. --- */

function ReviewCard({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-heading text-lg font-bold text-primary">{title}</h2>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-secondary transition-colors hover:text-primary"
        >
          <Pencil className="size-3.5" aria-hidden="true" />
          Edit
        </button>
      </div>
      {children}
    </section>
  );
}

function ReviewRow({
  label,
  value,
  wide,
}: {
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground">{value}</dd>
    </div>
  );
}
