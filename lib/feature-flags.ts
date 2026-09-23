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
 * FALSE - Shabbir Mobiles does not sell online. This system is used in
 * the shop, by shop staff, to track stock, sales, customers and money.
 *
 * With this off:
 *   - the storefront routes (shop, product pages, cart, checkout,
 *     wishlist, customer account, order tracking) are not reachable
 *   - "/" goes to the admin panel instead of a shop window
 *   - Online Orders is hidden from the admin navigation
 *   - revenue comes from counter sales only; the ONLINE channel still
 *     exists in the finance layer and simply reports zero
 *
 * Setting it back to true restores all of the above. Nothing else needs
 * changing.
 */
export const ONLINE_STORE_ENABLED = false;

/**
 * Where a visitor should land.
 *
 * With the shop off there is no public page worth showing, so the root
 * goes straight to the admin panel - which then bounces anyone who is
 * not signed-in staff to the login page.
 */
export const HOME_REDIRECT = ONLINE_STORE_ENABLED ? null : "/admin";
