import { ORDER_STATUS_CONFIG, PAYMENT_STATUS_CONFIG } from "@/lib/order-status";
import { countOrderItems } from "@/lib/order-utils";
import { PAYMENT_STATUS_STYLES } from "@/lib/pos-utils";
import type {
  Customer,
  Invoice,
  CustomerStats,
  CustomerStatus,
  CustomerTransaction,
  Order,
} from "@/types";
import { WALK_IN_CUSTOMER_ID } from "@/types";

/* ==================================================================
   DISPLAY
   ================================================================== */

export const CUSTOMER_STATUS_CONFIG: Record<
  CustomerStatus,
  { label: string; badgeClass: string }
> = {
  ACTIVE: { label: "Active", badgeClass: "bg-success/10 text-success" },
  INACTIVE: { label: "Inactive", badgeClass: "bg-muted text-muted-foreground" },
};

/** The walk-in record is a system row, not a person - it must not be
 *  edited, deactivated, or counted in "how many customers do we have". */
export function isSystemCustomer(customer: Customer): boolean {
  return customer.id === WALK_IN_CUSTOMER_ID;
}

/* ==================================================================
   SEARCH

   Case-insensitive, whitespace-trimmed, and phone matching ignores
   spaces so "03001234567" finds "0300 1234567" - people type it both
   ways, and a cashier searching for a customer at the counter is in a
   hurry.
   ================================================================== */

export function searchCustomers(
  customers: Customer[],
  query: string,
  status: CustomerStatus | "all" = "all"
): Customer[] {
  const q = query.trim().toLowerCase();

  return customers.filter((c) => {
    if (status !== "all" && c.status !== status) return false;
    if (!q) return true;

    const phoneDigits = c.phone.replace(/\s/g, "").toLowerCase();

    return (
      c.name.toLowerCase().includes(q) ||
      c.phone.toLowerCase().includes(q) ||
      phoneDigits.includes(q.replace(/\s/g, "")) ||
      c.email.toLowerCase().includes(q)
    );
  });
}

/* ==================================================================
   STATISTICS

   All DERIVED from the transactions themselves. Nothing is stored on
   the customer record, so a figure can never disagree with the rows
   behind it.

   TOTAL SPENT uses each transaction's OWN historical total, never a
   recalculation from current product prices. If the iPhone 12 was
   Rs 28,999 when they bought it, that is what they spent - even after
   the shop reprices it. Otherwise last year's customer value would
   change every time somebody edited a price.
   ================================================================== */

/**
 * Cancelled orders are excluded from every count and total.
 *
 * The customer did not buy that - they changed their mind before it
 * shipped. Counting it would inflate both their transaction count and
 * their lifetime value with money that never changed hands.
 *
 * A RETURNED order is kept: it did happen, was delivered, and came
 * back. That is a different fact, and hiding it would make the history
 * misleading.
 */
function countsAsPurchase(order: Order): boolean {
  return order.status !== "cancelled";
}

export function calculateCustomerStats(
  customerId: string,
  orders: Order[],
  invoices: Invoice[]
): CustomerStats {
  const theirOrders = orders.filter(
    (o) => o.customerId === customerId && countsAsPurchase(o)
  );
  // Real counter sales, not the dashboard's demo rows. Since Step 8 a
  // completed bill is a persisted Invoice, so this reads the same source
  // /admin/revenue does - one set of counter sales, not two.
  const theirSales = invoices.filter((i) => i.customerId === customerId);

  const orderSpend = theirOrders.reduce((sum, o) => sum + o.total, 0);
  const saleSpend = theirSales.reduce((sum, i) => sum + i.total, 0);

  // Across BOTH channels - the last thing they bought, wherever they
  // bought it.
  const lastPurchaseAt = [
    ...theirOrders.map((o) => o.placedAt),
    ...theirSales.map((i) => i.createdAt),
  ]
    .sort()
    .at(-1);

  const totalTransactions = theirOrders.length + theirSales.length;

  return {
    orderCount: theirOrders.length,
    posSaleCount: theirSales.length,
    totalTransactions,
    totalSpent: orderSpend + saleSpend,
    lastPurchaseAt: lastPurchaseAt ?? null,
    // DERIVED, never a stored flag: two or more purchases makes a
    // repeat customer, and it recomputes the moment one is added.
    isRepeat: totalTransactions >= 2,
  };
}

/* ==================================================================
   UNIFIED PURCHASE HISTORY

   Online orders and counter sales are different entities with
   different shapes. Rather than forcing one model onto both, they are
   mapped into a small shared view so one table can show a customer's
   complete history across both channels - which is the entire reason
   for having one customer record.
   ================================================================== */

