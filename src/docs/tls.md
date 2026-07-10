# TLS

`wtt` can terminate TLS on the webhook server, the HTTP/2 server, and the admin dashboard. Certificates come from one of three places: a self-signed certificate `wtt` generates, a certificate you supply, or Let's Encrypt over ACME.

The [TCP server](./tcp-connections.md) does not support TLS.

## Self-signed certificates

This is the default. Enable a TLS listener and `wtt` generates a certificate on startup if none exists:

```bash
# HTTPS webhook server on port 3443
export WTT_WEBHOOK_SSL_ENABLED=true

# HTTPS admin dashboard, on the same port as the HTTP dashboard
export WTT_DASHBOARD_SSL_ENABLED=true
```

Generation shells out to `openssl`, which must be on your `PATH`. The certificate is RSA-4096, valid for 365 days, and lands at `WTT_SSL_CERT_PATH` and `WTT_SSL_KEY_PATH` (by default `data/certs/cert.pem` and `data/certs/key.pem`).

Three things about the generated certificate are worth knowing:

- Its subject is `CN=localhost` and it carries **no subject alternative names**. Clients that verify hostnames will reject it when you connect by IP address or by any name other than `localhost`.
- `wtt` generates it only when **both** the certificate and the key are missing. Delete both to force a fresh one.
- Nothing regenerates it when it expires. After a year, delete both files and restart.

Because the certificate is self-signed, clients must be told to skip verification:

```bash
curl -k https://localhost:3443/hello
```

## Bringing your own certificate

Point `WTT_SSL_CERT_PATH` and `WTT_SSL_KEY_PATH` at a PEM certificate and key of your own. `wtt` leaves existing files alone, so nothing is overwritten.

This is the only way to give the **dashboard** a certificate a browser will trust. `WTT_DASHBOARD_SSL_ENABLED` reads from these two paths and never consults ACME.

## Let's Encrypt (ACME)

> ACME support is a work in progress. Read the limitations below before relying on it.

```bash
export WTT_ACME_ENABLED=true
export WTT_WEBHOOK_SSL_ENABLED=true
export WTT_ACME_DOMAINS=example.com,www.example.com
export WTT_ACME_EMAIL=admin@example.com

# issue untrusted certs against generous rate limits while you experiment
export WTT_ACME_STAGING=true
```

`wtt` requests a certificate for every domain in `WTT_ACME_DOMAINS` and stores it, along with the ACME account key, under `WTT_ACME_CERT_PATH`. Certificates are used by the HTTPS and [HTTP/2](./http2.md) webhook listeners. If the ACME exchange fails at startup, `wtt` falls back to the self-signed certificate, and failing that serves cleartext HTTP only.

### Validation happens on the webhook port

`wtt` answers the `http-01` challenge from a route on the **cleartext webhook listener**, at `/.well-known/acme-challenge/:token`. It never binds port 80 itself.

Let's Encrypt always validates `http-01` by connecting to port 80 of your domain. To satisfy it you must either set `WTT_WEBHOOK_PORT=80` or put a proxy in front that forwards `/.well-known/acme-challenge/` to whichever port the webhook server is on. Your domain must resolve to the instance.

### Renewal

`wtt` treats a certificate as valid while it has more than 30 days to run. It checks 60 seconds after startup and every 24 hours thereafter, and requests a replacement when the certificate falls inside that window.

Two limitations apply:

- **A renewal does not take effect until you restart.** After fetching a new certificate `wtt` closes the HTTPS listener and does not reopen it. Restart the process to serve the renewed certificate.
- **The renewal check only runs when `WTT_WEBHOOK_SSL_ENABLED` is set.** An HTTP/2-only deployment obtains a certificate at startup but never schedules renewal for it. Enable the HTTPS listener too, or restart before every expiry.

## Inspecting TLS on a request

When TLS details are available, a captured request gains a **TLS** section in the dashboard showing the negotiated protocol version, the cipher suite, whether the session was resumed, and the peer certificate's subject, issuer, validity window, and fingerprint.

In practice you will only ever see this section on **HTTP/2** requests. Bun does not expose the underlying socket for HTTP/1.1 requests ([bun#16834](https://github.com/oven-sh/bun/issues/16834)), so `tls_info` is empty for every request to the cleartext and HTTPS listeners. If you need to inspect a negotiated cipher, send the request to the HTTP/2 port.

Client certificates are never requested, so the peer certificate is the server's own.
