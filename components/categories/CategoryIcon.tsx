import { createElement } from "react";
import { getCategoryIcon } from "@/lib/category-icons";

interface CategoryIconProps {
  /** Category slug. Unknown slugs fall back to a generic package icon. */
  slug: string;
  className?: string;
}

/**
 * Renders the icon for a category slug.
 *
 * WHY createElement INSTEAD OF <Icon />:
 * Writing `const Icon = getCategoryIcon(slug)` and then `<Icon />` makes
 * React's linter treat Icon as a component *created during render*, which
 * is normally a real bug (a freshly created component type remounts and
 * loses its state on every render). Here the function only ever returns one
 * of nine fixed, module-level Lucide components, so nothing is truly being
 * created - but the rule cannot know that.
 *
 * createElement expresses the same thing as a plain function call and keeps
 * the lookup honest: one place decides which icon a slug gets.
 */
export function CategoryIcon({ slug, className }: CategoryIconProps) {
  return createElement(getCategoryIcon(slug), {
    className,
    "aria-hidden": "true",
  });
}
