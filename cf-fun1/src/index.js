import { Counter } from "./counter.js";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname !== "/api") {
      return new Response("Not found", { status: 404 });
    }

    const stub = env.COUNTER.getByName("main");
    return stub.fetch(request);
  },
};

export { Counter };
