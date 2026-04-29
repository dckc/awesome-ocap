# DisciplinedPython Style Guide

This guide is for Python programmers who want code that supports powerful patterns of cooperation without vulnerability.

If code is good, we will want to reuse it, and that usually means we will want to test it. Dependency injection makes code easier to test, reuse, and safely compose: pass in the filesystem, clock, network client, database connection, subprocess runner, or output stream instead of having helpers fetch those dependencies for themselves. DisciplinedPython sharpens that practice into the principle of least authority (POLA): give every part of the program the least authority it needs, and make authority-bearing dependencies explicit and reviewable.

## Script Recipe

In brief:

1. Define `main(...)` with args for only the access that the script needs: `argv`, `cwd`, etc.
2. Define `_script_io()` under the `__main__` guard. Import standard authorities there, then call `main(...)` with named arguments.
3. In `main(...)`, narrow broad authorities into objects or callables.
4. Give each function or class after that the least authority it needs.
5. Keep pure data transformation separate from I/O.
6. Run `tools/disciplined_python_check.py path/to/script.py`.
7. When in doubt, imitate `tests/fixtures/disciplined_python/fixed/script_entry.py`, then the fixed example for the checker code you are seeing.

## Checker Workflow

When asked to write a disciplined Python script, write the script and run:

```sh
tools/disciplined_python_check.py path/to/script.py
```

Treat every finding as a bug until you have a specific reason not to. The checker prints relevant examples from `tests/fixtures/disciplined_python/`. The `errors/` file shows the pattern to avoid; the same-named `fixed/` file shows the preferred shape.

The checker is intentionally syntactic. Passing it is not proof of POLA, but failing it identifies concrete work to do.

## Script Boundary

Importable code should define functions and data. Runtime authority belongs in a function defined under the `__main__` guard, conventionally named `_script_io()`.

```py
def main(argv, cwd, stdout):
    result_path = cwd / argv[1]
    print(result_path.read_text(encoding="utf-8"), file=stdout)


if __name__ == "__main__":
    def _script_io():
        from pathlib import Path
        from sys import argv, stdout

        return main(
            argv=list(argv),
            cwd=Path.cwd(),
            stdout=stdout,
        )

    raise SystemExit(_script_io())
```

`_script_io()` imports and snapshots standard ambient authorities. `main(...)` parses designations such as command-line strings and narrows broad authorities into objects or callables.

`_script_io()` should be simple and formulaic. It must not fail before calling `main`, so it must not do any I/O.

Ambient authority is allowed only inside functions defined under `if __name__ == "__main__":`. A bare call such as this is not the idiom:

```py
if __name__ == "__main__":
    main(open, sqlite3.connect, print)
```

Use a named boundary function so the authority-bearing part of the script is easy to find and review.

## Standard Authority Names

Prefer conventional names for standard authorities:

- `argv` for a defensive copy of command-line arguments
- `cwd` for `Path.cwd()`
- `home` for `Path.home()` when truly needed
- `stdout` when stdout is part of the program's API contract
- `urlopen` for `urllib.request.urlopen`
- `connect` for `sqlite3.connect`
- `run` for `subprocess.run`
- `now`, `today`, or `random_*` for clock and randomness callables

`_script_io()` should pass standard authorities rather than invent bespoke wrappers. If a narrower custom object is useful, construct it in `main(...)` or a boundary-adjacent helper so the attenuation is visible.

## Output And Logging

Use injected `stdout` only when stdout is part of the program's observable API: command output, reports, generated data, or machine-readable results.

Use `logging` directly for status, progress, debug, and diagnostic messages. The discipline treats logging as an allowed operational side effect.

Bad:

```py
def sync_items(count):
    print(f"syncing {count} items")
```

Good:

```py
import logging


def sync_items(count):
    logging.info("syncing %s items", count)
```

Configure logging in `_script_io()` if the script needs a particular logging destination or level.

## Filesystem Authority

