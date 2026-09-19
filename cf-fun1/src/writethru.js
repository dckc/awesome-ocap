import { RpcTarget } from "capnweb";

/**
 * A table mapping capabilities (RpcTargets) to their durable storage key so they
 * can be persisted as data. Agoric-style: durable state references remotables
 * by key, resurrected through a per-kind factory on load.
 *
 * The `capability -> key` mapping lives in a WeakMap here — storage bookkeeping,
 * never pinned on the app object. The allocator (`setAllocator`) assigns a
 * durable key to a fresh RpcTarget the first time it is encoded. The factory
 * (`addFactory`) resurrects a capability from a stored key.
 */
export class RefTable {
  #factories = new Map(); // kind -> (key) => RpcTarget
  #live = new Map(); // `${kind}:${key}` -> RpcTarget
  #keys = new WeakMap(); // capability -> durable key
  #alloc;

  constructor({ alloc }) {
    this.#alloc = alloc;
  }

  addFactory(kind, makeInstance) {
    this.#factories.set(kind, makeInstance);
  }

  getKey(obj) {
    return this.#keys.get(obj);
  }

  /** Give a capability a stable durable name; refs to it then serialize deterministically. */
  exportAs(obj, key) {
    this.#keys.set(obj, key);
  }

  ensureKey(obj) {
    let key = this.#keys.get(obj);
    if (key === undefined) {
      key = this.#alloc(obj);
      this.#keys.set(obj, key);
    }
    return key;
  }

  encodeValue(value) {
    if (value instanceof RpcTarget) {
      return {
        __ref: { kind: value.refKind, key: this.ensureKey(value) },
      };
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
        this.#keys.set(live, key);
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
 * key/id — the storage layer owns the `self -> key` mapping in the RefTable's
 * WeakMap. Hydration is deferred until first access, so a rehydrated capability
 * can have its key registered before any state is touched.
 */
export function makeWriteThru({ getSql, refTable, keyFor }) {
  return function writeThru(self, initial) {
    const sql = getSql();

    const ensureKey = () => {
      let key = refTable.getKey(self);
      if (key === undefined) {
        key = keyFor(self);
        refTable.exportAs(self, key);
      }
      return key;
    };

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
