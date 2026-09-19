import { RpcTarget } from "capnweb";

/** Symbol tagging an RpcTarget with its durable storage key. */
export const STATE_KEY = Symbol("stateKey");

/**
 * A table mapping capabilities (RpcTargets) to their durable storage key so they
 * can be persisted as data. Agoric-style: durable state references remotables
 * by key, resurrected through a per-kind factory on load.
 *
 * The allocator (`setAllocator`) assigns a durable key to a fresh RpcTarget the
 * first time it is encoded into durable state. The factory (`addFactory`)
 * resurrects a capability from a stored key.
 */
export class RefTable {
  #factories = new Map(); // kind -> (key) => RpcTarget
  #live = new Map(); // `${kind}:${key}` -> RpcTarget
  #alloc;

  setAllocator(fn) {
    this.#alloc = fn;
  }

  addFactory(kind, makeInstance) {
    this.#factories.set(kind, makeInstance);
  }

  encodeValue(value) {
    if (value instanceof RpcTarget) {
      if (!value[STATE_KEY]) {
        if (!this.#alloc) {
          throw new Error(`no key allocator for fresh capability of kind ${value.refKind}`);
        }
        value[STATE_KEY] = this.#alloc(value);
      }
      return { __ref: { kind: value.refKind, key: value[STATE_KEY] } };
    }
    if (Array.isArray(value)) {
      return value.map((x) => this.encodeValue(x));
    }
    if (value && typeof value === "object") {
      const out = {};
      for (const k of Object.keys(value)) out[k] = this.encodeValue(value[k]);
      return out;
    }
    return value;
  }

  decodeValue(value) {
    if (value && value.__ref) {
      const { kind, key } = value.__ref;
      const liveKey = `${kind}:${key}`;
      let live = this.#live.get(liveKey);
      if (!live) {
        const makeInstance = this.#factories.get(kind);
        if (!makeInstance) {
          throw new Error(`no factory for capability kind ${kind}`);
        }
        live = makeInstance(key);
        live[STATE_KEY] = key;
        this.#live.set(liveKey, live);
      }
      return live;
    }
    if (Array.isArray(value)) {
      return value.map((x) => this.decodeValue(x));
    }
    if (value && typeof value === "object") {
      const out = {};
      for (const k of Object.keys(value)) out[k] = this.decodeValue(value[k]);
      return out;
    }
    return value;
  }
}

/**
 * Build a write-through proxy factory bound to a single storage engine.
 *
 * `writeThru(self, initial)` hydrates `self`'s #state from the row named by its
 * storage key and persists every mutation to that row. The app never passes a
 * key/id — the storage layer owns the `self -> key` mapping via `keyFor`.
 * Hydration is deferred until first access, so a rehydrated capability can pin
 * its key (via STATE_KEY) before any state is touched.
 */
export function makeWriteThru({ getSql, refTable, keyFor }) {
  return function writeThru(self, initial) {
    const sql = getSql();

    const ensureKey = () =>
      self[STATE_KEY] ?? (self[STATE_KEY] = keyFor(self));

    let state = null;
    const hydrate = () => {
      if (state) return state;
      const key = ensureKey();
      const rows = sql
        .exec("SELECT value FROM state WHERE key = ?", key)
        .toArray();
      state = rows[0]
        ? refTable.decodeValue(JSON.parse(rows[0].value))
        : refTable.decodeValue(initial);
      if (!rows[0]) {
        sql.exec(
          "INSERT OR REPLACE INTO state (key, value) VALUES (?, ?)",
          key,
          JSON.stringify(refTable.encodeValue(state))
        );
      }
      return state;
    };
    const persist = () => {
      const key = ensureKey();
      sql.exec(
        "INSERT OR REPLACE INTO state (key, value) VALUES (?, ?)",
        key,
        JSON.stringify(refTable.encodeValue(state))
      );
    };

    return new Proxy(
      {},
      {
        get(_t, prop) {
          return hydrate()[prop];
        },
        set(_t, prop, value) {
          const s = hydrate();
          s[prop] = value;
          persist();
          return true;
        },
      }
    );
  };
}