Ambient filesystem authority is forbidden outside the `_script_io()` boundary. The checker flags calls to `open(...)`, construction of `Path(...)` from data, and ambient `Path.cwd()` / `Path.home()` lookups in helper logic. Receive a rooted path capability such as `cwd` or `home`, and derive specific paths from that root.

Bad:

```py
from pathlib import Path


def load_config(path_name):
    return Path(path_name).read_text(encoding="utf-8")
```

Good:

```py
def load_config(path):
    return path.read_text(encoding="utf-8")
```

For a CLI:

```py
def main(argv, cwd):
    config_path = cwd / argv[1]
    return load_config(config_path)
```

If a path string must be constrained to stay under `cwd`, enforce that separately. `cwd / user_input` does not by itself reject absolute paths or `..` traversal.

## Platform-Dependent Path Semantics

`os.path.join(...)` and related `os.path` helpers use the host platform's path flavor. A test written on Linux can behave differently on Windows.

For deterministic lexical path manipulation, use an explicit flavor:

```py
from pathlib import PurePosixPath


def metadata_path(out_dir):
    return PurePosixPath(out_dir) / "rules.metadata.json"
```

For real filesystem access, use an injected real path capability such as `cwd`, because the platform filesystem is part of that authority.

## Environment And Configuration

Ambient environment access is forbidden outside the `_script_io()` boundary. The checker flags `os.environ`, `os.getenv(...)`, and related environment APIs in helper code. Module globals must not be initialized from ambient state.

Bad:

```py
import os

API_URL = os.environ.get("API_URL", "http://127.0.0.1:23119")
```

Good:

```py
def load_config(environ):
    return {
        "api_url": environ.get("API_URL", "http://127.0.0.1:23119"),
    }
```

If the script boundary passes `environ`, pass a defensive copy unless the program intentionally observes later environment mutations.

## Network Authority

The Python standard library does not provide a `Path`-like URL capability. `urllib.parse` gives URL data; `urlopen` or an opener object is the authority.

Passing `url` and `urlopen` together deep into the program separates designation from authority. Prefer to attenuate broad network authority near `main(...)`.

One useful idiom is a small rooted object:

```py
from urllib.parse import urljoin


class WebPath:
    def __init__(self, base_url, urlopen):
        self.base_url = base_url
        self.__urlopen = urlopen

    def join(self, relative_url):
        return WebPath(urljoin(self.base_url, relative_url), self.__urlopen)

    def __truediv__(self, relative_url):
        return self.join(relative_url)

    def open(self):
        return self.__urlopen(self.base_url)


def main(argv, urlopen):
    root = WebPath(argv[1], urlopen)
    with (root / "status").open() as response:
        return response.status
```

A rooted network object must not expose the broad opener as a public field. If `wp.urlopen` is public, any holder of `wp` can recover broad network authority.

## Database Authority

Database connection creation is authority. Ambient `sqlite3.connect(...)` is forbidden outside the `_script_io()` boundary and is flagged by the checker.

Bad:

```py
import sqlite3


def count_items(db_name):
    with sqlite3.connect(db_name) as connection:
        return connection.execute("select count(*) from items").fetchone()[0]
```

Good:

```py
def count_items(connection):
    return connection.execute("select count(*) from items").fetchone()[0]
```

For a script, `_script_io()` may pass standard `connect` to `main(...)`; `main(...)` should promptly derive the database path from a rooted path capability and attenuate to a connection or a narrow database operation.

## Subprocess Authority

`subprocess.run`, `Popen`, `os.system`, and similar APIs are process-execution authority. Ambient process execution is forbidden outside the `_script_io()` boundary and is flagged by the checker.

Bad:

```py
import subprocess


def convert(src, dst):
    subprocess.run(["ocrmypdf", src, dst], check=True)
```

Good:

```py
def convert(src, dst, run_ocr):
    run_ocr(src, dst)
```

