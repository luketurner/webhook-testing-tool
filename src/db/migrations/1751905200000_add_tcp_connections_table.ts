import "@/server-only";

export const up = `
  CREATE TABLE tcp_connections (
    id TEXT PRIMARY KEY,
    client_ip TEXT NOT NULL,
    client_port INTEGER NOT NULL,
    server_ip TEXT NOT NULL,
    server_port INTEGER NOT NULL,
    received_data BLOB,
    sent_data BLOB,
    status TEXT NOT NULL,
    open_timestamp INTEGER NOT NULL,
    closed_timestamp INTEGER
  ) WITHOUT ROWID;

  CREATE INDEX idx_tcp_connections_status ON tcp_connections(status);
  CREATE INDEX idx_tcp_connections_timestamp ON tcp_connections(open_timestamp DESC);
`;

export const down = `
  DROP INDEX idx_tcp_connections_timestamp;
  DROP INDEX idx_tcp_connections_status;
  DROP TABLE tcp_connections;
`;
