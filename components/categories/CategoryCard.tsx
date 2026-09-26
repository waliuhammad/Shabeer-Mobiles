import Link from "next/link";
import Image from "next/image";
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
      {/*
        A PHOTO WHEN THE CATEGORY HAS ONE, the icon otherwise.
        
        Category documents have always carried an `image` field and
        nothing read it, so a picture could be set and never appear.
        Both branches keep the same 64px rounded square, so a grid that
        mixes photographed and un-photographed categories still lines up.
        
        The tile is white behind a photo rather than the cyan tint the
        icons sit on: these are product shots on white, and a tinted
        surround would show as a ring around the cut-out.
      */}
      {category.image ? (
        <span className="relative size-16 overflow-hidden rounded-xl bg-white ring-1 ring-border">
          <Image
            src={category.image}
            alt=""
            fill
            sizes="64px"
            className="object-contain p-1"
          />
        </span>
      ) : (
        <span className="flex size-16 items-center justify-center rounded-xl bg-cyan-soft text-secondary transition-colors group-hover:bg-primary group-hover:text-accent">
          <CategoryIcon slug={category.slug} className="size-7" />
        </span>
      )}

      <span className="text-sm font-semibold text-foreground">{category.name}</span>

      {productCount !== undefined && (
        <span className="text-[11px] text-muted-foreground">
          {productCount} {productCount === 1 ? "item" : "items"}
        </span>
      )}
    </Link>
  );
}
