# OCap Python Style Guide

This guide is for Python programmers who want code that supports powerful patterns of cooperation without vulnerability.

If code is good, we will want to reuse it, and that usually means we will want to test it. Code that reaches out to the world directly is harder to test, so this guide recommends injecting I/O explicitly, including filesystem, network, clock, environment, subprocess, and console access.

## Separate Definition from Execution

Move logic into `main(...)` or `run(...)` and keep the script entrypoint thin.
The script entrypoint is where ambient authority from the Python runtime becomes available.

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

This is only the first step.
It avoids work at import time, but it does not yet make authority flow explicit.
The next section addresses that.

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
def main(file_name, read_text, stdout):
    lines = read_text(file_name).splitlines()
    print(len(lines), file=stdout)


if __name__ == "__main__":
    import os
    import sys

    def read_text(path):
        with open(path) as fp:
            return fp.read()

    main(
        file_name=os.environ["INPUT_FILE"],
        read_text=read_text,
        stdout=sys.stdout,
    )
```

This version makes the filesystem and console dependencies explicit.

FIXME: both examples in this section are still toy-like. Replace them with a realistic CLI or filesystem example when available.

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

In small scripts, the first boundary function may still take a slightly broader bundle such as
`argv`, `cwd`, `home`, and `stdout`. That is acceptable when it is clearly the script boundary and
the function promptly breaks that authority down for narrower helpers.

The reviewability risk is that a large `main(...)` makes it hard to see which of those authorities
are actually used where. If `main(...)` grows large enough that a reviewer must inspect every line
to verify authority use, it is time to refactor.

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

When argument defaults depend on capabilities such as `home` or `cwd`, it can still be appropriate
to resolve those defaults in `parse_args(argv, *, cwd, home)` rather than in `script_entry()`.
That keeps path-rooting policy close to the CLI interface. The key point is that `parse_args(...)`
must receive the relevant capabilities explicitly rather than reaching for them ambiently.

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

For CLI scripts, a useful convention is to name the boundary function `script_entry()`.
Import ambient modules such as `sys`, `pathlib.Path`, `os`, `subprocess`, or network clients
inside `script_entry()` and pass the resulting capabilities inward.

For example:

```py
from pathlib import Path as Path_T


def main(argv, *, cwd: Path_T, home: Path_T, stdout):
    ...


if __name__ == "__main__":
    def script_entry():
        from pathlib import Path
        from sys import argv as sys_argv
        from sys import stdout

        cwd = Path(".")
        home = Path.home()
        return main(sys_argv[1:], cwd=cwd, home=home, stdout=stdout)

    raise SystemExit(script_entry())
```

FIXME: "tiny shell" is directionally right, but "tiny" should not become dogma. A script boundary can be slightly larger when that makes authority flow clearer. The real goal is reviewable authority decomposition, not golfing the entrypoint.

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

FIXME: "hunt the red squiggly" is memorable, but also a bit cute. It should not be the main explanation. The stronger statement is that removing ambient imports is a practical audit technique for finding hidden authority.

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

The same issue arises with `Path(...)`.
Using `Path` in a type annotation is fine.
Using `Path(...)` as an expression turns path data into a filesystem authority-bearing object.
That step belongs at a deliberate boundary such as `script_entry()` or another clearly marked script I/O function.

For command-line parsing, this means:

- bad: `argparse` returns `Path(...)` values by reaching for ambient `Path` or ambient `cwd`
- better: `parse_args(argv, *, cwd, home)` receives rooted capabilities and returns `Path` values derived from them
- also acceptable: `parse_args(...)` returns strings and a later boundary function turns them into rooted `Path` values

The important part is not which of those two acceptable patterns you choose.
The important part is that the data-to-authority step is reviewable and capability-rooted.

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

FIXME: this section may overfit custom wrapper objects. In many Python scripts, a plain rooted `Path` derived from an injected root capability is sufficient, and a bespoke wrapper would add noise rather than clarity.

## Keep Boundary Functions Reviewable

An OCap script can still become hard to audit if the boundary function grows into a long mixed
orchestration block.

Warning signs:

- `main(...)` both parses arguments and walks the filesystem and performs verification and formats output
- a reviewer cannot tell at a glance where `cwd`, `home`, or other capabilities are consumed
- one comprehension mixes path derivation, file reads, parsing, and object construction

Prefer to split such code into helpers that make authority use obvious:

- `parse_args(argv, *, cwd, home)`
- `iter_verification_items(...)`
- `build_mounted_media_index(...)`
- `emit_report(...)`

This is not only about aesthetics.
Smaller boundary-adjacent helpers make it easier to confirm that a capability is used only for the narrow purpose intended.

### Keep Boundary Policy Visible

Defaults such as API roots, desktop directory names, and project-specific subdirectory names are policy.
They should be visible near the top of the file as data, rather than hidden in the guts of `main(...)`.
But policy defaults are still different from authority and should not be confused with capability objects.

## Boundary Convention

A useful convention is to separate the script-only authority boundary from the importable program logic.

Use a tiny helper inside:

```py
if __name__ == "__main__":
    def _script_io():
        ...
    _script_io()
```

The point of `_script_io()` is to wire authority, not to hide arbitrary program logic.

A practical convention:

- pass existing APIs across the `_script_io()` to `main(...)` boundary rather than wrapping everything immediately
- for example, pass `datetime.now`, `uuid4`, `subprocess.run`, or `urlopen`
- then narrow those capabilities inside `main(...)` as needed
- prefer not to do avoidable observations in `_script_io()` itself
- for example, pass `datetime.now` rather than calling `datetime.now()` there

One pragmatic exception is that `home` and `cwd` can be treated as platform-provided context for `main(...)`.
That is, it is reasonable for `_script_io()` to pass `Path.home()` and `Path.cwd()` into `main(...)`.

Rule for allowed ambient scope:

- ambient authority is allowed only in functions defined under `if __name__ == "__main__":`
- and only when those functions are not called from outside that guarded block

This keeps the ambient boundary explicit and prevents helper functions elsewhere in the module from quietly becoming script-only escape hatches.

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
- add a note on the slogan "do not prohibit what you cannot enforce": if a path is meant to represent downward-only traversal or read-only access, that should be enforced by the type or wrapper rather than assumed by convention
