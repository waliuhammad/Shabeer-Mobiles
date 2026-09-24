import { getFirestore, type Firestore } from "firebase/firestore";
import { getFirebaseApp } from "@/lib/firebase/client";

/**
 * THE browser Firestore instance.
 *
 * Every read and write through this is subject to firestore.rules, using
 * the signed-in user's token. That is the point: the admin panel writes
 * through here so the rules are genuinely exercised on every save, rather
 * than being a file nobody has ever run.
 *
 * Server-side reads use getAdminDb() instead - see lib/firebase/admin.ts
 * for why the two are kept apart.
 */
export function getDb(): Firestore {
  return getFirestore(getFirebaseApp());
}

/** Collection names in one place, so a typo cannot create a ghost collection. */
export const COLLECTIONS = {
  products: "products",
  categories: "categories",
  productCosts: "productCosts",
  customers: "customers",
  orders: "orders",
  invoices: "invoices",
  expenses: "expenses",
  suppliers: "suppliers",
  purchases: "purchases",
  inventory: "inventory",
  inventoryTransactions: "inventoryTransactions",
  settings: "settings",
  staff: "staff",
  messages: "messages",
} as const;
