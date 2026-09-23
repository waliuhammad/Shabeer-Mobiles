"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { products as seedProducts } from "@/data/products";
import { categories as seedCategories } from "@/data/categories";
import { productCosts as seedCosts } from "@/data/product-costs";
import { createCategoryId, createProductId } from "@/lib/catalog-utils";
import { useIsHydrated } from "@/hooks/use-is-hydrated";
import type {
  Category,
  CategoryFormData,
  Product,
  ProductFormData,
  ProductStatus,
} from "@/types";

const PRODUCTS_KEY = "shabbir-mobiles:products:v1";
const CATEGORIES_KEY = "shabbir-mobiles:categories:v1";
const COSTS_KEY = "shabbir-mobiles:product-costs:v1";

/**
 * THE catalogue store: products, categories and admin-only costs.
 *
 * WHY COST IS A SEPARATE MAP, NOT A FIELD ON Product
 * --------------------------------------------------
 * types/product.ts refuses to carry purchasePrice, and the reason is
 * written there: one careless getProducts() on a public page would ship
 * the shop's margins to every customer's browser, and no Security Rule
 * can undo a read that was legitimate.
 *
 * So cost lives in its own record here, exactly as data/product-costs.ts
 * keeps it separate today. In Phase 2 that becomes productCosts/{id},
 * a document only OWNER and MANAGER may read. Keeping the shapes apart
 * now is what makes that split a one-line rule later rather than a
 * refactor of every component.
 *
 * WHAT THIS STORE DOES NOT OWN: stock. Stock belongs to the inventory
 * ledger, because every change to it must record who, how much and why.
 * See the note on ProductFormData.
 */
interface CatalogContextValue {
  products: Product[];
  /** Storefront-visible products only. */
  activeProducts: Product[];
  categories: Category[];

  getProduct: (id: string) => Product | undefined;
  getCategory: (id: string) => Category | undefined;
  /** Admin-only. Current cost, 0 when unknown. */
  getCost: (productId: string) => number;

  createProduct: (data: ProductFormData) => Product;
  updateProduct: (id: string, data: ProductFormData) => Product | undefined;
  /** Archives, restores or drafts. Never deletes. */
  setProductStatus: (id: string, status: ProductStatus) => void;

  createCategory: (data: CategoryFormData) => Category;
  updateCategory: (id: string, data: CategoryFormData) => Category | undefined;
  /** Refuses when any product still points at it. */
  removeCategory: (id: string) => boolean;

  resetCatalog: () => void;
  localChangeCount: number;
  isHydrated: boolean;
}

const CatalogContext = createContext<CatalogContextValue | null>(null);

