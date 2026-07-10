# Webhook Server

The webhook server accepts any HTTP request on any path, records it, and replies. Configure nothing and it answers `200 OK` with an empty body. Write a [handler](./handlers.md) and it answers however you like.

## Listeners

`wtt` can run three HTTP listeners at once. All three share the same handlers and record into the same request log.

| Protocol | Default port | Enabled by |
| --- | --- | --- |
| HTTP/1.1, cleartext | `3000` | always listening |
| HTTP/1.1 over TLS | `3443` | `WTT_WEBHOOK_SSL_ENABLED` |
| HTTP/2 over TLS | `3444` | `WTT_WEBHOOK_H2_ENABLED` |

The cleartext listener cannot be turned off. Both TLS listeners need a certificate, which `wtt` will generate for you; see [TLS](./tls.md). HTTP/2 occupies a separate port rather than sharing the HTTPS one, for reasons covered in [HTTP/2](./http2.md).

Behind a reverse proxy, set the `WTT_PUBLIC_*` variables so the dashboard shows the URLs your clients actually use. See [Configuration](./configuration.md).

## What gets recorded

Every request becomes a **request event**, stored in SQLite and streamed to the dashboard as it happens.

| Field | Contents |
| --- | --- |
| `request_method`, `request_url` | The method and path. |
| `request_query_params` | Query string, parsed into name/value pairs. |
| `request_headers` | Request headers, minus any you excluded. |
| `request_body` | The raw body, stored base64-encoded. |
| `request_timestamp` | When the request arrived. |
| `response_status`, `response_status_message` | What was sent back. HTTP/2 carries no reason phrase, so the message is always empty there. |
| `response_headers`, `response_body` | What was actually transmitted, not merely what a handler asked for. Express adds `content-length` and `etag` on its own, and those appear here. |
| `response_timestamp` | When the response was sent. |
| `http_version` | `1.1` or `2.0`. |
| `tls_info` | Negotiated protocol, cipher, and certificate. Populated only for HTTP/2 requests; see [TLS](./tls.md). |
| `http2_info` | Pseudo-headers, stream, and SETTINGS frames. See [HTTP/2](./http2.md). |
| `status` | `running` while handlers execute, then `complete` or `error`. |

Bodies are stored as raw bytes and handed to the dashboard base64-encoded, so binary payloads survive intact. [Inspecting requests](./inspecting-requests.md) covers how to read them back.

## Excluding headers

A reverse proxy or cloud load balancer will attach headers of its own, and they add noise to every capture. List them in `WTT_EXCLUDE_HEADERS` and `wtt` drops them before recording:

```bash
export WTT_EXCLUDE_HEADERS=x-forwarded-for,x-request-id,fly-client-ip
```

Excluded headers never reach handlers either.

## Responses

With no matching handler, `wtt` returns `200 OK` and an empty body.

Handlers change that. They match on method and path, chain like Express middleware, and can set any status, headers, and body. A handler can also break the protocol on purpose — write raw bytes to the socket, or abort the connection outright — to test how your client copes. See [Handlers](./handlers.md).

## Trying it

```bash
curl http://localhost:3000/hello

# with a body, to see payload inspection do something
curl -X POST http://localhost:3000/hello \
  -H 'content-type: application/json' \
  -d '{"greeting":"hi"}'
```

Both requests appear in the dashboard immediately. You can also send requests without leaving the dashboard; see [Sending requests](./sending-requests.md).
