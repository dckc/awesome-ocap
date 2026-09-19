import { env } from "cloudflare:workers";
import { describe, it, expect } from "vitest";

describe("counter registry", () => {
  const registry = (name) => env.REGISTRY.getByName(`test-main-${name}`);
  const counterStub = (name) => env.COUNTER.getByName(name);

  it("starts with no counters", async () => {
    const reg = registry("empty");
    expect(await reg.listCounterIds()).toEqual([]);
  });

  it("makeCounter creates a counter and lists it", async () => {
    const reg = registry("make");
    const id = await reg.createCounter();
    expect(id).toEqual(1);
    expect(await reg.listCounterIds()).toEqual([1]);
    expect(await reg.getCounterId(1)).toEqual(1);
  });

  it("increment and decrement change the value", async () => {
    const counter = counterStub("incr");
    expect(await counter.getValue()).toBe(0);
    expect(await counter.increment()).toBe(1);
    expect(await counter.increment()).toBe(2);
    expect(await counter.decrement()).toBe(1);
    expect(await counter.getValue()).toBe(1);
  });

  it("each counter is independent", async () => {
    const c1 = counterStub("a");
    const c2 = counterStub("b");

    await c1.increment();
    expect(await c1.getValue()).toBe(1);
    expect(await c2.getValue()).toBe(0);
  });
});
