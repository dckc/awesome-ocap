# DisciplinedPython Attenuation Patterns

DisciplinedPython is not only dependency injection. Passing `run`, `connect`,
`urlopen`, `cwd`, or `stdout` explicitly is better than importing ambient
authority in helper code, but it is often still too much authority. The next
step is attenuation: turn a broad authority plus a designation into a smaller
object whose methods match the task.

The model to imitate is `pathlib`. A script boundary may capture `Path.cwd()`,
but ordinary code should not keep passing `cwd` and path strings around. It
should receive path objects for the files it is supposed to use. Those path
objects are still authority-bearing, but they are shaped around a designated
resource and a narrow vocabulary such as `exists`, `stat`, and `open`.

Apply the same idea to subprocesses, databases, network clients, and output.

## The Path-Like Shape

A broad authority often travels with a designation:

```python
def load(cwd, name):
    return (cwd / name).read_text(encoding="utf-8")
```

Prefer to attenuate near `main` and pass the designated capability:

```python
def load(path):
    return path.read_text(encoding="utf-8")


def main(argv, cwd):
    config_path = cwd / argv[1]
    return load(config_path)
```

This does not make `config_path` harmless. It makes the authority explicit,
reviewable, and narrower than `cwd` plus arbitrary names.

## Subprocess Authority

`subprocess.run` is broad process authority. Passing it deep into application
logic is usually a smell unless that code is specifically attenuating it.

Bad:

```python
def lookup_key(run, path):
    p = run(
        ["git", "annex", "lookupkey", path],
        check=True,
        text=True,
        capture_output=True,
    )
    return p.stdout.strip()
```

This function only intends to run one git-annex operation, but a holder of
`run` can execute any process.

Better:

```python
class GitAnnexLookup:
    def __init__(self, run):
        self.__run = run

    def lookup_key(self, path):
        p = self.__run(
            ["git", "annex", "lookupkey", path],
            check=True,
            text=True,
            capture_output=True,
        )
        return p.stdout.strip()
```

Now downstream code receives `GitAnnexLookup`, not `run`.

Prefer private helpers whose parameters also reflect the narrowed authority:

```python
class GitAnnexLookup:
    def __init__(self, run):
        self.__run = run

    def __annex_output(self, args):
        p = self.__run(
            ["git", "annex", *args],
            check=True,
            text=True,
            capture_output=True,
        )
        return p.stdout.strip()

    def lookup_key(self, path):
        return self.__annex_output(["lookupkey", path])
```

Avoid a private `__command_output(cmd)` here. Even though it is private, its
shape still says "arbitrary command" rather than "git-annex command tail".

## Dry-Run Is Authority Selection

Dry-run should usually be represented by withholding write authority, not by
passing write authority plus a boolean guard.

Bad:

```python
def publish(run, dry_run, artifact):
    logging.info("publishing %s", artifact)
    if not dry_run:
        run(["publisher", "upload", artifact], check=True)
```

Better:

```python
class LoggingPublisher:
    def publish(self, artifact):
        logging.info("+ publisher upload %s", artifact)


class RealPublisher(LoggingPublisher):
    def __init__(self, run):
        self.__run = run

    def publish(self, artifact):
        super().publish(artifact)
        self.__run(["publisher", "upload", artifact], check=True)


def main(argv, run):
    publisher = LoggingPublisher() if "--dry-run" in argv else RealPublisher(run)
    publish_all(publisher)
```

The dry-run publisher has no process authority, so lower-level code cannot
accidentally perform the write.

## Database Authority

`sqlite3.connect` is authority to open database files. If code only needs one
database, open the connection near `main` and pass a narrower object over that
connection.

Bad:

```python
def find_downloads(connect, db_path, filename):
    conn = connect(db_path)
    ...
```

Better:

```python
class DownloadHistory:
    def __init__(self, conn):
        self.__conn = conn

    def download_urls(self, filename):
        cur = self.__conn.cursor()
        cur.execute("select url from downloads where target_path like ?", (filename,))
        return [row[0] for row in cur.fetchall()]


def main(argv, cwd, connect):
    conn = connect(cwd / argv[1])
    try:
        history = DownloadHistory(conn)
        ...
    finally:
        conn.close()
```

`DownloadHistory` can query the selected database. It cannot open more
databases.

## Network Authority

Treat `urlopen` like `run`: it is broad authority. A URL string is only a
designation. Keep broad network authority near the boundary and pass a rooted
or operation-specific client.

```python
class WebPath:
    def __init__(self, base_url, urlopen):
        self.base_url = base_url
        self.__urlopen = urlopen

    def open(self):
        return self.__urlopen(self.base_url)
```

For an API, prefer a client with domain methods:

```python
class PackageIndex:
    def __init__(self, base_url, urlopen):
        self.__base_url = base_url
        self.__urlopen = urlopen

    def metadata(self, name):
        with self.__urlopen(f"{self.__base_url}/{name}.json") as response:
            return json.load(response)
```

Downstream code can ask for package metadata. It cannot fetch arbitrary URLs
unless the capability exposes that operation.

## Stdout, Stderr, And Logging

Do not inject `stdout` just because a script has things to say. Use logging for
human status, progress, diagnostics, and dry-run previews. Inject `stdout` when
stdout is a real output API: generated data, reports intended for another
program, or explicit modes such as `--json`.

Bad:

```python
def sync(stdout, items):
    print("starting sync", file=stdout)
    ...
```

Better:

```python
def sync(items):
    logging.info("starting sync")
```

If stdout becomes an API, make that explicit:

```python
def emit_json(stdout, record):
    print(json.dumps(record), file=stdout)
```

## Review Checklist

Before considering a DisciplinedPython refactor done, look for broad authority
that escaped attenuation:

- Does ordinary logic receive `run`, `connect`, `urlopen`, `cwd`, `home`,
  `stdout`, or environment access?
- Can a function run more commands, open more databases, fetch more URLs, or
  write more output than its task requires?
- Is dry-run enforced by booleans around writes, or by passing an object with no
  write authority?
- Are exception classes, constants, regexes, and parsed data being treated as
  powerless data rather than authority?
- Do private helper methods still reflect the narrowed operation, or do their
  names and parameters smuggle broad authority back in?
- Is `cwd / user_path` being used as designation, not mistaken for confinement?

When in doubt, make the broad authority look more like a `Path`: close over it
near `main`, expose a small domain-shaped vocabulary, and pass that smaller
object downstream.
