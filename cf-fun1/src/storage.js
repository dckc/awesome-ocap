import { DurableObject } from "cloudflare:workers";
import { newWorkersRpcResponse } from "capnweb";
import { makeWriteThru, RefTable, STATE_KEY } from "./writethru.js";
import { Counter, CounterRegistry } from "./counter.js";

/**
 * The single storage engine. Not an app class — it owns the SQLite schema, a
 * write-through proxy factory, and serves `/bootstrap` by constructing the
 * app root RpcTarget (CounterRegistry).
 *
 * The storage layer owns the `RpcTarget -> key` mapping: `keyFor` assigns a
 * durable key to a fresh capability (allocating from a durable sequence) and
 * reuses an already-pinned key. The RefTable's allocator delegates here so a
 * capability nested inside durable state also gets a key.
 */
export class Storage extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.env = env;
    this.ctx = ctx;
    this.refTable = new RefTable();
    this.writeThru = makeWriteThru({
      getSql: () => this.ctx.storage.sql,
      refTable: this.refTable,
      keyFor: (obj) => this.keyFor(obj),
    });
    ctx.blockConcurrencyWhile(() => {
      ctx.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS state (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        )
      `);
    });
    this.refTable.addFactory("counter", (key) => new Counter(this.writeThru));
    this.refTable.setAllocator((obj) => this.keyFor(obj));
  }

  keyFor(obj) {
    const sql = this.ctx.storage.sql;
    if (obj[STATE_KEY]) return obj[STATE_KEY];
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

  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname !== "/bootstrap") {
      return new Response("Not found", { status: 404 });
    }
    const registry = new CounterRegistry(this.writeThru);
    registry[STATE_KEY] = "registry:main";
    return newWorkersRpcResponse(request, registry);
  }
}
