import { describe, it, expect } from "vitest";
import { MessageChannel } from "node:worker_threads";
import { newMessagePortRpcSession } from "capnweb";

import { Counter, RegistryApi, RemoteCounter } from "../src/counter.js";
import { makeWriteThru, RefTable } from "../src/writethru.js";
import { formatSecret } from "../src/storage.js";
import { isWebkeyDeref } from "../src/egressPolicy.js";
import {
  STURDYREF_TAG,
  OP_DELIVER_TAG,
  makeSturdyref,
  parseSturdyref,
  srToUrl,
  makeOpDeliver,
  parseOpDeliver,
  isSwissnum,
} from "../src/ocapn.js";

const TEST_ORIGIN = "https://worker.example";

// In-memory stand-in for the storage engine's SQL, so the app layer can be
// tested without workerd. Mirrors Storage: keyFor emits kind-bearing secrets;
// revocation is a `revoked!`-prefixed row in the same table.
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

// Mirrors Storage's revocation-aware decode/revoke, against the shared rows.
function setupApp(shared) {
  const store = shared || makeInMemoryStore();
  const refTable = new RefTable({ alloc: (obj) => store.keyFor(obj) });
  const writeThru = makeWriteThru({
    getSql: () => store.sql,
    refTable,
    keyFor: (obj) => store.keyFor(obj),
  });
  refTable.addFactory("counter", (key) => new Counter(writeThru));
  refTable.addRemoteFactory("counter", (remoteRef) => new RemoteCounter(remoteRef));
  const secretFor = (obj) => refTable.ensureKey(obj);
  const remoteFactory = (remoteRef) => new RemoteCounter(remoteRef);
  const decodeFor = (secret) => {
    if (store.rows.has(`revoked!${secret}`)) return undefined;
    try {
      return refTable.decodeValue({ "*": secret });
    } catch {
      return undefined;
    }
  };
  const revokeFor = (secret) => {
    store.rows.set(`revoked!${secret}`, "");
    return true;
  };
  const registry = new RegistryApi(writeThru, secretFor, remoteFactory, {
    decodeFor,
    revokeFor,
    route: "/counterRegistry",
  });
  refTable.exportAs(registry, "registry:main");
  return { registry, refTable, writeThru, store, secretFor };
}

describe("the sturdyref codec", () => {
  it("round-trips a minted sturdyref", () => {
    const sr = makeSturdyref("counter:aaaaaaaaaaaca", ["/counterRegistry"]);
    expect(sr[0]).toBe(STURDYREF_TAG);
    const { swissnum, hints } = parseSturdyref(sr);
    expect(swissnum).toBe("counter:aaaaaaaaaaaca");
    expect(hints).toEqual(["/counterRegistry"]);
  });

  it("srToUrl derives a web-key URL with the secret in the fragment", () => {
    const sr = makeSturdyref("counter:aaaaaaaaaaaca", ["/counterRegistry"]);
    expect(srToUrl(TEST_ORIGIN, sr)).toBe(
      `${TEST_ORIGIN}/counterRegistry#counter:aaaaaaaaaaaca`
    );
  });

  it("rejects a forged tag, wrong arity, and non-arrays", () => {
    expect(() => parseSturdyref(["ocapn:sturdy-ref", "counter:aaaaaaaaaaaca", []])).toThrow();
    expect(() => parseSturdyref([STURDYREF_TAG, "counter:aaaaaaaaaaaca"])).toThrow();
    expect(() => parseSturdyref([STURDYREF_TAG, "counter:aaaaaaaaaaaca", [], "extra"])).toThrow();
    expect(() => parseSturdyref("ocapn:sturdyref")).toThrow();
    expect(() => parseSturdyref(null)).toThrow();
    expect(() => parseSturdyref({ 0: STURDYREF_TAG })).toThrow();
  });

  it("rejects malformed swissnums", () => {
    expect(() => parseSturdyref(makeSturdyref("counter:short", ["/counterRegistry"]))).toThrow();
    expect(() => parseSturdyref(makeSturdyref("no-kind-separator", ["/counterRegistry"]))).toThrow();
    expect(() => parseSturdyref(makeSturdyref("counter:UPPERCASE123", ["/counterRegistry"]))).toThrow();
    expect(() => parseSturdyref(makeSturdyref(123, ["/counterRegistry"]))).toThrow();
  });

  it("isSwissnum picks out local secrets from web-key values", () => {
    expect(isSwissnum("counter:aaaaaaaaaaaca")).toBe(true);
    expect(isSwissnum("registry:aaaaaaaaaaaca")).toBe(true);
    expect(isSwissnum("https://other.worker.example/counterRegistry#counter:xyz")).toBe(false);
    expect(isSwissnum("counter:short")).toBe(false);
    expect(isSwissnum(123)).toBe(false);
  });

  it("rejects hints that are not route paths", () => {
    expect(() => parseSturdyref(makeSturdyref("counter:aaaaaaaaaaaca", []))).toThrow();
    expect(() =>
      parseSturdyref(makeSturdyref("counter:aaaaaaaaaaaca", ["javascript:alert(1)"]))
    ).toThrow();
    expect(() =>
      parseSturdyref(makeSturdyref("counter:aaaaaaaaaaaca", ["https://evil.example/counterRegistry"]))
    ).toThrow();
    expect(() =>
      parseSturdyref(makeSturdyref("counter:aaaaaaaaaaaca", ["/counter#registry"]))
    ).toThrow();
    expect(() => parseSturdyref(makeSturdyref("counter:aaaaaaaaaaaca", [42]))).toThrow();
  });
});

