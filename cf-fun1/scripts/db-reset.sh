#!/bin/sh
# Wipe both dev workers' persisted state (Durable Object storage, KV, R2,
# caches). Dev servers hold these files open, so the script refuses to run
# while wrangler/workerd is up.
set -eu
cd "$(dirname "$0")/.."
if pgrep -f "wrangler dev" >/dev/null 2>&1 || pgrep -x workerd >/dev/null 2>&1; then
  echo "db:reset: dev servers still running — stop dev:both first" >&2
  exit 1
fi
rm -rf .wrangler/state-a .wrangler/state-b
echo "db:reset: cleared .wrangler/state-a and .wrangler/state-b"
