/**
 * Session cookie name — kept in its own module (no `server-only`) so both the
 * server session layer and the edge proxy can import it.
 */
export const COOKIE_NAME = "dpap_session";
