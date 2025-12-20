# Outstanding goals (current)

1. **Reliable upload of large media files to Internet Archive**
   The current `urllib.request`-based PUT approach reliably fails with HTTP 500 errors for ~50MB+ files, even with HTTPS and `Content-Type` set. The goal is a robust upload path (likely multipart / retry-capable) that works with IA’s infrastructure.

2. **Preserve object-capability discipline**
   Any solution (including possibly using an S3 library or external tool) should:

   * make authority explicit
   * avoid ambient access to filesystem, network, credentials
   * pass capabilities (client objects, paths) explicitly
     Teaching clarity matters almost as much as functionality.

3. **Decide on scope split: orchestration vs transport**
   A likely next step is to separate responsibilities:

   * this script handles metadata extraction, identifiers, curation, dry runs
   * a more robust tool/library handles the actual upload

4. **Keep the script usable in practice**
   Even if the upload path changes, the script should remain something Dan can actually run for real office hours recordings.

---

# Background / what we built

## Initial motivation

* Zoom cloud recordings are ephemeral / unreliable as long-term URLs.
* Office hours are already curated via GitHub Discussions (label: `video-recording`).
* Internet Archive provides durable URLs and fits the open-source ethos.
* Goal: a small script to move recordings from local disk to IA with correct metadata.

## Script features achieved

* **Dry run mode**: prints full IA metadata without uploading
* **Flexible inputs**: accepts any mix of `.mp4`, `.m4a`, `.txt`, `.vtt`
* **Metadata extraction**:

  * title and date scraped from GitHub Discussion HTML
  * backlink to the discussion embedded in IA description
  * consistent subjects, license, creator
* **Single IA item per discussion**:

  * multiple files uploaded under one identifier
  * metadata attached per file upload (normal IA practice)

## Object-capability design choices

* No ambient filesystem or network authority in library code
* All authority introduced in `_script_io()`:

  * `urlopen`
  * `Path` constructor (`make_path`)
  * environment variables
* Network access wrapped in a `NetPath` abstraction:

  * URL composition via `/`
  * `with_headers()` to refine authority (auth, metadata)
* Logging is the sole intentional ambient exception

## Testing approach

* Chose **doctest** to refine API semantics rather than infrastructure
* Introduced `UploadError` as a domain-level exception
* Added a test stub (`_failing_urlopen`) to reproduce IA HTTP 500 behavior
* Fixed a real bug where HTTP error response bodies were being discarded

## Upload failure investigation

Observed behavior:

* Large uploads (~50MB) fail with Apache 500 after full body transfer
* Error body is generic HTML (no actionable details)
* HTTPS already in use
* Adding `Content-Type` did not help

Conclusions:

* Failure is in IA’s legacy S3/Apache front end, not in Python logic
* Single-shot PUT via `urllib` is the most fragile possible upload path
* IA CLI and S3 libraries succeed because they use multipart uploads, retries, or different backends

## Open design tension

* **Robustness vs teachability**:

  * `urllib` + NetPath is a very clean ocap teaching example
  * but it is not reliable for large media uploads to IA
* Using an S3 library would likely solve the problem technically

  * but requires careful wrapping to avoid ambient authority
  * and reduces pedagogical clarity

---

# Likely next steps

* Decide whether to:

  * wrap a minimal S3 multipart uploader as an injected capability, or
  * delegate uploads to `ia upload` while keeping this script for metadata/orchestration
* Potentially narrow this script’s guarantee to “metadata + small files”, with large uploads handled elsewhere
* Keep this document as a design log to avoid re-deriving decisions in future sessions
