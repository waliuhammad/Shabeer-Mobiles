import { ShopWindow } from "@/components/home/ShopWindow";
import { ONLINE_STORE_ENABLED } from "@/lib/feature-flags";
import type { Metadata } from "next";
import { Container } from "@/components/shared/Container";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { ProductGrid } from "@/components/products/ProductGrid";
import { Hero } from "@/components/home/Hero";
import { CategoryGrid } from "@/components/home/CategoryGrid";
import { VisitShop } from "@/components/home/VisitShop";
import { ServicesSection } from "@/components/home/ServicesSection";
import { getFeaturedProducts, getBestSellers } from "@/services/catalog.service";

/**
 * Rebuild this page at most once a minute, in the background.
 *
 * WHY IT IS HERE AT ALL
 * ---------------------
 * Without it Next.js prerenders this page ONCE, at deploy time, and
 * serves that copy for ever. The prices, stock badges and featured
 * products below come from Firestore, so the effect was that changing a
 * price in the admin panel never reached the shop's own website - it
 * kept advertising the old one until somebody happened to redeploy.
 * Measured, not assumed: a marker written into Firestore was still
 * missing from the live page 90 seconds later.
 *
 * WHY 60 AND NOT 0
 * ----------------
 * Rendering per request would always be current, but every visitor
 * would then wait on a Firestore round trip - the uncached /shop page
 * was taking over three seconds. With this, visitors are served an
 * instant cached copy and the copy is never more than a minute old.
 * For a price on a shop window, a minute is nothing; three seconds of
 * staring at a blank page is not.
 *
 * The ADMIN panel is unaffected and stays instant: it reads Firestore
 * through onSnapshot in the browser, not through this page.
 */
export const revalidate = 60;

export const metadata: Metadata = {
  // Combined with the template in app/layout.tsx:
  // "Mobiles, Accessories & Repairing in Multan | Shabbir Mobiles"
  title: "Mobiles, Accessories & Repairing in Multan",
  description:
    "Buy used mobiles, chargers, covers, protectors, handsfree, AirPods and power banks. Expert repairing, battery replacement and software solutions at Shabbir Mobiles, Multan.",
};

/**
 * Homepage - "/".
 *
 * Note how little is here. The page's only jobs are:
 *   1. declare its metadata
 *   2. fetch its data
 *   3. compose section components in order
 *
 * NOW READING FIRESTORE. The only change this needed was `await` and
 * one import - the seam between "where data comes from" and "what the
 * page renders" held, exactly as the earlier note predicted.
 */
/**
 * The front page.
 *
 * TWO VERSIONS, ONE FLAG. While the shop does not sell online, this
 * renders ShopWindow: address, hours, contact, services and a map, with
 * no products and no cart. The full storefront below it - featured
 * products, categories, browse - is kept intact and still compiles, and
 * returns the moment ONLINE_STORE_ENABLED is true.
 *
 * It redirected to /admin before, which left the site with no public
 * page at all: signing out or clicking "exit to store" simply looped
 * back to login.
 */
export default async function HomePage() {
  if (!ONLINE_STORE_ENABLED) return <ShopWindow />;

  // Run together rather than one after the other. Both hit the same
  // cached getActiveProducts() underneath, so this is one read, not two.
  const [featured, bestSellers] = await Promise.all([
    getFeaturedProducts(4),
    getBestSellers(4),
  ]);

  return (
    <>
      <Hero />

      <CategoryGrid />

      <Container as="section" className="py-12 lg:py-16">
        <SectionHeading
          eyebrow="Handpicked"
          title="Featured Products"
          description="Fresh stock and the deals our customers ask for most."
          action={{ label: "View all", href: "/shop" }}
        />
        <ProductGrid products={featured} />
      </Container>

      <section className="bg-muted/50 py-12 lg:py-16">
        <Container>
          <SectionHeading
            eyebrow="Popular"
            title="Best Sellers"
            description="The accessories moving fastest off our shelves this month."
            action={{ label: "View all", href: "/shop" }}
          />
          <ProductGrid products={bestSellers} />
        </Container>
      </section>

      <ServicesSection />

      <VisitShop />
    </>
  );
}
