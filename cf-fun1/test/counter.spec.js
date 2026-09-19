import { describe, it, expect } from "vitest";
import { Counter, CounterRegistry } from "../src/counter.js";
import { makeWriteThru, RefTable, STATE_KEY } from "../src/writethru.js";

// In-memory stand-in for the storage engine's SQL, so the app layer can be
// tested without workerd. writeThru persists to a plain Map keyed by `key`.
function makeInMemoryStore() {
  const rows = new Map();
  let seq = 0;
  return {
    sql: {
      exec(sql, ...params) {
        if (sql.startsWith("SELECT")) {
          const key = params[0];
          const row = rows.get(key);
          return { toArray: () => (row ? [{ value: row }] : []) };
        }
        rows.set(params[0], params[1]);
        return { toArray: () => [] };
      },
    },
    keyFor(obj) {
      if (obj[STATE_KEY]) return obj[STATE_KEY];
      seq += 1;
      return `counter:${seq}`;
    },
    rows,
  };
}

function setupApp(shared) {
  const refTable = new RefTable();
  const store = shared || makeInMemoryStore();
  const writeThru = makeWriteThru({
    getSql: () => store.sql,
    refTable,
    keyFor: (obj) => store.keyFor(obj),
  });
  refTable.addFactory("counter", (key) => new Counter(writeThru));
  refTable.setAllocator((obj) => store.keyFor(obj));
  const registry = new CounterRegistry(writeThru);
  registry[STATE_KEY] = "registry:main";
  return { registry, refTable, writeThru, store };
}

describe("counter app as pure RpcTargets over write-thru state", () => {
  it("makeCounter creates an incrementable counter", async () => {
    const { registry } = setupApp();
    const counter = await registry.makeCounter();
    expect(counter).toBeInstanceOf(Counter);
    expect(await counter.getValue()).toBe(0);
    expect(await counter.increment()).toBe(1);
    expect(await counter.increment()).toBe(2);
    expect(await counter.decrement()).toBe(1);
    expect(await counter.getValue()).toBe(1);
  });

  it("registry holds counter capabilities and listCounters rehydrates them", async () => {
    const { registry } = setupApp();
    const c1 = await registry.makeCounter();
    const c2 = await registry.makeCounter();
    await c1.increment();
    const list = await registry.listCounters();
    expect(list).toHaveLength(2);
    expect(list[0]).toBeInstanceOf(Counter);
    expect(await list[0].getValue()).toBe(1);
    expect(await list[1].getValue()).toBe(0);
  });

  it("state persists across a new app instance (rehydrated from storage)", async () => {
    const store = makeInMemoryStore();
    const first = setupApp(store);
    const c = await first.registry.makeCounter();
    await c.increment();
    await c.increment();
    expect(await c.getValue()).toBe(2);
    // A fresh registry over the SAME storage: state survives.
    const second = setupApp(store);
    const list = await second.registry.listCounters();
    expect(list).toHaveLength(1);
    expect(await list[0].getValue()).toBe(2);
  });

  it("a counter's #state can hold a capability, resurrected by ref", async () => {
    const { registry } = setupApp();
    const a = await registry.makeCounter();
    const b = await registry.makeCounter();
    a.setFriend(b);
    // b was already live, so the ref resolves to the same instance.
    expect(await a.friend.getValue()).toBe(0);
    expect(a.friend).toBeInstanceOf(Counter);
    expect(a.friend).toBe(b);
  });
});
