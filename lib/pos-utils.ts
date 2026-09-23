import { getProductCost } from "@/data/product-costs";
import type {
  Invoice,
  InvoiceLine,
  POSPaymentMethod,
  POSPaymentStatus,
  POSCartItem,
  POSTotals,
  Product,
} from "@/types";

/* ==================================================================
   BILL ARITHMETIC

   Every number on the bill is DERIVED from three inputs: the lines, the
   discount and the paid amount. Nothing is stored twice.

   That is the whole reason this file exists. If the summary panel added
   up the lines itself, and the payment panel did its own subtraction, the
   two would eventually disagree - and on a till, disagreeing totals mean
   the customer is charged the wrong amount.
   ================================================================== */

/** Sum of price x quantity across every line. */
export function calculatePOSSubtotal(items: POSCartItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

/**
 * The discount that will actually be applied.
 *
 * Clamped at both ends: a negative discount would be a silent surcharge,
 * and a discount larger than the subtotal would make the total negative -
 * i.e. the shop paying the customer. Clamping here rather than in the
 * input means no caller can bypass it.
 */
export function calculatePOSDiscount(
  requestedDiscount: number,
  subtotal: number
): number {
  if (!Number.isFinite(requestedDiscount) || requestedDiscount <= 0) return 0;
  return Math.min(requestedDiscount, subtotal);
}

/** subtotal - discount. Never below zero. */
export function calculatePOSTotal(subtotal: number, discount: number): number {
  return Math.max(0, subtotal - discount);
}

/** total - paid. Never below zero; overpayment is rejected, not banked. */
export function calculatePOSDue(total: number, paidAmount: number): number {
  return Math.max(0, total - paidAmount);
}

/**
 * Payment status, DERIVED - never a field the cashier sets.
 *
 * A stored status can drift out of step with the numbers beside it. A
 * derived one cannot: change the paid amount and the badge follows.
 *
 * An empty bill reads DUE rather than PAID, because zero paid on zero
 * owed is not a completed sale.
 */
export function derivePaymentStatus(
  total: number,
  paidAmount: number
): POSPaymentStatus {
  if (total > 0 && paidAmount >= total) return "PAID";
  if (paidAmount > 0) return "PARTIAL";
  return "DUE";
}

/**
 * Everything the bill panel needs, in one pass.
 *
 * Call this once per render and read the fields. Components should never
 * recompute any of it.
 */
export function calculatePOSTotals(
  items: POSCartItem[],
  requestedDiscount: number,
  requestedPaidAmount: number
): POSTotals {
  const subtotal = calculatePOSSubtotal(items);
  const discount = calculatePOSDiscount(requestedDiscount, subtotal);
  const total = calculatePOSTotal(subtotal, discount);

  // Paid is clamped to the total: a till records what is owed and what is
  // settled, not change given. Overpayment is a validation error, not a
  // negative balance.
  const paidAmount = Math.min(Math.max(0, requestedPaidAmount), total);

  return {
    subtotal,
    discount,
    total,
    paidAmount,
    dueAmount: calculatePOSDue(total, paidAmount),
    paymentStatus: derivePaymentStatus(total, paidAmount),
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
  };
}

/* ==================================================================
   CONVERSIONS
   ================================================================== */

/**
 * Product -> POS line.
 *
 * ONE place builds a line, so every entry point - click, SKU search,
 * future barcode scan - produces an identically shaped item.
 *
 * Note which Product fields are copied and which are not. purchasePrice
 * is not on the Product interface at all (see types/product.ts), so it
 * cannot be copied here even by accident.
 */
export function productToPOSItem(product: Product, quantity = 1): POSCartItem {
  return {
    productId: product.id,
    name: product.name,
    sku: product.sku,
    image: product.images[0] ?? null,
    price: product.price,
    quantity,
    stock: product.stock,
  };
}

/** POS line -> frozen invoice line, with its total baked in. */
function posItemToInvoiceLine(item: POSCartItem): InvoiceLine {
  return {
    productId: item.productId,
    name: item.name,
    sku: item.sku,
    quantity: item.quantity,
    price: item.price,
    total: item.price * item.quantity,
    /**
     * THE COST SNAPSHOT, taken at the instant the bill is completed.
     *
     * Read from data/product-costs.ts HERE and then frozen onto the
     * invoice. Reading it later would be wrong: the invoice is a
     * historical document, so next month's supplier price rise must not
     * retroactively change what this sale cost.
     *
     * The cashier never sees this value - POSCartItem has no cost field,
     * so it is not in the terminal's state and cannot reach the screen
     * or the printed receipt. It is stamped on during invoice creation
     * only, for the admin finance pages.
     *
     * PHASE 2: the browser must not supply this at all. A Cloud Function
     * looks the cost up server-side when it writes the sale, because a
     * client that can name its own COGS can report any profit it likes.
     */
    purchasePrice: getProductCost(item.productId),
  };
}

/* ==================================================================
   INVOICE NUMBERS

   Mock only. A real invoice number must be issued by the SERVER, inside
   the same transaction that writes the invoice - most likely from a
   Firestore counter document.

   Two reasons the browser cannot do it:
     - two cashiers on two tills would generate the same number in the
       same second, and an invoice number must be unique
     - a number the browser chose is a number a customer could choose
   ================================================================== */

const INVOICE_PREFIX = "SM-INV";

/** SM-INV-0007 */
export function formatInvoiceNumber(sequence: number): string {
  return `${INVOICE_PREFIX}-${String(sequence).padStart(4, "0")}`;
}

/** Reads the sequence back out of a formatted number. 0 if unparseable. */
export function parseInvoiceSequence(invoiceNumber: string): number {
  const digits = invoiceNumber.replace(/\D/g, "");
  const parsed = Number.parseInt(digits, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

/* ==================================================================
   VALIDATION

   Courtesy checks, not security. See the note at the bottom of the file.
   ================================================================== */

export interface POSValidationResult {
  ok: boolean;
  errors: string[];
}

export function validateBill(
  items: POSCartItem[],
  customerName: string,
  totals: POSTotals,
  requestedDiscount: number,
  requestedPaidAmount: number
): POSValidationResult {
  const errors: string[] = [];

  if (items.length === 0) {
    errors.push("Add at least one product to the bill.");
  }

  if (!customerName.trim()) {
    errors.push("Select a customer, or use Walk-in Customer.");
  }

  // Every line must still be fulfillable from the stock we last saw.
  for (const item of items) {
    if (item.quantity < 1) {
      errors.push(`${item.name}: quantity must be at least 1.`);
    }
    if (item.quantity > item.stock) {
      errors.push(
        `${item.name}: only ${item.stock} ${
          item.stock === 1 ? "unit is" : "units are"
        } available.`
      );
    }
  }

  if (requestedDiscount < 0) {
    errors.push("Discount cannot be negative.");
  }
  if (requestedDiscount > totals.subtotal) {
    errors.push("Discount cannot be more than the subtotal.");
  }

  if (requestedPaidAmount < 0) {
    errors.push("Paid amount cannot be negative.");
  }
  if (requestedPaidAmount > totals.total) {
    errors.push("Paid amount cannot be more than the total.");
  }

  return { ok: errors.length === 0, errors };
}

/* ==================================================================
   BUILDING THE MOCK INVOICE
   ================================================================== */

export function buildInvoice(params: {
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  items: POSCartItem[];
  totals: POSTotals;
  paymentMethod: POSPaymentMethod;
  cashierName: string;
}): Invoice {
  const {
    invoiceNumber,
    customerId,
    customerName,
    customerPhone,
    items,
    totals,
    paymentMethod,
    cashierName,
  } = params;

  return {
    id: `inv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    invoiceNumber,
    customerId,
    customerName,
    customerPhone,
    items: items.map(posItemToInvoiceLine),
    subtotal: totals.subtotal,
    discount: totals.discount,
    total: totals.total,
    paidAmount: totals.paidAmount,
    dueAmount: totals.dueAmount,
    paymentMethod,
    paymentStatus: totals.paymentStatus,
    createdAt: new Date().toISOString(),
    cashierName,
  };
}

export const PAYMENT_METHOD_LABELS: Record<POSPaymentMethod, string> = {
  cash: "Cash",
  card: "Card",
  "bank-transfer": "Bank Transfer",
  other: "Other",
};

export const PAYMENT_STATUS_STYLES: Record<
  POSPaymentStatus,
  { label: string; className: string }
> = {
  PAID: { label: "Paid", className: "bg-success/10 text-success" },
  PARTIAL: { label: "Partial", className: "bg-warning/15 text-gold-deep" },
  DUE: { label: "Due", className: "bg-destructive/10 text-destructive" },
};

/* ==================================================================
   WHAT "SAVE BILL" WILL ACTUALLY DO

   Today: buildInvoice() runs in the browser and the result goes into
   React state. Nothing leaves the tab. Crucially, NO STOCK CHANGES -
   data/products.ts is not mutated, because inventory movements are Step 4
   and they belong to the server anyway.

   In production, pressing Save Bill sends only this:

       { customerId | customer, paymentMethod, paidAmount, discount,
         items: [{ productId, quantity }] }

   Note what is NOT sent: prices, the subtotal, the total. The browser's
   copies are display values, and a customer can edit them in DevTools.

   A Cloud Function then does all of this inside ONE transaction:

       cashier -> POS UI -> trusted sale service
            re-read each product's CURRENT price      (not the browser's)
            re-read each product's CURRENT stock      (not the browser's)
            re-read each product's purchase cost      (never sent to the browser)
            reject if any line cannot be fulfilled
            compute subtotal, discount and total server-side
            issue the invoice number from a counter
            write the invoice
            write a SALE, capturing cost-at-time-of-sale for COGS
            write an INVENTORY TRANSACTION per line
            decrease stock atomically
            write a PAYMENT record
            write an ACTIVITY LOG entry
        -> return the finished invoice -> show and print

   The transaction is the point. Two cashiers selling the last unit at the
   same moment is a real thing in a busy shop, and only the database can
   arbitrate it. Every check in this file runs on a snapshot the browser
   fetched earlier, so every check in this file can be stale.
   ================================================================== */
