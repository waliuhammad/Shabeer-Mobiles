#!/usr/bin/env node
/**
 * Prove an off-catalogue line records correctly.
 *
 *   node scripts/verify-custom-line.mjs http://localhost:3133
 *
 * WHAT IT IS ACTUALLY CHECKING, and why each one earns its place:
 *
 *   1. The sale is REFUSED without a cost. A line that reached the books
 *      with cost 0 would report its whole sale price as profit, which is
 *      the exact failure the server-side cost lookup exists to prevent.
 *   2. It is ACCEPTED with one, and the invoice carries isCustom.
 *   3. Gross profit is price - cost, not price. This is the number the
 *      shop makes decisions on.
 *   4. NO STOCK MOVED. An off-catalogue item has no product document;
 *      if anything on the shelf changed, something looked up the wrong
 *      row.
 *   5. No inventory ledger row was written for it, for the same reason.
 *
 * It signs in as the throwaway staff account, so run
 * `node scripts/temp-staff.mjs create` first.
 */

import { readFileSync } from "node:fs";
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const BASE = process.argv[2] ?? "http://localhost:3133";
const EMAIL = "temp-verify-bot@shabbir-mobiles.invalid";
const PASSWORD = "TempVerify!2026";

function loadEnv() {
  const text = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!(k in process.env)) process.env[k] = v;
  }
}
loadEnv();

initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: (process.env.FIREBASE_ADMIN_PRIVATE_KEY ?? "")
      .replace(/^["']|["']$/g, "")
      .replace(/\\n/g, "\n"),
  }),
});
const db = getFirestore();

/* ---- sign in through the real login page, to get a real session ---- */
const key = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const signIn = await fetch(
  `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${key}`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD, returnSecureToken: true }),
  }
).then((r) => r.json());

if (!signIn.idToken) {
  console.error("Could not sign in. Run: node scripts/temp-staff.mjs create");
  console.error(signIn.error?.message ?? signIn);
  process.exit(1);
}

const sessionRes = await fetch(`${BASE}/api/auth/session`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ idToken: signIn.idToken }),
});
const cookie = (sessionRes.headers.getSetCookie?.() ?? [])
  .map((c) => c.split(";")[0])
  .join("; ");
if (!cookie) {
  console.error(`No session cookie from /api/auth/session (HTTP ${sessionRes.status}).`);
  process.exit(1);
}
console.log("signed in\n");

const post = (body) =>
  fetch(`${BASE}/api/sales`, {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie },
    body: JSON.stringify(body),
  });

let failed = false;
const check = (label, pass, detail) => {
  console.log(`${pass ? "PASS" : "FAIL"}  ${label}${detail ? ` - ${detail}` : ""}`);
  if (!pass) failed = true;
};

/* ---- 1. refused without a cost ---- */
const noCost = await post({
  customerId: "cus_walkin",
  items: [],
  customItems: [{ name: "Oppo A16 back glass", quantity: 1, price: 1200 }],
  paidAmount: 1200,
  paymentMethod: "cash",
});
const noCostBody = await noCost.json();
check(
  "refused when the cost is missing",
  noCost.status === 400 && !noCostBody.invoice,
  `HTTP ${noCost.status}`
);

/* ---- 2 & 3. accepted with one, and the profit is right ---- */
const PRICE = 1200;
const COST = 850;
const QTY = 2;

const before = await db.collection("products").get();
const stockBefore = new Map(before.docs.map((d) => [d.id, d.data().stock ?? 0]));

const res = await post({
  customerId: "cus_walkin",
  items: [],
  customItems: [
    { name: "Oppo A16 back glass", quantity: QTY, price: PRICE, purchasePrice: COST },
  ],
  paidAmount: PRICE * QTY,
  paymentMethod: "cash",
});
const body = await res.json();
const invoice = body.invoice;

check("accepted with a cost", res.ok && !!invoice, body.error ?? `HTTP ${res.status}`);
if (!invoice) {
  console.log("\nFAIL");
  process.exit(1);
}

const line = invoice.items[0];
check("line is marked isCustom", line?.isCustom === true, String(line?.isCustom));
check("productId is empty, not synthetic", line?.productId === "", JSON.stringify(line?.productId));
check("price is what was sent", line?.price === PRICE, String(line?.price));
check("cost is what was sent", line?.purchasePrice === COST, String(line?.purchasePrice));
check("line total is price x quantity", line?.total === PRICE * QTY, String(line?.total));
check("invoice total is right", invoice.total === PRICE * QTY, String(invoice.total));

const grossProfit = (line.price - line.purchasePrice) * line.quantity;
check(
  "gross profit is price minus cost, not price",
  grossProfit === (PRICE - COST) * QTY,
  `Rs ${grossProfit} (not Rs ${PRICE * QTY})`
);

/* ---- 4. nothing on the shelf moved ---- */
const after = await db.collection("products").get();
const moved = after.docs
  .filter((d) => (d.data().stock ?? 0) !== stockBefore.get(d.id))
  .map((d) => `${d.id}: ${stockBefore.get(d.id)} -> ${d.data().stock}`);
check("no product stock changed", moved.length === 0, moved.join(", ") || "none");

/* ---- 5. no ledger row for it ---- */
const ledger = await db
  .collection("inventoryTransactions")
  .where("referenceId", "==", invoice.invoiceNumber)
  .get();
check(
  "no inventory row written for an off-catalogue line",
  ledger.empty,
  `${ledger.size} row(s)`
);

/* ---- tidy up: this was a real invoice against a real counter ---- */
await db.collection("invoices").doc(invoice.id).delete();
console.log(`\ncleaned up ${invoice.invoiceNumber}`);

console.log(failed ? "\nFAIL" : "\nPASS - off-catalogue lines record correctly.");
process.exit(failed ? 1 : 0);
