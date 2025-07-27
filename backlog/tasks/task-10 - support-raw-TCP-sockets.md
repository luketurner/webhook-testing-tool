---
id: task-10
title: support raw TCP sockets
status: Done
assignee: []
created_date: '2025-07-08'
updated_date: '2025-07-27'
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

## Implementation Plan

1. Create database schema and migration for tcp_connections table\n2. Create src/tcp-connections folder with schema.ts, model.ts, and controller.ts following existing patterns\n3. Implement TCP server in src/tcp-server folder using Bun TCP API\n4. Add WTT_TCP_PORT configuration\n5. Integrate TCP server into main server.ts\n6. Create UI components for viewing TCP connections\n7. Update SSE provider to handle tcp_connection events\n8. Write comprehensive tests for all new functionality

## Implementation Notes

Successfully implemented TCP socket support for the Webhook Testing Tool. Features include:

- Database schema and migration for tcp_connections table
- TCP server implementation using Bun's TCP API on configurable port (WTT_TCP_PORT)
- Automatic ack responses to incoming data
- Real-time UI for viewing TCP connections with client/server details and data exchange
- Server-Sent Events integration for live updates
- Full CRUD API endpoints for managing connections
- Comprehensive test coverage for all components

The implementation allows users to test raw TCP socket connections alongside HTTP webhooks, with data being logged to the database and displayed in a user-friendly interface similar to the existing request handling system.
