"use client";

import {
  deleteDoc,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  writeBatch,
  type DocumentData,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase/firestore";

/**
 * Writes, from the browser, through Security Rules.
 *
 * WHY NOT THE ADMIN SDK
 * ---------------------
 * The Admin SDK would be easier - it bypasses every rule. That is
 * precisely why writes do not use it. A rule that is never evaluated is
 * a rule nobody knows is broken, and the whole point of firestore.rules
 * is that a cashier physically cannot write a product cost. Routing
 * admin writes through the client SDK means every save is a live test
 * of the rules.
 *
 * Server-side reads still use the Admin SDK - see
 * services/catalog.service.ts for why the two are kept apart.
 */

export class FirestoreWriteError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "FirestoreWriteError";
    this.code = code;
  }
}

/** Turns a Firestore error into something worth showing a person. */
function translate(error: unknown): FirestoreWriteError {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code: unknown }).code)
      : "unknown";

  if (code === "permission-denied") {
    return new FirestoreWriteError(
      code,
      "Your role does not allow this change. Security Rules refused it."
    );
  }
  if (code === "unavailable") {
    return new FirestoreWriteError(
      code,
      "Cannot reach the database. Check your connection - the change was not saved."
    );
  }
  if (code === "not-found") {
    return new FirestoreWriteError(code, "That record no longer exists.");
  }
  const message = error instanceof Error ? error.message : "The change could not be saved.";
  return new FirestoreWriteError(code, message);
}

/**
 * Firestore rejects `undefined` outright. An optional field left blank -
 * originalPrice, receivedAt - would otherwise fail the whole write with
 * a message that does not name the field.
 */
export function stripUndefined<T extends DocumentData>(data: T): DocumentData {
  return Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined));
}

/** Create or replace a document at a known id. */
export async function writeDoc(
  collectionName: string,
  id: string,
  data: DocumentData
): Promise<void> {
  try {
    await setDoc(doc(getDb(), collectionName, id), stripUndefined(data), { merge: true });
  } catch (error) {
    throw translate(error);
  }
}

/** Patch specific fields. Fails if the document is gone. */
export async function patchDoc(
  collectionName: string,
  id: string,
  data: DocumentData
): Promise<void> {
  try {
    await updateDoc(doc(getDb(), collectionName, id), stripUndefined(data));
  } catch (error) {
    throw translate(error);
  }
}

/**
 * Hard delete. Used ONLY for records with no history behind them - an
 * empty category, for instance. Products, customers, orders, invoices
 * and expenses are never deleted; they are archived, deactivated or
 * cancelled, because something else references them.
 */
export async function removeDoc(collectionName: string, id: string): Promise<void> {
  try {
    await deleteDoc(doc(getDb(), collectionName, id));
  } catch (error) {
    throw translate(error);
  }
}

export async function readDoc(
  collectionName: string,
  id: string
): Promise<DocumentData | null> {
  try {
    const snap = await getDoc(doc(getDb(), collectionName, id));
    return snap.exists() ? snap.data() : null;
  } catch (error) {
    throw translate(error);
  }
}

/**
 * Several writes, all or nothing.
 *
 * Receiving a purchase has to add stock AND write a ledger row AND mark
 * the purchase received. Doing those as three separate writes means a
 * dropped connection can leave stock that no ledger row explains.
 */
export async function writeBatchDocs(
  operations: { collection: string; id: string; data: DocumentData }[]
): Promise<void> {
  try {
    const batch = writeBatch(getDb());
    for (const op of operations) {
      batch.set(doc(getDb(), op.collection, op.id), stripUndefined(op.data), { merge: true });
    }
    await batch.commit();
  } catch (error) {
    throw translate(error);
  }
}
