import { RpcTarget, newHttpBatchRpcSession } from "capnweb";
import {
  makeSturdyref,
  parseSturdyref,
  parseOpDeliver,
} from "./ocapn.js";

/**
 * Methods an `op:deliver` may dispatch per capability kind. The registry
 * checks the resolved target's kind here; kinds without an entry are not
 * deliverable-to at all.
 */
const KIND_METHODS = {
  counter: ["getValue", "increment", "decrement"],
};

/**
 * App RpcTargets hold `#state = writeThru(this, initial)`. The writeThru
 * factory (from the storage engine) persists every mutation to this object's
 * durable storage. The registry holds counter *capabilities* in its own state
 * (persisted as refs), so holding one is the authority.
 */

export class Counter extends RpcTarget {
  refKind = "counter";
  constructor(writeThru) {
    super();
    this.#state = writeThru(this, { value: 0, friend: null });
  }

  #state;

  getValue() {
    return this.#state.value;
  }

  increment() {
    this.#state.value += 1;
    return this.#state.value;
  }

  decrement() {
    this.#state.value -= 1;
    return this.#state.value;
  }

  get friend() {
    return this.#state.friend;
  }

  setFriend(cap) {
    this.#state.friend = cap;
  }
}

/**
 * A remote counter: a stub whose state lives on another worker. The facet can't
 * fetch the network directly; its capnweb batch RPC session's `fetch` is routed
 * to the supervisor (via `globalOutbound`), which performs the real outbound
 * fetch to the owning worker and returns the response. So `increment`/etc open
 * a session to the remote web-key URL and delegate to the stub they get back.
 * The web-key URL is the durable identity; it serializes as a remote `{"@"}` ref.
 */
export class RemoteCounter extends RpcTarget {
  refKind = "counter";
  /**
   * @param {string} remoteRef  full web-key URL of the remote counter
   */
  constructor(remoteRef) {
    super();
    this.remoteRef = remoteRef; // encoded as {"@": remoteRef}
  }

  #sessionUrl() {
    // The web-key URL carries the secret in the fragment, which is never sent
    // over the wire. Move it into the query so the owning worker's deref
    // endpoint (?secret=) can read it.
    const u = new URL(this.remoteRef);
    const secret = u.hash.slice(1);
    u.hash = "";
    u.searchParams.set("secret", secret);
    return u.href;
  }

  // capnweb's batch transport is single-shot: one round-trip then the session
  // ends. Open a fresh session per call so every method does its own POST to
  // the owner (routed via the supervisor's egress relay). Returns the remote
  // main stub; its methods return RpcPromises that resolve on await.
  #stubbed() {
    return newHttpBatchRpcSession(this.#sessionUrl());
  }

  async getValue() {
    const s = this.#stubbed();
    return await s.getValue();
  }

  async increment() {
    const s = this.#stubbed();
    return await s.increment();
  }

  async decrement() {
    const s = this.#stubbed();
    return await s.decrement();
  }

  get friend() {
    throw new Error("friend not supported on remote counter");
  }

  setFriend() {
    throw new Error("friend not supported on remote counter");
  }
}

/**
 * The session-root capability served by the CounterRegistry DO. Holds the
 * counter list as capability refs in its #state; the DO owns wiring (factory
 * registration, export name).
 */
export class RegistryApi extends RpcTarget {
  refKind = "registry";
  /**
   * @param {object} writeThru    storage-layer write-through state factory
   * @param {(cap: object) => string} secretFor  a capability's webkey secret;
   *   bound to the storage engine by the DO that builds this API.
   * @param {(remoteRef: string) => object} remoteFactory  makes a remote proxy
   *   stub for a web-key URL.
   * @param {object} [bindings]  optional storage-engine bindings for the
   *   sturdyref surface: `decodeFor(secret)` enlivens or returns undefined,
   *   `revokeFor(secret)` marks revoked, `route` is the path this registry is
   *   served at (used as a sturdyref's locator hint).
   */
  constructor(writeThru, secretFor, remoteFactory, bindings = {}) {
    super();
    this.#writeThru = writeThru;
    this.#secretFor = secretFor;
    this.#remoteFactory = remoteFactory;
    this.#decodeFor = bindings.decodeFor;
    this.#revokeFor = bindings.revokeFor;
    this.#route = bindings.route ?? "/counterRegistry";
    this.#state = this.#writeThru(this, { counters: [] });
  }

