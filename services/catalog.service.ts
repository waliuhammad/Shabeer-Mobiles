import "server-only";

import { cache } from "react";
import { getAdminDb } from "@/lib/firebase/admin-db";
import { COLLECTIONS } from "@/lib/firebase/firestore";
import type { Category, Product } from "@/types";

/**
 * THE catalogue read layer, for the server.
 *
 * This is the file every comment in data/products.ts pointed at:
 * "services/*.ts will produce them from Firestore in Phase 2. Because
 * both honour this contract, no component changes when we swap the
 * source." That swap is what this file is.
 *
 * WHY THE ADMIN SDK AND NOT THE CLIENT SDK
 * ----------------------------------------
 * These run in Server Components, where there is no signed-in user. The
 * catalogue is public, so there is nothing to authorise - and going
 * through the Admin SDK avoids opening an unauthenticated client
 * connection on every request.
 *
 * Admin WRITES deliberately do NOT come through here. Those go through
 * the browser client SDK so firestore.rules is evaluated on every save.
 * A rule that is never run is a rule nobody knows is broken.
 *
 * WHY cache()
 * -----------
 * One page render can ask for products from a layout, the page and two
 * components. React's cache() collapses that into a single Firestore
 * read per render pass.
 */

/**
 * Firestore returns `DocumentData`, which is `any` in all but name.
 * Everything crossing this boundary is checked, so a malformed document
 * becomes a skipped row rather than a crash halfway down a render.
 */
function toProduct(id: string, d: FirebaseFirestore.DocumentData): Product | null {
  if (typeof d.name !== "string" || typeof d.slug !== "string") return null;
  return {
    id,
    name: d.name,
    slug: d.slug,
    brand: typeof d.brand === "string" ? d.brand : "",
    sku: typeof d.sku === "string" ? d.sku : "",
    categoryId: typeof d.categoryId === "string" ? d.categoryId : "",
    categorySlug: typeof d.categorySlug === "string" ? d.categorySlug : "",
    categoryName: typeof d.categoryName === "string" ? d.categoryName : "",
    description: typeof d.description === "string" ? d.description : "",
    features: Array.isArray(d.features) ? d.features.filter((f: unknown) => typeof f === "string") : [],
    images: Array.isArray(d.images) ? d.images.filter((i: unknown) => typeof i === "string") : [],
    price: typeof d.price === "number" ? d.price : 0,
    originalPrice: typeof d.originalPrice === "number" ? d.originalPrice : undefined,
    stock: typeof d.stock === "number" ? d.stock : 0,
    lowStockThreshold: typeof d.lowStockThreshold === "number" ? d.lowStockThreshold : 5,
    condition: d.condition === "used" ? "used" : "new",
    status:
      d.status === "active" || d.status === "draft" || d.status === "archived"
        ? d.status
        : "draft",
    isFeatured: Boolean(d.isFeatured),
    isBestSeller: Boolean(d.isBestSeller),
    createdAt: typeof d.createdAt === "string" ? d.createdAt : new Date(0).toISOString(),
  };
}

function toCategory(id: string, d: FirebaseFirestore.DocumentData): Category | null {
  if (typeof d.name !== "string" || typeof d.slug !== "string") return null;
  return {
    id,
    name: d.name,
    slug: d.slug,
    description: typeof d.description === "string" ? d.description : "",
    image: typeof d.image === "string" ? d.image : null,
  };
}

/** Every product, including drafts and archived. Admin-facing. */
export const getAllProducts = cache(async (): Promise<Product[]> => {
  const snap = await getAdminDb().collection(COLLECTIONS.products).get();
  return snap.docs
    .map((doc) => toProduct(doc.id, doc.data()))
    .filter((p): p is Product => p !== null);
});

/**
 * Everything the storefront is allowed to show.
 *
 * The status filter is applied in the QUERY, not afterwards in
 * JavaScript. That matters: a draft product must never be sent to a
 * customer's browser at all, not merely hidden once it arrives.
 * firestore.rules allows a public read of this collection, so this
 * filter is convenience - the real guarantee is that drafts contain
 * nothing secret.
 */
export const getActiveProducts = cache(async (): Promise<Product[]> => {
  const snap = await getAdminDb()
    .collection(COLLECTIONS.products)
    .where("status", "==", "active")
    .get();
  return snap.docs
    .map((doc) => toProduct(doc.id, doc.data()))
    .filter((p): p is Product => p !== null);
});

export const getProductBySlug = cache(
  async (slug: string): Promise<Product | undefined> => {
    const snap = await getAdminDb()
      .collection(COLLECTIONS.products)
      .where("slug", "==", slug)
      .limit(1)
      .get();
    const doc = snap.docs[0];
    if (!doc) return undefined;
    return toProduct(doc.id, doc.data()) ?? undefined;
  }
);

export const getProductById = cache(
  async (id: string): Promise<Product | undefined> => {
    const doc = await getAdminDb().collection(COLLECTIONS.products).doc(id).get();
    if (!doc.exists) return undefined;
    return toProduct(doc.id, doc.data() ?? {}) ?? undefined;
  }
);

export const getProductsByCategory = cache(
  async (categorySlug: string): Promise<Product[]> => {
    const snap = await getAdminDb()
      .collection(COLLECTIONS.products)
      .where("categorySlug", "==", categorySlug)
      .where("status", "==", "active")
      .get();
    return snap.docs
      .map((doc) => toProduct(doc.id, doc.data()))
      .filter((p): p is Product => p !== null);
  }
);

export const getFeaturedProducts = cache(async (count = 4): Promise<Product[]> => {
  const all = await getActiveProducts();
  return all.filter((p) => p.isFeatured).slice(0, count);
});

export const getBestSellers = cache(async (count = 4): Promise<Product[]> => {
  const all = await getActiveProducts();
  return all.filter((p) => p.isBestSeller).slice(0, count);
});

export const getCategories = cache(async (): Promise<Category[]> => {
  const snap = await getAdminDb().collection(COLLECTIONS.categories).get();
  return snap.docs
    .map((doc) => toCategory(doc.id, doc.data()))
    .filter((c): c is Category => c !== null);
});

/**
 * Is the catalogue actually in Firestore yet?
 *
 * Used by the seed script and by pages that want to explain an empty
 * shop rather than silently showing nothing.
 */
export async function isCatalogSeeded(): Promise<boolean> {
  const snap = await getAdminDb().collection(COLLECTIONS.products).limit(1).get();
  return !snap.empty;
}
