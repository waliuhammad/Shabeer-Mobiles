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
export default function CheckoutPage() {
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
