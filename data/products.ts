import type { Product } from "@/types";

/**
 * Phase 1 stand-in for the Firestore `products` collection.
 * One object here = one future Firestore document.
 *
 * NOTE ON IMAGES: `images` is an empty array on every product. That is
 * intentional, not a placeholder-to-fix. "No image" is a legitimate state
 * that ProductImage handles with a branded fallback tile. External URLs
 * break randomly; local files that do not exist render broken-image icons.
 * When Cloudinary is wired up you fill these arrays and nothing else in the
 * app changes.
 *
 * Edge cases are seeded on purpose - zero stock, low stock, and a product
 * with no discount - because a UI that has never rendered an unhappy path
 * will fail on one.
 */
export const products: Product[] = [
  {
    id: "p-001",
    name: "iPhone 12 (Used)",
    slug: "iphone-12-used",
    brand: "Apple",
    sku: "APL-IP12-64U",
    categoryId: "cat-mobiles",
    categorySlug: "used-mobiles",
    categoryName: "Used Mobiles",
    description:
      "A clean, fully tested iPhone 12 in excellent condition. Battery health above 85%, no display shadows, Face ID working, and PTA approved. Comes with a 7-day checking warranty from the shop.",
    features: [
      "6.1 inch Super Retina XDR display",
      "A14 Bionic chip",
      "12MP dual camera system",
      "64GB storage",
      "Face ID / PTA approved",
    ],
    images: ["/images/products/iphone-12-used.png"],
    price: 28999,
    originalPrice: 34999,
    stock: 0,
    lowStockThreshold: 5,
    condition: "used",
    status: "active",
    isFeatured: true,
    isBestSeller: true,
    createdAt: "2026-08-14T10:00:00.000Z",
  },
  {
    id: "p-002",
    name: "iPhone 11 (Used)",
    slug: "iphone-11-used",
    brand: "Apple",
    sku: "APL-IP11-64U",
    categoryId: "cat-mobiles",
    categorySlug: "used-mobiles",
    categoryName: "Used Mobiles",
    description:
      "Reliable everyday iPhone with a strong battery and clean body. Checked and serviced in our lab before listing. An ideal first iPhone.",
    features: [
      "6.1 inch Liquid Retina HD display",
      "A13 Bionic chip",
      "12MP dual camera",
      "64GB storage",
      "Face ID / PTA approved",
    ],
    images: ["/images/products/iphone-11-used.png"],
    price: 22999,
    originalPrice: 27999,
    stock: 0,
    lowStockThreshold: 5,
    condition: "used",
    status: "active",
    isFeatured: true,
    isBestSeller: false,
    createdAt: "2026-08-02T10:00:00.000Z",
  },
  {
    id: "p-003",
    name: "Samsung Galaxy A52 (Used)",
    slug: "samsung-galaxy-a52-used",
    brand: "Samsung",
    sku: "SAM-A52-128U",
    categoryId: "cat-mobiles",
    categorySlug: "used-mobiles",
    categoryName: "Used Mobiles",
    description:
      "Super AMOLED 90Hz display with a big battery and a genuinely good camera. Complete with original box and charger.",
    features: [
      "6.5 inch Super AMOLED 90Hz",
      "Snapdragon 720G",
      "8GB RAM / 128GB storage",
      "64MP quad camera",
      "4500mAh battery",
    ],
    images: ["/images/products/samsung-galaxy-a52-used.png"],
    price: 18999,
    originalPrice: 22999,
    stock: 0,
    lowStockThreshold: 5,
    condition: "used",
    status: "active",
    isFeatured: false,
    isBestSeller: true,
    createdAt: "2026-07-21T10:00:00.000Z",
  },
  {
    id: "p-004",
    name: "Samsung Original Charger 25W",
    slug: "samsung-original-charger-25w",
    brand: "Samsung",
    sku: "SAM-CHG-25W",
    categoryId: "cat-chargers",
    categorySlug: "chargers",
    categoryName: "Chargers",
    description:
      "Genuine Samsung 25W Super Fast Charging adapter with Type-C cable included. The safe choice for your Galaxy device.",
    features: [
      "25W Super Fast Charging",
      "USB Type-C output",
      "Type-C to Type-C cable included",
      "Original Samsung product",
    ],
    images: ["/images/products/samsung-original-charger-25w.png"],
    price: 1499,
    originalPrice: 1899,
    stock: 0,
    lowStockThreshold: 5,
    condition: "new",
    status: "active",
    isFeatured: true,
    isBestSeller: true,
    createdAt: "2026-09-01T10:00:00.000Z",
  },
  {
    id: "p-005",
    name: "Fast Charger 33W",
    slug: "fast-charger-33w",
    brand: "Generic",
    sku: "GEN-CHG-33W",
    categoryId: "cat-chargers",
    categorySlug: "chargers",
    categoryName: "Chargers",
    description:
      "High-output 33W adapter compatible with most fast-charging phones. Built-in over-current protection. One month replacement warranty.",
    features: [
      "33W maximum output",
      "VOOC / QC compatible",
      "Over-current protection",
      "1 month replacement warranty",
    ],
    images: ["/images/products/fast-charger-33w.png"],
    price: 899,
    originalPrice: 1299,
    stock: 0,
    lowStockThreshold: 10,
    condition: "new",
    status: "active",
    isFeatured: false,
    isBestSeller: true,
    createdAt: "2026-09-05T10:00:00.000Z",
  },
  {
    id: "p-006",
    name: "Silicone Phone Cover",
    slug: "silicone-phone-cover",
    brand: "Generic",
    sku: "GEN-CVR-SIL",
    categoryId: "cat-covers",
    categorySlug: "covers",
    categoryName: "Covers",
    description:
      "Soft-touch silicone back cover with raised camera protection and a microfibre lining. Available for most popular models - ask in store for your device.",
    features: [
      "Soft-touch silicone finish",
      "Raised camera bezel",
      "Microfibre inner lining",
      "Precise button cut-outs",
    ],
    images: ["/images/products/silicone-phone-cover.png"],
    price: 999,
    originalPrice: 1299,
    stock: 0,
    lowStockThreshold: 10,
    condition: "new",
    status: "active",
    isFeatured: false,
    isBestSeller: false,
    createdAt: "2026-08-25T10:00:00.000Z",
  },
  {
    id: "p-007",
    name: "Tempered Glass Screen Protector",
    slug: "tempered-glass-screen-protector",
    brand: "Generic",
    sku: "GEN-PRT-9H",
    categoryId: "cat-protectors",
    categorySlug: "protectors",
    categoryName: "Protectors",
    description:
      "9H hardness full-glue tempered glass with an oleophobic coating. Free professional installation at the shop with every purchase.",
    features: [
      "9H surface hardness",
      "Full glue, no rainbow edges",
      "Oleophobic anti-fingerprint coating",
      "Free installation in store",
    ],
    images: ["/images/products/tempered-glass-screen-protector.png"],
    price: 349,
    originalPrice: 499,
    stock: 0,
    lowStockThreshold: 20,
    condition: "new",
    status: "active",
    isFeatured: false,
    isBestSeller: true,
    createdAt: "2026-09-10T10:00:00.000Z",
  },
  {
    id: "p-008",
    name: "AirPods Pro (2nd Gen)",
    slug: "airpods-pro-2nd-gen",
    brand: "Apple",
    sku: "APL-APP-GEN2",
    categoryId: "cat-airpods",
    categorySlug: "airpods",
    categoryName: "AirPods",
    description:
      "Active noise cancellation with transparency mode and a wireless charging case. Tested in store before handover.",
    features: [
      "Active Noise Cancellation",
      "Adaptive Transparency mode",
      "Wireless charging case",
      "Up to 6 hours listening time",
    ],
    images: ["/images/products/airpods-pro-2nd-gen.png"],
    price: 8999,
    originalPrice: 11499,
    stock: 0,
    lowStockThreshold: 5,
    condition: "new",
    status: "active",
    isFeatured: true,
    isBestSeller: true,
    createdAt: "2026-09-12T10:00:00.000Z",
  },
  {
    id: "p-009",
    name: "Power Bank 20,000 mAh",
    slug: "power-bank-20000-mah",
    brand: "Anker",
    sku: "ANK-PWB-20K",
    categoryId: "cat-powerbanks",
    categorySlug: "power-banks",
    categoryName: "Power Banks",
    description:
      "Charge a modern phone four to five times over. 22.5W PD fast output, dual USB-A plus Type-C, with an LED percentage display.",
    features: [
      "20,000 mAh capacity",
      "22.5W PD fast output",
      "Dual USB-A + USB Type-C",
      "LED battery percentage display",
    ],
    images: ["/images/products/power-bank-20000-mah.png"],
    price: 4299,
    originalPrice: 4999,
    stock: 0,
    lowStockThreshold: 5,
    condition: "new",
    status: "active",
    isFeatured: true,
    isBestSeller: false,
    createdAt: "2026-08-30T10:00:00.000Z",
  },
  {
    id: "p-010",
    name: "Wired Handsfree",
    slug: "wired-handsfree",
    brand: "Generic",
    sku: "GEN-HFR-35MM",
    categoryId: "cat-handsfree",
    categorySlug: "handsfree",
    categoryName: "Handsfree",
    description:
      "Comfortable in-ear wired earphones with an inline microphone and call button. Clear sound for calls and music.",
    features: [
      "In-ear noise isolating fit",
      "Inline microphone + call button",
      "3.5mm jack",
      "1.2m tangle-resistant cable",
    ],
    images: ["/images/products/wired-handsfree.png"],
    price: 599,
    stock: 0,
    lowStockThreshold: 10,
    condition: "new",
    status: "active",
    isFeatured: false,
    isBestSeller: false,
    createdAt: "2026-09-08T10:00:00.000Z",
  },
  {
    id: "p-011",
    name: "Type-C Fast Charging Cable",
    slug: "type-c-fast-charging-cable",
    brand: "Generic",
    sku: "GEN-CBL-TYPC",
    categoryId: "cat-accessories",
    categorySlug: "accessories",
    categoryName: "Other Accessories",
    description:
      "Braided 1-metre Type-C cable rated for 3A fast charging with reinforced connectors that survive daily use.",
    features: [
      "3A fast charging support",
      "Braided nylon jacket",
      "1 metre length",
      "Reinforced strain relief",
    ],
    images: ["/images/products/type-c-fast-charging-cable.png"],
    price: 449,
    originalPrice: 699,
    stock: 0,
    lowStockThreshold: 15,
    condition: "new",
    status: "active",
    isFeatured: false,
    isBestSeller: false,
    createdAt: "2026-09-15T10:00:00.000Z",
  },
];

