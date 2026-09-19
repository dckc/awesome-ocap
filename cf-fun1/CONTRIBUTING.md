# Contributing to cf-fun1

`cf-fun1` is an exploration of the Cloudflare platform. Keep it runnable and
small.

## Repo / branch

- Lives in `cf-fun1/` inside the `awesome-ocap` repo, on branch `cf-fun`.
- No CI yet. Do not `wrangler deploy` — this is local exploration only.
- Generated `cf-fun1/public/vendor/capnweb.js` is rebuilt by the `build`
  command in `wrangler.jsonc`; see `.gitignore` for why it stays ignored.

## Remember: keep the README current

When you explore a new Cloudflare feature (or change how something works), make
sure `README.md` reflects it — e.g. the "Platform bits explored" list. It's easy
to forget when the exploration is the point.

## Commands

```sh
cd cf-fun1
npm install                # uses --legacy-peer-deps (npm arborist bug with vitest)
npx vitest run             # app tests (in-memory storage engine)
npm run dev:a              # worker A on http://localhost:8787
npm run dev:b              # worker B (separate origin) on http://localhost:8788
npm run dev:both           # both at once
```

`package.json` is ESM (`"type": "module"`); config is `vitest.config.ts` and
`wrangler.jsonc`.

## Where things live

- `src/index.js` — Worker entrypoint; maps routes to DO bindings
  (`{ "/counterRegistry": "COUNTER_REGISTRY" }`), then `env[space].getByName("main")`.
- `src/storage.js` — the storage engine: a reusable base class for app Durable
  Objects. Owns the SQLite schema, the `writeThru` proxy factory, and the
  `RefTable` (`RpcTarget -> key` mapping in a WeakMap). App DOs extend it.
- `src/countersApp.js` — `CounterRegistry`, the app's Durable Object. Extends
  `Storage` and serves the `RegistryApi` capability at `/counterRegistry`.
- `src/countersAppBundle.js` — generated multi-module map handed to the Worker
  Loader (see `build-facet.js`). Gitignored; rebuilt by the `build` command.
- `src/writethru.js` — `makeWriteThru` (a `#state` write-through proxy: each
  mutation persists to the object's row) and `RefTable` (capabilities
  stored by durable key, resurrected on load).
- `src/counter.js` — `Counter` and `RegistryApi` as pure `RpcTarget`s. No DO
  classes here; state comes from a `writeThru` factory passed into the
  constructor. A counter's `#state` can hold other capabilities by ref.
- `public/` — static front end (no build step), talks to `/bootstrap` over
  Cap'n Web.
- `wrangler-alt.jsonc` — alternate worker name for running a second instance on
  another port (separate origin).
- `no_bundle: true` is set in both `wrangler.jsonc` and `wrangler-alt.jsonc`, so
  wrangler uploads the supervisor (`src/index.js`) as-is rather than bundling.
  The facet is already a multi-module graph handed to the Worker Loader, so the
  main worker follows the same no-bundle, runtime-resolved spirit.
- `build-facet.js` — generates `src/countersAppBundle.js`: a multi-module map
  for the Worker Loader (app files + capnweb as separate modules, relative
  imports, `capnweb` specifier rewritten to `./capnweb.js`). capnweb stays an
  npm dependency, read from `node_modules`, not vendored.
- `test/counter.spec.js` — Vitest for the app layer against an in-memory stand-in
  storage engine.

## The ocap idea here

The session root is a `RegistryApi` capability served by the `CounterRegistry`
DO. `makeCounter()` returns a counter capability; holding it *is* the authority
to `getValue` / `increment` / `decrement` that counter.

The app's Durable Object (`CounterRegistry`, extending `Storage`) holds all
state; the capability objects (`RegistryApi`, `Counter`) are pure `RpcTarget`s.
Each holds `#state = writeThru(this, initial)` — a proxy that persists every
mutation to the DO's SQLite row for this object. Persistence is structural: any
`RpcTarget` state is durable by construction, no `#persist()` discipline. The
app never passes a key/id — the storage layer owns the `this -> key` mapping.

Capabilities that live *inside* `#state` are stored by durable key and resurrected
on load via the `RefTable` (which keeps the `capability -> key` map in a
WeakMap) — the Agoric-style durable-capability pattern. This matters because
Cap'n Web's standalone `serialize()`/`deserialize()` cannot round-trip
`RpcTarget`s; references only survive inside a live session.

## Cloudflare skills already installed

Installed via <https://developers.cloudflare.com/agent-setup/prompt.md>:
`wrangler`, `durable-objects`, `workers-best-practices`, `nextjs-on-cloudflare`,
`cloudflare`, `cloudflare-one`, `cloudflare-one-migrations`,
`cloudflare-email-service`, `agents-sdk`, `sandbox-stable`, `sandbox-next`,
`sandbox-migrate-to-next`, `turnstile-spin`, `web-perf`.

## Vitest gotchas (learned the hard way)

- Storage isolation is **per test file**, not per test; tests in a file share
  storage and run sequentially. Give each test distinct DO names; never reuse
  `"1"`/`"2"` across tests.
- DO SQL cursors support `.one()` / `.toArray()` / iteration but **not**
  `.first()`. For a possibly-empty row use `.toArray()[0]`.
- npm's arborist chokes resolving vitest's peer deps (`Cannot read properties
  of null (reading 'edgesOut')`); install with `--legacy-peer-deps`. See
  <https://github.com/npm/cli/issues/9787>.

## Running wrangler

**Do not run `wrangler dev` / start or stop the dev servers yourself.** The
dev servers (`npm run dev:a` / `dev:b` / `dev:both`) are run and managed by the
human developer, not by the agent. Make your code edits and then let the
developer restart / reload `wrangler` and verify. This avoids port collisions
with servers the developer already has running and keeps the agent out of
their dev loop.

When you do need wrangler, it requires the nvm node on PATH
(`~/.nvm/versions/node/v22.22.0/bin`).
`npx wrangler dev` may hit `EMFILE` when the machine's inotify instance quota
(`/proc/sys/fs/inotify/max_user_instances`) is exhausted — see
`../WIP/emfile-wrangler-dev-inotify.md`.
