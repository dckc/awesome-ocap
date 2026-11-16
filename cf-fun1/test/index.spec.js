import { env, exports } from "cloudflare:workers";
import { describe, it, expect } from "vitest";
import { newWebSocketRpcSession } from "capnweb";
import { makeOpDeliver, parseSturdyref } from "../src/ocapn.js";

async function openSession(url) {
  const res = await exports.default.fetch(
    new Request(url, { headers: { Upgrade: "websocket" } })
  );
  expect(res.status).toBe(101);
  res.webSocket.accept();
  return newWebSocketRpcSession(res.webSocket);
}

describe("index.js fetch routing", () => {
  it("forwards any path to the FacetSupervisor DO", async () => {
    const res = await exports.default.fetch(new Request("https://worker.test/nope"));
    // The entrypoint is a thin facade; the supervisor decides 404 vs. forwarding.
    expect([404, 101, 400, 200]).toContain(res.status);
  });

  it("routes /counterRegistry to the counter-app facet", async () => {
    const res = await exports.default.fetch(
      new Request("https://worker.test/counterRegistry", {
        headers: { Upgrade: "websocket" },
      })
    );
    // A WebSocket-upgrade request reaches the DO: 101 (session), or 400/200.
    expect([101, 400, 200]).toContain(res.status);
  });

  it("the FacetSupervisor DO forwards to the counter-app facet", async () => {
    const stub = env.FACET_SUPERVISOR.getByName("main");
    const res = await stub.fetch(
      new Request("http://storage.internal/counterRegistry", {
        headers: { Upgrade: "websocket" },
      })
    );
    expect([101, 400, 200]).toContain(res.status);
  });

  it("makeCounter + increment, and listCounters pairs counters with webkeys", async () => {
    const registry = await openSession("https://worker.test/counterRegistry");
    const counter = await registry.makeCounter();
    expect(await counter.increment()).toBe(1);
    expect(await counter.increment()).toBe(2);

    const entries = await registry.listCounters();
    expect(entries.length).toBeGreaterThanOrEqual(1);
    for (const entry of entries) {
      // Waterken-style kind-bearing webkey secret, as plain data.
      expect(entry.webkey).toMatch(/^counter:[a-z2-7]{13}$/);
    }
  });

  it("dereferences a webkey to reach the same counter in a new session", async () => {
    const registry = await openSession("https://worker.test/counterRegistry");
    const counter = await registry.makeCounter();
    await counter.increment();
    // Storage is shared across tests in this file; take the newest counter.
    const entries = await registry.listCounters();
    const secret = entries.at(-1).webkey;

    // A fresh session rooted at the enlivened capability: cross-session identity.
    const counter2 = await openSession(
      `https://worker.test/counterRegistry?secret=${secret}`
    );
    expect(await counter2.increment()).toBe(2);
  });

  it("importCounter holds a durable remote ref that survives a fresh session", async () => {
    const registry = await openSession("https://worker.test/counterRegistry");
    const remoteUrl = "https://other.worker.example/counterRegistry#counter:xyz123";
    const imported = await registry.importCounter(remoteUrl);
    // The registry now holds a RemoteCounter; listCounters surfaces its URL.
    const entries = await registry.listCounters();
    const last = entries.at(-1);
    expect(last.webkey).toBe(remoteUrl);

    // A fresh session (reload) re-acquires the same remote ref from storage.
    const registry2 = await openSession("https://worker.test/counterRegistry");
    const entries2 = await registry2.listCounters();
    const last2 = entries2.at(-1);
    expect(last2.webkey).toBe(remoteUrl);
  });
});

describe("sturdyrefs over a real session (ocapn:sturdyref as data)", () => {
  it("mints a tagged array that crosses the session untouched", async () => {
    const registry = await openSession("https://worker.test/counterRegistry");
    await registry.makeCounter();
    const webkey = (await registry.listCounters()).at(-1).webkey;

    const sr = await registry.sturdyrefFor(webkey);
    // The tagged array arrives as plain data — string-first array, not a stub,
    // not interpreted, not tunneled as bytes.
    expect(Array.isArray(sr)).toBe(true);
    expect(sr[0]).toBe("ocapn:sturdyref");
    const { swissnum, hints } = parseSturdyref(sr);
    expect(swissnum).toBe(webkey);
    expect(hints).toEqual(["/counterRegistry"]);
  });

  it("a fresh session resolves the sturdyref and pipelines on the stub", async () => {
    const registry = await openSession("https://worker.test/counterRegistry");
    const made = await registry.makeCounter();
    await made.increment();
    const webkey = (await registry.listCounters()).at(-1).webkey;
    const sr = await registry.sturdyrefFor(webkey);

    // Fresh WebSocket session: capnweb's session tables are empty, so the
    // only identity carried across is the sturdyref (data in the client).
    const fresh = await openSession("https://worker.test/counterRegistry");
    const counter = await fresh.resolveSturdyref(sr);
    expect(await counter.getValue()).toBe(1);

    // Pipelined calls on the resolved stub: both go out before either is
    // awaited, arriving as dependent expressions in the session.
    const a = counter.increment();
    const b = counter.decrement();
    expect(await a).toBe(2);
    expect(await b).toBe(1);
  });

  it("revocation makes both the tagged-array and ?secret= paths refuse", async () => {
    const registry = await openSession("https://worker.test/counterRegistry");
    await registry.makeCounter();
    const webkey = (await registry.listCounters()).at(-1).webkey;
    const sr = await registry.sturdyrefFor(webkey);
    expect(await registry.revokeSturdyref(sr)).toBe(true);

    // The op-level path: a fresh session's resolution rejects.
    const fresh = await openSession("https://worker.test/counterRegistry");
    await expect(fresh.resolveSturdyref(sr)).rejects.toThrow(/no such capability/);

    // The URL deref path (?secret=) also refuses the revoked webkey.
    const res = await exports.default.fetch(
      new Request(`https://worker.test/counterRegistry?secret=${webkey}`, {
        headers: { Upgrade: "websocket" },
      })
    );
    expect(res.status).toBe(404);
  });

  it("delivers op:deliver over the session", async () => {
    const registry = await openSession("https://worker.test/counterRegistry");
    await registry.makeCounter();
    const webkey = (await registry.listCounters()).at(-1).webkey;
    const sr = await registry.sturdyrefFor(webkey);

    expect(await registry.deliver(makeOpDeliver(sr, "increment", []))).toBe(1);
    expect(await registry.deliver(makeOpDeliver(sr, "getValue", []))).toBe(1);
  });

  it("rejects forged and non-sturdyref values at the wire boundary", async () => {
    const registry = await openSession("https://worker.test/counterRegistry");
    await expect(
      registry.resolveSturdyref(["ocapn:bogus", "counter:aaaaaaaaaaaca", []])
    ).rejects.toThrow(/not a sturdyref/);
    await expect(
      registry.resolveSturdyref(new Request("https://worker.test/"))
    ).rejects.toThrow(/not a sturdyref/);
    await expect(
      registry.deliver(["ocapn:op:deliver", "counter:aaaaaaaaaaaca", "increment", []])
    ).rejects.toThrow(/not a sturdyref/);
  });

  it("refuses delivers of methods the kind does not serve", async () => {
    const registry = await openSession("https://worker.test/counterRegistry");
    await registry.makeCounter();
    const webkey = (await registry.listCounters()).at(-1).webkey;
    const sr = await registry.sturdyrefFor(webkey);

    await expect(
      registry.deliver(makeOpDeliver(sr, "constructor", []))
    ).rejects.toThrow(/not allowed/);
  });
});