Prefer narrow runners such as `run_ocr` or `run_known_command` over passing `run` plus arbitrary command data into deep helpers.

## Clock And Randomness

Clock and randomness are authority because they make behavior depend on outside state.

Bad:

```py
from datetime import datetime


def stamp_record(record):
    return {**record, "created_at": datetime.now().isoformat()}
```

Good:

```py
def stamp_record(record, now):
    return {**record, "created_at": now().isoformat()}
```

The same applies to `random`, `secrets`, `uuid.uuid4`, and `os.urandom`.

## Keep Pure Logic Pure

The least authority needed by parsing, filtering, formatting, validation, and data transformation routines is zero authority. Keep these functions pure: separate data transformation from I/O.

Bad:

```py
from datetime import datetime


def recent(entries):
    cutoff = datetime.now().timestamp() - 3600
    return [entry for entry in entries if entry.modified_at >= cutoff]
```

Good:

```py
def recent(entries, cutoff):
    return [entry for entry in entries if entry.modified_at >= cutoff]
```

Pure code is easier to test, reuse, and review.

## Keep Designation And Authority Together

A common POLA failure is passing broad authority together with plain data and letting a callee combine them.

Bad:

```py
def load_rules(file_opener, xlsx_path):
    with file_opener(xlsx_path) as handle:
        ...
```

Better:

```py
def load_rules(workbook):
    ...
```

or:

```py
def load_rules(read_workbook):
    workbook = read_workbook()
    ...
```

The same smell appears as:

- `urlopen(url)`
- `connect(db_path)`
- `run(command)`
- `open(path)`

`_script_io()` may pass broad standard authorities to `main(...)` so the boundary stays simple and avoids bespoke constructions. `main(...)` should parse designations and promptly attenuate. Deeper helpers should receive narrow capabilities or already-opened / already-loaded objects.

## Narrow Function Signatures

After `main(...)` has attenuated broad authorities, keep narrowing at each function boundary. A function signature is an authority contract: it should grant only what makes the callee useful.

Bad:

```py
def sync_everything(config):
    data = config["path"].read_text()
    config["logger"].info("synced")
```

Good:

```py
def sync_file(path):
    data = path.read_text()
    logging.info("synced")
```

Better still, if parsing is the helper's real job:

```py
def parse_sync_data(data):
    ...
```

If a signature forces a reviewer to inspect every line to see what power is used, split the function or narrow the parameter.

## Module Globals

Module globals should be static data or pure definitions. Module globals must not be derived from environment, current directory, home directory, clock, randomness, platform, process state, or other ambient authority.

Bad:

```py
from pathlib import Path

SCAN_DIR = Path.home() / "Documents" / "scan-from-mobile"
```

Good:

```py
def scan_dir(home):
    return home / "Documents" / "scan-from-mobile"
```

Policy defaults such as `"Documents"` or `"rules.ndjson"` are data. Keep them visible and separate from authority-bearing objects.

## Suppressions

The checker supports narrow line suppressions:

```py
legacy_call()  # dpy: ignore[DPY004]
```

Use suppressions sparingly. A suppression should mean "this line is an accepted boundary or checker limitation," not "I did not want to refactor this." Prefer fixing the code to suppressing the finding.

## Review Checklist

The checker is expected to catch known stdlib APIs such as:

- ambient APIs: `open`, `Path(...)`, `Path.cwd`, `os.environ`, `urlopen`, `sqlite3.connect`, `subprocess.run`, `datetime.now`, `random.random`, whether in module global initialization or inside functions / methods
- bare `print(...)` used for status instead of `logging`
- `os.path.join` or other platform-dependent path helpers

Human review is still needed for:

- broad authority passed deep into helpers
- plain strings later combined with broad authority
- custom capability objects that expose their underlying broad authority
- functions whose signatures grant more authority than their body needs
- suppressions that hide real design problems rather than accepted boundaries or checker limitations

Then run the checker again.