/* ==================================================================
   DATA ACCESS FUNCTIONS - THE SEAM

   Components import THESE, never the raw `products` array.

   Each becomes a Firestore query in Phase 2, in
   services/products.service.ts, keeping the same name and return type.
   The only change: they become `async`, and callers `await` them.
   ================================================================== */

/** Phase 2: query(col, where("isFeatured","==",true), limit(n)) */
export function getFeaturedProducts(count = 4): Product[] {
  return products.filter((p) => p.isFeatured && p.status === "active").slice(0, count);
}

/** Phase 2: query(col, where("isBestSeller","==",true), limit(n)) */
export function getBestSellers(count = 4): Product[] {
  return products.filter((p) => p.isBestSeller && p.status === "active").slice(0, count);
}

/** Phase 2: getDoc(doc(db, "products", id)) */
export function getProductById(id: string): Product | undefined {
  return products.find((p) => p.id === id);
}

/**
 * Phase 2: query(col, where("slug","==",slug), limit(1))
 * Returns undefined on a miss, which is what will trigger notFound().
 */
export function getProductBySlug(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}

/** Phase 2: query(col, where("categorySlug","==",slug)) */
export function getProductsByCategory(categorySlug: string): Product[] {
  return products.filter((p) => p.categorySlug === categorySlug && p.status === "active");
}

/**
 * Everything the storefront is allowed to show.
 * The `status === "active"` check is the SINGLE place drafts and archived
 * items get excluded. In Phase 2 this becomes a Firestore `where` clause
 * AND a matching Security Rule - defence in depth.
 */
export function getActiveProducts(): Product[] {
  return products.filter((p) => p.status === "active");
}
