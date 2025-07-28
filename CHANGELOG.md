# Changelog

## 2.1.1 (2025-07-27)

- Compressed release files no longer include a spurious `dist/` directory.

## 2.1.0 (2025-07-27)

- Add `WTT_DATA_DIR` environment variable, defaulting to `./data`. Going forward, data will be stored in here instead of `./local`.
- Automatically create the directory for the SQLite DB if it doesn't already exist.

---

## 2.0.0 (2025-07-27)

This is the first official release! Some features are still a work in progress, notably:

- ACME cerficiate retrieval
- Raw TCP connections