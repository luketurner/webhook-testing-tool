# Welcome to Webhook Testing Tool

Webhook Testing Tool (WTT) is an open-source tool for testing and debugging HTTP webhooks, TCP connections, and more. It answers any request you send it, records the request and the response in full, and lets you write TypeScript to control what it replies.

Source code and installation instructions live [on GitHub](https://github.com/luketurner/webhook-testing-tool).

## Receiving traffic

- [Webhook server](./webhook-server.md) — the HTTP listeners, what gets recorded, and how to keep proxy headers out of your logs.
- [TLS](./tls.md) — self-signed certificates, your own certificates, and Let's Encrypt.
- [HTTP/2](./http2.md) — serving `h2` and inspecting pseudo-headers, streams, and SETTINGS.
- [TCP connections](./tcp-connections.md) — the raw TCP server, for protocols that are not HTTP.

## Working with requests

- [Sending requests](./sending-requests.md) — send a test request, or replay one you captured.
- [Inspecting requests](./inspecting-requests.md) — payload encodings, multipart parts, JWTs, HMAC signatures, and sharing.

## Writing responses

- [Handlers](./handlers.md) — respond to HTTP requests with TypeScript.
- [TCP handlers](./tcp-handlers.md) — respond to TCP data with TypeScript.
- [MCP server](./mcp.md) — connect an AI agent to inspect requests and write handlers.

## Reference

- [Configuration](./configuration.md) — every environment variable.
- [Admin CLI](./cli.md) — reset the login, export the database.

## Features

- **Responds to HTTP requests.** Answers `200 OK` to anything, on cleartext HTTP, HTTPS, and HTTP/2.
- **TypeScript response handlers.** Write custom response logic in an embedded editor with Intellisense. Handlers chain like middleware, share state within a request, and share persistent state across requests.
- **Protocol breakers.** Write non-HTTP bytes to the socket, or abort the connection, to see how your client copes.
- **Stores everything.** Requests, responses, and handler execution state all land in SQLite and are viewable in the dashboard.
- **TLS termination.** Self-signed, bring-your-own, or Let's Encrypt.
- **HTTP/2 inspection.** Pseudo-headers, stream identifiers, frame flags, and negotiated SETTINGS.
- **Prettify payloads.** Format and syntax-highlight JSON, XML, and HTML, or read the exact bytes you received.
- **Multiple encodings.** View payloads as UTF-8, ASCII, Latin-1, base64, hex, or binary.
- **Downloading.** Save a payload with the file extension its `Content-Type` implies.
- **Multipart payloads.** Inspect each part separately, or the whole raw body.
- **Timestamp inspector.** Read any timestamp in several formats and any timezone.
- **Authorization inspector.** Parse Basic, Digest, Bearer, JWT, and HMAC credentials.
- **JWTs.** Decode and verify tokens against a JWKS or a JKU, in the dashboard or inside a handler.
- **HMAC.** Verify webhook signatures from GitHub, Gitea, GitLab, and others against the bytes actually received.
- **Copy as…** Re-express a captured request as cURL, `fetch`, or raw HTTP.
- **Sharing.** Publish a request at an unauthenticated URL.
- **TCP connections.** Accept raw TCP on a separate port and inspect everything sent and received.
- **MCP server.** Point an AI agent at your instance to automate testing workflows.
