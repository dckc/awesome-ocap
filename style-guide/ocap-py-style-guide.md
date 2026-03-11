# OCap Python Style Guide

This guide is for Python programmers who want code that supports powerful patterns of cooperation without vulnerability.

If code is good, we will want to reuse it, and that usually means we will want to test it. Code that reaches out to the world directly is harder to test, so this guide recommends injecting I/O explicitly, including filesystem, network, clock, environment, subprocess, and console access.

## Separate Definition from Execution

Move logic into `main(...)` or `run(...)` and keep the script entrypoint thin.

Bad:

```py
import os

file_name = os.environ["INPUT_FILE"]
with open(file_name) as fp:
    print(len(fp.readlines()))
```

Good:

```py
import os


def main():
    file_name = os.environ["INPUT_FILE"]
    with open(file_name) as fp:
        print(len(fp.readlines()))


if __name__ == "__main__":
    main()
```

## Pass I/O In Explicitly

Do not let deep helper functions reach out to the environment or other I/O directly. Pass in the specific inputs they need.

Bad:

```py
import os


def api_url():
    return os.environ.get("API_URL", "http://127.0.0.1:23119")
```

Good:

```py
def api_url(environ):
    return environ.get("API_URL", "http://127.0.0.1:23119")


if __name__ == "__main__":
    import os

    print(api_url(os.environ))
```

TODO: find a more plausible Python example for this section. The `api_url(environ)` example makes the dependency explicit, but it is still more mechanical than idiomatic.

## Prefer Small Capability Parameters

Pass only the authority a function needs, not a grab bag of unrelated globals.

Bad:

```py
def sync_everything(config):
    with open(config["path"]) as fp:
        data = fp.read()
    now = config["clock"]()
    config["logger"].info("synced at %s", now)
```

Good:

```py
def sync_file(path, open_text, now, log):
    with open_text(path) as fp:
        data = fp.read()
    log.info("synced at %s", now())
```

## Keep Pure Logic Pure

Parsing, filtering, formatting, and data transformation should not perform I/O.

Bad:

```py
from datetime import datetime, timedelta


def recent_pdfs(scan_dir):
    cutoff = datetime.now() - timedelta(hours=1)
    return [
        path for path in scan_dir.iterdir()
        if path.suffix == ".pdf" and path.stat().st_mtime >= cutoff.timestamp()
    ]
```

Good:

```py
def is_recent_pdf(name, modified_at, cutoff):
    return name.endswith(".pdf") and modified_at >= cutoff


def recent_pdfs(entries, cutoff):
    return [entry for entry in entries if is_recent_pdf(entry.name, entry.modified_at, cutoff)]
```

## Replace Module Globals with Configuration Data

Avoid module-level configuration derived from environment, home directory, or current process state.

Bad:

```py
import os
from pathlib import Path

API_URL = os.environ.get("API_URL", "http://127.0.0.1:23119")
SCAN_DIR = Path.home() / "Documents" / "scan-from-mobile"
```

Good:

```py
from dataclasses import dataclass


@dataclass(frozen=True)
class Config:
    api_url: str
    scan_dir: str


def load_config(environ, home):
    return Config(
        api_url=environ.get("API_URL", "http://127.0.0.1:23119"),
        scan_dir=str(home / "Documents" / "scan-from-mobile"),
    )
```

## Inject Time, Network, and Subprocess Power

Clock, HTTP, and subprocess access are capabilities. Treat them that way.

Bad:

```py
from datetime import datetime
import subprocess
import urllib.request


def refresh(url, src, dst):
    stamp = datetime.now().isoformat()
    urllib.request.urlopen(url)
    subprocess.run(["ocrmypdf", src, dst], check=True)
    return stamp
```

Good:

```py
def refresh(url, src, dst, now, http_get, run_ocr):
    stamp = now().isoformat()
    http_get(url)
    run_ocr(src, dst)
    return stamp
```

## Prefer a Tiny Authority-Bearing Shell

Library code should expose a reusable callable such as `run(...)`. The `__main__` block should just wire real authorities.

Good:

```py
def run(config, now, http, ocr, reporter):
    ...


if __name__ == "__main__":
    import os
    import sys
    from datetime import datetime

    run(
        config=load_config(os.environ, home_dir()),
        now=datetime.now,
        http=urllib_http_client(),
        ocr=ocrmypdf_runner(),
        reporter=console_reporter(sys.stdout, sys.stderr),
    )
```

