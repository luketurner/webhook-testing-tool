# Manual Pages for Key Features — Design

**Date:** 2026-07-09
**Status:** Approved

## Problem

The in-app manual (`src/docs`) covers only four topics: `home`, `handlers`, `tcp-handlers`, and `mcp`. Key features — TLS, HTTP/2, TCP connections, sending test requests, and request inspection — are documented nowhere, or only in passing in the README.

Two reference sections live in the README that belong in the manual: the environment variable table and the admin CLI reference. Users running `wtt` cannot reach either without leaving the app.

`home.md` has also drifted. It reproduces an old copy of the README feature list, omitting HTTP/2 and protocol breakers.

## Goals

1. Add manual pages for the key features, written from the code rather than from the README.
2. Move the environment variable reference and the CLI reference into manual pages, linked from the README.
3. Let manual pages link to each other, both on GitHub and inside the dashboard.
4. Document real limitations rather than omitting them.

## Non-goals

- Restructuring the manual API (`/api/manual`, `/api/manual/:pageName`) or the MCP manual tools.
- Rewriting `handlers.md` or `tcp-handlers.md`, beyond correcting the wrong TCP port in the latter.
- Adding a search index, page ordering metadata, or a table-of-contents component.

## Page structure

Twelve pages. Two are unchanged, one takes a correction, one is rewritten, two move out of the README, and six are new.

| Page | Status | Covers |
| --- | --- | --- |
| `home.md` | Rewritten | What WTT is; grouped index linking every page |
| `webhook-server.md` | New | Receiving and capturing HTTP requests |
| `tls.md` | New | Self-signed certs, BYO certs, ACME, dashboard TLS, `tls_info` |
| `http2.md` | New | Enabling h2, captured h2 metadata, handler differences |
| `tcp-connections.md` | New | TCP server config, connection lifecycle, what is recorded |
| `sending-requests.md` | New | Test Request page, resend, MCP `send-http-request` |
| `inspecting-requests.md` | New | Payload viewer, Copy as…, inspectors, sharing |
| `configuration.md` | Moved from README | Environment variable reference |
| `cli.md` | Moved from README | Admin command reference |
| `handlers.md` | Unchanged | HTTP handler programming model |
| `tcp-handlers.md` | Port fix only | TCP handler programming model |
| `mcp.md` | Unchanged | MCP server and tools |

### Boundaries between pages

`webhook-server.md` describes the listeners and the capture pipeline. `tls.md` and `http2.md` describe protocol options layered on those listeners; each links back rather than restating port defaults.

`tcp-connections.md` describes the server and the recorded connection. `tcp-handlers.md` already owns the handler programming model, the injected globals, and the client-tool examples. The new page links to it and does not repeat it.

`sending-requests.md` covers producing a request. `inspecting-requests.md` covers reading one back. Both link to `handlers.md`, which owns what happens in between.

`configuration.md` is the single source of truth for environment variables. Feature pages name the variables they depend on and link to it for defaults.

## Cross-page links

Pages link to each other with relative markdown links: `[TLS](./tls.md)`. GitHub resolves these against `src/docs/`. The dashboard rewrites them.

A new module, `src/docs/render.ts`, exports `renderManualPage(markdown: string): Promise<string>`. It wraps `marked` with a custom link renderer that resolves an href against the `manualPages` keys and, on a match, emits:

```html
<a href="?manual=tls" data-manual-page="tls">TLS</a>
```

External and unrecognized links pass through unchanged. Resolution is a pure function, `manualPageFromHref(href)`, which strips a leading `./` and a trailing `.md` and returns the page name only if it is a key of `manualPages`. A link to a page that does not exist therefore renders as an ordinary anchor, which is visible in tests rather than silently broken at click time.

`dashboard/server.ts` calls `renderManualPage` in place of its inline `marked` call.

