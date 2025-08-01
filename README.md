# Webhook Testing Tool (wtt)

> [!NOTE]
> This README is for `v2` of webhook-testing-tool.
>
> The README and code for `v1` are available at: https://github.com/luketurner/webhook-testing-tool/releases/tag/v1.

<div style="max-width:500px; margin:auto;">

![Screenshot of the app](./docs/wtt_request.png)

</div>

`wtt` is an open-source alternative to webhook testing tools like https://webhook.site. It's designed for easy and lightweight self-hosting:

- **Single-file executable**: Released as a single-file executable for easy, zero-dependency deployment. Just download and run the binary.
- **No external database**: Uses SQLite and the local filesystem for data storage. There is no need for an external database.
- **Configured with environment variables**: Exclusively configured via environment variables. See [Configration](#configuration) section for details.
- **Single-user login**: The `wtt`admin dashboard supports email/password authentication. The admin user's email and password are configured via environment variables.
- **HTTPS support with Let's Encrypt**: Supports built-in TLS termination using either self-signed certificates or Let's Encrypt certificates via the `http-01` ACME challenge. (Let's Encrypt support is WIP)

## Features

- **:ear: Responds to HTTP requests**: Automatically responds with a `200 OK` to any incoming HTTP request.
- **:screwdriver: Typescript response handlers**: Write custom response logic using Typescript handlers with Intellisense (uses an embedded Monaco editor and compiles with Bun's transpiler).
    - **Middleware pattern**: Multiple handlers can run per request in a middleware-like pattern.
    - **Persistent state**: Handlers can share state local to a given request, or globally (a persistent pseudo-DB for sharing data across multiple requests).
- **:world_map: Admin dashboard**: Authenticated Web UI exposed on a separate port from the main webhook server.
- **:card_file_box: Stores everything**: All requests and responses, handler execution state, etc. are stored in the SQLite DB and viewable in the dashboard.
- **:shield: TLS Termination**: Supports TLS termination via self-signed certificate or Let's Encrypt ( :construction: WIP; TLS socket info not currently available in Bun. See [related issue](https://github.com/oven-sh/bun/issues/16834)).
- **:art: Prettify payloads**: Display payloads in "pretty" mode (formatted and syntax highlighted -- XML/JSON/urlencoded only) or "raw" mode (exactly what you got).
- **:mag: Multiple encodings**: Display payloads in multiple encodings: UTF8, Latin-1, base64, hex, and binary.
- **:floppy_disk: Downloading**: Download payloads with automatic filetype detection (based on Content-Type).
- **:jigsaw: Multipart payloads**: Inspect multipart payload parts individually, or view the entire raw multipart body.
- **:watch: Timestamp inspector**: View timestamps in multiple formats and different timezones.
- **:lock_with_ink_pen: Authorization inspector**: Parse and inspect Authorization header schemes -- Basic, Digest, Bearer, etc.
- **:toolbox: JWTs**: Detect, parse, and verify JWTs from the dashboard. Verification requires private key to be provided. Handlers have access to a suite of JWT utility functions to inspect and verify automatically.
- **:balance_scale: HMAC**: Detect, parse, and verify HMAC signatures from the dashboard, e.g. those sent in `X-Signature-*` headers.
- **:writing_hand: Copy as...**: View and copy requests as cURL, Fetch, or Raw HTTP.
- **:loudspeaker: Sharing**: Generate unique, unauthenticated URLs to share requests/responses with others.
- **:salt: TCP connections**: Accepts arbitrary TCP connections on a separate port. View all data sent/received on the connection in the dashboard.

## Limitations

- Does not support multi-user login. (Users are expected to deploy their own instance of `wtt` instead of sharing.)
- Reliance on SQLite means horizontal scaling is tricky. I recommend running `wtt` with a single pod/container and SQLite stored in a persistent volume. You could probably make horizontal scaling work with [Litestream](https://litestream.io/) or something, but I haven't tried it.

## Quickstart

1. Download the archive for your platform from the [latest release](https://github.com/luketurner/webhook-testing-tool/releases/latest).
2. Extract the executable from your archive:

```bash
# example -- replace archive name with the one for your platform
tar -xf wtt-linux-x86.tar.gz
```

3. Set required environment variables:

```bash
# Enable HTTPS for the admin dashboard with a self-signed cert. Requires openssl to be installed
# Not necessary if hosted behind a reverse proxy that terminates TLS, e.g. on Fly,
# or if you're fine with sending credentials over plain HTTP.
export WTT_DASHBOARD_SSL_ENABLED=true

# Set a secure password
export WTT_ADMIN_PASSWORD="mysupersecurepassword"

# Create secret required by authentication library
export BETTER_AUTH_SECRET="$(openssl rand -base64 32)"
```

4. Run the app:

```bash
./wtt
```

5. Open the admin dashboard at http://localhost:3001 (or https://localhost:3001 if `WTT_DASHBOARD_SSL_ENABLED=true`). Login with username `admin@example.com` and your configured password.
6. Send a test request to the webhook server (served on `http:/localhost:3000` by default):

```bash
curl http://localhost:3000/hello
```

7. Observe the request you just sent appears in the admin dashboard UI.

### Docker

There are two example Dockerfiles for deploying `wtt`:

- The [release.Dockerfile](./release.Dockerfile) uses a base `alpine` image and `curl` to download the latest `wtt` release from Github. You should normally use this. You may want to adjust the Dockerfile to pin the download to a specific version instead of pulling the latest one if you want consistent behavior with no breaking changes.
- The [development.Dockerfile](./development.Dockerfile) builds `wtt` from source. You should use this if you want to test unreleased code.

### Fly.io

All you need to deploy on [Fly.io](https://fly.io/) are two files:

- The sample [release.Dockerfile](./release.Dockerfile)
- The sample [fly.toml](./fly.toml)

Steps:

1. Download those two files into the same directory.
2. Edit the `app` value in the `fly.toml` to something unique for your app.
3. Run the following commands (changing secret and region values as needed):

```bash
flyctl launch --no-deploy
flyctl secrets set WTT_ADMIN_USERNAME=you@example.com WTT_ADMIN_PASSWORD=yoursecretpassword BETTER_AUTH_SECRET="$(openssl rand -base64 32)"
flyctl volumes create -s 1 -r sea data
flyctl deploy
```

Once deployed, you can access your app at the following URLs:

- Admin dashboard: `https://$APP_NAME.fly.dev:8000/`
- Webhook server (HTTP): `http://$APP_NAME.fly.dev`
- Webhook server (HTTPS): `https://$APP_NAME.fly.dev`
- TCP server: `$APP_NAME.fly.dev:3002`

## Configuration

`wtt` understands the following environment variables:

| Variable | Default value | Notes |
|-|-|-|
| `BETTER_AUTH_SECRET` | N/A | Secret used by `better-auth` for securing dashboard authentication. This is NOT a password, it's used internally by the system. Should be set to a sufficiently random value for any production deployment. |
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
| `NODE_ENV` | `"development"` or `"production"` | Controls certain development features (e.g. hot-module reloading) and security checks. Note this is always set to `"production"` for release builds and cannot be changed. |

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


## SSL/TLS Configuration

`wtt` supports HTTPS connections with two certificate options:

### Self-Signed Certificates (Default)

By default, `wtt` uses self-signed certificates for HTTPS. Just set `WTT_WEBHOOK_SSL_ENABLED` and/or `WTT_DASHBOARD_SSL_ENABLED`, no additional configuration needed:

```bash
# Enable HTTPS w/self-signed cert for webhook server
export WTT_WEBHOOK_SSL_ENABLED=true

# Enable HTTPS w/self-signed cert for admin dashboard server
export WTT_DASHBOARD_SSL_ENABLED=true
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
