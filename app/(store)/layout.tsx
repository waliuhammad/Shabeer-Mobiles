import { StoreHeader } from "@/components/layout/StoreHeader";
import { StoreFooter } from "@/components/layout/StoreFooter";
import { Logo } from "@/components/shared/Logo";
import { ONLINE_STORE_ENABLED } from "@/lib/feature-flags";

/**
 * Shell for every customer-facing page.
 *
 * The (store) folder name is in parentheses, which means Next.js uses it for
 * GROUPING ONLY - it never appears in a URL. app/(store)/page.tsx serves "/",
 * app/(store)/cart/page.tsx serves "/cart".
 *
 * Its sole purpose: give the storefront a layout that /admin will not inherit.
 *
 * TWO SHELLS, ONE FLAG
 * --------------------
 * With the online shop off, the only pages left in this group are login
 * and register - and the full storefront chrome would surround them with
 * a nav bar pointing at Shop, Cart, Wishlist, About and Contact, every
 * one of which now 404s. A header full of dead links is worse than no
 * header.
 *
 * So the shop chrome is kept, intact and compiled, behind the flag; a
 * minimal shell is used while the shop is off. Turning
 * ONLINE_STORE_ENABLED back on restores the original layout exactly.
 */
export default function StoreLayout({ children }: LayoutProps<"/">) {
  if (!ONLINE_STORE_ENABLED) {
    return (
      <div className="flex min-h-dvh flex-col bg-muted/40">
        <header className="border-b border-border bg-background">
          <div className="mx-auto flex max-w-5xl items-center px-4 py-3">
            {/* Logo renders its own <Link>. Wrapping it in another one
                nests <a> inside <a>, which is invalid HTML and caused a
                hydration error on the live site. */}
            <Logo />
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="border-t border-border bg-background py-4">
          <p className="text-center text-xs text-muted-foreground">
            Shabbir Mobiles - shop management system. Staff access only.
          </p>
        </footer>
      </div>
    );
  }

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
