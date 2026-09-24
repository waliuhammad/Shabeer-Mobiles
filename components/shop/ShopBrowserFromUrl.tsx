"use client";

import { useSearchParams } from "next/navigation";
import { ShopBrowser } from "@/components/shop/ShopBrowser";
import type { Category, Product } from "@/types";

interface ShopBrowserFromUrlProps {
  products: Product[];
  categories: Category[];
}

/**
 * Reads ?category= and ?q= in the BROWSER and hands them to ShopBrowser.
 *
 * WHY THIS TINY COMPONENT EXISTS
 * ------------------------------
 * The shop page used to await searchParams on the server. Reading them
 * there makes the route dynamic by definition - Next.js cannot prerender
 * a page whose output depends on the query string - so every visit paid
 * for a fresh server render plus a Firestore round trip. Measured on the
 * live site, /shop answered in 3.4 seconds with
 * `Cache-Control: private, no-cache, no-store` and a cache MISS every
 * single time, while the cached home page answered in well under one.
 *
 * Moving the read here costs nothing and buys everything: the page above
 * becomes prerenderable and cacheable, and the query string is applied
 * by the component that was going to own it anyway.
 *
 * NOTHING ELSE CHANGES. Filtering was already client-side inside
 * ShopBrowser, and the full product list is still server-rendered into
 * the HTML, so deep links, search engines and a visitor with JavaScript
 * disabled all see the same products they did before.
 *
 * THE `key` IS LOAD-BEARING, and is the same trick the server page used.
 * ShopBrowser seeds useState from these props, and useState only reads
 * its initial value on the first render. Going from /shop?q=iphone to
 * /shop?q=cover would otherwise leave the old text in the search box.
 * Changing the key remounts it, so the new values are read as initial
 * ones. Deriving instead of remounting would mean the component could
 * never be typed in, since the URL would win on every keystroke.
 */
export function ShopBrowserFromUrl({ products, categories }: ShopBrowserFromUrlProps) {
  const params = useSearchParams();
  const category = params.get("category") ?? "all";
  const query = params.get("q") ?? "";

  return (
    <ShopBrowser
      key={`${category}-${query}`}
      products={products}
      categories={categories}
      initialCategory={category}
      initialQuery={query}
    />
  );
}
