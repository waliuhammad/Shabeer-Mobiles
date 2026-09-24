import { ONLINE_STORE_ENABLED } from "@/lib/feature-flags";

/**
 * Single source of truth for fixed business information.
 *
 * Phase 1: hardcoded here.
 * Later:   the editable fields (phone, hours, address) move to a Firestore
 *          `settings` document so the owner can change them from the admin
 *          panel without a redeploy. Consumers import from here either way.
 */

export const BUSINESS = {
  name: "Shabbir Mobiles",
  tagline: "Accessories & Repairing Lab",
  description:
    "Used mobiles, genuine accessories and expert repairing in Multan. Trusted service since day one.",

  /**
   * REAL shop contact details.
   *
   * `phone` is E.164 for tel: links - a phone dialler needs the country
   * code, because a customer abroad tapping "0321..." would dial their
   * own country. `phoneDisplay` is the local form people actually read.
   * Both describe the SAME number; keep them in step.
   *
   * The WhatsApp number is deliberately a DIFFERENT line from the call
   * number - that is how the shop runs, not a mistake. wa.me needs
   * international format with no plus sign.
   */
  phone: "+92 321 6337525",
  phoneDisplay: "0321 - 6337525",
  whatsapp: "923029211073", // 0302 9211073 -> international, no +
  email: "shaheryarmughal245@gmail.com",

  address: {
    shop: "Shop #20",
    plaza: "Abdul Rasheed Mobile Plaza",
    street: "Ketchery Road",
    city: "Multan",
    country: "Pakistan",
  },

  /**
   * Confirmed by the shop owner: 11:00 AM to 9:00 PM.
   *
   * One entry, not two, because a single range was given for the whole
   * week. If Sunday or a weekly half-day differs, add a second row -
   * every surface that shows hours reads this array, so the footer, the
   * contact page and the home page update together.
   */
  hours: [{ days: "Monday - Sunday", time: "11:00 AM - 9:00 PM" }],
} as const;

/** Full address as one line - receipts, footer, structured data. */
export const FULL_ADDRESS =
  `${BUSINESS.address.shop}, ${BUSINESS.address.plaza}, ` +
  `${BUSINESS.address.street}, ${BUSINESS.address.city}`;

/* ------------------------------------------------------------------
   MAP LOCATION
   ------------------------------------------------------------------ */

export interface MapCoordinates {
  lat: number;
  lng: number;
}

/**
 * The exact shop pin.
 *
 * null means "we do not have precise coordinates yet", and everything below
 * falls back to searching FULL_ADDRESS. That lands the map near Abdul
 * Rasheed Mobile Plaza, which is close - but not on the shop door, and the
 * pin may drift if Google re-geocodes the street.
 *
 * TO SET THE REAL PIN (2 minutes, no account needed):
 *   1. open Google Maps and find the shop
 *   2. right-click exactly on it
 *   3. the top row of the menu is "lat, lng" - click to copy
 *   4. paste here, e.g.  { lat: 30.1956, lng: 71.4753 }
 *
 * Once set, the map, the marker and Get Directions all switch from a fuzzy
 * text search to an exact point. Nothing else in the code changes.
 */
function resolveShopCoordinates(): MapCoordinates | null {
  // Replace this line with the copied pin, e.g.
  //   return { lat: 30.1956, lng: 71.4753 };
  return null;
}

/**
 * Wrapped in a function on purpose. Writing
 *     export const SHOP_COORDINATES: MapCoordinates | null = null;
 * makes TypeScript narrow the constant to exactly `null`, and then
 * `SHOP_COORDINATES ? ... : ...` below becomes an error, because the
 * truthy branch is unreachable as far as the compiler is concerned.
 * A function's declared return type is not narrowed that way.
 */
export const SHOP_COORDINATES: MapCoordinates | null = resolveShopCoordinates();

/** How tightly the map zooms. 17 is street level; 15 shows the district. */
export const MAP_ZOOM = 17;

/**
 * What we hand to Google: exact coordinates when we have them, otherwise
 * the written address. Used by BOTH the embedded map and the directions
 * link, so the two can never point at different places.
 */
export const MAP_QUERY = SHOP_COORDINATES
  ? `${SHOP_COORDINATES.lat},${SHOP_COORDINATES.lng}`
  : FULL_ADDRESS;

/** Opens turn-by-turn directions in the customer's Maps app or browser. */
export const DIRECTIONS_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
  MAP_QUERY
)}`;

export const WHATSAPP_URL = `https://wa.me/${BUSINESS.whatsapp}`;

/* ------------------------------------------------------------------
   NAVIGATION
   Rendered by BOTH the desktop nav and the mobile drawer.
   One array -> they can never show different links.
   ------------------------------------------------------------------ */

export interface NavLink {
  label: string;
  href: string;
}

/**
 * The public navigation.
 *
 * Shop and Categories only exist when the business sells online. Listing
 * them while the shop is off would put two 404s in the header, and a
 * navigation bar that leads nowhere is worse than a short one.
 */
export const STORE_NAV: NavLink[] = ONLINE_STORE_ENABLED
  ? [
      { label: "Home", href: "/" },
      { label: "Shop", href: "/shop" },
      { label: "Categories", href: "/#categories" },
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
    ]
  : [
      { label: "Home", href: "/" },
      { label: "Services", href: "/#services" },
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
    ];

export const FOOTER_QUICK_LINKS: NavLink[] = ONLINE_STORE_ENABLED
  ? [
      { label: "Home", href: "/" },
      { label: "Shop All", href: "/shop" },
      { label: "About Us", href: "/about" },
      { label: "Contact", href: "/contact" },
      { label: "Visit Our Shop", href: "/#visit" },
    ]
  : [
      { label: "Home", href: "/" },
      { label: "About Us", href: "/about" },
      { label: "Contact", href: "/contact" },
      { label: "Visit Our Shop", href: "/#visit" },
    ];

/**
 * Category shortcuts. Empty while the shop is off - every one of them
 * points at /shop, which 404s. The footer hides the whole column when
 * this is empty rather than printing a heading with nothing under it.
 */
export const FOOTER_SHOP_LINKS: NavLink[] = ONLINE_STORE_ENABLED
  ? [
      { label: "Used Mobiles", href: "/shop?category=used-mobiles" },
      { label: "Chargers", href: "/shop?category=chargers" },
      { label: "Covers", href: "/shop?category=covers" },
      { label: "AirPods", href: "/shop?category=airpods" },
      { label: "Power Banks", href: "/shop?category=power-banks" },
    ]
  : [];

/** Account and order self-service links. */
export const FOOTER_CUSTOMER_LINKS: NavLink[] = ONLINE_STORE_ENABLED
  ? [
      { label: "My Account", href: "/account" },
      { label: "Track Order", href: "/tracking" },
      { label: "My Wishlist", href: "/wishlist" },
      { label: "Shopping Cart", href: "/cart" },
      { label: "Login", href: "/login" },
    ]
  : [{ label: "Staff Login", href: "/login" }];

export const FOOTER_SERVICE_LINKS: NavLink[] = [
  { label: "Mobile Repairing", href: "/#services" },
  { label: "Battery Replacement", href: "/#services" },
  { label: "Software Solutions", href: "/#services" },
  { label: "Screen Replacement", href: "/#services" },
];
