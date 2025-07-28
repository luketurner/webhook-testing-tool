# Webhook Testing Tool (wtt)

> [!NOTE]
> This README is for `v2` of webhook-testing-tool.
>
> The README and code for `v1` are available at: https://github.com/luketurner/webhook-testing-tool/releases/tag/v1.

<div style="max-width:500px; margin:auto;">

![Screenshot of the app](./docs/wtt_request.png)

</div>

`wtt` is an open-source alternative to webhook testing tools like https://webhook.site. It's designed for easy and lightweight self-hosting:

- **Single-file executable**: `wtt` is released as a single-file executable for easy, zero-dependency deployment. Just download and run the binary.
- **No external database**: `wtt` uses SQLite and the local filesystem for data storage. There is no need for an external database.
- **One binary, multiple servers**: `wtt` can run an HTTP server, HTTPS server, TCP server, and dashboard server all from a single executable.
- **Configured with environment variables**: `wtt` is exclusively configured via environment variables. See [Configration](#configuration) section for details.
- **Single-user login**: The `wtt` dashboard supports email/password authentication. The admin user's email and password are configured via environment variables.
- **HTTPS support with Let's Encrypt**: `wtt` supports built-in TLS termination using either self-signed certificates or Let's Encrypt certificates via the `http-01` ACME challenge. Admin dashboard does not support TLS termination. (Work in progress)

## Features

- Automatically responds to any HTTP request.
- Response behavior can be customized with Typescript code by defining **handlers**. See the Handlers section below.
- TLS termination with self-signed certificate or automatic Let's Encrypt certificates via ACME (work in progress, TLS socket info not currently available in Bun. See [related issue](https://github.com/oven-sh/bun/issues/16834))
- JWT parsing and signature verification against a JWKS or JWK URL.
- Formatting and syntax highlighting for JSON request/response bodies.
- Viewing request/response bodies in multiple encodings including UTF8, Latin-1, base64, hex, and binary.
- Special "parsed" views for certain common types of bodies, like JSON, XML/HTML, `application/x-www-form-urlencoded`, and `multipart/form-data`.
- Downloading request/response bodies as files, with extensions guessed based on the `Content-Type` header.
- `Authorization` header inspector that parses Basic, Bearer, JWT, and HMAC authorization schemes.
- Parse and verify `X-Signature-*` headers as sent by e.g. Github/Gitlab/etc.
- Composing and sending test requests directly from the UI.
- Datetime inspector that displays timestamps in multiple formats and timezones.
- Copy requests as cURL or Fetch.
- Share requests (generates a public URL that anyone can use to see a read-only view of the request and response).
- Accepts arbitrary TCP connections, allows viewing the data that was sent both ways over the connection.

## Limitations

- Does not support multi-user login. (Users are expected to deploy their own instance of `wtt` instead of sharing.)
- Reliance on SQLite means horizontal scaling is tricky. I recommend running `wtt` with a single pod/container and SQLite stored in a persistent volume. You could probably make horizontal scaling work with [Litestream](https://litestream.io/) or something, but I haven't tried it.

## Configuration

`wtt` understands the following environment variables:

| Variable | Default value | Notes |
|-|-|-|
| `NODE_ENV` | N/A | Set to `development` to enable development mode. |
| `WTT_DATA_DIR` | `"data"` | Path to the data directory. By default, all files (databases, certs, etc.) will be stored in this directory, although file locations can be overridden more granularly with other variables. |
| `WTT_DB_FILE` | `"$WTT_DATA_DIR/data.sqlite"` | Path to the SQLite database to use. Database will be created if it does not already exist. |
| `WTT_ADMIN_USERNAME` | `"admin@example.com"` | Configures the username for logging in to the admin dashboard. |
| `WTT_ADMIN_PASSWORD` | `"admin123"` | Configures the password for logging in to the admin dashboard. STRONGLY recommend to override the default value. |
| `WTT_EXCLUDE_HEADERS` | `""` | Comma-separated list of headers to exclude from logging for incoming HTTP requests. Used to e.g. remove headers added by a cloud reverse proxy. |
| `WTT_ADMIN_PORT` | `"3001"` | Port used for the admin dashboard Web UI. |
| `WTT_WEBHOOK_PORT` | `"3000"` | Port used for the HTTP (non-TLS-terminating) webhook server. |
| `WTT_TCP_PORT` | `"3002"` | Port used for the raw TCP (non-TLS-terminating) server. |
| `WTT_DASHBOARD_SSL_ENABLED` | `"false"` | Set to `"true"` to enable (and require) HTTPS (TLS termination) for the dashboard server. Note the dashboard server currently only supports using self-signed (or BYO) certificates. |
| `WTT_WEBHOOK_SSL_ENABLED` | `"false"` | Set to `"true"` to enable the HTTPS (TLS-terminating) webhook server. |
| `WTT_WEBHOOK_SSL_PORT` | `"3443"` | Port used for the HTTPS server. |
| `WTT_SSL_CERT_PATH` | `"$WTT_DATA_DIR/certs/cert.pem"` | Path to the SSL/TLS certificate to use for HTTPS if not using ACME/Let's Encrypt. |
| `WTT_SSL_KEY_PATH` | `"$WTT_DATA_DIR/certs/key.pem"` | Path to the SSL/TLS private key to use for HTTPS if not using ACME/Let's Encrypt. |
| `WTT_ACME_ENABLED` | `"false"` | Set to `"true"` to enable certificate retrieval via ACME/Let's Encrypt. |
| `WTT_ACME_DOMAINS` | `""` | Comma-separated list of domains to request certificates for ACME/Let's Encrypt. |
| `WTT_ACME_EMAIL` | `""` | Contact email for ACME/Let's Encrypt. |
| `WTT_ACME_DIRECTORY` | `"https://acme-v02.api.letsencrypt.org/directory"` | Directory URL for ACME/Let's Encrypt. |
| `WTT_ACME_CERT_PATH` | `"$WTT_DATA_DIR/acme-certs"` | Local directory that ACME certificates will be stored in. |
| `WTT_ACME_STAGING` | `"false"` | Whether the ACME directory is a staging environment. |

## Handlers

One special feature is the ability to configure how `wtt` responds to requests using handlers.

<div style="max-width:500px; margin:auto;">

![Screenshot of the app](./docs/wtt_handler.png)

</div>

Handlers are written in Typescript and can be edited in the `wtt` admin UI. You can define multiple scripts based on the request's HTTP method and URL. Handlers can be nested with an Express-style middleware pattern as well. Some notable features:

- Multiple handlers can be executed for a single request in a kind of middleware pattern. Nested handlers can share state using a `locals` value.
- Handlers can match on paths with parameters in an Express style e.g. `/person/:id`
- Handlers can share state with all other handlers **globally** using the `shared` object. This is stored in the DB and persists across server restarts.
- Use `resp.body_raw` to return a base64 encoded payload that can include arbitrary content.

Documentation about handlers is available in the in-app manual, or you can open [the manual page](./src/docs/handlers.md) in Github.

## Local testing

Requirements:

- [Bun](https://bun.sh/)

```bash
# install dependencies
bun install

# run the server
bun run dev

# run automated tests
bun run test
```

View the UI at http://localhost:3001/ (login with user `admin@example.com` / password `admin123` for local development)

Some other useful commands:

```bash
# production build
bun run build

# Publish a new release
bun pm version [increment]
git push origin tag [tag]
```

## Development with Claude Code

This project is designed to be developed in tandem with Claude Code using the following steps:

1. Open the project in a Devcontainer.
2. When starting on a new feature, run `wt new` to create a new worktree and launch a zellij session for that worktree with:
   - Claude Code
   - Dedicated app server for testing changes in that worktree
   - Lazygit for seeing what changes were made.
3. Once finished working in that worktree, exit Zellij with `C-b q` and you will be prompted to cherry-pick the commits from the worktree into the `main` branch.

## Deployment

`wtt` is designed for deployment on [Fly](https://fly.io):

```bash
flyctl launch --no-deploy
flyctl secrets set WTT_ADMIN_USERNAME=you@example.com WTT_ADMIN_PASSWORD=yoursecretpassword BETTER_AUTH_SECRET="$(openssl rand -base64 32)"
flyctl volumes create -s 1 -r sea data
flyctl deploy
```

Then you can open the admin dashboard at `https://$APP_NAME.fly.dev:8000/`, and send webhook requests to `http://$APP_NAME.fly.dev` or `https://$APP_NAME.fly.dev`

## SSL/TLS Configuration

`wtt` supports HTTPS connections with two certificate options:

### Self-Signed Certificates (Default)

By default, `wtt` uses self-signed certificates for HTTPS. Just set `WTT_WEBHOOK_SSL_ENABLED`, no additional configuration needed:

```bash
# Enable SSL w/self-signed cert
export WTT_WEBHOOK_SSL_ENABLED=true
```

`wtt` will automatically generate a new self-signed cert on startup (requires `openssl` to be installed), or use an existing cert if already created.

### Let's Encrypt Certificates (ACME)

> [!WARNING]
> ACME support is still a work in progress!


For production deployments, `wtt` can automatically obtain and renew certificates from Let's Encrypt:

```bash
# Enable ACME
export WTT_ACME_ENABLED=true
export WTT_WEBHOOK_SSL_ENABLED=true

# Configure your domain(s)
export WTT_ACME_DOMAINS=example.com,www.example.com
export WTT_ACME_EMAIL=admin@example.com

# Optional: Use Let's Encrypt staging for testing
export WTT_ACME_STAGING=true
```

**ACME Requirements:**

- Your domain must point to your `wtt` instance
- Port 80 must be accessible for HTTP-01 challenges
