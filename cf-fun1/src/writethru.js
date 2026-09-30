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
  #remoteFactories = new Map(); // kind -> (remoteRef) => RpcTarget proxy stub
  #remotes = new Map(); // remoteRef -> live proxy stub
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

  /** Split a `<kind>:<key>` secret into its kind and key parts. */
  parseSecret(secret) {
    const colon = secret.indexOf(":");
    if (colon < 1) return undefined;
    return { kind: secret.slice(0, colon), key: secret };
  }

  /**
   * Encode a state value for persistence. Capability references are encoded
   * with a marker:
   *   - `{"@": "<full web-key URL>"}` — a remote reference to a capability
   *     hosted on another worker. Deserializing yields a remote proxy stub.
   *   - `{"*": "<kind>:<secret>"}` — a local reference, resolved through the
   *     RefTable's per-kind factory on load.
   * Distinguishes local vs remote by whether the capability declares a remote
   * web-key URL (`remoteRef`); only that case is remote.
   */
  encodeValue(value) {
    if (value instanceof RpcTarget) {
      if (typeof value.remoteRef === "string") return { "@": value.remoteRef };
      return { "*": this.ensureKey(value) };
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
    if (value && typeof value === "object") {
      // Remote reference: a full web-key URL, deserializes to a proxy stub.
      if (typeof value["@"] === "string") {
        return this.#remoteDecode(value["@"]);
      }
      // Local reference: a kind-bearing secret, resurrected via a factory.
      if (typeof value["*"] === "string") {
        const secret = value["*"];
        const parsed = this.parseSecret(secret);
        if (parsed === undefined) throw new Error(`malformed reference: ${secret}`);
        const { kind, key } = parsed;
        const liveKey = secret;
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

  #remoteDecode(remoteRef) {
    const stub = this.#remotes.get(remoteRef);
    if (stub) return stub;
    const kind = this.#remoteKindOf(remoteRef);
    const makeStub = this.#remoteFactories.get(kind);
    if (!makeStub) {
      throw new Error(`no remote factory for capability kind ${kind}: ${remoteRef}`);
    }
    const created = makeStub(remoteRef);
    this.#remotes.set(remoteRef, created);
    return created;
  }

  /** The capability kind a remote web-key URL points at (from its secret). */
  #remoteKindOf(remoteRef) {
    const hash = remoteRef.indexOf("#");
    const secret = hash >= 0 ? remoteRef.slice(hash + 1) : remoteRef;
    const colon = secret.indexOf(":");
    return colon > 0 ? secret.slice(0, colon) : "cap";
  }

  /** Register a factory that makes a remote proxy stub for a web-key URL. */
  addRemoteFactory(kind, makeStub) {
    this.#remoteFactories.set(kind, makeStub);
  }

  /**
   * Enliven a kind-bearing webkey secret into its live capability.
   *
   * A secret has the form `<kind>:<key>` (e.g. `counter:<base32>`); the kind
   * names the factory that resurrects it, the key is the durable storage key.
   * This is what gives the supervisor a session-independent identity for a
   * capability that capn-web's session-scoped export ids cannot express.
   *
   * @returns {RpcTarget|undefined} the live capability, or undefined if the
   *   secret does not name a known kind or key.
   */
  decodeSecret(secret) {
    if (this.parseSecret(secret) === undefined) return undefined;
    try {
      return this.decodeValue({ "*": secret });
    } catch (err) {
      // Unknown kind or key: not a secret we can enliven.
      return undefined;
    }
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
