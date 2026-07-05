# MCP Server

Webhook Testing Tool includes a built-in [MCP](https://modelcontextprotocol.io) (Model Context Protocol) server, so AI clients like Claude can inspect captured requests, manage webhook handlers, and debug JWTs.

## Connecting

The MCP server uses the streamable HTTP transport and is available at:

```
{dashboard URL}/mcp
```

For example: `http://localhost:3001/mcp`.

Authentication uses OAuth. When you connect an MCP client, it registers itself automatically and opens a browser window where you sign in to the dashboard and approve the connection. Authorized applications can be reviewed and revoked at any time from the **Manage user** page.

Example (Claude Code):

```
claude mcp add --transport http wtt http://localhost:3001/mcp
```

If the dashboard is deployed behind a reverse proxy, set the `WTT_BASE_URL` environment variable to the public dashboard URL so OAuth token issuance and validation use the correct address.

## Available tools

| Tool | Description |
| --- | --- |
| `send-http-request` | Send a test HTTP request to the webhook server. |
| `list-http-requests` | List metadata for captured HTTP request events. |
| `get-http-request` | Get a full request event, including payloads and handler executions. |
| `archive-http-request` | Archive a request event. |
| `list-tcp-connections` | List metadata for captured TCP connections. |
| `get-tcp-connection` | Get a full TCP connection, including sent/received data. |
| `archive-tcp-connection` | Archive a TCP connection. |
| `list-handlers` | List webhook handlers (without code). |
| `get-handler` | Get a webhook handler, including its code. |
| `create-handler` | Create a new webhook handler. |
| `update-handler` | Update fields on an existing webhook handler. |
| `delete-handler` | Permanently delete a webhook handler. |
| `inspect-jwt` | Decode a JWT's header and payload (no signature check). |
| `verify-jwt` | Verify a JWT's signature and claims against a key, JWKS, or JWKS URL. |
| `list-manual-pages` | List the built-in manual pages. |
| `get-manual-page` | Read a manual page as markdown. |
