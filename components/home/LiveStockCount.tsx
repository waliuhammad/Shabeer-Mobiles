"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { getDb } from "@/lib/firebase/firestore";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import { COLLECTIONS } from "@/lib/firebase/firestore";

interface LiveStockCountProps {
  /**
   * The figure rendered on the server, from the same Firestore data.
   *
   * This is what a visitor sees before any JavaScript runs, what a
   * crawler reads, and what shows if the subscription never connects.
   * It is never a guess - just a snapshot taken a moment earlier.
   */
  initial: number;
}

/**
 * The hero's stock figure, kept live.
 *
 * WHY A SUBSCRIPTION AND NOT JUST THE SERVER NUMBER
 * -------------------------------------------------
 * The page is cached and revalidated once a minute, so the
 * server-rendered figure can be up to a minute old. That is fine for a
 * price; it is less good for a number a customer might be reading while
 * deciding whether to travel. This keeps it current to the second
 * without the page reloading.
 *
 * WHAT IT COSTS, since a public page paying for anything deserves a
 * reason: one Firestore listener per visitor over eleven product
 * documents, which the security rules already allow anyone to read -
 * the storefront shows those products and their stock on every card.
 * The Firebase SDK is already in this bundle, shared across routes, so
 * no extra JavaScript is downloaded for it.
 *
 * IT NEVER SHOWS A WORSE NUMBER THAN THE SERVER GAVE. If Firebase is
 * not configured, or the listener is refused, or it simply never
 * connects, the initial value stands.
 */
export function LiveStockCount({ initial }: LiveStockCountProps) {
  const [units, setUnits] = useState(initial);

  // Computed during render, not in an effect: whether a subscription is
  // possible at all is knowable immediately.
  const canSubscribe = isFirebaseConfigured();

  const constraints = useMemo(() => [where("status", "==", "active")], []);

  useEffect(() => {
    if (!canSubscribe) return;

    let live = true;
    const q = query(collection(getDb(), COLLECTIONS.products), ...constraints);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!live) return;
        let total = 0;
        for (const doc of snapshot.docs) {
          const stock = doc.data().stock;
          // Negative stock is a data error, not a negative quantity of
          // shelf - it must not subtract from the total on show.
          if (typeof stock === "number" && stock > 0) total += stock;
        }
        setUnits(total);
      },
      () => {
        // Refused or offline. The server's figure is already on screen
        // and stays there; a public page should not announce a
        // subscription problem to a customer.
      }
    );

    return () => {
      live = false;
      unsubscribe();
    };
  }, [canSubscribe, constraints]);

  if (units <= 0) return null;

  return (
    <div className="absolute -bottom-3 -left-1 rounded-xl bg-background p-3 shadow-xl sm:-left-3 sm:p-4">
      <p className="font-heading text-xl font-bold text-primary sm:text-2xl">
        {units.toLocaleString("en-GB")}
      </p>
      <p className="text-[11px] text-muted-foreground">Items in stock</p>
    </div>
  );
}
