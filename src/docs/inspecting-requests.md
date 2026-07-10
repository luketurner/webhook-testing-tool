# Inspecting Requests

`wtt` stores every request and response in full — headers, query, and raw body bytes — and the dashboard exists to make sense of them. This page covers what the request view can do.

## Payloads

Bodies are stored as raw bytes, so the viewer has to decide how to show them. Two controls decide that.

**Encoding** reinterprets the same bytes as UTF-8, ASCII, Latin-1, Base64, Hex, or Binary. Reach for Hex when a payload is not text, or when you suspect an encoding problem and want to see what actually arrived.

**Raw and Pretty** switch between the bytes as sent and a formatted, syntax-highlighted rendering. Pretty appears for JSON, XML, and HTML.

Two content types get their own treatment. `application/x-www-form-urlencoded` bodies are parsed into a table of fields. `multipart/form-data` bodies are split into their parts, each with its own name, filename, headers, and content; **View Raw** shows the undivided body, boundaries and all.

Every payload can be copied, maximized into a full-screen view, or downloaded. Downloads take their file extension from the `Content-Type` header.

## Copying a request

**Copy request as…** re-expresses a captured request as something you can paste elsewhere:

- **cURL** — a shell command.
- **Fetch** — Node.js `fetch` source.
- **Raw** — the HTTP/1.1 request text.

**Copy response as…** offers Raw HTTP.

Generated URLs use the public host and port from your [configuration](./configuration.md), so a command copied from a deployed instance points at the deployed instance.

## Timestamps

Every timestamp in the dashboard opens a popover showing the same instant as an ISO 8601 string, as Unix seconds, as Unix milliseconds, and in any timezone you pick. Useful when a webhook's payload and its arrival time disagree.

## Authorization headers

An `Authorization` header expands in place into a parsed view. `wtt` recognizes:

- **Basic** — decoded username and password.
- **Digest** — realm, nonce, response, algorithm, qop, and the rest.
- **Bearer** — the raw token.
- **JWT** — decoded header and payload, with a link into the JWT inspector.
- **HMAC** — algorithm and signature, with verification.

## Signatures

Webhook providers sign their payloads, and a signature that fails to verify is a miserable thing to debug blind. `wtt` recognizes the common signature headers — `x-hub-signature` and `x-hub-signature-256` (GitHub), `x-gitea-signature`, `x-gitlab-signature`, and the generic `x-signature` — and expands them like an `Authorization` header.

Paste the shared secret and `wtt` recomputes the HMAC over the exact bytes it received and compares it against the header, in constant time. SHA-1, SHA-256, and SHA-512 are supported. Because it signs the recorded body rather than a re-serialized copy, a mismatch means the signature really is wrong.

## JWTs

The JWT inspector decodes a token into its header, payload, and signature, showing each raw and as formatted JSON.

To verify a signature, supply a key set: paste a JWKS, or give a JKU that `wtt` fetches. It selects the key by `kid`, falling back to matching on algorithm, and checks the signature along with the `exp` and `nbf` claims. Failures say which check failed rather than merely reporting invalidity.

Handlers can verify JWTs automatically on every matching request. See [Handlers](./handlers.md).

## Sharing

**Share request** mints a random 32-character token and gives you a link to `/#/shared/<token>`.

Anyone holding that link can view the request and its response without logging in. That is the point, and it is also the caveat: the token is the only credential. There is no expiry and no second check. Handler executions are withheld from the shared view, so your handler code is not exposed, but headers and bodies are shown in full — share a request only after you know what is in it.

**Disable sharing** revokes the token immediately. A new share generates a new one; the old link stays dead.

## Archiving

Archiving hides a request without deleting it. Archived requests stay out of the sidebar until you ask for them, and remain readable through the API and through the [MCP server](./mcp.md), whose `list-http-requests` tool takes an `include_archived` flag.
