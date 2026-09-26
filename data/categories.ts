import type { Category } from "@/types";

/**
 * Phase 1 stand-in for the Firestore `categories` collection.
 *
 * Each object here is exactly one future Firestore document. The array
 * itself is the collection. When Phase 2 arrives, this file is deleted and
 * services/categories.service.ts returns the same Category[] from Firestore.
 *
 * `slug` is the key that ties everything together:
 *   - the URL:    /shop?category=chargers
 *   - the filter: product.categorySlug === "chargers"
 * Keep slugs lowercase and hyphenated. Never change one after launch - it
 * would break every saved link and every Google result.
 */
export const categories: Category[] = [
  {
    id: "cat-chargers",
    name: "Chargers",
    slug: "chargers",
    description: "Original and fast-charging adapters for every brand",
    image: null,
  },
  {
    id: "cat-covers",
    name: "Covers",
    slug: "covers",
    description: "Back covers, flip cases and bumpers",
    image: null,
  },
  {
    id: "cat-protectors",
    name: "Protectors",
    slug: "protectors",
    description: "Tempered glass and hydrogel screen protection",
    image: null,
  },
  {
    id: "cat-handsfree",
    name: "Handsfree",
    slug: "handsfree",
    description: "Wired earphones with built-in microphone",
    image: null,
  },
  {
    id: "cat-airpods",
    name: "AirPods",
    slug: "airpods",
    description: "AirPods and wireless TWS earbuds",
    image: null,
  },
  {
    id: "cat-powerbanks",
    name: "Power Banks",
    slug: "power-banks",
    description: "10,000 to 30,000 mAh portable backup power",
    image: null,
  },
  {
    id: "cat-accessories",
    name: "Other Accessories",
    slug: "accessories",
    description: "Cables, holders, OTG adapters and memory cards",
    image: null,
  },
];

/**
 * Lookup by slug. Becomes a Firestore query in Phase 2:
 *     query(collection(db, "categories"), where("slug", "==", slug))
 * with the SAME name and the SAME return type - so callers never change.
 */
export function getCategoryBySlug(slug: string): Category | undefined {
  return categories.find((c) => c.slug === slug);
}
