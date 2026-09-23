import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Crumb {
  label: string;
  /** Omit on the last crumb - the current page is not a link to itself. */
  href?: string;
}

interface BreadcrumbProps {
  items: Crumb[];
  className?: string;
}

/**
 * Home / Shop / Used Mobiles / iPhone 12 (Used)
 *
 * A nav landmark with aria-label, so screen readers announce it as the
 * breadcrumb trail rather than as an anonymous list of links.
 */
export function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className={cn("text-xs sm:text-sm", className)}>
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-1.5">
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="text-muted-foreground transition-colors hover:text-secondary"
                >
                  {item.label}
                </Link>
              ) : (
                // aria-current tells assistive tech which crumb is this page.
                <span className="font-medium text-foreground" aria-current="page">
                  {item.label}
                </span>
              )}

              {!isLast && (
                <ChevronRight
                  className="size-3.5 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
