import { notFound } from "next/navigation";
import { ONLINE_STORE_ENABLED } from "@/lib/feature-flags";
import type { Metadata } from "next";
import { Container } from "@/components/shared/Container";
import { ShopBrowser } from "@/components/shop/ShopBrowser";
import { getActiveProducts } from "@/services/catalog.service";
import { categories } from "@/data/categories";

export const metadata: Metadata = {
  title: "Shop Mobiles & Accessories",
  description:
    "Browse used mobiles, chargers, covers, screen protectors, handsfree, AirPods and power banks at Shabbir Mobiles, Multan.",
};

/**
 * /shop - a SERVER Component.
 *
 * Its jobs: metadata, read the URL, load the data, render the static
 * heading, hand the interactive part to a client component.
 *
 * WHY searchParams is awaited:
 * In Next.js 15+ `params` and `searchParams` are Promises. This lets Next
 * begin rendering the static parts of the page before the request's search
 * parameters are resolved. Practically: this function must be `async` and
 * you must `await searchParams` before reading it.
 */
/**
 * DISABLED - the shop does not sell online.
 *
 * The page is kept whole and still type-checks; it simply 404s while
 * ONLINE_STORE_ENABLED is false. Flip that flag in lib/feature-flags.ts
 * to bring it back.
 */
export default async function ShopPage({ searchParams }: PageProps<"/shop">) {
  if (!ONLINE_STORE_ENABLED) notFound();
  const params = await searchParams;
  const category = typeof params.category === "string" ? params.category : "all";
  const q = typeof params.q === "string" ? params.q : "";

  // Reads Firestore ON THE SERVER, so a draft or archived product is
  // so no credentials reach the browser. This line is the only change.
  const allProducts = await getActiveProducts();

  return (
    <>
      {/* Page heading - static, server-rendered, ships no JavaScript */}
      <section className="border-b border-border bg-muted/40">
        <Container className="py-8 lg:py-12">
          <h1 className="text-2xl font-bold text-primary sm:text-3xl">Shop</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground sm:text-base">
            Explore mobiles, accessories and more.
          </p>
        </Container>
      </section>

      <Container className="py-6 lg:py-10">
        <ShopBrowser
          /**
           * `key` forces a REMOUNT whenever the URL changes.
           *
           * Without it: you are on /shop?q=iphone, then use the header
           * search for "cover". The URL updates and this server component
           * re-renders with initialQuery="cover" - but ShopBrowser is
           * already mounted, and useState initial values are only read on
           * the FIRST render. The box would still say "iphone".
           */
          key={`${category}-${q}`}
          products={allProducts}
          categories={categories}
          initialCategory={category}
          initialQuery={q}
        />
      </Container>
    </>
  );
}
