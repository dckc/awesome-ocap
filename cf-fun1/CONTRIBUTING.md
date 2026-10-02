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

## Comments: match the docs to the knowledge the code carries

**Scope each comment to the thing it annotates.** A comment (docstring, block
comment, or inline note) should describe only what the code's reader can see in
the file itself — the responsibilities and invariants that live here. Do not
document what some other thing (another layer, caller, or supervisor) does, or
explain that "this is X's job" on something that does not do X. If the division
of responsibility is real, state it in the file that actually owns it (e.g. the
storage layer that holds the key mapping), not in a file that contradicts it.
A comment belongs on the thing that owns the responsibility; if it reads like it
is explaining work happening elsewhere, it is misplaced. Keep comments short and
grounded in the code.

**Don't leak chat context into code.** Do NOT transcribe design decisions,
reasoning, or context from this conversation (e.g. "the app never deals with
keys" does not belong on an app object that, from its own code, does deal with
state). Write only what the code's reader needs, stated in terms of the code
itself.

## Tests and commit messages

Test files are `.spec` files **for a reason**: each is a spec of the behavior
being committed. When you commit, let the spec lead — a good commit message
parallels the spec it ships. Prefer a headline that names the feature the tests
specify (e.g. "each counter has a webkey"), then itemize the most important
`describe`/`it` names (paraphrased where needed), grouped under their test
files. If a change ships no tests, that's a signal to reconsider whether it's
spec'd.

## Commands

```sh
cd cf-fun1
npm install                # uses --legacy-peer-deps (npm arborist bug with vitest)
npx vitest run             # app tests (in-memory storage engine)
npm run dev:a              # worker A on http://localhost:8787
npm run dev:b              # worker B (separate origin) on http://localhost:8788
npm run dev:both           # both at once
npm run db:reset           # wipe both dev workers' persisted state (stop dev servers first)
```

`package.json` is ESM (`"type": "module"`); config is `vitest.config.ts` and
`wrangler.jsonc`.

## Where things live

- `src/` — each source file opens with a `@file` comment saying what it is
  (the generated `countersAppBundle.js` excepted). Start with `index.js` (the
  supervisor Worker) and `countersApp.js` (the app Durable Object).
- `test/` — Vitest specs (`npx vitest run`); `.spec` files, each a spec of the
  behavior its commit ships.
- `public/` — static front end, no build step; `vendor/` is copied in by the
  build command. Talks to `/counterRegistry` over a Cap'n Web WebSocket.

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
