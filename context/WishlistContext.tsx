"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useIsHydrated } from "@/hooks/use-is-hydrated";
import type { WishlistIds } from "@/types";

const STORAGE_KEY = "shabbir-mobiles:wishlist:v1";

interface WishlistContextValue {
  /** Product ids, newest first. */
  ids: WishlistIds;
  count: number;
  isSaved: (productId: string) => boolean;
  /** Adds if absent, removes if present. What a heart button needs. */
  toggle: (productId: string) => void;
  remove: (productId: string) => void;
  clear: () => void;
  /** False on the server and during hydration. See CartContext for why. */
  isHydrated: boolean;
}

const WishlistContext = createContext<WishlistContextValue | null>(null);

function readStoredWishlist(): WishlistIds {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // The customer can hand-edit this string, so keep only plain strings
    // and drop any duplicates that crept in.
    return [...new Set(parsed.filter((id): id is string => typeof id === "string"))];
  } catch {
    return [];
  }
}

/* Same hydration technique as CartContext - see the long note there. */
export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [ids, setIds] = useState<WishlistIds>(readStoredWishlist);

  const isHydrated = useIsHydrated();

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    } catch {
      // Storage blocked or full - the wishlist still works for this session.
    }
  }, [ids]);

  const isSaved = useCallback(
    (productId: string) => ids.includes(productId),
    [ids]
  );

  const toggle = useCallback((productId: string) => {
    setIds((current) =>
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : // Newest first, so the most recently saved item is at the top.
          [productId, ...current]
    );
  }, []);

  const remove = useCallback((productId: string) => {
    setIds((current) => current.filter((id) => id !== productId));
  }, []);

  const clear = useCallback(() => setIds([]), []);

  const value = useMemo(
    () => ({
      ids,
      count: ids.length,
      isSaved,
      toggle,
      remove,
      clear,
      isHydrated,
    }),
    [ids, isSaved, toggle, remove, clear, isHydrated]
  );

  return (
    <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>
  );
}

export function useWishlist(): WishlistContextValue {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error("useWishlist must be used inside a <WishlistProvider>");
  }
  return context;
}
