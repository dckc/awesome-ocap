import { CounterRegistry } from "./countersApp.js";

const routes = { "/counterRegistry": "COUNTER_REGISTRY" };

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const space = routes[url.pathname];
    if (!space) return new Response("Not found", { status: 404 });

    const stub = env[space].getByName("main");
    return stub.fetch(request);
  },
};

export { CounterRegistry };
