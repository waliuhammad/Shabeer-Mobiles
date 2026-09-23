import { redirect } from "next/navigation";
import { HOME_REDIRECT } from "@/lib/feature-flags";
import type { Metadata } from "next";
import { Container } from "@/components/shared/Container";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { ProductGrid } from "@/components/products/ProductGrid";
import { Hero } from "@/components/home/Hero";
import { CategoryGrid } from "@/components/home/CategoryGrid";
import { VisitShop } from "@/components/home/VisitShop";
import { ServicesSection } from "@/components/home/ServicesSection";
import { getFeaturedProducts, getBestSellers } from "@/services/catalog.service";

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
 * The shop window - DISABLED while the business does not sell online.
 *
 * Kept intact rather than deleted: it still compiles and type-checks, so
 * it cannot rot. Turning ONLINE_STORE_ENABLED back on in
 * lib/feature-flags.ts restores it exactly as it was.
 *
 * Until then the root sends staff to the admin panel, which bounces
 * anyone who is not signed in to the login page.
 */
export default async function HomePage() {
  if (HOME_REDIRECT) redirect(HOME_REDIRECT);

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
