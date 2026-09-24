import { notFound } from "next/navigation";
import { ONLINE_ORDERING_ENABLED } from "@/lib/feature-flags";
import type { Metadata } from "next";
import { Container } from "@/components/shared/Container";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { CartView } from "@/components/cart/CartView";
import { CartItemCount } from "@/components/cart/CartItemCount";

export const metadata: Metadata = {
  title: "Your Cart",
  description: "Review the mobiles and accessories in your Shabbir Mobiles cart.",
  // A cart is personal and has nothing to index.
  robots: { index: false, follow: true },
};

/**
 * /cart - a Server Component shell around a client island.
 *
 * The heading and breadcrumb are static HTML. Only CartView and the item
 * count need browser state, so only those two opt into the client.
 */
/**
 * DISABLED - the shop does not sell online.
 *
 * The page is kept whole and still type-checks; it simply 404s while
 * ONLINE_ORDERING_ENABLED is false. Flip that flag in lib/feature-flags.ts
 * to bring it back.
 */
export default function CartPage() {
  if (!ONLINE_ORDERING_ENABLED) notFound();

  return (
    <Container className="py-6 lg:py-10">
      <Breadcrumb
        className="mb-6"
        items={[{ label: "Home", href: "/" }, { label: "Cart" }]}
      />

      <div className="mb-6 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="text-2xl font-bold text-primary sm:text-3xl">Your Cart</h1>
        <CartItemCount />
      </div>

      <CartView />
    </Container>
  );
}