`ManualSheet` attaches one delegated click handler to the rendered container. A click inside an element carrying `data-manual-page` is intercepted, and the sheet swaps its contents via `setSearchParams`. This is required because the dashboard uses `HashRouter` (`app.tsx:34`); an unintercepted `href="?manual=tls"` would replace the real query string and discard the hash route.

## Navigation

`app-sidebar.tsx` renders a hardcoded Documentation dropdown with three items. It gains one item per page, grouped with separators, and picks up the `mcp` page, which is reachable today only over MCP or by hand-editing the URL.

## README changes

Three sections are replaced by one-line pointers to their manual pages:

- **Configuration** → `configuration.md`
- **Admin commands** → `cli.md`
- **SSL/TLS Configuration** → `tls.md`

The README retains its pitch, feature list, limitations, quickstart, deployment guides (Docker, Fly.io), local testing, and devcontainer notes. Pointers use the same relative form as the existing handler links: `./src/docs/tls.md`.

## Limitations to document

These are true of the code at `845ddbb` and belong in the docs.

- **ACME renewal does not reload the certificate.** `server.ts:88-95` closes the HTTPS server on renewal and never re-listens. A process restart is required. `tls.md`.
- **The ACME renewal scheduler requires `WTT_WEBHOOK_SSL_ENABLED`** (`server.ts:72`), so an HTTP/2-only deployment never schedules renewal. `tls.md`.
- **`wtt` never binds port 80.** HTTP-01 challenges are served from the plain webhook listener on `WTT_WEBHOOK_PORT`. Reaching them from Let's Encrypt requires setting that port to 80 or proxying `/.well-known/acme-challenge/`. The README's current claim that "port 80 must be accessible" omits this. `tls.md`.
- **`tls_info` is `null` for every HTTP/1.1 request** under Bun ([bun#16834](https://github.com/oven-sh/bun/issues/16834)); it populates only on the h2 path. `tls.md`, `http2.md`.
- **Self-signed certs carry `CN=localhost` and no SAN**, are never regenerated on expiry, and require `openssl` on the PATH. `tls.md`.
- **HTTP/2 needs its own TLS port** ([bun#26721](https://github.com/oven-sh/bun/issues/26721)); h2c is unsupported. `http2.md`.
- **`resp.socket` raw writes are unsupported over HTTP/2** and reset the stream. Connection-specific response headers are stripped. `http2.md`, cross-referenced from `handlers.md`'s protocol-breaker section.
- **`sendWebhookRequest` accepts absolute URLs** (`send-request.ts:11`) and will send to any host, not only the local webhook server. `sending-requests.md`.
- **Share links carry no expiry and no authentication.** The 32-hex-character token is the capability, and `GET /api/shared/:sharedId` is registered outside `withAuth`. `inspecting-requests.md`.
- **The TCP server has no TLS listener** and no enable flag; it always binds `0.0.0.0`. `tcp-connections.md`.
- **Stored TCP data loses packet boundaries and direction interleaving.** `received_data` and `sent_data` are separate accumulated blobs. `tcp-connections.md`.

## Corrections

- `tcp-handlers.md` uses port `8888` in every testing example (lines 341, 343, 351, 362, 379). The default is `3002`.
- `home.md`'s feature list predates HTTP/2 and protocol breakers.

## Testing

`src/docs/render.spec.ts` covers `manualPageFromHref` and `renderManualPage`:

- `./tls.md` and `tls.md` resolve to the `tls` page and render the `data-manual-page` attribute.
- `https://example.com` and `#anchor` pass through untouched.
- `./nope.md`, naming no existing page, renders as a plain anchor.
- Every relative `.md` link in every page under `manualPages` resolves to a real page. This turns a broken cross-link into a failing test.
- Existing `marked` options, `gfm` and `breaks`, still apply.

`manual-sheet.spec.tsx` is not added; the repo has no component test harness.

## Risks

Twelve dropdown items make the Documentation menu long. Separators between the four groups — About, Protocols, Requests, Reference — keep it scannable. If it grows further, the menu should be replaced by a manual landing page, which `home.md` already is.