describe("the op:deliver codec", () => {
  it("round-trips a deliver", () => {
    const sr = makeSturdyref("counter:aaaaaaaaaaaca", ["/counterRegistry"]);
    const op = makeOpDeliver(sr, "increment", []);
    expect(op[0]).toBe(OP_DELIVER_TAG);
    const { target, method, args } = parseOpDeliver(op);
    expect(target.swissnum).toBe("counter:aaaaaaaaaaaca");
    expect(method).toBe("increment");
    expect(args).toEqual([]);
  });

  it("keeps deliver args as one array (args for the call, not spread)", () => {
    const sr = makeSturdyref("counter:aaaaaaaaaaaca", ["/counterRegistry"]);
    const { args } = parseOpDeliver(makeOpDeliver(sr, "setFriend", [sr]));
    expect(args).toEqual([sr]);
  });

  it("rejects forged tags, non-sturdyref targets, and bad method/args", () => {
    const sr = makeSturdyref("counter:aaaaaaaaaaaca", ["/counterRegistry"]);
    expect(() => parseOpDeliver(["ocapn:op:bootstrap", sr, "increment", []])).toThrow();
    expect(() => parseOpDeliver([OP_DELIVER_TAG, "counter:aaaaaaaaaaaca", "increment", []])).toThrow();
    expect(() => parseOpDeliver([OP_DELIVER_TAG, sr, 42, []])).toThrow();
    expect(() => parseOpDeliver([OP_DELIVER_TAG, sr, "increment", "not-an-array"])).toThrow();
    expect(() => parseOpDeliver(makeOpDeliver(sr, "increment", []).slice(0, 3))).toThrow();
  });
});

