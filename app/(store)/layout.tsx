import { StoreHeader } from "@/components/layout/StoreHeader";
import { StoreFooter } from "@/components/layout/StoreFooter";

/**
 * Shell for every customer-facing page.
 *
 * The (store) folder name is in parentheses, which means Next.js uses it for
 * GROUPING ONLY - it never appears in a URL. app/(store)/page.tsx serves "/",
 * app/(store)/cart/page.tsx serves "/cart".
 *
 * Its sole purpose: give the storefront a layout that /admin will not inherit.
 */
export default function StoreLayout({ children }: LayoutProps<"/">) {
  return (
    // min-h-dvh + flex-col + the footer's mt-auto pins the footer to the
    // bottom on short pages, without position: fixed.
    <div className="flex min-h-dvh flex-col bg-background">
      <StoreHeader />
      {/* main is a landmark - screen readers can jump straight to content. */}
      <main className="flex-1">{children}</main>
      <StoreFooter />
    </div>
  );
}
