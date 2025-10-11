# Welcome to Webhook Testing Tool

Webhook Testing Tool (WTT) is an open-source tool for testing HTTP webhooks, TCP connections, and more.

## Installation

WTT source code and installation instructions are available [on Github](https://github.com/luketurner/webhook-testing-tool).

## Features

- **Responds to HTTP requests**: Automatically responds with a `200 OK` to any incoming HTTP request.
- **Typescript response handlers**: Write custom response logic using Typescript handlers with Intellisense (uses an embedded Monaco editor and compiles with Bun's transpiler).
    - **Middleware pattern**: Multiple handlers can run per request in a middleware-like pattern.
    - **Persistent state**: Handlers can share state local to a given request, or globally (a persistent pseudo-DB for sharing data across multiple requests).
- **Admin dashboard**: Authenticated Web UI exposed on a separate port from the main webhook server.
- **Stores everything**: All requests and responses, handler execution state, etc. are stored in the SQLite DB and viewable in the dashboard.
- **TLS Termination**: Supports TLS termination via self-signed certificate or Let's Encrypt ( :construction: WIP; TLS socket info not currently available in Bun. See [related issue](https://github.com/oven-sh/bun/issues/16834)).
- **Prettify payloads**: Display payloads in "pretty" mode (formatted and syntax highlighted -- XML/JSON/urlencoded only) or "raw" mode (exactly what you got).
- **Multiple encodings**: Display payloads in multiple encodings: UTF8, Latin-1, base64, hex, and binary.
- **Downloading**: Download payloads with automatic filetype detection (based on Content-Type).
- **Multipart payloads**: Inspect multipart payload parts individually, or view the entire raw multipart body.
- **Timestamp inspector**: View timestamps in multiple formats and different timezones.
- **Authorization inspector**: Parse and inspect Authorization header schemes -- Basic, Digest, Bearer, etc.
- **JWTs**: Detect, parse, and verify JWTs from the dashboard. Verification requires private key to be provided. Handlers have access to a suite of JWT utility functions to inspect and verify automatically.
- **HMAC**: Detect, parse, and verify HMAC signatures from the dashboard, e.g. those sent in `X-Signature-*` headers.
- **Copy as...**: View and copy requests as cURL, Fetch, or Raw HTTP.
- **Sharing**: Generate unique, unauthenticated URLs to share requests/responses with others.
- **TCP connections**: Accepts arbitrary TCP connections on a separate port. View all data sent/received on the connection in the dashboard.
