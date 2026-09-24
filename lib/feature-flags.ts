/**
 * Feature flags.
 *
 * WHY A FLAG AND NOT DELETED CODE, OR COMMENTED-OUT CODE
 * -----------------------------------------------------
 * The online shop is switched off, not thrown away. Two ways of doing
 * that were rejected:
 *
 *   DELETING it loses work that may be wanted later, and the decision
 *   would have to be reconstructed from git history.
 *
 *   COMMENTING IT OUT looks tidy for a week and then rots. Commented
 *   code is not compiled, not type-checked and not linted, so every
 *   later refactor silently breaks it. By the time anyone uncomments it,
 *   it no longer builds and nobody remembers why.
 *
 * A flag keeps the code ALIVE: it still compiles, still type-checks,
 * still fails the build if something it depends on changes. Turning the
 * shop back on is one boolean, and it is guaranteed to still work.
 */

/**
 * Is the public online shop enabled?
 *
 * TRUE - the full storefront is live: shop and product pages, cart,
 * checkout, wishlist, customer accounts and order tracking, with "/"
 * showing the shop rather than the plain shop-window page.
 *
 * READ THIS BEFORE TAKING ORDERS THROUGH IT. The shop sells at the
 * counter. With this on, a visitor can place an order that nobody has
 * agreed to fulfil, so somebody has to watch Online Orders in the admin
 * panel and answer them. If that is not happening, set this to false.
 *
 * With it OFF instead:
 *   - the storefront routes are not reachable (they 404)
 *   - "/" shows ShopWindow: address, hours and how to get in touch
 *   - Online Orders is hidden from the admin navigation
 *   - revenue comes from counter sales only; the ONLINE channel still
 *     exists in the finance layer and simply reports zero
 *
 * Either way it is one boolean and nothing else needs changing. The
 * shop-window page stays compiled and type-checked while it is off, so
 * it still works whenever it is wanted again.
 */
export const ONLINE_STORE_ENABLED = true;

/**
 * Do we want customers to order and hold accounts?
 *
 * Separate from the flag above, because "show people what we sell" and
 * "let people buy it without coming in" are two different decisions, and
 * the shop wants the first without the second.
 *
 * Private, and combined below rather than exported on its own, so the
 * invariant cannot be broken by editing one line: ordering requires a
 * catalogue. Switching the store off switches ordering off with it,
 * which makes a cart on a site with no product pages unreachable by
 * construction rather than by remembering.
 */
const ONLINE_ORDERING_WANTED = false;

/**
 * Is the customer side of the site enabled?
 *
 * FALSE - the public site is a BROWSE-ONLY CATALOGUE. A visitor sees the
 * shop, the categories, every product, its price and whether it is in
 * stock, and then calls or walks in. That matches how the business
 * actually works: it sells at the counter.
 *
 * With this off:
 *   - /cart, /checkout, /wishlist, /tracking, /account and /register
 *     are not reachable
 *   - no Add to Cart, Buy Now or wishlist hearts anywhere; product
 *     pages offer the phone number instead
 *   - the cart and wishlist icons leave the header
 *   - /login stays, because STAFF sign in there for the admin panel
 *   - a successful sign-in goes to /admin, since /account 404s
 *
 * Nothing behind it is deleted. CartContext, WishlistContext, the
 * checkout and the account dashboard all still compile and type-check,
 * so turning this back on restores a working system rather than one
 * that rotted while nobody was looking.
 */
export const ONLINE_ORDERING_ENABLED = ONLINE_STORE_ENABLED && ONLINE_ORDERING_WANTED;

/**
 * Is the Users / Staff directory shown in the admin panel?
 *
 * FALSE - the shop does not want a staff list in the panel.
 *
 * NOTHING ABOUT ACCESS CHANGES. That page never granted anything: it
 * recorded who works at the shop, and said so on its own face. Real
 * access is a Firebase custom claim, granted with scripts/set-role.mjs
 * and checked by requireStaff() and requireRole() in lib/auth/dal.ts.
 * Those are untouched, so staff sign in exactly as before and cashiers
 * still cannot open Profit & Loss.
 *
 * What goes with it:
 *   - "Users / Staff" leaves the sidebar
 *   - /admin/users is not reachable
 *   - the Profile item in the admin topbar, which pointed there
 *
 * The staff documents already in Firestore are left alone. Deleting
 * them would break the names shown against past invoices.
 */
export const STAFF_DIRECTORY_ENABLED = false;

/**
 * Where a visitor should land.
 *
 * With the shop off there is no public page worth showing, so the root
 * goes straight to the admin panel - which then bounces anyone who is
 * not signed-in staff to the login page.
 */
export const HOME_REDIRECT = ONLINE_STORE_ENABLED ? null : "/admin";

/**
 * Where a successful sign-in lands when no ?next= was supplied.
 *
 * This follows ORDERING, not the store: with ordering off there is no
 * customer account page to go to - it 404s - so everyone who signs in is
 * there for the admin panel. Staff reach it; a customer who somehow has
 * an account is bounced back to the storefront by requireStaff().
 */
export const DEFAULT_SIGNED_IN_ROUTE = ONLINE_ORDERING_ENABLED ? "/account" : "/admin";
