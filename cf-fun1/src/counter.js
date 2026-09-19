import { RpcTarget } from "capnweb";

/**
 * App RpcTargets hold `#state = writeThru(this, initial)`. The writeThru
 * factory (from the storage engine) persists every mutation to this object's
 * durable storage; the app never deals with keys or ids — the storage layer
 * owns the `this -> key` mapping. The registry holds counter *capabilities* in
 * its own state (persisted as refs), so holding one is the authority.
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
  constructor(writeThru) {
    super();
    this.#writeThru = writeThru;
    this.#state = this.#writeThru(this, { counters: [] });
  }

  #writeThru;
  #state;

  async makeCounter() {
    const counter = new Counter(this.#writeThru);
    this.#state.counters = [...this.#state.counters, counter];
    return counter;
  }

  async listCounters() {
    return [...this.#state.counters];
  }
}
