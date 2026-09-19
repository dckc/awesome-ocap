import { newWorkersRpcResponse } from "capnweb";
import { Storage } from "./storage.js";
import { Counter, RegistryApi } from "./counter.js";

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
    this.registerFactory("counter", (key) => new Counter(this.writeThru));
    this.#api = new RegistryApi(this.writeThru);
    this.exportAs(this.#api, "registry:main");
  }

  #api;

  async fetch(request) {
    return newWorkersRpcResponse(request, this.#api);
  }
}
