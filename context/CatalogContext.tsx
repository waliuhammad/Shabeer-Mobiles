"use client";

import { createContext, useCallback, useContext, useMemo } from "react";
import type { QueryDocumentSnapshot } from "firebase/firestore";
import { COLLECTIONS } from "@/lib/firebase/firestore";
import { useFirestoreCollection } from "@/hooks/use-firestore-collection";
import { removeDoc, writeDoc } from "@/lib/firebase/write";
import { createCategoryId, createProductId } from "@/lib/catalog-utils";
import { useAuth } from "@/context/AuthContext";
import type {
  Category,
  CategoryFormData,
  Product,
  ProductFormData,
  ProductStatus,
} from "@/types";

/**
 * THE catalogue store - now live Firestore, not localStorage.
 *
 * Products, categories and costs arrive through onSnapshot, so a price
 * changed on the shop machine appears on the owner's laptop without a
 * refresh. The component API below is unchanged from the localStorage
 * version, which is why no screen had to be rewritten.
 *
 * COST IS A SEPARATE COLLECTION, STILL
 * ------------------------------------
 * productCosts/{productId} is its own document, exactly as it was its
 * own map before. types/product.ts refuses to carry purchasePrice, and
 * firestore.rules refuses a cashier read of productCosts. Keeping cost
 * out of the product document is what makes that rule possible: a public
 * read of the catalogue cannot carry margins it does not contain.
 */

interface CatalogContextValue {
  products: Product[];
  activeProducts: Product[];
  categories: Category[];

  getProduct: (id: string) => Product | undefined;
  getCategory: (id: string) => Category | undefined;
  /** Admin-only. 0 when unknown or not readable by this role. */
  getCost: (productId: string) => number;
  /** Was that cost estimated rather than supplied by the shop? */
  isCostEstimated: (productId: string) => boolean;

  createProduct: (data: ProductFormData) => Promise<Product>;
  updateProduct: (id: string, data: ProductFormData) => Promise<Product | undefined>;
  setProductStatus: (id: string, status: ProductStatus) => Promise<void>;

  createCategory: (data: CategoryFormData) => Promise<Category>;
  updateCategory: (id: string, data: CategoryFormData) => Promise<Category | undefined>;
  removeCategory: (id: string) => Promise<boolean>;

  loading: boolean;
  error: string | null;
  /** True once the first snapshot has arrived. */
  isHydrated: boolean;
}

const CatalogContext = createContext<CatalogContextValue | null>(null);

