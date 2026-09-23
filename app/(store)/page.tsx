import type { Metadata } from "next";
import { Container } from "@/components/shared/Container";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { ProductGrid } from "@/components/products/ProductGrid";
import { Hero } from "@/components/home/Hero";
import { CategoryGrid } from "@/components/home/CategoryGrid";
import { VisitShop } from "@/components/home/VisitShop";
import { ServicesSection } from "@/components/home/ServicesSection";
import { getFeaturedProducts, getBestSellers } from "@/data/products";

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
 * In Phase 2, line 3 below becomes `await getFeaturedProducts()` against
 * Firestore and this component becomes async. Nothing else on the page
 * changes - that is what the data-access seam buys us.
 */
export default function HomePage() {
  const featured = getFeaturedProducts(4);
  const bestSellers = getBestSellers(4);

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