export function getCustomerTransactions(
  customerId: string,
  orders: Order[],
  invoices: Invoice[]
): CustomerTransaction[] {
  const fromOrders: CustomerTransaction[] = orders
    .filter((o) => o.customerId === customerId)
    .map((o) => ({
      reference: o.orderNumber,
      kind: "ONLINE_ORDER",
      at: o.placedAt,
      itemCount: countOrderItems(o),
      total: o.total,
      statusLabel: ORDER_STATUS_CONFIG[o.status].label,
      statusClass: ORDER_STATUS_CONFIG[o.status].badgeClass,
      paymentLabel: PAYMENT_STATUS_CONFIG[o.paymentStatus].label,
      paymentClass: PAYMENT_STATUS_CONFIG[o.paymentStatus].badgeClass,
      href: `/admin/orders/${o.orderNumber}`,
    }));

  const fromSales: CustomerTransaction[] = invoices
    .filter((i) => i.customerId === customerId)
    .map((i) => ({
      reference: i.invoiceNumber,
      kind: "POS_SALE",
      // A real timestamp now, so counter sales interleave correctly with
      // online orders instead of sorting to the bottom.
      at: i.createdAt,
      itemCount: i.items.reduce((n, line) => n + line.quantity, 0),
      total: i.total,
      statusLabel: "Completed",
      statusClass: "bg-success/10 text-success",
      paymentLabel: PAYMENT_STATUS_STYLES[i.paymentStatus].label,
      paymentClass: PAYMENT_STATUS_STYLES[i.paymentStatus].className,
      // Counter invoices have no detail route yet. Null renders a
      // disabled action rather than a link to nowhere.
      href: null,
    }));

  return [...fromOrders, ...fromSales].sort((a, b) => b.at.localeCompare(a.at));
}

/* ==================================================================
   SUMMARY FOR THE LIST PAGE
   ================================================================== */

export interface CustomerListSummary {
  total: number;
  active: number;
  newThisMonth: number;
  repeat: number;
}

export function calculateCustomerSummary(
  customers: Customer[],
  orders: Order[],
  invoices: Invoice[]
): CustomerListSummary {
  // The walk-in row is a system record, not a person, so it is excluded
  // from every headline figure.
  const people = customers.filter((c) => !isSystemCustomer(c));
  const now = new Date();

  return {
    total: people.length,
    active: people.filter((c) => c.status === "ACTIVE").length,
    newThisMonth: people.filter((c) => {
      const created = new Date(c.createdAt);
      return (
        created.getMonth() === now.getMonth() &&
        created.getFullYear() === now.getFullYear()
      );
    }).length,
    repeat: people.filter(
      (c) => calculateCustomerStats(c.id, orders, invoices).isRepeat
    ).length,
  };
}

/* ==================================================================
   VALIDATION
   ================================================================== */

export interface CustomerErrors {
  name?: string;
  phone?: string;
  email?: string;
}

/**
 * Name and phone required; email optional but validated when given.
 *
 * Phone is required because it is how a shop actually reaches somebody -
 * more reliably than email, and it is the field the POS searches by.
 */
export function validateCustomer(
  data: { name: string; phone: string; email: string },
  isValidPhone: (v: string) => boolean,
  isValidEmail: (v: string) => boolean
): CustomerErrors {
  const errors: CustomerErrors = {};

  if (data.name.trim().length < 2) {
    errors.name = "Customer name is required.";
  }
  if (!data.phone.trim()) {
    errors.phone = "Phone number is required.";
  } else if (!isValidPhone(data.phone)) {
    errors.phone = "Enter a valid mobile number, e.g. 0300 1234567.";
  }
  if (data.email.trim() && !isValidEmail(data.email.trim())) {
    errors.email = "That email address does not look right.";
  }

  return errors;
}

/* ==================================================================
   WHAT THIS BECOMES

   Today these functions read arrays from data/*.ts. In Phase 2 the
   same names and return types read Firestore:

       customers/{customerId}
       orders/{orderId}          where customerId == ...
       invoices/{invoiceId}      where customerId == ...

   Auth maps in above them:

       Firebase Auth UID  ->  customers/{customerId}

   so a signed-in shopper sees exactly their own orders, enforced by a
   Security Rule rather than by the UI. A customer must never be able to
   read another customer's record by guessing an id - which is precisely
   what the current mock DOES allow, and why none of this is security
   until the rules exist.
   ================================================================== */
