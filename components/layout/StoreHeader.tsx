import Link from "next/link";
import { Phone, MapPin } from "lucide-react";
import { Container } from "@/components/shared/Container";
import { Logo } from "@/components/shared/Logo";
import { UserMenu } from "@/components/auth/UserMenu";
import { ONLINE_STORE_ENABLED, ONLINE_ORDERING_ENABLED } from "@/lib/feature-flags";
import { SearchBar } from "@/components/shared/SearchBar";
import { MobileMenu } from "@/components/navigation/MobileMenu";
import { CartLink } from "@/components/layout/CartLink";
import { WishlistLink } from "@/components/layout/WishlistLink";
import { STORE_NAV, BUSINESS, FULL_ADDRESS } from "@/lib/constants";

/**
 * Customer-facing header. Rendered by app/(store)/layout.tsx, so it appears
 * on every storefront page and never on /admin.
 *
 * A Server Component: the nav links are static, so none of this ships as
 * JavaScript. Only <SearchBar> and <MobileMenu> are client islands.
 */
export function StoreHeader() {
  return (
    <header className="sticky top-0 z-50 w-full">
      {/* Utility bar - hidden on mobile, where this lives in the drawer */}
      <div className="hidden bg-primary text-primary-foreground lg:block">
        <Container className="flex h-9 items-center justify-between text-xs">
          <p className="flex items-center gap-1.5 text-white/75">
            <MapPin className="size-3.5 text-accent" aria-hidden="true" />
            {FULL_ADDRESS}
          </p>
          <div className="flex items-center gap-5">
            <span className="text-accent">Free installation on screen protectors</span>
            <a
              href={`tel:${BUSINESS.phone}`}
              className="flex items-center gap-1.5 hover:text-accent"
            >
              <Phone className="size-3.5" aria-hidden="true" />
              {BUSINESS.phoneDisplay}
            </a>
          </div>
        </Container>
      </div>

      {/* Main bar */}
      <div className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <Container className="flex h-16 items-center gap-3 sm:h-[70px] sm:gap-4">
          <MobileMenu />

          <Logo />

          {/* Desktop nav - the same STORE_NAV array the drawer maps over */}
          <nav className="ml-4 hidden items-center gap-1 lg:flex" aria-label="Main navigation">
            {STORE_NAV.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted hover:text-primary"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Search goes to /shop, which does not exist while the shop
              is off. */}
          {ONLINE_STORE_ENABLED && (
            <div className="ml-auto hidden max-w-xs flex-1 md:block lg:max-w-sm">
              <SearchBar placeholder="Search products..." />
            </div>
          )}

          <div className="ml-auto flex items-center gap-1 md:ml-2">
            {/* Client island: a login link when signed out, an account
                menu with Sign Out when signed in. */}
            <UserMenu />

            {/* Cart and wishlist belong to ORDERING, not to the
                catalogue. The shop can be fully browsable - as it is now -
                while /cart and /wishlist 404, so the icons go rather than
                offering a dead end. */}
            {ONLINE_ORDERING_ENABLED && (
              <>
                <WishlistLink />
                <CartLink />
              </>
            )}
          </div>
        </Container>
      </div>
    </header>
  );
}
