import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import "./globals.css";
import { BUSINESS, FULL_ADDRESS } from "@/lib/constants";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { ONLINE_ORDERING_ENABLED } from "@/lib/feature-flags";
import { WishlistProvider } from "@/context/WishlistContext";
import { Toaster } from "@/components/ui/sonner";

/**
 * next/font downloads and self-hosts these at build time:
 *   - zero runtime requests to Google (faster, privacy-friendly)
 *   - no layout shift, because the font metrics are known up front
 *
 * `variable` exposes each as a CSS variable, which globals.css binds to the
 * Tailwind font-sans / font-heading utilities via @theme inline.
 */
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: `${BUSINESS.name} - ${BUSINESS.tagline}`,
    // Child pages set title: "Shop" and get "Shop | Shabbir Mobiles"
    template: `%s | ${BUSINESS.name}`,
  },
  description: BUSINESS.description,
  keywords: [
    "mobile shop Multan",
    "used mobiles Multan",
    "mobile accessories",
    "mobile repairing",
    "Shabbir Mobiles",
    "chargers",
    "power banks",
  ],
  openGraph: {
    title: `${BUSINESS.name} - ${BUSINESS.tagline}`,
    description: BUSINESS.description,
    type: "website",
    locale: "en_PK",
    siteName: BUSINESS.name,
  },
  // A local shop lives and dies by local search. Tell Google where it is.
  other: { "geo.placename": FULL_ADDRESS },
};

/**
 * The ONLY place html and body can be declared.
 *
 * Deliberately holds no visual chrome - no header, no footer - because
 * /admin must not inherit the customer shell. Those live in the nested
 * layouts below this one.
 *
 * CartProvider and WishlistProvider sit here, above every route, so the
 * Header (rendered by the store layout), the product pages, the cart page
 * and the wishlist page all read ONE cart and ONE wishlist.
 *
 * Neither provider renders any markup - they only supply a context value -
 * so wrapping the whole app costs nothing, and pages passed through as
 * `children` stay server-rendered.
 *
 * The cart and wishlist are mounted only while ONLINE_ORDERING_ENABLED.
 * With ordering off nothing reads either one - no Add to Cart, no
 * wishlist hearts, and /cart and /wishlist 404 - so a public visitor is
 * not given two contexts and two localStorage reads for features that do
 * not exist.
 *
 * AuthProvider STAYS HERE, and an attempt to move it was reverted.
 *
 * The theory was good: the public catalogue has no sign-in, so it should
 * not pay for the Firebase Auth SDK. The measurement disagreed. That SDK
 * lives in a chunk Next.js shares across routes - /about, /contact and
 * even a 404 all load it - because /login and /admin need it, and a
 * module used by more than one route is hoisted into the common bundle.
 * Moving the provider to those routes changed the downloaded bytes by
 * zero, three times over, while adding a seam to the sign-in path that
 * has already broken twice.
 *
 * Removing it for real would mean splitting the auth routes out of this
 * bundle, which is a much larger change than ~36 KB gzipped is worth.
 */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${poppins.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        <AuthProvider>
          {ONLINE_ORDERING_ENABLED ? (
            <CartProvider>
              <WishlistProvider>{children}</WishlistProvider>
            </CartProvider>
          ) : (
            children
          )}
        </AuthProvider>

        {/* Mounted once, at the root, so toast() works from any route.
            It renders nothing until a toast is raised. */}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
