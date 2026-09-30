import { newWorkersRpcResponse } from "capnweb";
import { Storage } from "./storage.js";
import { Counter, RegistryApi, RemoteCounter } from "./counter.js";

/**
 * The app's Durable Object. The named durable host for the counter app: it
 * extends the storage engine (SQLite + writeThru + refTable), owns the app
 * wiring (registers the counter capability factory, names the registry
 * capability), and serves a RegistryApi capability. Routing to this DO is
 * `index.js`'s job — here it just hands out the capability.
 */
export class CounterRegistry extends Storage {
  constructor(ctx, env) {
    super(ctx, env);
    // Storage's constructor set writeThru/refTable. Wire the app: register the
    // counter factory (needed to resurrect stored counter refs) and build the
    // capability surface. It's in-memory, so recreated after any eviction.
    this.registerFactory("counter", (key) => {
      return new Counter(this.writeThru);
    });
    // Remote counters proxy to their owner. The facet can't fetch the network
    // itself, so RemoteCounter's capnweb session fetch is routed to the
    // supervisor (via globalOutbound), which relays the call to the owner.
    const remoteFactory = (remoteRef) => new RemoteCounter(remoteRef);
    this.#api = new RegistryApi(this.writeThru, (cap) => this.secretFor(cap), remoteFactory, {
      decodeFor: (secret) => this.decodeSecret(secret),
      revokeFor: (secret) => this.revokeSecret(secret),
      route: "/counterRegistry",
    });
    this.exportAs(this.#api, "registry:main");
  }

  #api;

  async fetch(request) {
    const url = new URL(request.url);
    // A `?secret=` dereference: enliven the referenced capability and serve an
    // RPC session rooted at it (the cross-session identity capnweb lacks).
    const secret = url.searchParams.get("secret");
    if (secret !== null) {
      const cap = this.decodeSecret(secret);
      if (!cap) return new Response("no such capability", { status: 404 });
      return newWorkersRpcResponse(request, cap);
    }
    return newWorkersRpcResponse(request, this.#api);
  }
}
