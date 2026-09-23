"use client";

import { useEffect, useMemo, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  type QueryConstraint,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase/firestore";
import { isFirebaseConfigured } from "@/lib/firebase/client";

/**
 * THE real-time collection subscription.
 *
 * WHY onSnapshot AND NOT getDocs
 * ------------------------------
 * getDocs answers "what is there right now" and then goes quiet.
 * onSnapshot keeps a live connection: when the counter rings up a sale,
 * the owner's laptop redraws without refreshing, and two people editing
 * the same stock cannot silently overwrite each other's view.
 *
 * That is the whole reason this app moved off localStorage. localStorage
 * is not a database - it is one browser's private scratchpad, and the
 * shop machine and the owner's laptop never saw the same numbers.
 *
 * FIRST PAINT IS FROM CACHE. The Firestore SDK keeps a local copy, so a
 * reconnecting browser renders instantly from cache and then corrects
 * itself when the server responds. `loading` is true only until the
 * first of those arrives.
 *
 * ERRORS ARE EXPECTED, NOT EXCEPTIONAL. A signed-out user, or a cashier
 * reading a collection their role forbids, gets permission-denied. That
 * is Security Rules working. It is surfaced rather than thrown, so the
 * UI can say "you do not have access" instead of crashing.
 */
export interface FirestoreCollectionState<T> {
  items: T[];
  loading: boolean;
  /** Human-readable. null when the subscription is healthy. */
  error: string | null;
}

interface Options {
  /**
   * Skip the subscription entirely. Used to avoid firing a query that is
   * certain to be refused - most collections require a signed-in user,
   * and an unauthenticated listener just fills the console with
   * permission-denied noise.
   */
  enabled?: boolean;
  constraints?: QueryConstraint[];
}

/** Shared so a disabled hook does not hand back a new array each render. */
const EMPTY: never[] = [];

export function useFirestoreCollection<T>(
  collectionName: string,
  mapDoc: (snapshot: QueryDocumentSnapshot) => T | null,
  options: Options = {}
): FirestoreCollectionState<T> {
  const { enabled = true, constraints } = options;

  /**
   * Whether a subscription should exist at all is decided during RENDER,
   * not in an effect. A disabled hook simply returns an empty, settled
   * state - there is nothing to synchronise, and setting state in an
   * effect for something already known is what the React Compiler lint
   * rule exists to catch.
   */
  const active = enabled && isFirebaseConfigured();

  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(active);
  const [error, setError] = useState<string | null>(null);

  // A stable key so a fresh array literal in the caller does not tear
  // down and rebuild the listener on every render.
  const constraintKey = useMemo(
    () => JSON.stringify(constraints?.map((c) => c.type) ?? []),
    [constraints]
  );

  useEffect(() => {
    if (!active) return;

    let live = true;
    const ref = collection(getDb(), collectionName);
    const q = constraints?.length ? query(ref, ...constraints) : query(ref);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!live) return;
        const next: T[] = [];
        for (const doc of snapshot.docs) {
          // A malformed document becomes a skipped row, not a crash
          // halfway down a render.
          const mapped = mapDoc(doc);
          if (mapped !== null) next.push(mapped);
        }
        setItems(next);
        setError(null);
        setLoading(false);
      },
      (err) => {
        if (!live) return;
        setError(
          err.code === "permission-denied"
            ? "You do not have permission to read this."
            : err.message
        );
        setLoading(false);
      }
    );

    return () => {
      live = false;
      unsubscribe();
    };
    // mapDoc is intentionally omitted: callers define it inline, so
    // including it would rebuild the listener on every render. The
    // collection name and the constraints are what actually identify
    // the query.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionName, active, constraintKey]);

  // A disabled hook reports an empty, settled state rather than the
  // stale contents of a previous subscription.
  if (!active) return { items: EMPTY, loading: false, error: null };

  return { items, loading, error };
}