describe("the registry's sturdyref surface (app layer)", () => {
  it("sturdyrefFor mints a tagged array naming the counter", async () => {
    const { registry } = setupApp();
    const counter = await registry.makeCounter();
    const entries = await registry.listCounters();
    const webkey = entries.at(-1).webkey;
    const sr = await registry.sturdyrefFor(webkey);
    const { swissnum, hints } = parseSturdyref(sr);
    expect(swissnum).toBe(webkey);
    expect(hints).toEqual(["/counterRegistry"]);
    expect(counter).toBeInstanceOf(Counter);
  });

  it("sturdyrefFor rejects a webkey whose kind has no factory", async () => {
    const { registry } = setupApp();
    await expect(registry.sturdyrefFor("nosuchkind:aaaaaaaaaaaca")).rejects.toThrow(
      /no such capability/
    );
  });

  it("a well-formed but never-minted swissnum lazily mints a virgin counter", async () => {
    // The key space is the authority: a capability's factory resurrects any
    // well-formed key, fabricating initial state for one never issued. A
    // guessed key reaches only a fresh object nobody else holds — with 64
    // bits of entropy, colliding with a minted key is infeasible, and
    // revocation still gates resolution.
    const { registry } = setupApp();
    const sr = await registry.sturdyrefFor("counter:aaaaaaaaaaaca");
    const virgin = await registry.resolveSturdyref(sr);
    expect(await virgin.getValue()).toBe(0);
  });

  it("resolveSturdyref enlivens the same counter in a fresh registry", async () => {
    const shared = makeInMemoryStore();
    const first = setupApp(shared);
    const counter = await first.registry.makeCounter();
    await counter.increment();

    const second = setupApp(shared); // fresh "isolate": same durable storage
    const sr = await second.registry.sturdyrefFor(
      (await second.registry.listCounters()).at(-1).webkey
    );
    const revived = await second.registry.resolveSturdyref(sr);
    expect(await revived.getValue()).toBe(1);
    expect(await revived.increment()).toBe(2);
  });

  it("revokeSturdyref makes later resolutions reject", async () => {
    const shared = makeInMemoryStore();
    const first = setupApp(shared);
    await first.registry.makeCounter();
    const sr = await first.registry.sturdyrefFor(
      (await first.registry.listCounters()).at(-1).webkey
    );
    expect(await first.registry.revokeSturdyref(sr)).toBe(true);

    const second = setupApp(shared);
    await expect(second.registry.resolveSturdyref(sr)).rejects.toThrow(
      /no such capability/
    );
  });

  it("resolveSturdyref rejects values that are not sturdyrefs", async () => {
    const { registry } = setupApp();
    await expect(registry.resolveSturdyref("counter:aaaaaaaaaaaca")).rejects.toThrow();
    await expect(
      registry.resolveSturdyref(["ocapn:desc:import-object", 1])
    ).rejects.toThrow(/not a sturdyref/);
    if (typeof Request === "function") {
      await expect(
        registry.resolveSturdyref(new Request("https://worker.example/"))
      ).rejects.toThrow(/not a sturdyref/);
    }
  });
});

describe("op:deliver through the registry (app layer)", () => {
  it("delivers increment and decrement to a sturdyref target", async () => {
    const { registry } = setupApp();
    await registry.makeCounter();
    const sr = await registry.sturdyrefFor(
      (await registry.listCounters()).at(-1).webkey
    );
    expect(await registry.deliver(makeOpDeliver(sr, "increment", []))).toBe(1);
    expect(await registry.deliver(makeOpDeliver(sr, "increment", []))).toBe(2);
    expect(await registry.deliver(makeOpDeliver(sr, "decrement", []))).toBe(1);
    expect(await registry.deliver(makeOpDeliver(sr, "getValue", []))).toBe(1);
  });

  it("rejects methods the target's kind does not serve", async () => {
    const { registry } = setupApp();
    await registry.makeCounter();
    const sr = await registry.sturdyrefFor(
      (await registry.listCounters()).at(-1).webkey
    );
    await expect(registry.deliver(makeOpDeliver(sr, "constructor", []))).rejects.toThrow(
      /not allowed/
    );
    await expect(registry.deliver(makeOpDeliver(sr, "toString", []))).rejects.toThrow(
      /not allowed/
    );
    await expect(registry.deliver(makeOpDeliver(sr, "nope", []))).rejects.toThrow(
      /not allowed/
    );
  });

  it("rejects a deliver whose target is revoked", async () => {
    const shared = makeInMemoryStore();
    const first = setupApp(shared);
    await first.registry.makeCounter();
    const sr = await first.registry.sturdyrefFor(
      (await first.registry.listCounters()).at(-1).webkey
    );
    await first.registry.revokeSturdyref(sr);

    const second = setupApp(shared);
    await expect(
      second.registry.deliver(makeOpDeliver(sr, "getValue", []))
    ).rejects.toThrow(/no such capability/);
  });
});

