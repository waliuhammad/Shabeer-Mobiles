import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@/components/shared/Container";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { ProductGallery } from "@/components/products/ProductGallery";
import { ProductInfo } from "@/components/products/ProductInfo";
import { ProductTabs } from "@/components/products/ProductTabs";
import { ProductGrid } from "@/components/products/ProductGrid";
import {
  getProductBySlug,
  getProductsByCategory,
  getActiveProducts,
} from "@/data/products";

/**
 * PRE-RENDER EVERY PRODUCT PAGE AT BUILD TIME.
 *
 * Next.js calls this during `next build`, gets back a list of slugs, and
 * generates a static HTML file for each one. A customer opening
 * /product/iphone-12-used then receives a ready-made page instead of
 * waiting for the server to render it.
 *
 * In Phase 2 this becomes a Firestore read of every active product's slug.
 * Products added after the build still work - they are rendered on demand
 * and cached from then on.
 */
export function generateStaticParams() {
  return getActiveProducts().map((product) => ({ slug: product.slug }));
}

/**
 * Per-product SEO.
 *
 * `metadata` cannot be a plain object here, because the title depends on
 * WHICH product this is - and that is only known once the URL is parsed.
 * generateMetadata is the async version that receives the same params the
 * page does.
 */
export async function generateMetadata({
  params,
}: PageProps<"/product/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = getProductBySlug(slug);

  if (!product) {
    return { title: "Product Not Found" };
  }

  return {
    title: product.name,
    description: product.description.slice(0, 160),
    openGraph: {
      title: `${product.name} - Shabbir Mobiles`,
      description: product.description.slice(0, 160),
      type: "website",
    },
  };
}

/**
 * /product/[slug]
 *
 * THE COMPLETE CHAIN:
 *
 *   ProductCard renders  <Link href={`/product/${product.slug}`}>
 *          |
 *          v  customer clicks
 *   URL becomes  /product/iphone-12-used
 *          |
 *          v  Next.js matches the folder  product/[slug]
 *   params = { slug: "iphone-12-used" }        <- the folder NAME is the key
 *          |
 *          v
 *   getProductBySlug("iphone-12-used")
 *          |
 *          v
 *   the Product object, or undefined -> notFound()
 *          |
 *          v
 *   ProductGallery / ProductInfo / ProductTabs
 */
export default async function ProductDetailPage({
  params,
}: PageProps<"/product/[slug]">) {
  // `params` is a Promise in Next.js 15+, so the page must be async.
  // `slug` is named after the folder: [slug] -> params.slug.
  // Rename the folder to [productSlug] and this becomes params.productSlug.
  const { slug } = await params;

  const product = getProductBySlug(slug);

  /**
   * notFound() comes from next/navigation. It throws a special error that
   * Next.js catches: it stops rendering this page, serves the nearest
   * not-found.tsx, and sends a real HTTP 404 status.
   *
   * Why this beats `return <p>Not found</p>`:
   *   - the status code is genuinely 404, so Google de-indexes dead URLs
   *     instead of treating them as thin content
   *   - TypeScript narrows `product` to Product below this line, because
   *     notFound() is typed as `never` and can never return
   *   - one shared 404 UI instead of an ad-hoc message on every page
   */
  if (!product) {
    notFound();
  }

  // Related products: same category, excluding this one.
  const related = getProductsByCategory(product.categorySlug)
    .filter((p) => p.id !== product.id)
    .slice(0, 4);

  return (
    <Container className="py-6 lg:py-10">
      <Breadcrumb
        className="mb-6"
        items={[
          { label: "Home", href: "/" },
          { label: "Shop", href: "/shop" },
          {
            label: product.categoryName,
            href: `/shop?category=${product.categorySlug}`,
          },
          { label: product.name },
        ]}
      />

      {/*
        RESPONSIVE LAYOUT
        Mobile  : one column - gallery, then info (the natural reading order)
        Desktop : two columns - gallery left, info right
        The DOM order is already correct for mobile, so no ordering tricks.
      */}
      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        <ProductGallery images={product.images} alt={product.name} />
        <ProductInfo product={product} />
      </div>

      <ProductTabs product={product} />

      {related.length > 0 && (
        <section className="mt-12 border-t border-border pt-10 lg:mt-16">
          <SectionHeading
            eyebrow="You may also like"
            title={`More in ${product.categoryName}`}
            action={{
              label: "View category",
              href: `/shop?category=${product.categorySlug}`,
            }}
          />
          {/* ProductGrid reused a fourth time - homepage featured, homepage
              best sellers, the shop grid, and now related products. */}
          <ProductGrid products={related} />
        </section>
      )}
    </Container>
  );
}
