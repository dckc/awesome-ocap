# EMFILE: too many open files when running `wrangler dev`

## Symptom

`npx wrangler dev` throws:

```
Error: EMFILE: too many open files, watch '.../wrangler.jsonc'
    at ... node:internal/fs/watchers ...
```

The local dev server still starts and serves requests; only the file watcher fails.

## Root cause

Not the `ulimit -n` fd limit (that is 1048576). It is the kernel **inotify
per-user instance limit**.

```
cat /proc/sys/fs/inotify/max_user_instances   # 128
cat /proc/sys/fs/inotify/max_user_watches    # 524288
```

Counting inotify instances in use:

```sh
for p in /proc/*/fd/*; do readlink "$p" 2>/dev/null | grep -q inotify && echo "$p"; done | wc -l
```

gives ~145, which is over the 128 `max_user_instances` ceiling. Exceeding that
limit surfaces as `EMFILE: too many open files`. (`max_user_watches` being
exhausted would instead give `ENOSPC`.)

## Who holds them

No single hog — spread across many GUI apps: Zoom, Brave, VS Code, Obsidian,
wireplumber, krunner, konsole, kded5, opencode web. Each holds a handful of
inotify instances; desktop clutter accumulates to the 128 ceiling.

## Fix

Raise the limit (recommended):

```sh
sudo sysctl -w fs.inotify.max_user_instances=512
echo 'fs.inotify.max_user_instances=512' | sudo tee /etc/sysctl.d/60-inotify.conf
```

Or close idle GUI apps to free instances. Wrangler worked after quitting
some apps; did not need to change the limit.

## Related note

`npx wrangler` may prompt to install and can match the typo-squat package
`wangler@0.0.8` (missing the "r") when wrangler is not installed locally in the
current project. Ensure `wrangler` is a local dev dependency so npx uses it
instead of fetching from the registry.
