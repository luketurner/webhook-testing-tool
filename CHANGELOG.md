# Changelog

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
