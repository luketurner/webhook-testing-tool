# Sending Requests

You do not need `curl` in another terminal to exercise a handler. `wtt` can send requests to itself, from the dashboard or from an AI agent, and the result lands in the request log like any other request.

## From the dashboard

The **Test Request** page builds a request from a method, a path, headers, query parameters, and a body. Submitting it sends the request to the local webhook server, which records it and runs the matching [handlers](./handlers.md).

The body editor is disabled for `GET`, `HEAD`, and `OPTIONS`. A toast reports the status the webhook server replied with; the request itself appears in the sidebar.

## Resending a captured request

Any request in the log can be sent again. Open it and choose **Resend request**. `wtt` rebuilds the request from what it recorded — method, path, query, headers, body — and sends it fresh, producing a second entry in the log rather than overwriting the first.

This is the fastest way to iterate on a handler: capture a real webhook once from the service you are integrating with, then replay it as you edit.

## Sending to other hosts

The path field accepts an absolute URL as well as a path. A path such as `/my-hook` resolves against the local webhook server; a URL such as `https://example.com/hook` is sent to that host.

Requests to other hosts are **not** captured. Nothing routes them back through the webhook server, so only the response status comes back to you. This also means `wtt` will send a request anywhere its own network can reach, which is worth remembering before exposing the dashboard.

## From an AI agent

The [MCP server](./mcp.md) exposes the same capability as `send-http-request`, taking a method, a URL or path, optional headers and query parameters, and an optional base64-encoded body. It returns the response status, headers, and base64 body.

An agent can then call `get-http-request` to read back what `wtt` captured, including which handlers ran and what they logged. Sending a request and inspecting its handler executions is the loop an agent uses to debug a handler it just wrote.

## Bodies are base64

Every interface here takes the request body base64-encoded, and returns response bodies the same way. That is what lets you send a body that is not valid text — a protobuf message, a gzipped payload, an image — without the encoding mangling it. The dashboard encodes what you type into the body editor for you.

See [Inspecting requests](./inspecting-requests.md) for reading the captured result.
