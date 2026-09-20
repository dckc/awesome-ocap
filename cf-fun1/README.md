# cf-fun1

An exploration of the Cloudflare platform. A counter app whose state lives in
Durable Objects, reached from a browser front end over Cap'n Web RPC.

## Run it (local only)

No deploy steps here — this is a sandbox for poking at the platform.

```sh
npm install
npm run dev:a        # worker A on http://localhost:8787
npm run dev:b        # worker B on http://localhost:8788 (separate origin)
npm run dev:both     # both at once
```

Then open `http://localhost:8787`. Start with zero counters, click **make
counter**, then `+` / `-`. Values survive page reloads (they live in Durable
Object storage). On reload the page re-acquires existing counters.

To share a counter across workers: on worker A, click **copy url** on a
counter, open `http://localhost:8788`, and paste that URL into the **import
web-key** box. Worker B holds a durable *remote ref* to A's counter — the value
and increments live on A, and B's `+`/`-` proxy to A over the supervisor relay.
Both pages converge on the same value.

The `dev:a`/`dev:b` scripts give each worker its own `--persist-to` directory so
they keep separate DO storage — they're distinct workers, not two ports on one.

Tests:

```sh
npx vitest run
```

> Generated file: `public/vendor/capnweb.js` is rebuilt on every `wrangler
> dev`/`deploy` by the `build` command in `wrangler.jsonc` (copied from
> `node_modules/capnweb`). It is gitignored — don't commit it.

## Platform bits explored

- [**Dynamic Workers**](https://developers.cloudflare.com/dynamic-workers/) — the counter app runs as a facet loaded through the [Worker Loader](https://developers.cloudflare.com/workers/runtime-apis/bindings/worker-loader/). Its code ships as a **multi-module graph** (each source file + capnweb as its own module with real relative imports), resolved by the runtime's [`new_module_registry`](https://developers.cloudflare.com/workers/configuration/compatibility-flags/new-module-registry) — the "no-bundle" idea applied to a facet, rather than wrangler's deploy-time `--no-bundle` flag. See `build-facet.js`.
  - **`no_bundle` on the main worker** — `wrangler.jsonc` sets `"no_bundle": true`, so wrangler uploads `src/index.js` (the supervisor) as-is instead of esbuild-bundling it. The generated `src/countersAppBundle.js` is attached as an additional ESModule via a `rules` glob (`**/*countersAppBundle.js`); without that rule, `no_bundle` leaves the statically-imported bundle unresolvable at runtime (`No such module "countersAppBundle.js"`). This keeps the main worker in the same multi-module, runtime-resolved spirit as the facet.
  - **`with { type: 'text' }` — explored, not yet available.** The new module registry [recognizes but rejects](https://github.com/cloudflare/workerd/blob/main/docs/reference/detail/new-module-registry.md) the `text` import attribute (`"not yet supported"`); only `json` is enabled. It tracks the TC39 Import Text proposal, which is at Stage 3 (Stage 4 required to ship). Once it lands, `build-facet.js` could read `src/*.js` via `import src from './counter.js' with { type: 'text' }` and drop the generated `src/countersAppBundle.js` entirely. Today that file is unavoidable — the Worker Loader needs module source as strings (it compiles them into a fresh, isolated facet), and a live `import` namespace is not a valid loader `Module`.
  - **Template-literal module map.** `src/countersAppBundle.js` embeds each module's source as a template literal rather than a JSON string — JSON turns every newline into a 2-byte `\n`, while a template literal keeps a literal 1-byte newline. For a many-module map that's ~10% smaller (123KB → 111KB). `build-facet.js`'s `tpl()` escapes `\`, `` ` ``, and `${` in the right order (backslash first, so the backslash it adds for the backtick escape is never re-escaped).
- [**Workers**](https://developers.cloudflare.com/workers/)
  - [**Wrangler**](https://developers.cloudflare.com/workers/wrangler/)
  - [**Static assets**](https://developers.cloudflare.com/workers/static-assets/)
- [**Durable Objects**](https://developers.cloudflare.com/durable-objects/) — by way of [Cap'n Web](https://github.com/cloudflare/capnweb)
  - [**SQLite storage in DOs**](https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/) — the `new_sqlite_classes` migration
  - [**Workers Vitest integration**](https://developers.cloudflare.com/workers/testing/vitest-integration/)
- [**Durable Object facets**](https://developers.cloudflare.com/dynamic-workers/usage/durable-object-facets/) — confine untrusted code to a child DO with its own isolated storage.
- [**Loopback bindings + `globalOutbound` redirect**](https://developers.cloudflare.com/dynamic-workers/usage/bindings/) — a facet can't fetch the network, but it can "call up to the supervisor": the supervisor hands the facet a `WorkerEntrypoint` loopback binding (`ctx.exports.Svc({})`) as its `globalOutbound`, so the facet's global `fetch()` lands back in the supervisor, which does the real outbound request and relays the response (body included). This is how a `RemoteCounter` reaches its owning worker.
- **Two-tier capability references** — durable state references a capability either locally as `{"*": "<kind>:<secret>"}` (resurrected via the RefTable's factory) or remotely as `{"@": "<full web-key URL>"}` (deserialized into a `RemoteCounter` proxy stub). This lets a second worker hold a durable remote ref to a counter that survives reload; method calls proxy to the owner. Waterken-style, echoing the `{"@": url}` link convention.
