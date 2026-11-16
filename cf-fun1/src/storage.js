/**
 * @file The storage engine: `Storage`, a reusable base class for app Durable
 * Objects — owns the SQLite schema, webkey secret allocation, and the
 * factory-registration surface that app DOs extend.
 */
import { DurableObject } from "cloudflare:workers";
import { makeWriteThru, RefTable } from "./writethru.js";

/** RFC 4648 base32 alphabet (lowercase, no padding). */
const BASE32 = "abcdefghijklmnopqrstuvwxyz234567";

/**
 * Format an unguessable 64-bit webkey secret as 13 base32 chars. `s` is a
 * Uint8Array of 8 bytes (already generated); this is pure bit-fiddling.
 */
export function formatSecret(s) {
  let secret = "";
  for (let i = 0; i < 13; i++) {
    // Read 5 bits at a time across the 64-bit value.
    const byteIndex = Math.floor((i * 5) / 8);
    const shift = (i * 5) % 8;
    let group = (s[byteIndex] >> shift) & 0x1f;
    if (shift > 3) group |= (s[byteIndex + 1] ?? 0) << (8 - shift);
    secret += BASE32[group & 0x1f];
  }
  return secret;
}

/**
 * The storage engine: a reusable base for app Durable Objects. It owns the
 * SQLite schema, a write-through proxy factory (`writeThru`), the RefTable
 * (capability -> durable key), and the webkey story.
 *
 * Each capability is given a durable key that IS an unguessable, kind-bearing
 * webkey secret (`<kind>:<base32>`, e.g. `counter:k7enposi7adap`). The key is
 * how the capability is persisted, referenced, and — via `decodeSecret` —
 * resurrected across isolates/sessions. App DOs never see keys or webkeys;
 * they extend this and serve their own capability surface.
 */
export class Storage extends DurableObject {
  constructor(
    ctx,
    env,
    { getRandomValues = (...args) => globalThis.crypto.getRandomValues(...args) } = {}
  ) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(() => {
      ctx.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS state (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        )
      `);
    });
    this.#ctx = ctx;
    this.#getRandomValues = getRandomValues;
    this.#refTable = new RefTable({
      alloc: (obj) => this.keyFor(obj),
    });
    this.#writeThru = makeWriteThru({
      getSql: () => this.#ctx.storage.sql,
      refTable: this.#refTable,
      keyFor: (obj) => this.keyFor(obj),
    });
  }

  #ctx;
  #refTable;
  #writeThru;
  #getRandomValues;

  /** The write-through state factory, bound to this engine. */
  get writeThru() {
    return this.#writeThru;
  }

  /** Give a capability a stable durable name (delegates to the RefTable). */
  exportAs(obj, key) {
    this.#refTable.exportAs(obj, key);
  }

  /** Register a factory that resurrects a capability kind from its key. */
  registerFactory(kind, makeInstance) {
    this.#refTable.addFactory(kind, makeInstance);
  }

  /** Register a factory that makes a remote proxy stub for a web-key URL. */
  registerRemoteFactory(kind, makeStub) {
    this.#refTable.addRemoteFactory(kind, makeStub);
  }

  /**
   * Enliven a kind-bearing webkey secret into its live capability. The
   * supervisor (running in a different isolate) cannot hold the capability
   * object; it asks this DO — the one that owns the RefTable and factories —
   * to resolve the secret. Returns the live RpcTarget, or undefined if the
   * secret is revoked or does not name a known kind or key.
   */
  decodeSecret(secret) {
    if (this.#isRevoked(secret)) return undefined;
    return this.#refTable.decodeSecret(secret);
  }

  /**
   * Mark a webkey secret revoked: `decodeSecret` refuses it from then on.
   * Revocation rows live in the `state` table under a `revoked!`-prefixed
   * key, which no capability key can collide with (those are `<kind>:<b32>`).
   * Returns true if the secret was well-formed to revoke.
   */
  revokeSecret(secret) {
    if (this.#refTable.parseSecret(secret) === undefined) return false;
    this.#ctx.storage.sql.exec(
      "INSERT OR REPLACE INTO state (key, value) VALUES (?, '')",
      `revoked!${secret}`
    );
    return true;
  }

  #isRevoked(secret) {
    const rows = this.#ctx.storage.sql
      .exec("SELECT key FROM state WHERE key = ?", `revoked!${secret}`)
      .toArray();
    return rows.length > 0;
  }

  /** The capability's durable key, which is its kind-bearing webkey secret. */
  secretFor(obj) {
    return this.#refTable.ensureKey(obj);
  }

  /**
   * Allocate a durable key for a fresh capability: a kind-bearing, unguessable
   * webkey secret. The kind is taken from the capability's `refKind`; the base32
   * tail is 64 bits of randomness. The key doubles as the storage row key and
   * the webkey's fragment secret.
   */
  keyFor(obj) {
    const existing = this.#refTable.getKey(obj);
    if (existing !== undefined) return existing;
    const kind = obj.refKind ?? "cap";
    return `${kind}:${formatSecret(this.#getRandomValues(new Uint8Array(8)))}`;
  }
}
