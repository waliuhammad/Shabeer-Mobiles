import { Container } from "@/components/shared/Container";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { CategoryCard } from "@/components/categories/CategoryCard";
import { getActiveProducts, getCategories } from "@/services/catalog.service";

export async function CategoryGrid() {
  const [all, categories] = await Promise.all([
    getActiveProducts(),
    getCategories(),
  ]);

  return (
    <Container as="section" id="categories" className="py-12 lg:py-16">
      <SectionHeading
        eyebrow="Browse"
        title="Shop by Category"
        description="Find exactly what you need - from a replacement charger to a tested second-hand phone."
        action={{ label: "View all products", href: "/shop" }}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
        {categories.map((category) => (
          <CategoryCard
            key={category.id}
            category={category}
            /**
             * Counted from the real products so the homepage and the shop
             * sidebar always agree. With 11 products this is free.
             *
             * At 500 products from Firestore you cannot count client-side -
             * you would have to read all 500 documents. That is when a
             * denormalised productCount field on the category document,
             * maintained by a Cloud Function, becomes the right answer.
             */
            productCount={all.filter((p) => p.categorySlug === category.slug).length}
          />
        ))}
      </div>
    </Container>
  );
}
