import "@/server-only";

export const up = `
  CREATE TABLE handler_executions (
    id TEXT PRIMARY KEY,
    handler_id TEXT NOT NULL,
    request_event_id TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    timestamp INTEGER NOT NULL,
    status TEXT NOT NULL,
    error_message TEXT,
    FOREIGN KEY (request_event_id) REFERENCES requests(id)
  ) WITHOUT ROWID;

  CREATE INDEX idx_handler_executions_request_event_id ON handler_executions(request_event_id);
  CREATE INDEX idx_handler_executions_handler_id ON handler_executions(handler_id);
  CREATE INDEX idx_handler_executions_timestamp ON handler_executions(timestamp);
`;

export const down = `
  DROP TABLE handler_executions;
`;
