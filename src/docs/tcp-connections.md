# TCP Connections

Alongside the HTTP servers, `wtt` listens for raw TCP connections. Everything a client sends and everything `wtt` sends back is recorded and shown in the dashboard, which makes it useful for debugging protocols that are not HTTP at all.

This page covers the server and the connection record. To write code that responds to incoming data, see [TCP handlers](./tcp-handlers.md).

## The server

The TCP server always listens. There is no flag to disable it. It binds `0.0.0.0` on `WTT_TCP_PORT`, which defaults to `3002`.

It does not support TLS. Connections are cleartext, and `openssl s_client` will not negotiate with it.

## Default behavior

With no handler enabled, `wtt` replies `ack\n` to every chunk of data it receives:

```console
$ echo "hello" | nc localhost 3002
ack
```

Enable a handler and it decides the reply instead. If the handler throws, `wtt` replies `error\n` and records the exception on the execution.

The dashboard sidebar also offers **Test TCP connection**, which opens a connection to the local TCP port, sends a short payload, and closes it. It is the quickest way to confirm the server is up.

## The connection record

Each connection is stored with:

| Field | Contents |
| --- | --- |
| `client_ip`, `client_port` | Where the connection came from. |
| `server_ip`, `server_port` | Always `0.0.0.0` and the listening port. |
| `received_data` | Every byte the client sent, concatenated. |
| `sent_data` | Every byte `wtt` sent, concatenated. |
| `open_timestamp`, `closed_timestamp` | When the connection opened and closed. |
| `status` | `active`, then `closed` or `failed`. |

A connection becomes `closed` when either side hangs up and `failed` when the socket errors. Data is stored as raw bytes and served to the dashboard base64-encoded, so binary protocols survive intact.

Two limits follow from storing the traffic as two accumulated blobs:

- **Packet boundaries are lost.** Three writes of `hi` are indistinguishable from one write of `hihihi`.
- **Received and sent bytes are not interleaved.** You can see everything the client sent and everything `wtt` sent, but not the order they alternated in.

Handler executions do preserve order. Each chunk of received data produces one execution, numbered in sequence, and the connection page lists them with their console output. Reading down that list reconstructs the exchange.

## In the dashboard

The **TCP Connections** sidebar lists connections as they arrive, with a live status dot, and filters by client address, port, or status. Connections can be archived to hide them without deleting them; **Show Archived** brings them back into view.

Opening a connection shows its addresses and timings, its duration, the received and sent data in a viewer that toggles between UTF-8 and base64, and every handler execution that ran.

New connections and new data appear without a refresh.

## Trying it

```bash
# one-shot
echo "hello" | nc localhost 3002

# interactive: type lines and watch the replies
nc localhost 3002
```

[TCP handlers](./tcp-handlers.md) has further examples using telnet, Python, and Node.

AI agents can read connections too, through the `list-tcp-connections` and `get-tcp-connection` tools. See [MCP server](./mcp.md).
