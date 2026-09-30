# cf-fun1

An exploration of the Cloudflare platform. A counter app whose state lives in
Durable Objects, reached from a browser front end over Cap'n Web RPC.

Phase-2 exploration: an **OCapN tagged-array codec** — sturdyrefs and delivery
ops as plain data values that ride Cap'n Web sessions (see
[the OCapN-over-Cloudflare design notes](../../../notes/ocapn-cloudflare-netlayer-design.md)).
The **copy url** button makes and serializes a sturdyref; a fresh session can
resolve it back into the live capability; sturdyrefs can be revoked.

## The OCapN layer

Cap'n Web references die with their session, so persistent identity rides as
*data*: a sturdyref is the tagged array
`["ocapn:sturdyref", swissnum, ["/counterRegistry"]]`, where the swissnum is the
capability's kind-bearing webkey secret minted by the storage layer. Cap'n Web's
encoder wraps array values in its literal-array escape, so tagged arrays cross
a session untouched in both directions — as arguments, results, or nested —
without byte-tunneling or any capnweb changes. `src/ocapn.js` is the only
interpreter, and its parsers are strict: forged tags, bad arity, malformed
swissnums, and non-path locator hints all throw before reaching storage.

The registry surface over any session:

- `sturdyrefFor(webkey)` — mint a sturdyref for a persisted capability.
- `resolveSturdyref(sr)` — enliven one into a live capability (rejects when
  revoked or unknown).
- `revokeSturdyref(sr)` — revoke; both the tagged-array path and the `?secret=`
  URL path refuse it thereafter.
- `deliver(op)` — execute `["ocapn:op:deliver", sr, method, args]`, with the
  method checked against a per-kind allowlist where the resolved kind is known.

Known semantics: a well-formed but never-minted swissnum *lazily mints* a
virgin capability (the key space is the authority; a guessed key reaches only
a fresh object nobody else holds, and 64 bits of entropy make colliding with a
minted key infeasible). Revocation is the gate.

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

The supervisor's egress relay is host-allowlisted (`EGRESS_HOSTS` in
`wrangler.jsonc`, defaulting to the two dev workers): the facet's single
permitted outbound is a web-key deref to a host we own, on the
`/counterRegistry` route, carrying a secret — never an arbitrary destination.

The `dev:a`/`dev:b` scripts give each worker its own `--persist-to` directory so
they keep separate DO storage — they're distinct workers, not two ports on one.

Tests:

```sh
npx vitest run
```

> Generated file: `public/vendor/capnweb.js` is rebuilt on every `wrangler
> dev`/`deploy` by the `build` command in `wrangler.jsonc` (copied from
> `node_modules/capnweb`). It is gitignored — don't commit it. The same
> applies to `public/vendor/ocapn.js` (copied from `src/ocapn.js`).

## Platform bits explored

This work explores the following bits of the Cloudflare developer platform.

- [**Workers**](https://developers.cloudflare.com/workers/)
  - [**Wrangler**](https://developers.cloudflare.com/workers/wrangler/)
  - [**Static assets**](https://developers.cloudflare.com/workers/static-assets/)
- [**Durable Objects**](https://developers.cloudflare.com/durable-objects/) — by way of [**Cap'n Web**](https://github.com/cloudflare/capnweb)
  - [**SQLite storage in DOs**](https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/)
  - [**Workers Vitest integration**](https://developers.cloudflare.com/workers/testing/vitest-integration/)
- [**Durable Object facets**](https://developers.cloudflare.com/dynamic-workers/usage/durable-object-facets/) / [**Dynamic Workers**](https://developers.cloudflare.com/dynamic-workers/)
  - [**Worker Loader**](https://developers.cloudflare.com/workers/runtime-apis/bindings/worker-loader/)
  - [**Custom bindings / loopback**](https://developers.cloudflare.com/dynamic-workers/usage/bindings/)
  - [**Egress control**](https://developers.cloudflare.com/dynamic-workers/usage/egress-control/)
  - [**Service bindings (RPC)**](https://developers.cloudflare.com/workers/runtime-apis/bindings/service-bindings/)
- [**Module registry**](https://developers.cloudflare.com/workers/configuration/compatibility-flags/new-module-registry)
  - [`no_bundle`](https://developers.cloudflare.com/workers/wrangler/configuration/)
  - [**Import Text** (not yet available)](https://github.com/cloudflare/workerd/blob/main/docs/reference/detail/new-module-registry.md)
