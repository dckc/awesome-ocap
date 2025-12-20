# Why this talk?

We started with a *practical* problem:

> I have Zoom recordings. I want sturdy URLs on the Internet Archive.

What we ended up with is a **teaching example** for object-capability discipline in Python.

This deck walks through that evolution *intentionally*, including mistakes.

---

# Slide: "Street Python" (how scripts usually start)

```python
import sys
import urllib.request
from pathlib import Path

url = sys.argv[1]
f = Path(sys.argv[2])

resp = urllib.request.urlopen(url)
data = resp.read()

Path("out.bin").write_bytes(data)
```

This works.

But:

* where does authority come from?
* what can this code touch?
* how would you test it?

---

# Slide: Problems with Street Python

Everything here is *ambient*:

* `sys.argv` (process authority)
* `urllib.request.urlopen` (network authority)
* `Path(...)` (filesystem authority)

Any function can:

* read any file
* write any file
* talk to the network

This is convenient.
It is also unstructured power.

---

# Slide: First Best Practice — `if __name__ == "__main__"`

```python
def main():
    url = sys.argv[1]
    ...

if __name__ == "__main__":
    import sys
    main()
```

This is good practice.

But note:

* `sys` is still ambient
* `main()` still *reaches out* for authority

We improved structure, not authority.

---

# Slide: Push I/O to the edges (first try — wrong)

```python
def main():
    ...

if __name__ == "__main__":
    import sys, urllib.request
    main()
```

Looks better.

But:

* imports at module scope leak everywhere
* `main()` can still name `urllib.request`

Authority still flows *invisibly*.

---

# Slide: What we actually want

We want to be able to say:

> This function can do X *because* it was given the power to do X.

Object-capability rule of thumb:

> **If you have an object, you can use it.**
> **If you don’t, you can’t.**

That implies **explicit parameters**.

---

# Slide: `_script_io()` — authority boundary

```python
def main(*, argv, urlopen, make_path):
    ...

if __name__ == "__main__":
    def _script_io():
        import sys, urllib.request
        from pathlib import Path

        return {
            "argv": tuple(sys.argv),
            "urlopen": urllib.request.urlopen,
            "make_path": Path,
        }

    main(**_script_io())
```

Now:

* authority is introduced *once*
* it is named
* it is passed explicitly

---

# Slide: Common mistake #1 — ambient imports sneak back in

```python
from pathlib import Path  # ← oops
```

This reintroduces ambient filesystem authority.

Fix:

* do not name `Path`
* inject a `make_path` function instead

---

# Slide: Common mistake #2 — confusing data with authority

```python
from urllib.request import Request
```

Is this authority?

No.

`Request` is *data*.
It describes a request, but cannot send it.

Authority lives in:

```python
urlopen(req)
```

---

# Slide: Explicit network capability (`NetPath`)

```python
class NetPath:
    def __init__(self, url, *, urlopen):
        self._url = url
        self._urlopen = urlopen

    def open(self):
        return self._urlopen(self._url)
```

This object:

* *embodies* network authority
* can be passed, refined, or withheld

---

# Slide: Refinement, not mutation

```python
item = ia / identifier / filename
item = item.with_headers(meta)
```

Each step:

* narrows meaning
* never increases authority

This is capability-safe composition.

---

# Slide: Metadata is not authority

Metadata:

* titles
* dates
* descriptions
* subjects

These are **pure data**.

They should:

* be printable (dry run)
* be testable
* not grant power

---

# Slide: Testing reveals design bugs

A real bug:

* HTTP 500 response body was discarded
* debugging was impossible

Fix:

* catch `HTTPError`
* read and surface the body

Testing drove API refinement.

---

# Slide: Doctest as executable spec

```python
>>> try:
...     upload_files(...)
... except UploadError as e:
...     "backend exploded" in str(e)
True
```

The test *documents the contract*:

* what is raised
* what information is preserved

---

# Slide: Hard truth — not all problems are architectural

Large uploads fail because:

* IA’s legacy S3 front end is flaky
* single-shot PUT is fragile

This is not an ocap failure.

Sometimes the backend just isn’t built for it.

---

# Slide: The real lesson

Object-capability discipline gives you:

* clarity about power
* testable boundaries
* understandable failures

It does **not** magically fix infrastructure.

But it *does* ensure you know where the problems are.

---

# Final slide: Why keep this script?

Even if uploads move elsewhere:

* this script is a clear teaching artifact
* it shows how to structure authority in Python
* it turns a messy script into a reasoned design

That’s worth preserving.
