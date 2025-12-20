#!/usr/bin/env python3
"""
mvp_zoom_to_ia.py — barely works, one case

DisciplinedPython / ocap style:
- no ambient authority (except logging)
- all I/O capabilities injected
- stdlib only
"""

from __future__ import annotations

import json
import logging
import tempfile
import urllib.parse
import urllib.request
from datetime import datetime
from pathlib import Path


# ---------------------------------------------------------------------------
# Logging (intentional ambient authority)
# ---------------------------------------------------------------------------

logger = logging.getLogger("zoom→ia")


# ---------------------------------------------------------------------------
# Small helpers (effectful only via passed-in capabilities)
# ---------------------------------------------------------------------------

def https_json(url, *, headers, data=None, urlopen):
    logger.info("🌐 GET/POST %s", url)
    req = urllib.request.Request(
        url,
        headers=headers,
        data=data,
        method="POST" if data else "GET",
    )
    with urlopen(req) as r:
        return json.load(r)


def https_download(url, *, headers, path: Path, urlopen):
    logger.info("⬇️  Downloading recording")
    req = urllib.request.Request(url, headers=headers)
    with urlopen(req) as r, open(path, "wb") as f:
        f.write(r.read())


# ---------------------------------------------------------------------------
# Zoom capability
# ---------------------------------------------------------------------------

def zoom_access_token(*, zoom_creds, urlopen):
    logger.info("🔑 Requesting Zoom access token")
    body = urllib.parse.urlencode({
        "grant_type": "account_credentials",
        "account_id": zoom_creds["account_id"],
    }).encode()

    headers = {
        "Authorization": zoom_creds["auth_header"],
        "Content-Type": "application/x-www-form-urlencoded",
    }

    resp = https_json(
        "https://zoom.us/oauth/token",
        headers=headers,
        data=body,
        urlopen=urlopen,
    )
    return resp["access_token"]


def zoom_latest_recording(*, token, urlopen):
    logger.info("🎥 Fetching latest Zoom recording")
    headers = {"Authorization": f"Bearer {token}"}
    meetings = https_json(
        "https://api.zoom.us/v2/users/me/recordings",
        headers=headers,
        urlopen=urlopen,
    )

    meeting = meetings["meetings"][0]
    file = meeting["recording_files"][0]

    return {
        "download_url": file["download_url"],
        "topic": meeting["topic"],
        "start_time": meeting["start_time"],
    }


# ---------------------------------------------------------------------------
# Internet Archive capability
# ---------------------------------------------------------------------------

def ia_upload(*, path: Path, metadata, ia_creds, urlopen):
    logger.info("📦 Uploading to Internet Archive: %s", metadata["identifier"])
    identifier = metadata["identifier"]
    url = f"https://s3.us.archive.org/{identifier}/{path.name}"

    headers = {
        "Authorization": ia_creds["auth_header"],
        "x-archive-meta-title": metadata["title"],
        "x-archive-meta-description": metadata["description"],
        "x-archive-meta-collection": "opensource_media",
    }

    with open(path, "rb") as f:
        req = urllib.request.Request(
            url,
            data=f.read(),
            headers=headers,
            method="PUT",
        )
        urlopen(req).read()

    logger.info("✅ Upload complete")


# ---------------------------------------------------------------------------
# Main program logic (no ambient authority)
# ---------------------------------------------------------------------------

def main(*, argv, environ, urlopen):
    discussion_url = argv[1]
    logger.info("🧭 Discussion URL: %s", discussion_url)

    zoom_creds = {
        "account_id": environ["ZOOM_ACCOUNT_ID"],
        "auth_header": (
            "Basic "
            + (
                environ["ZOOM_CLIENT_ID"]
                + ":"
                + environ["ZOOM_CLIENT_SECRET"]
            ).encode().hex()   # MVP shortcut
        ),
    }

    ia_creds = {
        "auth_header": (
            f"LOW {environ['IA_ACCESS_KEY']}:{environ['IA_SECRET_KEY']}"
        ),
    }

    token = zoom_access_token(
        zoom_creds=zoom_creds,
        urlopen=urlopen,
    )

    rec = zoom_latest_recording(
        token=token,
        urlopen=urlopen,
    )

    logger.info("📝 Recording topic: %s", rec["topic"])

    with tempfile.TemporaryDirectory() as td:
        mp4_path = Path(td) / "office-hours.mp4"

        https_download(
            rec["download_url"],
            headers={"Authorization": f"Bearer {token}"},
            path=mp4_path,
            urlopen=urlopen,
        )

        dt = datetime.fromisoformat(
            rec["start_time"].replace("Z", "+00:00")
        )

        ia_upload(
            path=mp4_path,
            metadata={
                "identifier": f"agoric-office-hours-{dt.date()}",
                "title": rec["topic"],
                "description": (
                    f"Recording referenced from {discussion_url}"
                ),
            },
            ia_creds=ia_creds,
            urlopen=urlopen,
        )

    logger.info("🎉 All done")


# ---------------------------------------------------------------------------
# Authority boundary
# ---------------------------------------------------------------------------

if __name__ == "__main__":

    def _script_io():
        import os
        import sys
        import urllib.request

        logging.basicConfig(
            level=logging.INFO,
            format="%(asctime)s %(levelname)s %(message)s",
        )

        return {
            "argv": tuple(sys.argv),
            "environ": dict(os.environ),   # defensive copy
            "urlopen": urllib.request.urlopen,
        }

    main(**_script_io())
