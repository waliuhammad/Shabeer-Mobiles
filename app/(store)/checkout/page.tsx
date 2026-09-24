import { notFound } from "next/navigation";
import { ONLINE_ORDERING_ENABLED } from "@/lib/feature-flags";
import type { Metadata } from "next";
import { Container } from "@/components/shared/Container";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { CheckoutView } from "@/components/checkout/CheckoutView";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Complete your Shabbir Mobiles order.",
  // Personal, and it must never appear in search results.
  robots: { index: false, follow: false },
};

/**
 * /checkout - a Server Component shell around one client island.
 *
 * All the interactivity (form state, step navigation, validation) lives in
 * CheckoutView. The heading and breadcrumb ship as plain HTML.
 */
/**
 * DISABLED - the shop does not sell online.
 *
 * The page is kept whole and still type-checks; it simply 404s while
 * ONLINE_ORDERING_ENABLED is false. Flip that flag in lib/feature-flags.ts
 * to bring it back.
 */
export default function CheckoutPage() {
  if (!ONLINE_ORDERING_ENABLED) notFound();

  return (
    <Container className="py-6 lg:py-10">
      <Breadcrumb
        className="mb-6"
        items={[
          { label: "Home", href: "/" },
          { label: "Cart", href: "/cart" },
          { label: "Checkout" },
        ]}
      />

      <h1 className="mb-6 text-2xl font-bold text-primary sm:text-3xl">Checkout</h1>

      <CheckoutView />
    </Container>
  );
}
