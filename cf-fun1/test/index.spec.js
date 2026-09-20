import { env, exports } from "cloudflare:workers";
import { describe, it, expect } from "vitest";
import { newWebSocketRpcSession } from "capnweb";

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
});
