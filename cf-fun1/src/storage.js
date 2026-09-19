import { DurableObject } from "cloudflare:workers";
import { makeWriteThru, RefTable } from "./writethru.js";

/**
 * The storage engine: a reusable base for app Durable Objects. It owns the
 * SQLite schema, a write-through proxy factory (`writeThru`), and the RefTable
 * (capability -> durable key). App DOs extend this and serve their own
 * capability surface; they never reimplement storage.
 *
 * The storage layer owns the `RpcTarget -> key` mapping: it allocates a durable
 * key for a fresh capability (from a durable sequence) and keeps the mapping in
 * the RefTable's WeakMap, so no key is ever pinned on an app object.
 */
export class Storage extends DurableObject {
  constructor(ctx, env) {
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

  keyFor(obj) {
    const existing = this.#refTable.getKey(obj);
    if (existing !== undefined) return existing;
    const sql = this.#ctx.storage.sql;
    const rows = sql
      .exec("SELECT value FROM state WHERE key = ?", "seq:counter")
      .toArray();
    const next = rows[0] ? Number(rows[0].value) + 1 : 1;
    sql.exec(
      "INSERT OR REPLACE INTO state (key, value) VALUES (?, ?)",
      "seq:counter",
      String(next)
    );
    return `counter:${next}`;
  }
}
