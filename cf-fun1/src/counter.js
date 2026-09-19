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
    const rows = this.ctx.storage.sql
      .exec("SELECT value FROM counters WHERE id = 1")
      .toArray();
    return rows[0] ? rows[0].value : 0;
  }

  async increment() {
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
}

export class CounterRegistry extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.env = env;
    ctx.blockConcurrencyWhile(() => {
      ctx.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS counters (
          id INTEGER PRIMARY KEY AUTOINCREMENT
        )
      `);
    });
  }

  async createCounter() {
    const res = this.ctx.storage.sql.exec(
      "INSERT INTO counters DEFAULT VALUES RETURNING id"
    );
    return res.one().id;
  }

  async listCounterIds() {
    return this.ctx.storage.sql
      .exec("SELECT id FROM counters ORDER BY id")
      .toArray()
      .map((r) => r.id);
  }

  async getCounterId(id) {
    const row = this.ctx.storage.sql
      .exec("SELECT id FROM counters WHERE id = ?", id)
      .one();
    return row ? row.id : null;
  }

  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname !== "/api") {
      return new Response("Not found", { status: 404 });
    }
    return newWorkersRpcResponse(request, new RegistryApi(this, this.env));
  }
}

class RegistryApi extends RpcTarget {
  constructor(registry, env) {
    super();
    this.registry = registry;
    this.env = env;
  }

  async makeCounter() {
    const id = await this.registry.createCounter();
    return new CounterProxy(this.env, id);
  }

  async listCounterIds() {
    return this.registry.listCounterIds();
  }

  async getCounter(id) {
    const exists = await this.registry.getCounterId(id);
    return exists ? new CounterProxy(this.env, id) : null;
  }
}

class CounterProxy extends RpcTarget {
  constructor(env, id) {
    super();
    this.stub = env.COUNTER.getByName(String(id));
  }

  getValue() {
    return this.stub.getValue();
  }

  increment() {
    return this.stub.increment();
  }

  decrement() {
    return this.stub.decrement();
  }
}
