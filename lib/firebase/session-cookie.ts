/**
 * The session cookie's name, alone in its own module.
 *
 * It used to live in lib/auth/dal.ts, which meant anything needing the
 * NAME also pulled in the DAL - React cache, next/navigation's redirect
 * and the whole Admin SDK. proxy.ts could not import it at all for that
 * reason, so the string was duplicated there.
 *
 * A constant with no dependencies can be imported from anywhere: the
 * route handler, the DAL, and the proxy.
 */
export const SESSION_COOKIE = "shabbir_session";
