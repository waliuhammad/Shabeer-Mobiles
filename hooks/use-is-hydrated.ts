"use client";

import { useSyncExternalStore } from "react";

/* ------------------------------------------------------------------
   WHY THIS EXISTS

   A React app renders twice: once on the SERVER to produce HTML, then
   again in the BROWSER to attach event handlers (hydration). Anything the
   server cannot see - localStorage, in our case - would make those two
   renders differ, and React reports a hydration mismatch.

   useSyncExternalStore is React's official way to read a value that
   legitimately differs between server and client:

     - getServerSnapshot (the third argument) is used while rendering on
       the server AND while hydrating, so it returns false.
     - getSnapshot is used for every render after hydration, so it
       returns true.

   React handles the switch itself. That is why this needs no useEffect and
   no setState, and why it can never produce a mismatch warning.

   `subscribe` is a no-op because this value changes exactly once, and all
   three functions live at module level so their identity is stable - an
   inline arrow would resubscribe on every render.
   ------------------------------------------------------------------ */

const noopSubscribe = () => () => {};
const getHydratedSnapshot = () => true;
const getServerSnapshot = () => false;

/**
 * False on the server and during hydration, true from the first
 * browser-only render onward.
 *
 * Gate any UI that reads browser-only state on this, so the hydration
 * render produces exactly the markup the server sent.
 */
export function useIsHydrated(): boolean {
  return useSyncExternalStore(noopSubscribe, getHydratedSnapshot, getServerSnapshot);
}
