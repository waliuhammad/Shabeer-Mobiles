/**
 * Domain types for the product catalogue.
 *
 * These describe the shape of a Firestore `products` / `categories`
 * document as it reaches the UI. data/*.ts produces them today;
 * services/*.ts will produce them from Firestore in Phase 2. Because both
 * honour this contract, no component changes when we swap the source.
 */

/** Used phones are core to the business, so condition is first-class. */
export type ProductCondition = "new" | "used";

/**
 * Admin-controlled visibility.
 * Only "active" products are ever sent to the storefront. In Phase 2 this
 * becomes `where("status", "==", "active")` in the Firestore query, AND a
 * Security Rule making that the only thing a signed-out user can read.
 */
export type ProductStatus = "active" | "draft" | "archived";

export interface Category {
  /** Firestore document ID. */
  id: string;
  name: string;
  /** URL-safe key. Used in /shop?category=chargers */
  slug: string;
  description: string;
  /** null until real imagery exists. Cloudinary URL later. */
  image: string | null;
}

export interface Product {
  /** Firestore document ID (the key, not a field inside the document). */
  id: string;
  name: string;
  /** Canonical URL segment: /product/iphone-12-used */
  slug: string;
  brand: string;

  /**
   * Stock Keeping Unit - the short code the shop uses at the counter.
   *
   * Added for the POS: a cashier types or scans a SKU far faster than a
   * product name, and it is what will be printed on shelf labels. It is
   * also the natural target for a barcode scanner later, since most
   * scanners simply type the code and press Enter.
   *
   * Unique per product, and stable - it is referenced by purchase
   * invoices and stock counts that must still make sense years later.
   */
  sku: string;

  /* ---- Category relationship (denormalised - Firestore has no joins) --- */
  /** Foreign key -> Category.id. The real relationship. */
  categoryId: string;
  /** Denormalised -> Category.slug. Filtering and URLs. */
  categorySlug: string;
  /** Denormalised -> Category.name. Display only, avoids an extra read. */
  categoryName: string;

  description: string;
  /** Bullet points for the product detail page. */
  features: string[];

  /**
   * Gallery. images[0] is the primary image used on cards.
   * An empty array is a VALID state - ProductImage renders a branded
   * placeholder - until Cloudinary URLs land in Phase 3.
   */
  images: string[];

  /* ---- Money. Whole rupees; Pakistani retail does not use paisa. ---- */
  /** What the customer pays. */
  price: number;
  /** Pre-discount price. Optional - present only when on sale. */
  originalPrice?: number;

  /**
   * SECURITY NOTE:
   * `purchasePrice` is deliberately ABSENT from this interface.
   *
   * Cost price is admin-only data. If it lived here, one careless
   * getProducts() on a public page would ship the shop's margins to every
   * customer's browser - and no Security Rule can undo that, because the
   * read was legitimate. Cost lives on a separate, rule-protected document
   * in a later phase. A type that cannot carry it cannot leak it.
   */

  /** THE central inventory number - shared by the website and the POS. */
  stock: number;
  /** Below this, the admin dashboard raises a low-stock warning. */
  lowStockThreshold: number;

  condition: ProductCondition;
  status: ProductStatus;

  isFeatured: boolean;
  isBestSeller: boolean;

  /**
   * ISO 8601 string. Becomes a Firestore Timestamp; the service layer will
   * convert it so the UI never handles a Firebase-specific type.
   */
  createdAt: string;
}

/**
 * The sort options the shop toolbar offers.
 *
 * A union type, not `string`. sortProducts(list, "price-lowest") is now a
 * compile error - it can only be one of these four exact values. This is
 * how you make invalid states unrepresentable instead of validating at
 * runtime and hoping.
 */
export type SortOption = "popular" | "price-asc" | "price-desc" | "newest";
