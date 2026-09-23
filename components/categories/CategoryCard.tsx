import Link from "next/link";
import { CategoryIcon } from "@/components/categories/CategoryIcon";
import { cn } from "@/lib/utils";
import type { Category } from "@/types";

interface CategoryCardProps {
  category: Category;
  /** Optional count shown under the name. Omit to hide the line entirely. */
  productCount?: number;
  className?: string;
}

/**
 * A clickable category tile that NAVIGATES to the filtered shop.
 *
 * Contrast with components/shop/CategoryFilter.tsx, which renders buttons
 * that set state on the page you are already on. Link vs button is a real
 * distinction, not a styling choice.
 */
export function CategoryCard({ category, productCount, className }: CategoryCardProps) {
  return (
    <Link
      href={`/shop?category=${category.slug}`}
      className={cn(
        "group flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-5 text-center transition-all hover:-translate-y-0.5 hover:border-secondary/40 hover:shadow-md",
        className
      )}
    >
      <span className="flex size-12 items-center justify-center rounded-xl bg-cyan-soft text-secondary transition-colors group-hover:bg-primary group-hover:text-accent">
        <CategoryIcon slug={category.slug} className="size-6" />
      </span>

      <span className="text-sm font-semibold text-foreground">{category.name}</span>

      {productCount !== undefined && (
        <span className="text-[11px] text-muted-foreground">
          {productCount} {productCount === 1 ? "item" : "items"}
        </span>
      )}
    </Link>
  );
}
