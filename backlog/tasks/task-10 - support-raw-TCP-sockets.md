---
id: task-10
title: support raw TCP sockets
status: To Do
assignee: []
created_date: '2025-07-08'
labels: []
dependencies: []
---

## Description

Add the ability to accept arbitrary incoming raw TCP connections. This will need to use a different port than the existing webhook server. Use the Bun TCP API: https://bun.com/docs/api/tcp. Just like with the webhook server, we want to track information about incoming TCP connections and all the data send/received on them in our SQLite database, in a new table called tcp_connections.

The tcp_connections table should have the following columns: client_ip, client_port, server_ip, server_port, received_data, sent_data, status, open_timestamp, closed_timestamp.

When we receive data on a TCP connection, the TCP server should automatically write a simple "ack" response to the socket and update the `tcp_connection` row with the new data.

## Acceptance Criteria

- [ ] Create new `src/tcp-connections` folder with `schema.ts`, `model.ts`, and `controller.ts`.
- [ ] Create new section of the UI for viewing TCP connections, similar to how request-events are rendered in the dashboard. The user should be able to view all historical TCP connections and click on them to open a page that shows the connection metadata and the data that was sent and received on the connection.
- [ ] Update the SSE code so the client automatically updates when a tcp_connection is created/updated.
- [ ] Create new `src/tcp-server` folder with `index.ts` that contains code for running the TCP server.
- [ ] Add new WTT_TCP_PORT setting to `config.ts`.
- [ ] Add code to `server.ts` to start the TCP server.
- [ ] Write tests for all new functionality.
