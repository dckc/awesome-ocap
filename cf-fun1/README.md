# cf-fun1

An exploration of the Cloudflare platform. A counter app whose state lives in
Durable Objects, reached from a browser front end over Cap'n Web RPC.

## Run it (local only)

No deploy steps here — this is a sandbox for poking at the platform.

```sh
npm install
npx wrangler dev --port 8787
```

Then open `http://localhost:8787`. Start with zero counters, click **make
counter**, then `+` / `-`. Values survive page reloads (they live in Durable
Object storage). On reload the page re-acquires existing counters.

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
