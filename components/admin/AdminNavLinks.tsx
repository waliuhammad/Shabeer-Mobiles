"use client";

import { createElement } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { adminNavSections, isAdminNavItemActive } from "@/lib/admin-nav";
import { cn } from "@/lib/utils";

interface AdminNavLinksProps {
  /** Called after a link is tapped - the mobile drawer uses it to close. */
  onNavigate?: () => void;
}

/**
 * The fifteen admin links, grouped into sections.
 *
 * WHY THIS IS A CLIENT COMPONENT:
 * it highlights the current page, which means it must know the current
 * URL. Per the Next.js docs, reading the URL from a Server Component is
 * not supported - deliberately, so that layout state survives navigation.
 * usePathname is the supported way, and it is a Client Component hook.
 *
 * That is not a de-optimisation. The component ships once, then re-renders
 * from the new pathname on each navigation with no refetch. Everything
 * around it - the sidebar shell, the logo, the page content - stays on the
 * server.
 *
 * Rendered TWICE: in the desktop sidebar and in the mobile drawer. One
 * definition, so the two can never show different links.
 */
export function AdminNavLinks({ onNavigate }: AdminNavLinksProps) {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin sections" className="space-y-5">
      {adminNavSections.map((section) => (
        <div key={section.title}>
          <h2 className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/45">
            {section.title}
          </h2>

          <ul className="space-y-0.5">
            {section.items.map((item) => {
              const isActive = isAdminNavItemActive(item.href, pathname);

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    // aria-current is what tells a screen reader which page
                    // this is. The colour change alone says nothing to one.
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                      isActive
                        ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
                        : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                    )}
                  >
                    {/* createElement rather than <item.icon />: the linter
                        treats a component read from a variable as "created
                        during render". Same reason as CategoryIcon. */}
                    {createElement(item.icon, {
                      className: cn(
                        "size-4 shrink-0",
                        isActive ? "text-sidebar-primary" : "text-sidebar-foreground/60"
                      ),
                      "aria-hidden": "true",
                    })}
                    <span className="truncate">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