function mapProduct(doc: QueryDocumentSnapshot): Product | null {
  const d = doc.data();
  if (typeof d.name !== "string" || typeof d.slug !== "string") return null;
  return {
    id: doc.id,
    name: d.name,
    slug: d.slug,
    brand: typeof d.brand === "string" ? d.brand : "",
    sku: typeof d.sku === "string" ? d.sku : "",
    categoryId: typeof d.categoryId === "string" ? d.categoryId : "",
    categorySlug: typeof d.categorySlug === "string" ? d.categorySlug : "",
    categoryName: typeof d.categoryName === "string" ? d.categoryName : "",
    description: typeof d.description === "string" ? d.description : "",
    features: Array.isArray(d.features) ? d.features.filter((f) => typeof f === "string") : [],
    images: Array.isArray(d.images) ? d.images.filter((i) => typeof i === "string") : [],
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

function mapCategory(doc: QueryDocumentSnapshot): Category | null {
  const d = doc.data();
  if (typeof d.name !== "string" || typeof d.slug !== "string") return null;
  return {
    id: doc.id,
    name: d.name,
    slug: d.slug,
    description: typeof d.description === "string" ? d.description : "",
    image: typeof d.image === "string" ? d.image : null,
  };
}

interface CostRow {
  productId: string;
  cost: number;
  /**
   * True when nobody at the shop supplied this figure - it was
   * estimated from the selling price and a typical margin for the
   * category.
   *
   * It exists so an estimate can never be mistaken for a real number
   * once it is in the database. Without it the two are identical, and
   * every margin, stock valuation and P&L built on top would look
   * exactly as authoritative as one built on real invoices.
   */
  isEstimate: boolean;
}

function mapCost(doc: QueryDocumentSnapshot): CostRow | null {
  const d = doc.data();
  if (typeof d.cost !== "number") return null;
  return { productId: doc.id, cost: d.cost, isEstimate: d.isEstimate === true };
}

export function CatalogProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();

  // Products and categories are world-readable, so they subscribe
  // immediately - the storefront needs them signed out.
  const productsState = useFirestoreCollection<Product>(COLLECTIONS.products, mapProduct);
  const categoriesState = useFirestoreCollection<Category>(COLLECTIONS.categories, mapCategory);

  /**
   * Costs are owner/manager only. Subscribing as a cashier or a signed
   * out visitor would be refused, so the listener is not even opened -
   * `enabled` keeps the console clean and saves a pointless round trip.
   */
  const canReadCosts =
    !authLoading && Boolean(user?.isStaff) && user?.role !== "CASHIER";
  const costsState = useFirestoreCollection<CostRow>(COLLECTIONS.productCosts, mapCost, {
    enabled: canReadCosts,
  });

  const costMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of costsState.items) map.set(row.productId, row.cost);
    return map;
  }, [costsState.items]);

  /** Which products carry an ESTIMATED cost rather than a supplied one. */
  const estimatedCostIds = useMemo(() => {
    const ids = new Set<string>();
    for (const row of costsState.items) {
      if (row.isEstimate) ids.add(row.productId);
    }
    return ids;
  }, [costsState.items]);

  const products = productsState.items;
  const categories = categoriesState.items;

  const activeProducts = useMemo(
    () => products.filter((p) => p.status === "active"),
    [products]
  );

  const getProduct = useCallback(
    (id: string) => products.find((p) => p.id === id),
    [products]
  );
  const getCategory = useCallback(
    (id: string) => categories.find((c) => c.id === id),
    [categories]
  );
  const getCost = useCallback((productId: string) => costMap.get(productId) ?? 0, [costMap]);

  /**
   * True when this product's cost was estimated rather than supplied.
   *
   * Every screen that shows a margin, a stock value or a profit figure
   * can ask this and say so, instead of presenting a guess with the same
   * confidence as a real invoice.
   */
  const isCostEstimated = useCallback(
    (productId: string) => estimatedCostIds.has(productId),
    [estimatedCostIds]
  );

  /**
   * Builds the product document from the form.
   *
   * categorySlug and categoryName are denormalised copies. Firestore has
   * no joins, so the shop page can filter by slug and a card can print
   * the category name without a second read. They are resolved here, at
   * write time, from the category id.
   */
  const buildProduct = useCallback(
    (data: ProductFormData, base: Product): Product => {
      const category = getCategory(data.categoryId);
      return {
        ...base,
        name: data.name.trim(),
        slug: data.slug.trim(),
        brand: data.brand.trim(),
        sku: data.sku.trim(),
        categoryId: data.categoryId,
        categorySlug: category?.slug ?? base.categorySlug,
        categoryName: category?.name ?? base.categoryName,
        description: data.description.trim(),
        features: data.features.split("\n").map((f) => f.trim()).filter(Boolean),
        /**
         * The gallery, in the order the form left it.
         *
         * Blank entries are dropped rather than stored: an empty string
         * reaches next/image as a src and renders a broken image, where
         * an absent entry correctly falls through to the placeholder
         * tile in ProductImage.
         */
        images: data.images.filter((url) => typeof url === "string" && url.trim() !== ""),
        price: Math.round(Number(data.price)),
        originalPrice: data.originalPrice.trim()
          ? Math.round(Number(data.originalPrice))
          : undefined,
        lowStockThreshold: Math.round(Number(data.lowStockThreshold)),
        condition: data.condition,
        status: data.status,
        isFeatured: data.isFeatured,
        isBestSeller: data.isBestSeller,
      };
    },
    [getCategory]
  );

  /** Cost goes to its own document, never onto the product. */
  const saveCost = useCallback(async (productId: string, raw: string) => {
    if (!raw.trim()) return;
    const value = Math.round(Number(raw));
    if (!Number.isFinite(value) || value < 0) return;
    await writeDoc(COLLECTIONS.productCosts, productId, {
      cost: value,
      /**
       * FALSE, always, from this path.
       *
       * A number typed into the admin form is one the shop supplied, so
       * it clears any estimate that was sitting there. Leaving the flag
       * alone would keep labelling a real invoice price as a guess, and
       * the label would never go away no matter how much work was done.
       */
      isEstimate: false,
      updatedAt: new Date().toISOString(),
    });
  }, []);

  const createProduct = useCallback(
    async (data: ProductFormData): Promise<Product> => {
      const id = createProductId();
      const product = buildProduct(data, {
        id,
        name: "", slug: "", brand: "", sku: "",
        categoryId: "", categorySlug: "", categoryName: "",
        description: "", features: [], images: [],
        price: 0,
        // A new product starts at zero stock. Units arrive only through
        // a recorded movement, never by being typed into a form.
        stock: 0,
        lowStockThreshold: 5,
        condition: "new",
        status: "draft",
        isFeatured: false,
        isBestSeller: false,
        createdAt: new Date().toISOString(),
      });
      await writeDoc(COLLECTIONS.products, id, product);
      await saveCost(id, data.purchasePrice);
      return product;
    },
    [buildProduct, saveCost]
  );

  const updateProduct = useCallback(
    async (id: string, data: ProductFormData): Promise<Product | undefined> => {
      const existing = getProduct(id);
      if (!existing) return undefined;
      const updated = buildProduct(data, existing);
      await writeDoc(COLLECTIONS.products, id, updated);
      await saveCost(id, data.purchasePrice);
      return updated;
    },
    [getProduct, buildProduct, saveCost]
  );

  const setProductStatus = useCallback(
    async (id: string, status: ProductStatus) => {
      await writeDoc(COLLECTIONS.products, id, { status });
    },
    []
  );

  const createCategory = useCallback(
    async (data: CategoryFormData): Promise<Category> => {
      const category: Category = {
        id: createCategoryId(),
        name: data.name.trim(),
        slug: data.slug.trim(),
        description: data.description.trim(),
        image: null,
      };
      await writeDoc(COLLECTIONS.categories, category.id, category);
      return category;
    },
    []
  );

  const updateCategory = useCallback(
    async (id: string, data: CategoryFormData): Promise<Category | undefined> => {
      const existing = getCategory(id);
      if (!existing) return undefined;
      const updated: Category = {
        ...existing,
        name: data.name.trim(),
        slug: data.slug.trim(),
        description: data.description.trim(),
      };
      await writeDoc(COLLECTIONS.categories, id, updated);
      return updated;
    },
    [getCategory]
  );

  const removeCategory = useCallback(
    async (id: string): Promise<boolean> => {
      // Guarded here as well as in the UI: removing a category with
      // products behind it would leave every one of them pointing at
      // something that no longer exists.
      if (products.some((p) => p.categoryId === id)) return false;
      await removeDoc(COLLECTIONS.categories, id);
      return true;
    },
    [products]
  );

  /**
   * Costs count towards "loaded", and leaving them out was a bug.
   *
   * EditProductView gates on isHydrated before rendering the form,
   * because the form seeds its useState ONCE from what it is handed.
   * With costs excluded from this flag the gate opened too early: the
   * form seeded purchasePrice from getCost(), which was still 0, and
   * froze an empty Purchase Cost box over a product that had a cost
   * recorded. The owner saw a blank field and no way to tell whether
   * that meant "none set" or "not loaded".
   *
   * authLoading is in here for the same reason, and leaving IT out was
   * why adding costsState.loading alone changed nothing. The costs hook
   * reports loading: false while it is DISABLED - which is correct, a
   * listener that was never opened is not loading - and it stays
   * disabled until auth resolves. So the gate opened during that window,
   * before the subscription had even been allowed to start.
   *
   * Safe for every other reader: once auth has resolved, a cashier or a
   * signed-out visitor leaves the costs listener closed and reporting
   * loading: false, so nothing waits on it.
   *
   * CatalogProvider is mounted only in the admin layout, so no
   * storefront page waits on an auth check it does not need.
   */
  const loading =
    authLoading ||
    productsState.loading ||
    categoriesState.loading ||
    costsState.loading;
  const error = productsState.error ?? categoriesState.error ?? costsState.error;

  const value = useMemo(
    () => ({
      products, activeProducts, categories,
      getProduct, getCategory, getCost, isCostEstimated,
      createProduct, updateProduct, setProductStatus,
      createCategory, updateCategory, removeCategory,
      loading, error,
      isHydrated: !loading,
    }),
    [
      products, activeProducts, categories, getProduct, getCategory, getCost, isCostEstimated,
      createProduct, updateProduct, setProductStatus, createCategory,
      updateCategory, removeCategory, loading, error,
    ]
  );

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog(): CatalogContextValue {
  const context = useContext(CatalogContext);
  if (!context) {
    throw new Error("useCatalog must be used inside a <CatalogProvider>");
  }
  return context;
}
