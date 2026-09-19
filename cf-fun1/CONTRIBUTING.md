# Contributing to cf-fun1

`cf-fun1` is an exploration of the Cloudflare platform. Keep it runnable and
small.

## Repo / branch

- Lives in `cf-fun1/` inside the `awesome-ocap` repo, on branch `cf-fun`.
- No CI yet. Do not `wrangler deploy` — this is local exploration only.
- Generated `cf-fun1/public/vendor/capnweb.js` is rebuilt by the `build`
  command in `wrangler.jsonc`; see `.gitignore` for why it stays ignored.

## Commands

```sh
cd cf-fun1
npm install                # uses --legacy-peer-deps (npm arborist bug with vitest)
npx vitest run             # DO tests in workerd
npx wrangler dev --port 8787
```

`package.json` is ESM (`"type": "module"`); config is `vitest.config.ts` and
`wrangler.jsonc`.

## Where things live

- `src/index.js` — Worker entrypoint; routes `/api` to the registry DO.
- `src/counter.js` — `Counter` and `CounterRegistry` Durable Objects + the
  Cap'n Web `RpcTarget` surface. The DOs expose plain data methods; only the
  `RpcTarget` layer builds counter capabilities.
- `public/` — static front end (no build step), talks to `/api` over Cap'n Web.
- `test/counter.spec.js` — Vitest against real DO bindings.

## The ocap idea here

The WebSocket session root is a `CounterRegistry` capability. `makeCounter()`
returns a counter capability; holding it *is* the authority to `getValue` /
`increment` / `decrement` that counter. Per-counter state lives in its own DO.

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

Wrangler needs the nvm node on PATH (`~/.nvm/versions/node/v22.22.0/bin`).
`npx wrangler dev` may hit `EMFILE` when the machine's inotify instance quota
(`/proc/sys/fs/inotify/max_user_instances`) is exhausted — see
`../WIP/emfile-wrangler-dev-inotify.md`.
