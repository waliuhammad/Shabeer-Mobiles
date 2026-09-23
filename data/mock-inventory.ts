import type { InventoryTransaction } from "@/types";

/**
 * The opening inventory ledger - deliberately empty.
 *
 * WHY THERE IS NO STARTING STOCK
 * ------------------------------
 * Every product in data/products.ts starts at stock 0, and this ledger
 * starts with no movements. That is not an oversight: it is the only
 * honest starting position for a real shop.
 *
 * Stock is not a number somebody types in. It is the running total of
 * recorded movements - goods received from a supplier, a sale at the
 * counter, a stock-take correction. If the app shipped with invented
 * opening balances, the very first figure on the inventory page would
 * already disagree with what is physically on the shelf, and nothing
 * afterwards could reconcile it.
 *
 * So stock arrives one of two ways, both of which leave a trace:
 *
 *   1. RECEIVE A PURCHASE  - /admin/purchases, which records what was
 *      bought, from whom, and at what cost. This also sets the cost
 *      used later for COGS.
 *   2. ADJUST MANUALLY     - /admin/inventory, for an opening count,
 *      breakage or a correction. Requires a reason.
 *
 * Both routes go through applyStockChange() in lib/inventory-utils.ts,
 * which is the single place stock may change. That is what keeps the
 * ledger and the shelf in agreement.
 *
 * PHASE 2: this file disappears and the ledger becomes the Firestore
 * collection `inventoryTransactions`, append-only and server-written -
 * a browser that could write a movement could conjure stock from
 * nothing.
 */
export const seedInventoryTransactions: InventoryTransaction[] = [];
