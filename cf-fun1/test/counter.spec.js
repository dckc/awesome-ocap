import { describe, it, expect } from "vitest";
import { Counter, RegistryApi, RemoteCounter } from "../src/counter.js";
import { makeWriteThru, RefTable } from "../src/writethru.js";
import { formatSecret } from "../src/storage.js";

const TEST_ORIGIN = "https://worker.example";

// In-memory stand-in for the storage engine's SQL, so the app layer can be
// tested without workerd. Mirrors Storage: keyFor emits kind-bearing secrets.
function makeInMemoryStore() {
  const rows = new Map();
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
      const kind = obj.refKind ?? "cap";
      const bits = new Uint8Array(8);
      for (let i = 0; i < 8; i++) bits[i] = Math.floor(Math.random() * 256);
      return `${kind}:${formatSecret(bits)}`;
    },
    rows,
  };
}

describe("formatSecret", () => {
  it("is 13 chars from the base32 alphabet", () => {
    const bits = new Uint8Array(8);
    for (let i = 0; i < 8; i++) bits[i] = Math.floor(Math.random() * 256);
    expect(formatSecret(bits)).toMatch(/^[a-z2-7]{13}$/);
  });

  it("two distinct inputs produce distinct secrets", () => {
    const a = new Uint8Array(8);
    const b = new Uint8Array(8);
    b[7] = 1;
    expect(formatSecret(a)).not.toBe(formatSecret(b));
  });

  it("formats a deterministic input", () => {
    const bits = new Uint8Array(8); // all zeros except the low bit
    bits[7] = 1;
    expect(formatSecret(bits)).toBe("aaaaaaaaaaaca");
  });
});

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
  refTable.addRemoteFactory("counter", (remoteRef) => new RemoteCounter(remoteRef));
  const secretFor = (obj) => refTable.ensureKey(obj);
  const remoteFactory = (remoteRef) => new RemoteCounter(remoteRef);
  const registry = new RegistryApi(writeThru, secretFor, remoteFactory);
  refTable.exportAs(registry, "registry:main");
  // Storage only hands out the secret; building the web-key URL (origin +
  // route) is the supervisor's job, as the Storage DO would expose it.
  const webkeyFor = (obj) => {
    const secret = refTable.ensureKey(obj);
    return `${TEST_ORIGIN}/counterRegistry#${secret}`;
  };
  return { registry, refTable, writeThru, store, webkeyFor };
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
    const entries = await registry.listCounters();
    expect(entries).toHaveLength(2);
    expect(entries[0].counter).toBeInstanceOf(Counter);
    expect(entries[1].counter).toBeInstanceOf(Counter);
    expect(await entries[0].counter.getValue()).toBe(0);
    expect(await entries[1].counter.getValue()).toBe(1);
    // Each entry pairs the capability with its webkey secret, as data.
    expect(entries[0].webkey).toMatch(/^counter:[a-z2-7]{13}$/);
    expect(entries[1].webkey).toMatch(/^counter:[a-z2-7]{13}$/);
    expect(entries[0].webkey).not.toBe(entries[1].webkey);
  });

  it("each counter has an unguessable kind-bearing webkey (at the storage layer)", async () => {
    const { registry, webkeyFor } = setupApp();
    const a = await registry.makeCounter();
    const b = await registry.makeCounter();
    const entries = await registry.listCounters();
    const counters = entries.map((e) => e.counter);
    expect(counters.length).toBeGreaterThanOrEqual(1);
    for (const c of counters) {
      const wk = webkeyFor(c);
      expect(typeof wk).toBe("string");
      // Waterken web-key: https URL, kind-bearing secret in the fragment:
      // `counter:<13 chars base32>`. The secret doubles as the storage key.
      expect(wk).toMatch(
        /^https:\/\/worker\.example\/counterRegistry#counter:[a-z2-7]{13}$/
      );
    }
    const [wa, wb] = counters.map((c) => webkeyFor(c));
    expect(wa).not.toBe(wb);
  });

  it("a counter's stored ref is a local Waterken-style {\\\"*\\\": secret}", async () => {
    const { store, registry, webkeyFor } = setupApp();
    const counter = await registry.makeCounter();
    await counter.increment(); // touch the counter's own row too
    const secret = new URL(webkeyFor(counter)).hash.slice(1);
    // The counter is referenced from the registry's row as a local ref.
    const registryRow = store.rows.get("registry:main");
    expect(registryRow).toContain(`"*":"${secret}"`);
  });

  it("decodeSecret enlivens a counter's secret into its capability", async () => {
    const { registry, refTable, webkeyFor } = setupApp();
    const counter = await registry.makeCounter();
    await counter.increment();
    await counter.increment();
    const webkey = webkeyFor(counter);
    const secret = new URL(webkey).hash.slice(1); // drop the leading '#'
    expect(secret.startsWith("counter:")).toBe(true);
    const revived = refTable.decodeSecret(secret);
    expect(revived).toBeInstanceOf(Counter);
    // The live instance, not a factory duplicate: one instance per key.
    expect(revived).toBe(counter);
    expect(await revived.getValue()).toBe(2);
    // Same instance: decodeSecret is idempotent within the live RefTable.
    expect(refTable.decodeSecret(secret)).toBe(revived);
    // An unknown kind/secret yields undefined, not an error.
    expect(refTable.decodeSecret("nope:doesnotexist")).toBeUndefined();
    expect(refTable.decodeSecret("no-colon")).toBeUndefined();
  });

  it("a remote ref {\"@\": url} deserializes to a proxy stub via the remote factory", async () => {
    const store = makeInMemoryStore();
    const refTable = new RefTable({ alloc: (o) => store.keyFor(o) });
    const writeThru = makeWriteThru({ getSql: () => store.sql, refTable, keyFor: (o) => store.keyFor(o) });
    // A remote factory turns a web-key URL into a proxy stub.
    const remoteUrl = "https://other.example/counterRegistry#counter:abc123xyz4";
    refTable.addRemoteFactory("counter", (url) => ({ remoteRef: url, kind: "proxy" }));
    // Persist a state value holding the remote ref.
    const decoded = refTable.decodeValue({ counters: [{ "@": remoteUrl }] });
    expect(decoded.counters[0].remoteRef).toBe(remoteUrl);
    expect(decoded.counters[0].kind).toBe("proxy");
  });

  it("a remote ref with no registered remote factory throws instead of yielding null", () => {
    const refTable = new RefTable({ alloc: () => "cap:aaaaaaaaaaaca" });
    const remoteUrl = "https://other.example/counterRegistry#cap:aaaaaaaaaaaca";
    // Throwing keeps the stored {"@": url} intact; a null here would be
    // persisted over it on the next mutation, destroying the ref.
    expect(() => refTable.decodeValue({ counters: [{ "@": remoteUrl }] })).toThrow(
      /no remote factory for capability kind cap/
    );
  });

  it("importCounter holds a remote ref that persists across app instances", async () => {
    const store = makeInMemoryStore();
    const remoteUrl = "https://other.example/counterRegistry#counter:zzz";
    const first = setupApp(store);
    const imported = await first.registry.importCounter(remoteUrl);
    expect(imported).toBeInstanceOf(RemoteCounter);
    // listCounters returns the remote URL as the webkey.
    const entries = await first.registry.listCounters();
    expect(entries[0].webkey).toBe(remoteUrl);
    // A fresh registry over the SAME storage: the remote ref survives.
    const second = setupApp(store);
    const entries2 = await second.registry.listCounters();
    expect(entries2[0].webkey).toBe(remoteUrl);
    expect(entries2[0].counter).toBeInstanceOf(RemoteCounter);
    // The stored registry row uses the remote {"@": url} shape, not local {"*"}.
    expect(store.rows.get("registry:main")).toContain(`"@":"${remoteUrl}"`);
  });

  it("a web-key deref reaches the registry's own live counter (no second instance)", async () => {
    const { registry, refTable, webkeyFor } = setupApp();
    const counter = await registry.makeCounter();
    await counter.increment();
    const secret = new URL(webkeyFor(counter)).hash.slice(1);
    // The remote-relay path: a deref enlivens by secret and mutates; the
    // registry's view must see it, not a diverging in-memory copy.
    const revived = refTable.decodeSecret(secret);
    expect(revived).toBe(counter);
    await revived.increment();
    const [entry] = await registry.listCounters();
    expect(await entry.counter.getValue()).toBe(2);
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
    const [entry] = await second.registry.listCounters();
    expect(await entry.counter.getValue()).toBe(2);
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
