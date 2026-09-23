import type { Supplier } from "@/types";

/**
 * Demo suppliers.
 *
 * Obviously fictional businesses with placeholder contact details - no
 * real company, person or phone number is used. The 03xx format is kept
 * so the search-by-phone filter is exercised realistically.
 *
 * PHASE 2: becomes the Firestore collection `suppliers/{supplierId}`,
 * readable by SUPER_ADMIN and MANAGER only. A cashier has no business
 * seeing what the shop pays its wholesalers.
 */
export const mockSuppliers: Supplier[] = [
  // Cleared. Real records are entered through the admin panel.
];
