import { ONLINE_STORE_ENABLED, STAFF_DIRECTORY_ENABLED } from "@/lib/feature-flags";
import {
  LayoutDashboard,
  Calculator,
  ShoppingBag,
  Package,
  Tags,
  Warehouse,
  Truck,
  Users,
  UserRound,
  Receipt,
  Banknote,
  TrendingUp,
  ChartColumn,
  UserCog,
  Settings,
  type LucideIcon,
} from "lucide-react";

/**
 * FUTURE ROLE GATING.
 *
 * Not enforced in Phase 1C - nothing here restricts anything yet. It is
 * declared now so that when Firebase Auth custom claims arrive, the
 * sidebar filters one array instead of having fifteen scattered checks
 * added to it.
 *
 * The intent, from the business rules:
 *   SUPER_ADMIN  everything
 *   MANAGER      catalogue, inventory, orders, billing, customers, reports
 *   CASHIER      POS, billing, customers only - and crucially NOT purchases,
 *                expenses, revenue or profit, because all four expose
 *                purchase prices and margins
 */
export type AdminRole = "SUPER_ADMIN" | "MANAGER" | "CASHIER";

export interface AdminNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Which roles may see this item once roles exist. */
  roles: AdminRole[];
}

export interface AdminNavSection {
  /** Small grey heading above the group. */
  title: string;
  items: AdminNavItem[];
}

const ALL: AdminRole[] = ["SUPER_ADMIN", "MANAGER", "CASHIER"];
const OWNER_ONLY: AdminRole[] = ["SUPER_ADMIN"];
const OWNER_MANAGER: AdminRole[] = ["SUPER_ADMIN", "MANAGER"];

/**
 * THE navigation definition.
 *
 * WHY AN ARRAY RATHER THAN FIFTEEN BLOCKS OF JSX:
 *
 *  1. The desktop sidebar and the mobile drawer both render it. Two
 *     hand-written copies would drift the first time an item is added.
 *  2. Changing how a link looks is one edit to one template, not fifteen.
 *  3. Role filtering becomes `items.filter(i => i.roles.includes(role))` -
 *     one line. With hardcoded blocks it is fifteen conditionals.
 *  4. The data is inspectable: a test can assert every href resolves,
 *     which is impossible against JSX scattered through a file.
 *
 * Grouping into sections is not decoration either - fifteen flat links is
 * a wall to scan. Six labelled groups of two or three is a glance.
 */
export const adminNavSections: AdminNavSection[] = [
  {
    title: "Main",
    items: [
      { label: "Dashboard", href: "/admin", icon: LayoutDashboard, roles: ALL },
    ],
  },
  {
    title: "Sales",
    items: [
      { label: "POS / Billing", href: "/admin/billing", icon: Calculator, roles: ALL },
      /**
       * Online Orders - hidden while the shop does not sell online.
       *
       * The route, the data and the finance integration all still exist
       * and still compile; there is simply nothing to look at, so the
       * link is not offered. Turning ONLINE_STORE_ENABLED back on brings
       * it straight back.
       */
      ...(ONLINE_STORE_ENABLED
        ? [{ label: "Online Orders", href: "/admin/orders", icon: ShoppingBag, roles: OWNER_MANAGER }]
        : []),
    ],
  },
  {
    title: "Catalog",
    items: [
      { label: "Products", href: "/admin/products", icon: Package, roles: OWNER_MANAGER },
      { label: "Categories", href: "/admin/categories", icon: Tags, roles: OWNER_MANAGER },
      { label: "Inventory", href: "/admin/inventory", icon: Warehouse, roles: OWNER_MANAGER },
    ],
  },
  {
    title: "Purchasing",
    items: [
      // Purchases carry cost prices, so a cashier never sees this group.
      { label: "Purchases", href: "/admin/purchases", icon: Truck, roles: OWNER_MANAGER },
      { label: "Suppliers", href: "/admin/suppliers", icon: Users, roles: OWNER_MANAGER },
    ],
  },
  {
    title: "Customers",
    items: [
      { label: "Customers", href: "/admin/customers", icon: UserRound, roles: ALL },
    ],
  },
  {
    title: "Finance",
    items: [
      { label: "Expenses", href: "/admin/expenses", icon: Receipt, roles: OWNER_MANAGER },
      { label: "Revenue", href: "/admin/revenue", icon: Banknote, roles: OWNER_MANAGER },
      { label: "Profit & Loss", href: "/admin/profit-loss", icon: TrendingUp, roles: OWNER_ONLY },
      { label: "Reports", href: "/admin/reports", icon: ChartColumn, roles: OWNER_MANAGER },
    ],
  },
  {
    title: "System",
    items: [
      /**
       * The staff directory, when it is switched on. Spread rather than
       * listed, so that with STAFF_DIRECTORY_ENABLED false the item is
       * absent from this array entirely - which matters because the
       * "Planned permissions" table and every nav lookup are built from
       * it. A hidden-but-present entry would still show up there.
       */
      ...(STAFF_DIRECTORY_ENABLED
        ? [{ label: "Users / Staff", href: "/admin/users", icon: UserCog, roles: OWNER_ONLY }]
        : []),
      { label: "Settings", href: "/admin/settings", icon: Settings, roles: OWNER_ONLY },
    ],
  },
];

/** Flat list - handy for lookups and for testing every href resolves. */
export const adminNavItems: AdminNavItem[] = adminNavSections.flatMap((s) => s.items);

/**
 * Is this nav item the page we are on?
 *
 * The naive version, `pathname.startsWith(href)`, is wrong in two ways:
 *
 *   - "/admin" is a prefix of EVERY admin route, so Dashboard would stay
 *     lit on every single page.
 *   - "/admin/product" would match "/admin/products" - a different route.
 *
 * So: exact match for the dashboard root, and for everything else either
 * an exact match or a match followed by "/" (a real child segment, which
 * is what keeps a future /admin/products/p-001 lighting up Products).
 */
export function isAdminNavItemActive(href: string, pathname: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Page title for the topbar, derived from the current route. */
export function getAdminPageTitle(pathname: string): string {
  const match = adminNavItems.find((item) => isAdminNavItemActive(item.href, pathname));
  return match?.label ?? "Admin";
}