  #writeThru;
  #secretFor;
  #remoteFactory;
  #decodeFor;
  #revokeFor;
  #route;
  #state;

  async makeCounter() {
    const counter = new Counter(this.#writeThru);
    this.#state.counters = [...this.#state.counters, counter];
    return counter;
  }

  /**
   * Import a capability from a web-key URL hosted on another worker. The
   * registry holds a RemoteCounter (a durable remote `{"@"}` ref) so the
   * import survives reload; method calls proxy to the owner via the supervisor.
   */
  async importCounter(remoteRef) {
    const counter = this.#remoteFactory(remoteRef);
    this.#state.counters = [...this.#state.counters, counter];
    return counter;
  }

  /** Each counter paired with its webkey (local secret or remote URL). */
  async listCounters() {
    return this.#state.counters.map((counter) => ({
      counter,
      webkey: counter.remoteRef || this.#secretFor(counter),
    }));
  }

  /**
   * Mint a sturdyref for a persisted capability, as data: the swissnum is the
   * capability's webkey secret, the hint is the route this registry serves it
   * at. A webkey (not a live capability) names the target so the mint is
   * wire-safe: over a session the capability would arrive as a stub, whose
   * identity the storage layer cannot see.
   */
  async sturdyrefFor(webkey) {
    if (typeof webkey !== "string") {
      throw new TypeError("sturdyrefFor: webkey (string) required");
    }
    if (!this.#decodeFor) {
      throw new Error("sturdyrefFor: no decode binding");
    }
    if (this.#decodeFor(webkey) === undefined) {
      throw new Error(`sturdyrefFor: no such capability: ${webkey}`);
    }
    return makeSturdyref(webkey, [this.#route]);
  }

  /**
   * Enliven a sturdyref (a tagged array, as data) into the live capability.
   * Rejects when the swissnum is malformed, revoked, or unknown.
   */
  async resolveSturdyref(sturdyref) {
    const { swissnum } = parseSturdyref(sturdyref);
    const cap = this.#decodeFor(swissnum);
    if (cap === undefined) {
      throw new Error(`no such capability: ${swissnum}`);
    }
    return cap;
  }

  /** Revoke a sturdyref's swissnum; resolutions of it fail thereafter. */
  async revokeSturdyref(sturdyref) {
    const { swissnum } = parseSturdyref(sturdyref);
    if (!this.#revokeFor) {
      throw new Error("revokeSturdyref: no revoke binding");
    }
    return this.#revokeFor(swissnum);
  }

  /**
   * Execute an `op:deliver`: resolve the target sturdyref, dispatch `method`
   * with `args`. The method must be one the target's kind serves —
   * `KIND_METHODS` is the allowlist, checked where the resolved kind is
   * known. Anything else the op carries was already rejected by
   * `parseOpDeliver`'s shape checks.
   */
  async deliver(op) {
    const { target, method, args } = parseOpDeliver(op);
    const cap = this.#decodeFor(target.swissnum);
    if (cap === undefined) {
      throw new Error(`no such capability: ${target.swissnum}`);
    }
    const allowed = KIND_METHODS[cap.refKind];
    if (!allowed || !allowed.includes(method)) {
      throw new TypeError(
        `deliver: method ${JSON.stringify(method)} not allowed on ${cap.refKind}`
      );
    }
    return await cap[method](...args);
  }
}
