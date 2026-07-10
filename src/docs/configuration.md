# Configuration

Webhook Testing Tool is configured entirely through environment variables. Nothing is read from a config file.

Boolean variables must be set to the exact string `"true"`. Any other value, including `"1"` and `"TRUE"`, counts as false.

## Core

| Variable | Default | Notes |
| --- | --- | --- |
| `WTT_DATA_DIR` | `data` | Directory holding the database, certificates, and other files. Individual paths below can override where their file lands. |
| `WTT_DB_FILE` | `$WTT_DATA_DIR/data.sqlite` | SQLite database. Created if it does not exist. |
| `NODE_ENV` | `development` | Controls hot-module reloading and production safety checks. Release builds hardcode `production`. When set to `test`, the database is held in memory. |

## Admin dashboard

| Variable | Default | Notes |
| --- | --- | --- |
| `WTT_ADMIN_PORT` | `3001` | Port for the dashboard. |
| `WTT_ADMIN_USERNAME` | `admin@example.com` | Dashboard login. |
| `WTT_ADMIN_PASSWORD` | `admin123` | Dashboard password. Override this. |
| `BETTER_AUTH_SECRET` | none | Secret the authentication library uses to sign sessions. This is not a password; you never type it. Set it to a random value, such as the output of `openssl rand -base64 32`. |
| `WTT_BASE_URL` | `http://localhost:$WTT_ADMIN_PORT` | Public URL of the dashboard, falling back to `BETTER_AUTH_URL`. Serves as the OAuth issuer and token audience for the [MCP server](./mcp.md), so it must be externally reachable when you deploy behind a reverse proxy. |
| `WTT_DASHBOARD_SSL_ENABLED` | `false` | Serve the dashboard over HTTPS on the same port. See [TLS](./tls.md). |

In production mode, `wtt` refuses to start unless you set both `BETTER_AUTH_SECRET` and `WTT_ADMIN_PASSWORD`.

Setting `WTT_DASHBOARD_SSL_ENABLED` also flips the default `WTT_BASE_URL` scheme to `https`.

## Webhook server

| Variable | Default | Notes |
| --- | --- | --- |
| `WTT_WEBHOOK_PORT` | `3000` | Port for the cleartext HTTP server. Always listening. |
| `WTT_EXCLUDE_HEADERS` | none | Comma-separated header names to drop before logging an incoming request. Use it to hide headers your reverse proxy injects. |

See [Webhook server](./webhook-server.md).

## HTTPS

| Variable | Default | Notes |
| --- | --- | --- |
| `WTT_WEBHOOK_SSL_ENABLED` | `false` | Serve HTTP/1.1 over TLS on a second port. |
| `WTT_WEBHOOK_SSL_PORT` | `3443` | Port for the HTTPS server. |
| `WTT_SSL_CERT_PATH` | `$WTT_DATA_DIR/certs/cert.pem` | Certificate used when ACME is disabled. |
| `WTT_SSL_KEY_PATH` | `$WTT_DATA_DIR/certs/key.pem` | Private key used when ACME is disabled. |

See [TLS](./tls.md).

## HTTP/2

| Variable | Default | Notes |
| --- | --- | --- |
| `WTT_WEBHOOK_H2_ENABLED` | `false` | Serve HTTP/2 over TLS on a third port. Requires a certificate, but does not require `WTT_WEBHOOK_SSL_ENABLED`. |
| `WTT_WEBHOOK_H2_PORT` | `3444` | Port for the HTTP/2 server. |

See [HTTP/2](./http2.md).

## Let's Encrypt (ACME)

| Variable | Default | Notes |
| --- | --- | --- |
| `WTT_ACME_ENABLED` | `false` | Obtain certificates over ACME instead of reading them from disk. |
| `WTT_ACME_DOMAINS` | none | Comma-separated domains to request a certificate for. Required when ACME is enabled. |
| `WTT_ACME_EMAIL` | none | Contact address for the ACME account. Required when ACME is enabled. |
| `WTT_ACME_DIRECTORY` | `https://acme-v02.api.letsencrypt.org/directory` | ACME directory URL. Ignored when `WTT_ACME_STAGING` is true. |
| `WTT_ACME_CERT_PATH` | `$WTT_DATA_DIR/acme-certs` | Directory where ACME certificates and the account key are stored. |
| `WTT_ACME_STAGING` | `false` | Use the Let's Encrypt staging directory, which issues untrusted certificates against generous rate limits. |

See [TLS](./tls.md), which also covers the limits of the current ACME support.

## TCP server

| Variable | Default | Notes |
| --- | --- | --- |
| `WTT_TCP_PORT` | `3002` | Port for the raw TCP server. Always listening, on all interfaces. |

See [TCP connections](./tcp-connections.md).

## Public ports

Behind a reverse proxy, the port a client connects to differs from the port `wtt` binds. These variables tell the dashboard which port to display and which URLs to generate for **Copy as…**. They never change what `wtt` binds.

| Variable | Corresponds to |
| --- | --- |
| `WTT_PUBLIC_WEBHOOK_PORT` | `WTT_WEBHOOK_PORT` |
| `WTT_PUBLIC_WEBHOOK_SSL_PORT` | `WTT_WEBHOOK_SSL_PORT` |
| `WTT_PUBLIC_WEBHOOK_H2_PORT` | `WTT_WEBHOOK_H2_PORT` |
| `WTT_PUBLIC_TCP_PORT` | `WTT_TCP_PORT` |
