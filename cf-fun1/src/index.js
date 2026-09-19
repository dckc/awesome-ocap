import { DurableObject } from "cloudflare:workers";
import { codeId, counterAppModule, mainModule } from "./countersAppBundle.js";

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
const counterLimits = {
  compatibilityDate: "2026-09-19",
  // The facet ships as a multi-module graph (real relative imports between the
  // app files and capnweb), so the runtime must use the URL-based module
  // registry to resolve it. See build-facet.mjs.
  compatibilityFlags: ["new_module_registry"],
  mainModule,
  modules: counterAppModule,
  // No network egress: the facet's global fetch()/connect() are blocked.
  globalOutbound: null,
  limits: { cpuMs: 10, subRequests: 5 },
};

/** Route table: request path -> { facet name, exported class name, loader options }. */
const routes = {
  "/counterRegistry": {
    facet: "counterApp",
    class: "CounterRegistry",
    options: counterLimits,
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
      const worker = this.env.LOADER.get(codeId, () => route.options);
      const facetClass = worker.getDurableObjectClass(route.class);
      return { class: facetClass };
    });
    return facet.fetch(request);
  }
}

export default {
  async fetch(request, env, ctx) {
    const stub = env.FACET_SUPERVISOR.getByName("main");
    return stub.fetch(request);
  },
};
