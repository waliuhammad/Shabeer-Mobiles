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
 * With the shop off there is no customer account page to go to - it
 * 404s - so staff go to the panel they actually came for.
 */
export const DEFAULT_SIGNED_IN_ROUTE = ONLINE_STORE_ENABLED ? "/account" : "/admin";
