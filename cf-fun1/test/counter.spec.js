import { describe, it, expect } from "vitest";
import { Counter, RegistryApi } from "../src/counter.js";
import { makeWriteThru, RefTable } from "../src/writethru.js";

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
      seq += 1;
      return `counter:${seq}`;
    },
    rows,
  };
}

function setupApp(shared) {
  const store = shared || makeInMemoryStore();
  const refTable = new RefTable({ alloc: (obj) => store.keyFor(obj) });
  const writeThru = makeWriteThru({
    getSql: () => store.sql,
    refTable,
    keyFor: (obj) => store.keyFor(obj),
  });
  // Mirror the CounterRegistry DO: register the factory, then build the API.
  refTable.addFactory("counter", (key) => new Counter(writeThru));
  const registry = new RegistryApi(writeThru);
  refTable.exportAs(registry, "registry:main");
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
    const c0 = await registry.makeCounter();
    const c1 = await registry.makeCounter();
    await c1.increment();
    const counters = await registry.listCounters();
    expect(counters).toHaveLength(2);
    expect(counters[0]).toBeInstanceOf(Counter);
    expect(counters[1]).toBeInstanceOf(Counter);
    expect(await counters[0].getValue()).toBe(0);
    expect(await counters[1].getValue()).toBe(1);
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
    const [c0] = await second.registry.listCounters();
    expect(await c0.getValue()).toBe(2);
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
