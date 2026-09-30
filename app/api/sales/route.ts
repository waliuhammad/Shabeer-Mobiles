import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { isAdminConfigured } from "@/lib/firebase/admin";
import { getAdminDb } from "@/lib/firebase/admin-db";
import { verifySession } from "@/lib/auth/dal";
import { STOCK_TRACKING_ENABLED } from "@/lib/feature-flags";
import type { Invoice, InvoiceLine, POSPaymentMethod } from "@/types";

/**
 * Record a counter sale. THE trusted path.
 *
 * WHY THIS IS A SERVER ROUTE AND NOT A BROWSER WRITE
 * --------------------------------------------------
 * Three things have to be true of a sale, and a browser can guarantee
 * none of them:
 *
 *   1. THE COST SNAPSHOT MUST BE REAL. Gross profit is revenue minus
 *      what the goods actually cost. A cashier is forbidden from reading
 *      productCosts - that is the point of the rule - so a cashier's
 *      browser CANNOT stamp a truthful cost. It would write 0, and every
 *      sale would look like pure profit. The cost is looked up here,
 *      with the Admin SDK, where the rule does not apply.
 *
 *   2. THE TOTALS MUST BE RECOMPUTED. The browser sends which products
 *      and how many. It does NOT get to send the price or the total - a
 *      client that names its own total is a client that can charge zero.
 *      Prices come from the product documents.
 *
 *   3. STOCK AND THE SALE MUST MOVE TOGETHER. A sale that deducted no
 *      stock, or stock deducted for a sale that failed to save, both
 *      leave the ledger disagreeing with the shelf. Everything below
 *      happens inside one Firestore transaction.
 *
 * This is what "the browser is never trusted" has meant throughout the
 * project, finally enforced rather than described.
 */

interface SaleLineInput {
  productId: string;
  quantity: number;
}

/**
 * An OFF-CATALOGUE line: bought in from another shop for this customer.
 *
 * WHY THIS IS ALLOWED TO NAME ITS OWN PRICE AND COST, when rule 2 above
 * exists precisely to stop that.
 *
 * Rule 2 says the browser may not send a price because the price is
 * already known here - it is on the product document, and a client that
 * names its own total is a client that can charge zero. That reasoning
 * needs a product to appeal to. An off-catalogue item has none: there is
 * no document, no price, no cost, nowhere on the server to look. The
 * figures exist only in the head of whoever walked to the other shop and
 * paid them.
 *
 * So the choice is not "trusted server figure" against "untrusted client
 * figure". It is "typed figure, recorded and marked as typed" against
 * "cannot sell the item at all". The mitigations are:
 *
 *   - THE COST IS REQUIRED. A line arriving without one is refused
 *     rather than defaulted to 0, because 0 would quietly report the
 *     whole sale price as profit - the exact failure rule 1 guards
 *     against, arriving by a different door.
 *   - THE LINE IS MARKED. isCustom rides onto the invoice, so finance
 *     can always separate what was looked up from what was typed.
 *   - IT TOUCHES NO STOCK. No product document is read or written and
 *     no inventory row is created, so nothing off-catalogue can move
 *     the shelf count of something real.
 */
interface CustomLineInput {
  name: string;
  quantity: number;
  price: number;
  purchasePrice: number;
}

function isLineArray(v: unknown): v is SaleLineInput[] {
  return (
    Array.isArray(v) &&
    v.every(
      (l) =>
        typeof l === "object" &&
        l !== null &&
        typeof (l as SaleLineInput).productId === "string" &&
        Number.isInteger((l as SaleLineInput).quantity) &&
        (l as SaleLineInput).quantity > 0
    )
  );
}

/** Money must be a whole, finite, non-negative number of rupees. */
function isMoney(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v) && v >= 0;
}

function isCustomLineArray(v: unknown): v is CustomLineInput[] {
  return (
    Array.isArray(v) &&
    v.every((l) => {
      if (typeof l !== "object" || l === null) return false;
      const c = l as CustomLineInput;
      return (
        typeof c.name === "string" &&
        c.name.trim().length > 0 &&
        c.name.length <= 120 &&
        Number.isInteger(c.quantity) &&
        c.quantity > 0 &&
        isMoney(c.price) &&
        // Required, not optional. See the note above.
        isMoney(c.purchasePrice)
      );
    })
  );
}

