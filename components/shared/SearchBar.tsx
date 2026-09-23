"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchBarProps {
  className?: string;
  placeholder?: string;
  /** Close the mobile drawer after a search is submitted. */
  onSubmitted?: () => void;
}

/**
 * A client island: it reads what the user types (state) and pushes a route
 * on submit. Both are browser-only operations.
 */
export function SearchBar({
  className,
  placeholder = "Search mobiles, chargers, covers...",
  onSubmitted,
}: SearchBarProps) {
  const [query, setQuery] = useState("");
  const router = useRouter();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    // Search state lives in the URL, not in React state. That makes results
    // shareable, bookmarkable and back-button friendly - and lets the shop
    // page read it on the SERVER.
    router.push(`/shop?q=${encodeURIComponent(trimmed)}`);
    onSubmitted?.();
  }

  return (
    <form onSubmit={handleSubmit} role="search" className={cn("relative w-full", className)}>
      <label htmlFor="site-search" className="sr-only">
        Search products
      </label>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <input
        id="site-search"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-full border border-border bg-muted/60 pl-9 pr-4 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-secondary focus:bg-background focus:ring-2 focus:ring-ring/30"
      />
    </form>
  );
}
