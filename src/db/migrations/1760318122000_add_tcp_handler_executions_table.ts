import "@/server-only";

export const up = `
  CREATE TABLE tcp_handler_executions (
    id TEXT PRIMARY KEY,
    handler_id TEXT NOT NULL,
    tcp_connection_id TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    timestamp INTEGER NOT NULL,
    status TEXT NOT NULL,
    error_message TEXT,
    console_output TEXT,
    FOREIGN KEY (tcp_connection_id) REFERENCES tcp_connections(id)
  ) WITHOUT ROWID;

  CREATE INDEX idx_tcp_handler_executions_tcp_connection_id ON tcp_handler_executions(tcp_connection_id);
  CREATE INDEX idx_tcp_handler_executions_handler_id ON tcp_handler_executions(handler_id);
  CREATE INDEX idx_tcp_handler_executions_timestamp ON tcp_handler_executions(timestamp);
`;

export const down = `
  DROP TABLE tcp_handler_executions;
`;
