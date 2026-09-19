export default {
  async fetch(request, env, ctx) {
    return new Response("Hello from cf-fun1!", {
      headers: { "content-type": "text/plain" },
    });
  },
};
