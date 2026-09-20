import { RpcTarget } from "capnweb";

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
  constructor(writeThru, secretFor) {
    super();
    this.#writeThru = writeThru;
    this.#secretFor = secretFor;
    this.#state = this.#writeThru(this, { counters: [] });
  }

  #writeThru;
  #secretFor;
  #state;

  async makeCounter() {
    const counter = new Counter(this.#writeThru);
    this.#state.counters = [...this.#state.counters, counter];
    return counter;
  }

  /** Each counter paired with its webkey secret, as plain data. */
  async listCounters() {
    return this.#state.counters.map((counter) => ({
      counter,
      webkey: this.#secretFor(counter),
    }));
  }
}
