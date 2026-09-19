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

- [**Workers**](https://developers.cloudflare.com/workers/)
  - [**Wrangler**](https://developers.cloudflare.com/workers/wrangler/)
  - [**Static assets**](https://developers.cloudflare.com/workers/static-assets/)
- [**Durable Objects**](https://developers.cloudflare.com/durable-objects/) — by way of [Cap'n Web](https://github.com/cloudflare/capnweb)
  - [**SQLite storage in DOs**](https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/) — the `new_sqlite_classes` migration
  - [**Workers Vitest integration**](https://developers.cloudflare.com/workers/testing/vitest-integration/)
- [**Durable Object facets**](https://developers.cloudflare.com/dynamic-workers/usage/durable-object-facets/) — confine untrusted code to a child DO with its own isolated storage.