describe("the sturdyref surface over a real capnweb session", () => {
  // A MessagePort session exercises the wire: tagged arrays cross as
  // arguments and results, and returned capabilities arrive as stubs.
  function openSession(target) {
    const { port1, port2 } = new MessageChannel();
    newMessagePortRpcSession(port1, target);
    return newMessagePortRpcSession(port2, undefined, true);
  }

  it("a sturdyref rides the session as data and resolves to a live stub", async () => {
    const { registry } = setupApp();
    await registry.makeCounter();
    const client = openSession(registry);

    // Mint over the wire: the tagged array must arrive as plain data.
    const webkey = (await client.listCounters()).at(-1).webkey;
    const sr = await client.sturdyrefFor(webkey);
    expect(Array.isArray(sr)).toBe(true);
    expect(sr[0]).toBe(STURDYREF_TAG);

    // Resolve over the wire: the capability arrives as a usable stub.
    const stub = await client.resolveSturdyref(sr);
    expect(await stub.increment()).toBe(1);
    expect(await stub.increment()).toBe(2);
    expect(await stub.getValue()).toBe(2);
  });

  it("delivers an op over the session", async () => {
    const { registry } = setupApp();
    await registry.makeCounter();
    const client = openSession(registry);
    const webkey = (await client.listCounters()).at(-1).webkey;
    const sr = await client.sturdyrefFor(webkey);

    expect(await client.deliver(makeOpDeliver(sr, "increment", []))).toBe(1);
  });

  it("a revoked sturdyref rejects over the session", async () => {
    const shared = makeInMemoryStore();
    const first = setupApp(shared);
    await first.registry.makeCounter();
    const webkey = (await first.registry.listCounters()).at(-1).webkey;
    const sr = await first.registry.sturdyrefFor(webkey);
    await first.registry.revokeSturdyref(sr);

    const second = setupApp(shared);
    const client = openSession(second.registry);
    await expect(client.resolveSturdyref(sr)).rejects.toThrow(/no such capability/);
  });

  it("forged values reject over the session", async () => {
    const { registry } = setupApp();
    const client = openSession(registry);
    await expect(client.resolveSturdyref(["ocapn:bogus", "counter:aaaaaaaaaaaca", []])).rejects
      .toThrow;
    await expect(client.resolveSturdyref(42)).rejects.toThrow;
  });
});

describe("the egress relay policy", () => {
  const hosts = ["localhost:8787", "localhost:8788"];

  it("permits only web-key derefs to allowlisted hosts", () => {
    expect(
      isWebkeyDeref("http://localhost:8788/counterRegistry?secret=counter:abc", hosts)
    ).toBe(true);
    expect(
      isWebkeyDeref("https://localhost:8787/counterRegistry?secret=counter:abc", hosts)
    ).toBe(true);
  });

  it("refuses other hosts, even with the right path and secret", () => {
    expect(
      isWebkeyDeref("https://evil.example/counterRegistry?secret=leak-me", hosts)
    ).toBe(false);
    expect(
      isWebkeyDeref("https://localhost:9999/counterRegistry?secret=counter:abc", hosts)
    ).toBe(false);
  });

  it("refuses other paths, missing secrets, and non-HTTP schemes", () => {
    expect(isWebkeyDeref("http://localhost:8788/counterRegistry", hosts)).toBe(false);
    expect(
      isWebkeyDeref("http://localhost:8788/other?secret=counter:abc", hosts)
    ).toBe(false);
    expect(
      isWebkeyDeref("file://localhost:8788/counterRegistry?secret=counter:abc", hosts)
    ).toBe(false);
    expect(isWebkeyDeref("not a url", hosts)).toBe(false);
  });

  it("an empty allowlist relays nothing", () => {
    expect(
      isWebkeyDeref("http://localhost:8788/counterRegistry?secret=counter:abc", [])
    ).toBe(false);
  });
});
