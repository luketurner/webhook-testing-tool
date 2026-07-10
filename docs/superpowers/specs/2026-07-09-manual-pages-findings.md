# Findings from writing the feature manual pages

**Date:** 2026-07-09

While documenting TLS, HTTP/2, TCP, request sending, and request inspection, I read the code behind each feature closely. This records the issues I found and deliberately left unchanged, so they are not lost. None were in scope for a documentation change.

Line references are against `845ddbb`.

## Bugs

### ACME renewal never takes effect

`src/server.ts:82-96`

When a certificate renews, the scheduler closes the HTTPS server and stops:

```js
if (webhookServer.httpsServer) {
  webhookServer.httpsServer.close(() => {
    // The server will restart automatically on next request
    // In production, you might want to implement a more sophisticated restart mechanism
  });
}
```

Nothing restarts it. The comment's "will restart automatically on next request" does not describe any code that exists. After a renewal the HTTPS listener is closed, and requests fail until the process is restarted by hand.

A renewal fires at most 30 days before expiry, so the window between "renewed" and "restarted" is exactly when the old certificate is still valid and nobody is watching. The dashboard docs now tell users to restart after a renewal, but the real fix is to re-create and re-listen the server with the new certificate.

### ACME renewal is not scheduled for an HTTP/2-only deployment

`src/server.ts:72`

```js
if (ACME_ENABLED && WEBHOOK_SSL_ENABLED) {
```

HTTP/2 can run with an ACME certificate and without `WEBHOOK_SSL_ENABLED`, since `WEBHOOK_H2_ENABLED` is independent. Such a deployment obtains a certificate at startup but never enters this branch, so it schedules no renewal at all and the certificate silently expires. The condition should also admit `WEBHOOK_H2_ENABLED`.

### A half-present certificate pair skips generation, then crashes startup

`src/util/generate-cert.ts:11`

```js
if (!existsSync(certPath) && !existsSync(keyPath)) {
```

Generation runs only when **both** files are absent. If exactly one exists — a cert whose key was deleted, an interrupted first run, a botched bring-your-own setup — generation is skipped, and startup later fails trying to read the missing file. The intent is "generate unless a complete pair exists"; the condition should treat a partial pair as missing. `existsSync(certPath) !== existsSync(keyPath)` is the case that falls through today.

### TCP byte counts report the base64 length, not the byte count

`src/dashboard/pages/tcp-connection-page.tsx:120,127`

```jsx
{connection.received_data ? connection.received_data.length : 0} bytes
```

`received_data` and `sent_data` reach the client base64-encoded, so `.length` is the length of the base64 string, roughly a third larger than the real payload. The "Data Received / Data Sent … bytes" figures are inflated. Decoding first, or computing `Math.floor(len * 3 / 4)` minus padding, would report the true size. (The new TCP page avoids quoting these figures.)

## Latent code smell

### ACME writes a certificate key it never uses

`src/acme-manager.ts:89-97,100,129-132`

The code reads or generates a private key at `cert.key`:

```js
const certKeyPath = path.join(ACME_CERT_PATH, "cert.key");
// ...reads cert.key, or creates and writes it
```

but the key actually saved as `key.pem` and paired with the certificate comes from `createCsr`, which generates its own:

```js
const [key, csr] = await acme.crypto.createCsr({ altNames: ACME_DOMAINS });
// ...
await fs.writeFile(keyPath, key.toString());
```

So `cert.key` is written and then ignored. The persisted file suggests a key reuse that does not happen; on every renewal `createCsr` mints a fresh key. Harmless today, but confusing to anyone who inspects the ACME certificate directory, and a trap if someone later assumes `cert.key` is authoritative.

## Upstream limitations (documented, not fixable here)

These are Bun constraints. The docs now state them; they are listed so they are not mistaken for our bugs.

- **`tls_info` is empty for every HTTP/1.1 request.** Bun does not expose the socket ([bun#16834](https://github.com/oven-sh/bun/issues/16834)), so negotiated protocol, cipher, and certificate are captured only on the HTTP/2 path. `src/webhook-server/tls-info.ts:9-12`.
- **HTTP/2 needs its own TLS port.** Bun advertises only `h2` over ALPN and ignores the option that would let one port serve both ([bun#26721](https://github.com/oven-sh/bun/issues/26721)), so HTTP/1.1 and HTTP/2 cannot share a port. `src/webhook-server/http2/server.ts:32-46`.

## Design choices worth a second look

Not bugs, but each has a sharp edge a future reader should weigh deliberately.

### The self-signed certificate has no SAN and never regenerates

`src/util/generate-cert.ts:15`

The certificate carries `CN=localhost` and no `subjectAltName`, so a verifying client rejects it for any host other than `localhost`, including by IP. It is also valid for 365 days and is never regenerated on expiry — after a year `wtt` keeps serving the stale certificate until both files are deleted. Adding a SAN (at least `localhost` and `127.0.0.1`) and regenerating when the certificate is within some window of expiry would both help.

### ACME validation depends on a port the app never binds

`src/webhook-server/index.ts:39-53`, `src/config.ts:29-32`

`wtt` answers the `http-01` challenge from the cleartext webhook listener on `WTT_WEBHOOK_PORT` (default 3000), but Let's Encrypt always validates by connecting to port 80. Nothing in `wtt` binds 80. Satisfying validation requires `WTT_WEBHOOK_PORT=80` or a proxy forwarding `/.well-known/acme-challenge/`. The old README line "Port 80 must be accessible" stated the requirement without the catch; `tls.md` now spells it out. Binding the challenge route on 80 directly, or documenting the proxy expectation in the app, would remove the surprise.

### Share links carry no expiry and no authentication

`src/dashboard/server.ts:70-79`, `src/request-events/controller.ts:98-127`

A shared request is served from a route registered outside `withAuth`; the 32-hex-character token is the only credential. There is no expiry and no revocation beyond nulling the token. Handler executions are withheld, but full request and response headers and bodies are exposed to anyone with the link. This is a reasonable default for a share feature, but worth a conscious decision about expiry if instances are ever deployed on shared networks. `inspecting-requests.md` states the exposure.

### `sendWebhookRequest` will send to any host

`src/webhook-server/send-request.ts:11`

```js
const absoluteUrl = new URL(url, LOCAL_WEBHOOK_URL);
```

An absolute URL bypasses the local base, so the Test Request page and the `send-http-request` MCP tool can reach any address the instance's network can, not only the local webhook server. This is intentional and documented, but it makes the dashboard an SSRF vector if exposed to an untrusted user. Worth remembering before widening who can reach the dashboard.

## Corrections already made

For completeness, two things I did change while writing the docs:

- `src/docs/tcp-handlers.md` used port `8888` in every testing example. The default is `3002`. Fixed.
- `src/docs/home.md` reproduced an old README feature list that predated HTTP/2 and protocol breakers. Rewritten as the manual index.
