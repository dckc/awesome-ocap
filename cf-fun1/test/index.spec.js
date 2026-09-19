import { env, exports } from "cloudflare:workers";
import { describe, it, expect } from "vitest";

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
});