function readStored<T>(key: string, isValid: (v: unknown) => v is T): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isValid(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

const isProductArray = (v: unknown): v is Product[] =>
  Array.isArray(v) && v.every((p) => typeof p === "object" && p !== null && typeof (p as Product).id === "string");
const isCategoryArray = (v: unknown): v is Category[] =>
  Array.isArray(v) && v.every((c) => typeof c === "object" && c !== null && typeof (c as Category).id === "string");
const isCostMap = (v: unknown): v is Record<string, number> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

export function CatalogProvider({ children }: { children: React.ReactNode }) {
  const [localProducts, setLocalProducts] = useState<Product[]>(
    () => readStored(PRODUCTS_KEY, isProductArray) ?? []
  );
  const [localCategories, setLocalCategories] = useState<Category[]>(
    () => readStored(CATEGORIES_KEY, isCategoryArray) ?? []
  );
  const [localCosts, setLocalCosts] = useState<Record<string, number>>(
    () => readStored(COSTS_KEY, isCostMap) ?? {}
  );
  /** Categories removed in this browser, by id. */
  const [removedCategories, setRemovedCategories] = useState<string[]>([]);

  const isHydrated = useIsHydrated();

  useEffect(() => {
    try {
      window.localStorage.setItem(PRODUCTS_KEY, JSON.stringify(localProducts));
      window.localStorage.setItem(CATEGORIES_KEY, JSON.stringify(localCategories));
      window.localStorage.setItem(COSTS_KEY, JSON.stringify(localCosts));
    } catch {
      // Storage blocked or full - still works for this session.
    }
  }, [localProducts, localCategories, localCosts]);

  const categories = useMemo(() => {
    if (!isHydrated) return seedCategories;
    const merged = seedCategories
      .filter((s) => !removedCategories.includes(s.id))
      .map((seed) => localCategories.find((l) => l.id === seed.id) ?? seed);
    const brandNew = localCategories.filter(
      (l) => !seedCategories.some((s) => s.id === l.id)
    );
    return [...merged, ...brandNew];
  }, [localCategories, removedCategories, isHydrated]);

  const products = useMemo(() => {
    if (!isHydrated) return seedProducts;
    const merged = seedProducts.map(
      (seed) => localProducts.find((l) => l.id === seed.id) ?? seed
    );
    const brandNew = localProducts.filter(
      (l) => !seedProducts.some((s) => s.id === l.id)
    );
    return [...merged, ...brandNew];
  }, [localProducts, isHydrated]);

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
  const getCost = useCallback(
    (productId: string) => localCosts[productId] ?? seedCosts[productId] ?? 0,
    [localCosts]
  );

  const upsertProduct = useCallback((product: Product) => {
    setLocalProducts((cur) => [...cur.filter((p) => p.id !== product.id), product]);
  }, []);

  /**
   * Builds the Product fields from the form, resolving the denormalised
   * category name and slug from the category id.
   *
   * Firestore has no joins, so those two copies exist on purpose: the
   * shop page filters by categorySlug and the card prints categoryName
   * without a second read. The cost is applied SEPARATELY, by the caller.
   */
  const applyForm = useCallback(
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
        features: data.features
          .split("\n")
          .map((f) => f.trim())
          .filter(Boolean),
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

  const setCost = useCallback((productId: string, raw: string) => {
    if (!raw.trim()) return;
    const value = Math.round(Number(raw));
    if (!Number.isFinite(value) || value < 0) return;
    setLocalCosts((cur) => ({ ...cur, [productId]: value }));
  }, []);

  const createProduct = useCallback(
    (data: ProductFormData): Product => {
      const id = createProductId();
      const product = applyForm(data, {
        id,
        name: "",
        slug: "",
        brand: "",
        sku: "",
        categoryId: "",
        categorySlug: "",
        categoryName: "",
        description: "",
        features: [],
        images: [],
        price: 0,
        // A brand new product starts at zero stock on purpose. Stock
        // arrives through a purchase being received or a manual
        // adjustment - both of which leave a ledger entry. Letting this
        // form seed stock would create units from nothing.
        stock: 0,
        lowStockThreshold: 5,
        condition: "new",
        status: "draft",
        isFeatured: false,
        isBestSeller: false,
        createdAt: new Date().toISOString(),
      });
      upsertProduct(product);
      setCost(id, data.purchasePrice);
      return product;
    },
    [applyForm, upsertProduct, setCost]
  );

  const updateProduct = useCallback(
    (id: string, data: ProductFormData): Product | undefined => {
      const existing = getProduct(id);
      if (!existing) return undefined;
      const updated = applyForm(data, existing);
      upsertProduct(updated);
      setCost(id, data.purchasePrice);
      return updated;
    },
    [getProduct, applyForm, upsertProduct, setCost]
  );

  const setProductStatus = useCallback(
    (id: string, status: ProductStatus) => {
      const existing = getProduct(id);
      if (!existing) return;
      upsertProduct({ ...existing, status });
    },
    [getProduct, upsertProduct]
  );

  const createCategory = useCallback((data: CategoryFormData): Category => {
    const category: Category = {
      id: createCategoryId(),
      name: data.name.trim(),
      slug: data.slug.trim(),
      description: data.description.trim(),
      image: null,
    };
    setLocalCategories((cur) => [...cur, category]);
    return category;
  }, []);

  const updateCategory = useCallback(
    (id: string, data: CategoryFormData): Category | undefined => {
      const existing = getCategory(id);
      if (!existing) return undefined;
      const updated: Category = {
        ...existing,
        name: data.name.trim(),
        slug: data.slug.trim(),
        description: data.description.trim(),
      };
      setLocalCategories((cur) => [...cur.filter((c) => c.id !== id), updated]);
      return updated;
    },
    [getCategory]
  );

  const removeCategory = useCallback(
    (id: string): boolean => {
      // Guarded here as well as in the UI. A category with products
      // behind it would orphan every one of them.
      if (products.some((p) => p.categoryId === id)) return false;
      setLocalCategories((cur) => cur.filter((c) => c.id !== id));
      setRemovedCategories((cur) => (cur.includes(id) ? cur : [...cur, id]));
      return true;
    },
    [products]
  );

  const resetCatalog = useCallback(() => {
    setLocalProducts([]);
    setLocalCategories([]);
    setLocalCosts({});
    setRemovedCategories([]);
  }, []);

  const value = useMemo(
    () => ({
      products,
      activeProducts,
      categories,
      getProduct,
      getCategory,
      getCost,
      createProduct,
      updateProduct,
      setProductStatus,
      createCategory,
      updateCategory,
      removeCategory,
      resetCatalog,
      localChangeCount: isHydrated
        ? localProducts.length + localCategories.length + Object.keys(localCosts).length
        : 0,
      isHydrated,
    }),
    [
      products, activeProducts, categories, getProduct, getCategory, getCost,
      createProduct, updateProduct, setProductStatus, createCategory,
      updateCategory, removeCategory, resetCatalog,
      localProducts.length, localCategories.length, localCosts, isHydrated,
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
