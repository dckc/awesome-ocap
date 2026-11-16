/**
 * @file The supervisor Worker: `FacetSupervisor` routes requests into a
 * Dynamic Worker facet (the counter app), and `Egress` relays the facet's
 * single permitted outbound — web-key derefs to an owning worker.
 */
import { DurableObject, WorkerEntrypoint } from "cloudflare:workers";
import { codeId, counterAppModule, mainModule } from "./countersAppBundle.js";
import { isWebkeyDeref } from "./egressPolicy.js";

/**
 * Fixed configuration for the Dynamic Worker that runs the counter-app facet.
 *
 * `limits` are per-invocation ceilings on CPU time and subrequests. They bound
 * compute but NOT the facet's own storage writes: `ctx.storage` is a capability
 * handed to the facet on `facets.get()`, and the loader exposes no storage knob,
 * so the facet can keep accruing rows-written / GB-stored on this account. There
 * is no per-facet storage quota today. The 128MB/isolate memory limit is the
 * only backstop against in-heap blowups; `facets.delete()` is the only
 * reclamation.
 */
const baseLimits = {
  compatibilityDate: "2026-09-19",
  // The facet ships as a multi-module graph (real relative imports between the
  // app files and capnweb), so the runtime must use the URL-based module
  // registry to resolve it. See build-facet.mjs.
  compatibilityFlags: ["new_module_registry"],
  mainModule,
  modules: counterAppModule,
  limits: { cpuMs: 10, subRequests: 5 },
};

/**
 * The supervisor's egress relay, handed to the facet as its `globalOutbound`.
 * The facet can't fetch the network itself, so when a RemoteCounter inside the
 * facet makes an HTTP request (its capnweb batch session's `fetch`), it lands
 * here; the supervisor performs the real outbound fetch to the owning worker
 * and relays the response back. The facet thus "calls up to the supervisor" and
 * gets a live capnweb stub back, without direct network access.
 */
export class Egress extends WorkerEntrypoint {
  async fetch(request) {
    console.log(`[Egress] relaying ${request.method} ${request.url}`);
    // Relay ONLY web-key derefs to an allowlisted owning worker: a
    // `counterRegistry` path with a `secret`, on a host in EGRESS_HOSTS.
    // The facet is confined (egress capped) — this is the single, allowlisted
    // outbound it's permitted, so it can't reach arbitrary hosts, internal
    // bindings, or exfiltrate data shaped like a deref to a host we don't own.
    const allowedHosts = (this.env?.EGRESS_HOSTS ?? "")
      .split(",")
      .map((h) => h.trim())
      .filter(Boolean);
    if (!isWebkeyDeref(request.url, allowedHosts)) {
      console.log(
        `[Egress] REFUSED ${request.url} (allowed hosts: ${allowedHosts.join(",") || "none"})`
      );
      return new Response("forbidden", { status: 403 });
    }
    const res = await fetch(request);
    console.log(`[Egress] -> ${res.status}`);
    return new Response(res.body, { status: res.status });
  }
}

/** Route table: request path -> { facet name, exported class name }. */
const routes = {
  "/counterRegistry": {
    facet: "counterApp",
    class: "CounterRegistry",
  },
};

/**
 * A supervisor Durable Object. It loads a Dynamic Worker as a facet — a child
 * DO with its own isolated SQLite database that the supervisor cannot read —
 * and forwards requests into it. The supervisor owns the routing table and the
 * resource limits; it is agnostic about what the facet's code does.
 */
export class FacetSupervisor extends DurableObject {
  async fetch(request) {
    const route = routes[new URL(request.url).pathname];
    if (!route) return new Response("Not found", { status: 404 });

    const facet = this.ctx.facets.get(route.facet, async () => {
      const worker = this.env.LOADER.get(codeId, () => this.#options());
      const facetClass = worker.getDurableObjectClass(route.class);
      return { class: facetClass };
    });
    return facet.fetch(request);
  }

  // Build the facet's loader options per-instance so its global outbound can
  // be redirected to THIS supervisor (needs `this.ctx.exports`, which is
  // per-instance). The facet's own `fetch()` calls land here.
  #options() {
    return {
      ...baseLimits,
      globalOutbound: this.ctx.exports.Egress({}),
    };
  }
}

export default {
  async fetch(request, env, ctx) {
    const stub = env.FACET_SUPERVISOR.getByName("main");
    return stub.fetch(request);
  },
};
