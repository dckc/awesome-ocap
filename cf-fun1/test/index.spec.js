import { env, exports } from "cloudflare:workers";
import { describe, it, expect } from "vitest";

describe("index.js fetch routing", () => {
  it("returns 404 for an unknown path", async () => {
    const res = await exports.default.fetch(new Request("https://worker.test/nope"));
    expect(res.status).toBe(404);
  });

  it("routes /counterRegistry to the CounterRegistry DO", async () => {
    const res = await exports.default.fetch(
      new Request("https://worker.test/counterRegistry", {
        headers: { Upgrade: "websocket" },
      })
    );
    // A WebSocket-upgrade request reaches the DO: 101 (session), or 400/200.
    expect([101, 400, 200]).toContain(res.status);
  });

  it("the CounterRegistry DO serves the counter app", async () => {
    const stub = env.COUNTER_REGISTRY.getByName("main");
    const res = await stub.fetch(
      new Request("http://storage.internal/counterRegistry", {
        headers: { Upgrade: "websocket" },
      })
    );
    expect([101, 400, 200]).toContain(res.status);
  });
});
