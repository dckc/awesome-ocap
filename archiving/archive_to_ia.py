#!/usr/bin/env python3
"""
archive_to_ia.py — manual Office Hours archiver (barely works)

Usage:
  archive_to_ia.py DISCUSSION_URL [files...]

Examples:
  # dry run (show metadata only)
  archive_to_ia.py https://github.com/Agoric/agoric-sdk/discussions/8431

  # upload video + transcript(s)
  archive_to_ia.py https://github.com/Agoric/agoric-sdk/discussions/8431 \
      office-hours.mp4 office-hours.txt office-hours.vtt
"""

from __future__ import annotations

import logging
import re
from urllib.parse import urljoin
from urllib.request import Request
from urllib.error import HTTPError


# ---------------------------------------------------------------------------
# Logging (intentional ambient authority)
# ---------------------------------------------------------------------------

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
)
logger = logging.getLogger("archive→ia")


# ---------------------------------------------------------------------------
# NetPath — pathlib-style *network* capability
# ---------------------------------------------------------------------------

class NetPath:
    """
    Network path with explicitly injected authority.
    """

    def __init__(self, url: str, *, urlopen, headers=None):
        self._url = url
        self._urlopen = urlopen
        self._headers = dict(headers or {})

    def __truediv__(self, subpath: str):
        return NetPath(
            urljoin(self._url.rstrip("/") + "/", subpath),
            urlopen=self._urlopen,
            headers=self._headers,
        )

    def with_headers(self, headers: dict):
        merged = dict(self._headers)
        merged.update(headers)
        return NetPath(self._url, urlopen=self._urlopen, headers=merged)

    def open(self, *, data=None, method="GET"):
        logger.info("🌐 %s %s", method, self._url)
        req = Request(
            url=self._url,
            headers=self._headers,
            data=data,
            method=method,
        )
        return self._urlopen(req)

    def read_text(self) -> str:
        with self.open() as r:
            return r.read().decode("utf-8")

    def put_file(self, file_path):
        """
        Upload a local file. Logs timing; surfaces HTTP error bodies.
        """
        size = file_path.stat().st_size

        logger.info(
            "⬆️  Uploading %s (%.1f MB)…",
            file_path.name,
            size / 1e6,
        )

        data = file_path.read_bytes()

        from urllib.request import Request

        req = Request(
            url=self._url,
            headers=self._headers,
            data=data,
            method="PUT",
        )

        try:
            with self._urlopen(req) as resp:
                return resp.read()
        except HTTPError as e:
            body = ""
            try:
                body = e.read().decode("utf-8", errors="replace")
            except Exception:
                pass
            logger.error(
                "❌ Upload failed (%s %s)\nResponse body:\n%s",
                e.code,
                e.reason,
                body,
            )
            raise


# ---------------------------------------------------------------------------
# GitHub discussion scraping (best-effort)
# ---------------------------------------------------------------------------

def parse_discussion(html: str):
    title_match = re.search(r"<title>(.*?) · Discussion", html)
    if not title_match:
        raise ValueError("Could not find discussion title")
    title = title_match.group(1).strip()

    time_match = re.search(
        r'<relative-time[^>]+datetime="([^"]+)"',
        html,
    )
    if not time_match:
        raise ValueError("Could not find discussion date")

    date = time_match.group(1).split("T")[0]
    return title, date


# ---------------------------------------------------------------------------
# IA metadata (pure data)
# ---------------------------------------------------------------------------

def ia_metadata(*, title, date, discussion_url):
    return {
        "Content-Type": "application/octet-stream",
        "x-archive-meta-collection": "opensource_movies",
        "x-archive-meta-title": title,
        "x-archive-meta-creator": "Dan Connolly",
        "x-archive-meta-date": date,
        "x-archive-meta-language": "eng",
        "x-archive-meta-licenseurl": "https://creativecommons.org/licenses/by/4.0/",
        "x-archive-meta-subject": (
            "Agoric, JavaScript, security, programming, "
            "smart contracts, capability security, office hours"
        ),
        "x-archive-meta-description": (
            "<div>Recording of Agoric Office Hours.</div>"
            "<div>See also GitHub discussion:</div>"
            "<div><ul><li>"
            f'<a href="{discussion_url}">{title}</a>'
            "</li></ul></div>"
        ),
    }


# ---------------------------------------------------------------------------
# Upload API + doctest
# ---------------------------------------------------------------------------

class UploadError(RuntimeError):
    """Upload to Internet Archive failed."""


def _failing_urlopen(req):
    """Test stub: simulate IA HTTP 500 with body."""
    from io import BytesIO
    raise HTTPError(
        url=req.full_url,
        code=500,
        msg="Internal Server Error",
        hdrs={},
        fp=BytesIO(b"backend exploded"),
    )


def upload_files(*, ia, identifier, files, meta):
    """
    Upload one or more files to an Internet Archive item.

    On failure, raises UploadError that includes the HTTP response body.

    >>> ia = NetPath("https://s3.us.archive.org/test-item",
    ...              urlopen=_failing_urlopen)
    >>> try:
    ...     upload_files(ia=ia, identifier="test-item", files=[], meta={})
    ... except UploadError as e:
    ...     "backend exploded" in str(e)
    True
    """
    results = []
    for f in files:
        item_file = (
            ia
            / identifier
            / f.name
        ).with_headers(meta)
        try:
            item_file.put_file(f)
            results.append((f.name, 200))
        except HTTPError as e:
            body = ""
            try:
                body = e.read().decode("utf-8", errors="replace")
            except Exception:
                pass
            raise UploadError(
                f"HTTP {e.code} uploading {f.name}:\n{body}"
            ) from None
    return results


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main(*, argv, environ, urlopen, make_path):
    discussion_url = argv[1]
    files = [make_path(p) for p in argv[2:]]

    logger.info("🧭 Discussion: %s", discussion_url)

    discussion = NetPath(discussion_url, urlopen=urlopen)
    html = discussion.read_text()

    title, date = parse_discussion(html)

    logger.info("📝 Title: %s", title)
    logger.info("📅 Date: %s", date)

    identifier = f"agoric-office-hours-{date}"
    logger.info("🆔 IA identifier: %s", identifier)

    meta = ia_metadata(
        title=title,
        date=date,
        discussion_url=discussion_url,
    )

    if not files:
        logger.info("🧪 Dry run (no files provided)")
        print("\nInternet Archive metadata:\n")
        for k, v in meta.items():
            print(f"{k}: {v}")
        return

    for f in files:
        logger.info("📎 Will upload: %s", f.name)

    ia_root = NetPath(
        "https://s3.us.archive.org/",
        urlopen=urlopen,
    )

    ia_auth = ia_root.with_headers({
        "Authorization": (
            f"LOW {environ['IA_ACCESS_KEY']}:{environ['IA_SECRET_KEY']}"
        ),
    })

    upload_files(
        ia=ia_auth,
        identifier=identifier,
        files=files,
        meta=meta,
    )


# ---------------------------------------------------------------------------
# Authority boundary
# ---------------------------------------------------------------------------

if __name__ == "__main__":

    def _script_io():
        from os import environ
        from sys import argv
        import urllib.request
        from pathlib import Path

        def make_path(p):
            return Path(p)

        return {
            "argv": tuple(argv),
            "environ": dict(environ),
            "urlopen": urllib.request.urlopen,
            "make_path": make_path,
        }

    main(**_script_io())
