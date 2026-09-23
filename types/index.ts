/**
 * Barrel file.
 *
 * Re-exports every domain type so the rest of the app imports from one path:
 *     import type { Product, CartItem, Order } from "@/types";
 *
 * One line per domain file, and no consumer's import ever changes.
 */
export * from "./product";
export * from "./cart";
export * from "./wishlist";
export * from "./checkout";
export * from "./order";
export * from "./admin";
export * from "./pos";
export * from "./inventory";
export * from "./supplier";
export * from "./purchase";
export * from "./customer";
export * from "./expense";
export * from "./finance";
export * from "./catalog";
export * from "./settings";
export * from "./auth";
