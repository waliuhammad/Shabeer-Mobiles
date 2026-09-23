import { DEMO_NOW } from "@/lib/demo-clock";
import { getMockCustomer } from "@/data/customers";
import { getProductById } from "@/data/products";
import type { Invoice, InvoiceLine, POSPaymentMethod, POSPaymentStatus } from "@/types";

/**
 * THE counter-sales dataset.
 *
 * WHY THIS FILE HAD TO EXIST
 * --------------------------
 * Until Step 8 a POS invoice lived only in POSTerminal's useState. That
 * was the right call for a bill in progress - a half-finished sale must
 * never survive a refresh - but it meant COMPLETED counter sales were
 * thrown away the moment the page reloaded. A shop that does most of
 * its trade over the counter would therefore have reported almost no
 * revenue, and /admin/revenue would have been an online-only report
 * pretending to be the whole business.
 *
 * So a finished bill now leaves the terminal and lands here, and the
 * ephemeral cart stays ephemeral. Those are two different lifetimes and
 * they now have two different homes.
 *
 * NOT A SECOND SALES DATABASE
 * ---------------------------
 * These are counter sales. data/orders.ts holds online sales. They do
 * not overlap - one invoice is one real transaction at the till, and no
 * order is ever copied in here. lib/finance-utils.ts reads both and is
 * the only thing that merges them.
 *
 * PHASE 2: becomes `invoices/{invoiceId}`, written by a trusted backend
 * that recalculates every total and stamps the cost snapshot itself -
 * because a browser must never be allowed to declare its own margins.
 */

const hoursAgo = (h: number) => new Date(DEMO_NOW - h * 3_600_000).toISOString();

/**
 * Cost per unit AT THE TIME of these counter sales.
 *
 * Deliberately different from data/product-costs.ts, which holds today's
 * cost. Keeping them apart is what proves the snapshot rule works: if
 * COGS ever moved when you edited product-costs.ts, this file would be
 * being ignored.
 */
const COST_AT_SALE: Record<string, number> = {
  "p-001": 23800,
  "p-002": 18500,
  "p-003": 15100,
  "p-004": 980,
  "p-005": 495,
  "p-006": 580,
  "p-007": 140,
  "p-008": 6350,
  "p-009": 2980,
  "p-010": 310,
  "p-011": 225,
};

interface SeedLine {
  productId: string;
  quantity: number;
  /** Unit price charged. Omit to use the product's list price. */
  price?: number;
}

interface SeedInvoice {
  sequence: number;
  customerId: string;
  hoursAgo: number;
  lines: SeedLine[];
  discount: number;
  /** Omit to mean "paid in full". */
  paidAmount?: number;
  paymentMethod: POSPaymentMethod;
  cashierName: string;
}

/**
 * Spread across roughly six weeks so the 7-day, 30-day and 12-month
 * ranges each have something real to show, and so a period filter can
 * be seen to actually exclude things.
 */
const SEED: SeedInvoice[] = [
  // Cleared. Real records are entered through the admin panel.
];

function derivePaymentStatus(total: number, paid: number): POSPaymentStatus {
  if (paid >= total) return "PAID";
  return paid <= 0 ? "DUE" : "PARTIAL";
}

function buildInvoices(): Invoice[] {
  return SEED.map((seed) => {
    const items: InvoiceLine[] = seed.lines.map((line) => {
      const product = getProductById(line.productId);
      const price = line.price ?? product?.price ?? 0;
      return {
        productId: line.productId,
        name: product?.name ?? line.productId,
        sku: product?.sku ?? "",
        quantity: line.quantity,
        price,
        total: price * line.quantity,
        // THE COST SNAPSHOT. Frozen here, never looked up later.
        purchasePrice: COST_AT_SALE[line.productId] ?? 0,
      };
    });

    const subtotal = items.reduce((sum, i) => sum + i.total, 0);
    const total = Math.max(0, subtotal - seed.discount);
    const paidAmount = seed.paidAmount ?? total;

    // The customer name and phone are SNAPSHOTS, read from the central
    // directory at seed time. After this they are frozen: renaming a
    // customer must not rewrite an invoice already handed over.
    const customer = getMockCustomer(seed.customerId);

    return {
      id: `inv_${String(seed.sequence).padStart(4, "0")}`,
      invoiceNumber: `SM-INV-${String(seed.sequence).padStart(4, "0")}`,
      customerId: seed.customerId,
      customerName: customer?.name ?? "Walk-in Customer",
      customerPhone: customer?.phone ?? "",
      items,
      subtotal,
      discount: seed.discount,
      total,
      paidAmount,
      dueAmount: Math.max(0, total - paidAmount),
      paymentMethod: seed.paymentMethod,
      paymentStatus: derivePaymentStatus(total, paidAmount),
      createdAt: hoursAgo(seed.hoursAgo),
      cashierName: seed.cashierName,
    };
  });
}

export const seedInvoices: Invoice[] = buildInvoices();

export function getSeedInvoice(invoiceNumber: string): Invoice | undefined {
  return seedInvoices.find((i) => i.invoiceNumber === invoiceNumber);
}

/** Highest seeded sequence, so new counter bills continue the numbering. */
export const LAST_SEEDED_INVOICE_SEQUENCE = SEED.length;
