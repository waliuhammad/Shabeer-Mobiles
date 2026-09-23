import { notFound } from "next/navigation";
import { ONLINE_STORE_ENABLED } from "@/lib/feature-flags";
import type { Metadata } from "next";
import { Container } from "@/components/shared/Container";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { WishlistView } from "@/components/wishlist/WishlistView";
import { WishlistCount } from "@/components/wishlist/WishlistCount";

export const metadata: Metadata = {
  title: "Your Wishlist",
  description: "Products you have saved at Shabbir Mobiles.",
  // Personal, and nothing to index.
  robots: { index: false, follow: true },
};

/** /wishlist - a Server Component shell around two small client islands. */
/**
 * DISABLED - the shop does not sell online.
 *
 * The page is kept whole and still type-checks; it simply 404s while
 * ONLINE_STORE_ENABLED is false. Flip that flag in lib/feature-flags.ts
 * to bring it back.
 */
export default function WishlistPage() {
  if (!ONLINE_STORE_ENABLED) notFound();

  return (
    <Container className="py-6 lg:py-10">
      <Breadcrumb
        className="mb-6"
        items={[{ label: "Home", href: "/" }, { label: "Wishlist" }]}
      />

      <div className="mb-6 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="text-2xl font-bold text-primary sm:text-3xl">Your Wishlist</h1>
        <WishlistCount />
      </div>

      <WishlistView />
    </Container>
  );
}
