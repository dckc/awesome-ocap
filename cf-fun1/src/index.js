import { Storage } from "./storage.js";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/api") {
      const stub = env.STORAGE.getByName("main");
      return stub.fetch(new Request("http://storage.internal/bootstrap", request));
    }

    return new Response("Not found", { status: 404 });
  },
};

export { Storage };
