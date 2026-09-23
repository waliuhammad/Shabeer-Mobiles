"use client";

import { CategoryIcon } from "@/components/categories/CategoryIcon";
import { cn } from "@/lib/utils";
import type { Category, Product } from "@/types";

interface CategoryFilterProps {
  categories: Category[];
  /** Used to compute the count beside each category. */
  products: Product[];
  /** Currently selected slug, or "all". */
  activeSlug: string;
  /** Called with the new slug. The PARENT owns the state; this reports. */
  onSelect: (slug: string) => void;
}

/**
 * A "controlled component": it has no useState. It renders whatever
 * activeSlug says and reports clicks upward through onSelect.
 *
 * That is deliberate. If this component owned the selection, the desktop
 * sidebar and the mobile drawer would each have their OWN copy and they
 * would disagree. One state in the parent, two renderings - they cannot
 * drift.
 */
export function CategoryFilter({
  categories,
  products,
  activeSlug,
  onSelect,
}: CategoryFilterProps) {
  const countFor = (slug: string) =>
    slug === "all"
      ? products.length
      : products.filter((p) => p.categorySlug === slug).length;

  // "All" is prepended here rather than living in data/categories.ts,
  // because it is a UI affordance, not a real category.
  const options = [
    { id: "all", name: "All Products", slug: "all" },
    ...categories,
  ];

  return (
    <nav aria-label="Filter by category">
      <h2 className="mb-3 font-heading text-sm font-semibold uppercase tracking-wider text-primary">
        Categories
      </h2>

      <ul className="space-y-1">
        {options.map((option) => {
          const isActive = option.slug === activeSlug;
          const count = countFor(option.slug);

          return (
            <li key={option.id}>
              <button
                type="button"
                onClick={() => onSelect(option.slug)}
                // Tells screen readers which filter is applied.
                aria-current={isActive ? "true" : undefined}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                  isActive
                    ? "bg-primary font-semibold text-primary-foreground"
                    : "text-foreground hover:bg-muted"
                )}
              >
                <CategoryIcon
                  slug={option.slug}
                  className={cn(
                    "size-4 shrink-0",
                    isActive ? "text-accent" : "text-secondary"
                  )}
                />
                <span className="flex-1 truncate">{option.name}</span>
                <span
                  className={cn(
                    "text-xs tabular-nums",
                    isActive ? "text-primary-foreground/70" : "text-muted-foreground"
                  )}
                >
                  {count}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
