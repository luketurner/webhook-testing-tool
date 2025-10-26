import "@/server-only";

export const up = `
  -- Update handler_executions table to add CASCADE
  CREATE TABLE handler_executions_new (
    id TEXT PRIMARY KEY,
    handler_id TEXT NOT NULL,
    request_event_id TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    timestamp INTEGER NOT NULL,
    status TEXT NOT NULL,
    error_message TEXT,
    console_output TEXT,
    response_data TEXT,
    locals_data TEXT,
    FOREIGN KEY (request_event_id) REFERENCES requests(id) ON DELETE CASCADE ON UPDATE CASCADE
  ) WITHOUT ROWID;

  INSERT INTO handler_executions_new SELECT * FROM handler_executions;
  DROP TABLE handler_executions;
  ALTER TABLE handler_executions_new RENAME TO handler_executions;

  CREATE INDEX idx_handler_executions_request_event_id ON handler_executions(request_event_id);
  CREATE INDEX idx_handler_executions_handler_id ON handler_executions(handler_id);
  CREATE INDEX idx_handler_executions_timestamp ON handler_executions(timestamp);

  -- Update tcp_handler_executions table to add CASCADE
  CREATE TABLE tcp_handler_executions_new (
    id TEXT PRIMARY KEY,
    handler_id TEXT NOT NULL,
    tcp_connection_id TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    timestamp INTEGER NOT NULL,
    status TEXT NOT NULL,
    error_message TEXT,
    console_output TEXT,
    FOREIGN KEY (tcp_connection_id) REFERENCES tcp_connections(id) ON DELETE CASCADE ON UPDATE CASCADE
  ) WITHOUT ROWID;

  INSERT INTO tcp_handler_executions_new SELECT * FROM tcp_handler_executions;
  DROP TABLE tcp_handler_executions;
  ALTER TABLE tcp_handler_executions_new RENAME TO tcp_handler_executions;

  CREATE INDEX idx_tcp_handler_executions_tcp_connection_id ON tcp_handler_executions(tcp_connection_id);
  CREATE INDEX idx_tcp_handler_executions_handler_id ON tcp_handler_executions(handler_id);
  CREATE INDEX idx_tcp_handler_executions_timestamp ON tcp_handler_executions(timestamp);
`;

export const down = `
  -- Revert handler_executions table
  CREATE TABLE handler_executions_old (
    id TEXT PRIMARY KEY,
    handler_id TEXT NOT NULL,
    request_event_id TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    timestamp INTEGER NOT NULL,
    status TEXT NOT NULL,
    error_message TEXT,
    console_output TEXT,
    response_data TEXT,
    locals_data TEXT,
    FOREIGN KEY (request_event_id) REFERENCES requests(id)
  ) WITHOUT ROWID;

  INSERT INTO handler_executions_old SELECT * FROM handler_executions;
  DROP TABLE handler_executions;
  ALTER TABLE handler_executions_old RENAME TO handler_executions;

  CREATE INDEX idx_handler_executions_request_event_id ON handler_executions(request_event_id);
  CREATE INDEX idx_handler_executions_handler_id ON handler_executions(handler_id);
  CREATE INDEX idx_handler_executions_timestamp ON handler_executions(timestamp);

  -- Revert tcp_handler_executions table
  CREATE TABLE tcp_handler_executions_old (
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

  INSERT INTO tcp_handler_executions_old SELECT * FROM tcp_handler_executions;
  DROP TABLE tcp_handler_executions;
  ALTER TABLE tcp_handler_executions_old RENAME TO tcp_handler_executions;

  CREATE INDEX idx_tcp_handler_executions_tcp_connection_id ON tcp_handler_executions(tcp_connection_id);
  CREATE INDEX idx_tcp_handler_executions_handler_id ON tcp_handler_executions(handler_id);
  CREATE INDEX idx_tcp_handler_executions_timestamp ON tcp_handler_executions(timestamp);
`;
