import { DurableObject } from "cloudflare:workers";
import { RpcTarget, newWorkersRpcResponse } from "capnweb";

export class Counter extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(() => {
      ctx.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS counters (
          id INTEGER PRIMARY KEY,
          value INTEGER NOT NULL
        )
      `);
    });
  }

  async getValue() {
    const row = this.ctx.storage.sql
      .exec("SELECT value FROM counters WHERE id = 1")
      .one();
    return row ? row.value : 0;
  }

  async increment() {
    // STYLE: would rather see:
    //   this.value += 1
    // or perhaps
    //   this.state.value += 1
    // can we do a proxy? would a popular ORM make sense? or a work-alike? (drizzle?)
    this.ctx.storage.sql.exec(
      `INSERT INTO counters (id, value) VALUES (1, 1)
       ON CONFLICT(id) DO UPDATE SET value = value + 1`
    );
    return this.getValue();
  }

  async decrement() {
    this.ctx.storage.sql.exec(
      `INSERT INTO counters (id, value) VALUES (1, -1)
       ON CONFLICT(id) DO UPDATE SET value = value - 1`
    );
    return this.getValue();
  }

  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname !== "/api") {
      return new Response("Not found", { status: 404 });
    }
    return newWorkersRpcResponse(request, new CounterApi(this));
  }
}

class CounterApi extends RpcTarget {
  constructor(durableObject) {
    super();
    this.do = durableObject;
  }

  getValue() {
    return this.do.getValue();
  }

  increment() {
    return this.do.increment();
  }

  decrement() {
    return this.do.decrement();
  }
}
