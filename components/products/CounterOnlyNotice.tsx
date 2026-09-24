import { Phone, MessageCircle, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BUSINESS, FULL_ADDRESS } from "@/lib/constants";
import type { Product } from "@/types";

interface CounterOnlyNoticeProps {
  product: Product;
}

/**
 * What stands where Add to Cart used to, while ONLINE_ORDERING_ENABLED
 * is false.
 *
 * WHY SOMETHING RATHER THAN NOTHING
 * ---------------------------------
 * Removing the buttons and leaving a gap would tell a visitor the page
 * is broken, or that the item cannot be had. Neither is true: it can be
 * had, by calling or walking in. This says so, and gives them the two
 * ways to do it.
 *
 * A Server Component - it has no state, so unlike ProductActions it
 * ships no JavaScript at all. That is the point of branching here rather
 * than inside the client island.
 *
 * The WhatsApp link carries the product name, so the shop receives
 * "Is the iPhone 12 (Used) available?" instead of a bare "hi" it has to
 * answer with a question.
 */
export function CounterOnlyNotice({ product }: CounterOnlyNoticeProps) {
  const outOfStock = product.stock <= 0;

  const whatsappText = encodeURIComponent(
    outOfStock
      ? `Assalam o Alaikum, do you have the ${product.name} coming back in stock?`
      : `Assalam o Alaikum, is the ${product.name} available?`
  );

  return (
    <div className="rounded-xl border border-border bg-muted/40 p-5">
      <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Store className="size-4 shrink-0 text-secondary" aria-hidden="true" />
        {outOfStock ? "Currently out of stock" : "Available at the shop"}
      </p>

      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
        {outOfStock ? (
          <>
            This one has sold out. Call or message and we will tell you when it
            is back, or suggest something similar we have on the shelf.
          </>
        ) : (
          <>
            We sell at the counter, not online. Call or message to confirm it is
            still here, then collect it from {FULL_ADDRESS}.
          </>
        )}
      </p>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Button
          asChild
          className="h-11 flex-1 gap-2 bg-accent font-semibold text-accent-foreground hover:bg-gold-deep"
        >
          <a href={`tel:${BUSINESS.phone}`}>
            <Phone className="size-4" aria-hidden="true" />
            Call {BUSINESS.phoneDisplay}
          </a>
        </Button>

        <Button asChild variant="outline" className="h-11 flex-1 gap-2 font-semibold">
          <a
            href={`https://wa.me/${BUSINESS.whatsapp}?text=${whatsappText}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <MessageCircle className="size-4" aria-hidden="true" />
            WhatsApp
          </a>
        </Button>
      </div>
    </div>
  );
}
