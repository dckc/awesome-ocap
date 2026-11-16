/**
 * @file The OCapN tagged-array codec: sturdyrefs and delivery ops as plain
 * data values that ride a Cap'n Web session.
 *
 * Every value is a tagged array — the same length-prefixed, string-first
 * shape Cap'n Web itself uses for non-JSON values (`["date", ms]`), namespaced
 * under `ocapn:`. Cap'n Web's encoder wraps array *values* in its
 * literal-array escape, so a tagged array passes through a session untouched
 * in both directions — as an argument, a return value, or nested inside
 * either. A string-first array is only *interpreted* as a type tag at the
 * expression level, which these values never reach: this codec is the only
 * interpreter.
 *
 * Parsing is strict and total: a value that is not exactly the expected shape
 * throws — forged tag names, wrong arity, bad swissnum shapes, non-path
 * locator hints. This is the boundary the app trusts; everything that crosses
 * a session into these parsers is validated before it reaches the storage
 * engine.
 */

/**
 * A swissnum: `<kind>:<13 base32 chars>`, as minted by the storage layer
 * (`keyFor`). The kind names a factory; the tail is 64 bits of entropy.
 */
const SWISSNUM = /^[a-z][a-z0-9-]*:[a-z2-7]{13}$/;

/**
 * A locator hint: a route path only (`/counterRegistry`). No scheme, host,
 * query, or fragment — the client supplies its origin when serializing to a
 * URL, so a hint cannot smuggle one in.
 */
const HINT = /^\/[a-z0-9\-._~/]*$/i;

/** Whether a value is a well-formed swissnum (a local capability secret). */
export function isSwissnum(value) {
  return typeof value === "string" && SWISSNUM.test(value);
}

export const STURDYREF_TAG = "ocapn:sturdyref";
export const OP_DELIVER_TAG = "ocapn:op:deliver";

/**
 * A session-scoped object position, as in OCapN's `desc:import-object`. Not
 * constructible or parseable here: positions live in Cap'n Web's session
 * tables, which a method argument cannot name. The tag is reserved so the
 * wire vocabulary is complete; `parseOpDeliver` rejects any target that is
 * not a sturdyref.
 */
export const DESC_IMPORT_OBJECT_TAG = "ocapn:desc:import-object";

/**
 * Build a sturdyref for a capability this registry mints. `swissnum` is the
 * capability's kind-bearing webkey secret; `hints` are route paths the
 * registry serves it at. The result is data — never a stub.
 */
export function makeSturdyref(swissnum, hints) {
  return [STURDYREF_TAG, swissnum, hints];
}

/**
 * Validate and destructure a sturdyref. Throws unless `value` is exactly
 * `["ocapn:sturdyref", swissnum, hints]` with a well-formed swissnum and at
 * least one path-shaped hint.
 *
 * @returns {{ swissnum: string, hints: string[] }}
 */
export function parseSturdyref(value) {
  if (!Array.isArray(value) || value.length !== 3) {
    throw new TypeError("not a sturdyref: expected a 3-element tagged array");
  }
  const [tag, swissnum, hints] = value;
  if (tag !== STURDYREF_TAG) {
    throw new TypeError(
      `not a sturdyref: unknown tag ${JSON.stringify(tag)}`
    );
  }
  if (!isSwissnum(swissnum)) {
    throw new TypeError("not a sturdyref: malformed swissnum");
  }
  if (
    !Array.isArray(hints) ||
    hints.length < 1 ||
    !hints.every((h) => typeof h === "string" && HINT.test(h))
  ) {
    throw new TypeError("not a sturdyref: expected non-empty path hints");
  }
  return { swissnum, hints };
}

/**
 * Serialize a sturdyref to a web-key URL: `<origin><route>#<swissnum>`. The
 * secret rides in the fragment, so it is never sent to the host or leaked via
 * Referer. Inverse of the fragment-parsing `RemoteCounter` does on import.
 */
export function srToUrl(origin, sturdyref) {
  const { swissnum, hints } = parseSturdyref(sturdyref);
  return `${origin}${hints[0]}#${swissnum}`;
}

/**
 * Build an `op:deliver`: call `method` with `args` on the capability the
 * sturdyref names. `args` is a single array of arguments, so a deliver for
 * `counter.increment()` is `["ocapn:op:deliver", sr, "increment", []]`.
 */
export function makeOpDeliver(target, method, args) {
  return [OP_DELIVER_TAG, target, method, args];
}

/**
 * Validate and destructure an `op:deliver`. The target must be a sturdyref
 * (session positions are rejected — see `DESC_IMPORT_OBJECT_TAG`). The
 * method must be a non-empty string; whether the *resolved* capability's kind
 * offers it is the caller's check, where the kind is known.
 *
 * @returns {{ target: { swissnum: string, hints: string[] }, method: string, args: unknown[] }}
 */
export function parseOpDeliver(value) {
  if (!Array.isArray(value) || value.length !== 4) {
    throw new TypeError("not an op:deliver: expected a 4-element tagged array");
  }
  const [tag, target, method, args] = value;
  if (tag !== OP_DELIVER_TAG) {
    throw new TypeError(`not an op:deliver: unknown tag ${JSON.stringify(tag)}`);
  }
  const targetRef = parseSturdyref(target);
  if (typeof method !== "string" || method.length < 1) {
    throw new TypeError("not an op:deliver: method must be a non-empty string");
  }
  if (!Array.isArray(args)) {
    throw new TypeError("not an op:deliver: args must be an array");
  }
  return { target: targetRef, method, args };
}