export async function POST(request: Request) {
  if (!isAdminConfigured()) {
    return NextResponse.json({ error: "Server is not configured." }, { status: 503 });
  }

  // Only signed-in staff may ring up a sale. verifySession checks the
  // cookie's signature with the Admin SDK - a forged cookie fails here.
  const user = await verifySession();
  if (!user?.isStaff) {
    return NextResponse.json({ error: "Staff sign-in required." }, { status: 401 });
  }

  let body: {
    customerId?: unknown;
    items?: unknown;
    customItems?: unknown;
    discount?: unknown;
    paidAmount?: unknown;
    paymentMethod?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const rawItems = body.items ?? [];
  const rawCustom = body.customItems ?? [];

  if (!isLineArray(rawItems)) {
    return NextResponse.json({ error: "Invalid product lines." }, { status: 400 });
  }
  if (!isCustomLineArray(rawCustom)) {
    return NextResponse.json(
      {
        error:
          "An off-catalogue item needs a name, a quantity, a price and what the shop paid for it.",
      },
      { status: 400 }
    );
  }
  if (rawItems.length === 0 && rawCustom.length === 0) {
    return NextResponse.json({ error: "Add at least one product." }, { status: 400 });
  }

  // Narrowed once here so the transaction below works with typed values
  // rather than re-proving them on every use.
  const requestedLines: SaleLineInput[] = rawItems;
  const requestedCustom: CustomLineInput[] = rawCustom;

  const customerId = typeof body.customerId === "string" ? body.customerId : "cus_walkin";
  const requestedDiscount =
    typeof body.discount === "number" && body.discount > 0 ? Math.round(body.discount) : 0;
  const requestedPaid =
    typeof body.paidAmount === "number" && body.paidAmount > 0 ? Math.round(body.paidAmount) : 0;
  const paymentMethod = (["cash", "card", "bank-transfer", "other"].includes(
    String(body.paymentMethod)
  )
    ? body.paymentMethod
    : "cash") as POSPaymentMethod;

  const db = getAdminDb();

  try {
    const invoice = await db.runTransaction(async (txn) => {
      // ---- read everything first; Firestore transactions require it ----
      const productRefs = requestedLines.map((l) =>
        db.collection("products").doc(l.productId)
      );
      const costRefs = requestedLines.map((l) =>
        db.collection("productCosts").doc(l.productId)
      );
      const counterRef = db.collection("counters").doc("invoices");

      /**
       * getAll() throws on an empty argument list, and an empty list is
       * not a hypothetical here: a bill made entirely of off-catalogue
       * items has no product refs at all, which is the commonest shape
       * this feature will take - someone fetched one part from another
       * shop and is selling just that.
       */
      const productSnaps = productRefs.length ? await txn.getAll(...productRefs) : [];
      const costSnaps = costRefs.length ? await txn.getAll(...costRefs) : [];
      const counterSnap = await txn.get(counterRef);

      const lines: InvoiceLine[] = [];
      const stockWrites: { ref: FirebaseFirestore.DocumentReference; newStock: number }[] = [];

      for (let i = 0; i < requestedLines.length; i++) {
        const input = requestedLines[i];
        const snap = productSnaps[i];
        if (!snap.exists) throw new Error(`Product ${input.productId} no longer exists.`);

        const p = (snap.data() ?? {}) as Record<string, unknown>;
        const stock = typeof p.stock === "number" ? p.stock : 0;

        /**
         * Stock is checked against the DATABASE, not against whatever
         * the till last saw. Two cashiers selling the last unit at the
         * same moment cannot both succeed.
         *
         * Skipped entirely when the shop does not count stock. This is
         * the check that would otherwise refuse a real sale on the
         * strength of a number nobody has been maintaining.
         */
        if (STOCK_TRACKING_ENABLED && input.quantity > stock) {
          throw new Error(
            `${p.name ?? input.productId}: only ${stock} in stock, ${input.quantity} requested.`
          );
        }

        // PRICE comes from the product, never from the request.
        const price = typeof p.price === "number" ? p.price : 0;
        // COST comes from the protected collection the cashier cannot read.
        const costData = (costSnaps[i].data() ?? {}) as Record<string, unknown>;
        const cost = typeof costData.cost === "number" ? costData.cost : 0;

        lines.push({
          productId: input.productId,
          name: typeof p.name === "string" ? p.name : "",
          sku: typeof p.sku === "string" ? p.sku : "",
          quantity: input.quantity,
          price,
          total: price * input.quantity,
          purchasePrice: cost,
        });

        stockWrites.push({ ref: productRefs[i], newStock: stock - input.quantity });
      }

      /**
       * Off-catalogue lines, appended after the catalogue ones.
       *
       * Rounded here rather than trusted as sent: the validator proved
       * the numbers are finite and non-negative, not that they are whole
       * rupees. Everything else in this file works in integers.
       *
       * No product is read, no stock is written and no stockWrites entry
       * is pushed - which is what keeps the loop below, that pairs lines
       * with stock writes by index, correct. Custom lines sit past the
       * end of that array on purpose.
       */
      for (const c of requestedCustom) {
        const price = Math.round(c.price);
        const quantity = Math.round(c.quantity);
        lines.push({
          // Empty, not synthetic. An id shaped like a product id is an
          // id something will eventually try to look up.
          productId: "",
          name: c.name.trim().slice(0, 120),
          sku: "",
          quantity,
          price,
          total: price * quantity,
          purchasePrice: Math.round(c.purchasePrice),
          isCustom: true,
        });
      }

      const subtotal = lines.reduce((sum, l) => sum + l.total, 0);
      const discount = Math.min(requestedDiscount, subtotal);
      const total = Math.max(0, subtotal - discount);
      const paidAmount = Math.min(requestedPaid, total);
      const dueAmount = total - paidAmount;
      const paymentStatus =
        total > 0 && paidAmount >= total ? "PAID" : paidAmount > 0 ? "PARTIAL" : "DUE";

      /**
       * INVOICE NUMBER FROM A COUNTER DOCUMENT, inside the transaction.
       *
       * The old client-side version read the highest number it could see
       * and added one. Two tills would both read the same number and both
       * claim it. A counter read and written in one transaction cannot
       * hand out the same number twice.
       */
      const nextSequence = (counterSnap.exists ? Number(counterSnap.data()?.value ?? 0) : 0) + 1;
      const invoiceNumber = `SM-INV-${String(nextSequence).padStart(4, "0")}`;
      const id = `inv_${String(nextSequence).padStart(4, "0")}`;
      const createdAt = new Date().toISOString();

      const customerSnap = await txn.get(db.collection("customers").doc(customerId));
      const customer = (customerSnap.data() ?? {}) as Record<string, unknown>;

      const record: Invoice = {
        id,
        invoiceNumber,
        customerId,
        // Snapshots: renaming a customer must not rewrite a handed-over receipt.
        customerName:
          typeof customer.name === "string" ? customer.name : "Walk-in Customer",
        customerPhone: typeof customer.phone === "string" ? customer.phone : "",
        items: lines,
        subtotal,
        discount,
        total,
        paidAmount,
        dueAmount,
        paymentMethod,
        paymentStatus,
        createdAt,
        cashierName: user.displayName ?? user.email ?? "Staff",
      };

      // ---- writes ----
      txn.set(counterRef, { value: nextSequence });
      txn.set(db.collection("invoices").doc(id), record);

      /**
       * Stock moves only for catalogue lines, and stockWrites has one
       * entry per catalogue line in the same order - so this walks that
       * array, not `lines`, which now also holds custom rows with no
       * stock behind them.
       *
       * The whole loop is skipped when stock is not counted: no
       * deduction and no ledger row. The invoice is still written above,
       * so revenue, profit and the customer's history are unaffected -
       * it is only the shelf count that stops moving, which is the point
       * of switching counting off.
       */
      for (let i = 0; STOCK_TRACKING_ENABLED && i < stockWrites.length; i++) {
        const line = lines[i];
        const write = stockWrites[i];
        txn.update(write.ref, { stock: write.newStock });
        // One ledger row per line, so "why did stock drop by 2?" always
        // has an answer, and it names the invoice.
        txn.set(db.collection("inventoryTransactions").doc(`${id}_${line.productId}`), {
          id: `${id}_${line.productId}`,
          productId: line.productId,
          productName: line.name,
          productSku: line.sku,
          type: "SALE_POS",
          quantity: -line.quantity,
          previousStock: write.newStock + line.quantity,
          newStock: write.newStock,
          referenceId: invoiceNumber,
          note: `Counter sale ${invoiceNumber}`,
          createdBy: record.cashierName,
          createdAt,
          serverAt: FieldValue.serverTimestamp(),
        });
      }

      return record;
    });

    return NextResponse.json({ invoice });
  } catch (error) {
    // Business failures (out of stock, missing product) are the caller's
    // to show, so the message is passed through. Anything unexpected
    // becomes a generic message rather than leaking internals.
    const message =
      error instanceof Error && error.message ? error.message : "Could not record the sale.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
