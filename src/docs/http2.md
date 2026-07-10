# HTTP/2

`wtt` can serve HTTP/2 and record the protocol detail that HTTP/1.1 hides: pseudo-headers, stream identifiers, frame flags, and the SETTINGS both peers negotiated.

## Enabling it

```bash
export WTT_WEBHOOK_H2_ENABLED=true
```

That is the whole configuration. The server listens on `WTT_WEBHOOK_H2_PORT`, which defaults to `3444`, and generates a self-signed certificate if you have not supplied one. It does not require `WTT_WEBHOOK_SSL_ENABLED`; the two listeners are independent.

`wtt` speaks `h2` over TLS only. Cleartext HTTP/2, whether by prior knowledge or by `Upgrade: h2c`, is not supported.

### Why a separate port

Ordinarily one TLS port serves both HTTP/1.1 and HTTP/2, and ALPN picks between them per connection. Bun ignores the option that would allow this and advertises only `h2` ([bun#26721](https://github.com/oven-sh/bun/issues/26721)), so an HTTP/1.1 client reaching that port gets a TLS `no application protocol` alert rather than a response.

Rather than break HTTP/1.1, `wtt` gives HTTP/2 its own port. Send `h2` traffic to `3444` and everything else to `3000` or `3443`. See [Webhook server](./webhook-server.md).

## Trying it

```bash
curl -sk --http2 -X POST https://localhost:3444/h2-demo \
  -H 'content-type: application/json' \
  -d '{"hello":"h2"}' \
  -w '\n[HTTP/%{http_version}]\n'
```

`-k` skips verification of the self-signed certificate and `--http2` forces the protocol. The trailing output should read `[HTTP/2]`.

In the dashboard the request carries an `H2` badge in the list and an `HTTP/2.0` badge on the detail page.

## What gets recorded

An HTTP/2 request captures everything an HTTP/1.1 request does, plus an **HTTP/2** section and, uniquely, a populated **TLS** section. See [TLS](./tls.md) for why HTTP/2 is the only place TLS details appear.

**Connection and stream**

- `alpn_protocol` — the protocol ALPN settled on, `h2`.
- `stream_id` — the stream this request arrived on.
- `weight` — the stream's priority weight.
- `headers_frame_flags` — whether the HEADERS frame carried `END_STREAM` and `END_HEADERS`.

**Pseudo-headers**

`:method`, `:path`, `:scheme`, and `:authority` are recorded separately from ordinary headers and shown in their own table. They do not appear in the Headers table, and handlers do not see them among `req.headers`.

**SETTINGS**

`local_settings` and `remote_settings` are shown side by side, covering `headerTableSize`, `enablePush`, `initialWindowSize`, `maxConcurrentStreams`, `maxFrameSize`, `maxHeaderListSize`, and `enableConnectProtocol`.

Individual DATA, WINDOW_UPDATE, PRIORITY, PING, and GOAWAY frames are **not** recorded. Stream priority appears only as the single `weight` value.

## How handlers behave

[Handlers](./handlers.md) run unchanged. The same `req`, `resp`, `ctx`, `locals`, and `shared` objects are available, matching works the same way, and a handler need not know which listener served it.

Four differences show up on HTTP/2:

- **`resp.socket` does nothing.** Raw socket writes would corrupt HTTP/2's binary framing, so a handler that sets `resp.socket` resets the stream with an internal error instead. Protocol breakers only work over HTTP/1.1.
- **Aborting closes the stream, not the connection.** Throwing `AbortSocketError` cancels the stream. The request is still recorded, with no response.
- **Connection-specific response headers are stripped.** HTTP/2 forbids `connection`, `keep-alive`, `transfer-encoding`, `upgrade`, and `proxy-connection`. If a handler sets one, `wtt` removes it before responding.
- **Response header names arrive lowercased,** and there is no status reason phrase to set.
