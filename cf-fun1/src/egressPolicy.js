/**
 * @file The facet's egress policy, as a pure predicate: which outbound
 * requests the supervisor relays on the facet's behalf.
 *
 * A request is relayable only when it targets an allowlisted host, the
 * /counterRegistry route, and carries a secret — the exact shape of a web-key
 * dereference to an owning worker. Anything else (arbitrary hosts, other
 * paths, a missing secret, non-HTTP(S) schemes) is refused: the facet is
 * otherwise egress-capped, and this relay is its single outbound.
 */

/**
 * @param {string} rawUrl  the request URL to check
 * @param {string[]} allowedHosts  `host` or `host:port` origins the relay may
 *   reach (e.g. `["localhost:8787", "localhost:8788"]` for the two-worker dev
 *   setup); an empty list relays nothing.
 * @returns {boolean}
 */
export function isWebkeyDeref(rawUrl, allowedHosts) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    return false;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  if (!allowedHosts.includes(url.host)) return false;
  if (url.pathname !== "/counterRegistry") return false;
  return url.searchParams.has("secret");
}
