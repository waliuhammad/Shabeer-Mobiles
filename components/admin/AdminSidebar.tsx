import Link from "next/link";
import { Smartphone, Store } from "lucide-react";
import { ONLINE_STORE_ENABLED } from "@/lib/feature-flags";
import { AdminNavLinks } from "@/components/admin/AdminNavLinks";
import { BUSINESS } from "@/lib/constants";

/**
 * The fixed desktop sidebar.
 *
 * A Server Component: the brand block and the footer links are static.
 * Only AdminNavLinks inside it hydrates, because only it needs the URL.
 *
 * The dark navy comes from the --sidebar-* tokens declared back in Phase
 * 1A's globals.css, which is why the admin panel matches the storefront's
 * brand without a single new colour being invented here.
 */
export function AdminSidebar() {
  return (
    <aside className="flex h-full w-64 flex-col bg-sidebar">
      {/* --- Brand --- */}
      <div className="flex h-16 shrink-0 items-center gap-2.5 border-b border-sidebar-border px-4">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
          <Smartphone className="size-5" aria-hidden="true" />
        </span>
        <span className="flex min-w-0 flex-col leading-none">
          <span className="truncate font-heading text-sm font-bold text-white">
            SHABBIR MOBILES
          </span>
          <span className="mt-1 text-[10px] font-medium uppercase tracking-[0.12em] text-sidebar-foreground/50">
            Admin Panel
          </span>
        </span>
      </div>

      {/* --- Navigation (scrolls if the viewport is short) --- */}
      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-4">
        <AdminNavLinks />
      </div>

      {/* --- Footer --- */}
      <div className="shrink-0 border-t border-sidebar-border p-3">
        {/* Only worth offering when there is a storefront to visit. With
            the online shop off, "/" redirects straight back to /admin,
            so the link would be a loop. */}
        {ONLINE_STORE_ENABLED && <Link
          href="/"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <Store className="size-3.5 shrink-0" aria-hidden="true" />
          View {BUSINESS.name} store
        </Link>}
      </div>
    </aside>
  );
}