## What This Refactor Taught

A useful way to refactor toward OCap discipline is to play "hunt the red squiggly."
If removing an ambient import such as `os`, `sys`, `urllib.request`, or `subprocess`
breaks a helper, the resulting error points at hidden authority that should probably
be passed in explicitly.

A few concrete lessons:

- Acquire authority only at the outer script boundary, such as `if __name__ == "__main__":`.
- Pass authority inward explicitly through arguments.
- Keep helpers honest about the least authority they need.
- Keep data separate from authority-bearing objects.
- Do not smuggle broad authority inside a narrowed object.

### Least Authority First

When refactoring a helper, ask what authority it actually needs, not which module names it currently uses.

For example, a helper like `ensure_ocr_pdf(...)` may appear to need `sys`, `subprocess`, and broad filesystem access.
But the least authority may be closer to:

- read access to the source path
- write access to the destination directory
- an `ocrmypdf` runner capability
- a diagnostic output stream

That is a better guide than mechanically passing whole modules around.

### Data Is Not Authority

One recurring bug pattern is turning plain data into authority in the middle of the program.
Examples include:

- path string to `Path(...)` or `open(...)`
- URL string to `urlopen(...)`
- command name such as `"ocrmypdf"` to `subprocess.run(...)`

That kind of step should happen only at a deliberate boundary.
A useful analogy is that turning `"abc"` into `open("abc")` is a little like casting an integer to a pointer.
The string is data. The opened file is authority.

### Rooted Capability Objects

Sometimes the right move is to introduce a rooted capability object that behaves a bit like `Path`.
For network access, a rooted URL endpoint can be narrower than passing a general HTTP client.

But a rooted object must not expose the broader authority it was built from.
If a `UrlEndpoint` stores a public `urlopen` field, then any holder of the endpoint can recover broad network authority.
That violates POLA even if the object also supports nice rooted operations such as `endpoint / "api" / "users"`.

A better pattern is:

- inject the broad opener at the boundary
- store it privately inside the rooted object
- expose only rooted operations such as `/` and `open()`

### Keep Boundary Policy Visible

Defaults such as API roots, desktop directory names, and project-specific subdirectory names are policy.
They should be visible near the top of the file as data, rather than hidden in the guts of `main(...)`.
But policy defaults are still different from authority and should not be confused with capability objects.

## Review Checklist

When reviewing Python for OCap discipline, look for:

- `os.environ` used outside startup wiring
- `Path.home()` or cwd lookups outside startup wiring
- `datetime.now()` inside selection or transformation logic
- `urllib`, `requests`, or similar network calls in helpers that could accept an injected client
- `subprocess.run()` hidden in business logic
- `print()` or `sys.stderr.write()` scattered through library code
- module globals initialized from ambient state

## Worked Example Candidates

Scripts like `tools/zotero_link_recent.py` are useful examples because they often combine:

- environment-driven configuration
- filesystem traversal
- wall-clock time
- HTTP calls
- subprocess execution
- console reporting

These are good refactoring targets because the behavior is small while the authority surface is easy to inspect.

## TODO

- show the testing benefit directly in the `env(...)` example
- use a defensive copy of `environ` at the boundary
- show similar treatment for `sys`
- show similar treatment for `uuid`
- show similar treatment for `urllib.request`
- show similar treatment for `Path`
- add a section on pathnames as data becoming filesystem authority, including when `Path(...)`, `open(...)`, or related APIs are appropriate boundaries
- add a section on URLs as data becoming network authority, including when request construction should be confined to the boundary
- add a section on command names as data becoming process-execution authority, including helpers like `ensure_ocr_pdf()` that should receive an `ocrmypdf` capability instead of calling `subprocess.run(...)` directly
- explain why turning a piece of data such as `"ocrmypdf"` into authority with `subprocess.run(...)` is a bad pattern, analogous to turning `"abc"` into `open("abc")` or casting an integer to a pointer
- add a POLA note for rooted network/path-like capability objects: do not expose the underlying opener or other broad authority as a public field, because any holder of the narrowed object could recover access to the wider authority
