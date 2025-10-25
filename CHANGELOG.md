# Changelog

## 2.6.0 (2025-10-25)

- Add user management page, with ability to change email/password

---

## 2.5.4 (2025-10-19)

- Automatically wrap text when viewing payloads with base64, hex, or binary encodings.
- Fix: Downloading non-textual payloads (e.g. PNGs) now works without mangling the bytes
- Fix: Data written with resp.socket is now being properly flushed
- Finalize RequestEvent and HandlerExecutions when aborting the connection early via resp.socket or AbortSocketError
- Don't treat thrown HandlerErrors as failed handler executions, since the user threw them deliberately to return a specific HTTP status code.

---

## 2.5.3 (2025-10-16)

- add resp.body_raw to types for HTTP handler code editor

---

## 2.5.2 (2025-10-16)

- Add WTT_PUBLIC_WEBHOOK_PORT, WTT_PUBLIC_WEBHOOK_SSL_PORT, and WTT_PUBLIC_TCP_PORT env vars.
- Improve how webhook URLs are listed on the homepage, and add TCP host to the homepage.
- Fixes to how URLs are generated when copying requests as cURL/fetch/raw.
- Fixes duplicate Host headers when copying requests as raw.

---

## 2.5.1 (2025-10-15)

- Fix: Use hash-based routing URL for shared requests

---

## 2.5.0 (2025-10-13)

- Add `resp.socket` property for HTTP handlers to break the HTTP protocol.
- Add AbortSocketError for HTTP handlers to destroy the socket without sending a response.
- Add TCP handler support. TCP handlers are run in response to incoming data, and can use a `send()` function to send data back on the socket.

---

## 2.4.0 (2025-10-11)

- Add `sleep(ms)` function to handler code execution context.
- Enable top-level `await` keywords in handler code.
- Improve copy in manual pages.
- Fix: Request status toast displaying incorrect status after sending test requests.
- Fix: Duration display showing negative numbers for in-progress requests.
- Fix: Duration display for TCP connections not displaying in milliseconds.

---

## 2.3.0 (2025-10-10)

- Switch to hash-based routing to fix issue with nested routes when compiled as a single-file executables (see https://github.com/oven-sh/bun/issues/23431)
- Switch to using @luketurner/bakery for build/release scripts
- Fix issue with referencing manual pages when compiled as a single-file executable
- Fix issue with TCP server not being closed when hot reloading in devleopment mode
- Remove some unnecessary text.
- Fix handler links from homepage.

---

## 2.2.1 (2025-07-29)

- Fixed issue with `process.env.NODE_ENV` being accessed from the browser bundle. `NODE_ENV` is now set to `"production"` and inlined during the build process.

---

## 2.2.0 (2025-07-28)

- Reworked how certificates are generated. `wtt` now creates them automatically if the appropriate environment variables are set -- no longer requires running a separate bash script.
- Add `WTT_DASHBOARD_SSL_ENABLED` for enabling HTTPS for the admin dashboard with self-signed cert.
- Rename `WTT_WEBHOOK_SSL_CERT_PATH` to `WTT_SSL_CERT_PATH` and `WTT_WEBHOOK_SSL_KEY_PATH` to `WTT_SSL_KEY_PATH` to indicate these are not specific to the webhook server anymore.
- Executable names in compressed release files no longer include target (e.g. just `wtt` instead of `wtt-linux-x64`).

---

## 2.1.1 (2025-07-27)

- Compressed release files no longer include a spurious `dist/` directory.

---

## 2.1.0 (2025-07-27)

- Add `WTT_DATA_DIR` environment variable, defaulting to `./data`. Going forward, data will be stored in here instead of `./local`.
- Automatically create the directory for the SQLite DB if it doesn't already exist.

---

## 2.0.0 (2025-07-27)

This is the first official release! Some features are still a work in progress, notably:

- ACME cerficiate retrieval
- Raw TCP connections
