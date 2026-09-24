import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ONLINE_STORE_ENABLED } from "@/lib/feature-flags";
import type { Metadata } from "next";
import { Container } from "@/components/shared/Container";
import { ShopBrowserFromUrl } from "@/components/shop/ShopBrowserFromUrl";
import { ProductGrid } from "@/components/products/ProductGrid";
import { getActiveProducts, getCategories } from "@/services/catalog.service";

export const metadata: Metadata = {
  title: "Shop Mobiles & Accessories",
  description:
    "Browse used mobiles, chargers, covers, screen protectors, handsfree, AirPods and power banks at Shabbir Mobiles, Multan.",
};

/**
 * Rebuild at most once a minute, in the background. Same reasoning as
 * the home page: the catalogue changes when the shop changes it, not on
 * every request, so visitors get a cached page that is never stale by
 * more than a minute.
 */
export const revalidate = 60;

/**
 * /shop - a SERVER Component.
 *
 * Its jobs: metadata, load the data, render the static heading, hand the
 * interactive part to a client component.
 *
 * WHY IT NO LONGER AWAITS searchParams
 * ------------------------------------
 * It used to, in order to seed the filter and the search box. But a page
 * that reads the query string on the server cannot be prerendered - the
 * output depends on the request - so this route was rendered from
 * scratch every single time. On the live site that measured 3.4 seconds
 * with a cache MISS on every visit, against well under a second for the
 * cached home page.
 *
 * The query string is now read in the browser by ShopBrowserFromUrl.
 * Nothing about the URLs changes: /shop?category=chargers and
 * /shop?q=cover behave exactly as before.
 *
 * DISABLED - the shop does not sell online.
 *
 * The page is kept whole and still type-checks; it simply 404s while
 * ONLINE_STORE_ENABLED is false. Flip that flag in lib/feature-flags.ts
 * to bring it back.
 */
export default async function ShopPage() {
  if (!ONLINE_STORE_ENABLED) notFound();

  /**
   * Both from Firestore now.
   *
   * Categories used to come from data/categories.ts, a Phase 1 stand-in
   * that is no longer the truth: a category added or renamed in the
   * admin panel is written to Firestore, so the old import meant the
   * shop page quietly disagreed with the rest of the app.
   *
   * Run together rather than in sequence - neither needs the other.
   */
  const [allProducts, allCategories] = await Promise.all([
    getActiveProducts(),
    getCategories(),
  ]);

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
        {/*
          The Suspense boundary is REQUIRED, not stylistic. useSearchParams
          suspends during prerendering, because the query string is not
          known until a real request arrives. Without a boundary telling
          Next.js what to show meanwhile, the production build fails with
          "useSearchParams() should be wrapped in a suspense boundary" -
          the same rule that already applies to the login form.

          THE FALLBACK IS THE WHOLE CATALOGUE, NOT A SKELETON, and that
          matters more than it looks. Whatever sits here is what goes into
          the prerendered HTML. A skeleton meant the shop page shipped
          with zero products in its markup - every product reachable only
          after JavaScript ran. Measured: `grep href="/product/..."` on
          the served HTML returned 0, where it had returned 11 before.
          That is a page with nothing in it for a crawler, a slow phone,
          or anyone whose JavaScript has not arrived yet.

          Rendering the real grid instead means the HTML carries all
          eleven products and their links, exactly as it used to, and the
          interactive version takes over on hydration.
        */}
        <Suspense fallback={<ProductGrid products={allProducts} />}>
          <ShopBrowserFromUrl products={allProducts} categories={allCategories} />
        </Suspense>
      </Container>
    </>
  );
}

