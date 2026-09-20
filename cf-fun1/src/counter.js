import { RpcTarget, newHttpBatchRpcSession } from "capnweb";

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
   */
  constructor(writeThru, secretFor, remoteFactory) {
    super();
    this.#writeThru = writeThru;
    this.#secretFor = secretFor;
    this.#remoteFactory = remoteFactory;
    this.#state = this.#writeThru(this, { counters: [] });
  }

  #writeThru;
  #secretFor;
  #remoteFactory;
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
}
