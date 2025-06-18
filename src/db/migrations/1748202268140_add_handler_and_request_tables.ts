import "@/server-only";

export const up = `
  CREATE TABLE handlers (
    id TEXT,
    version_id TEXT,
    method TEXT,
    path TEXT,
    code TEXT,
    "order" INTEGER NOT NULL UNIQUE,
    name TEXT,
    PRIMARY KEY (id, version_id)
  ) WITHOUT ROWID;

  CREATE TABLE requests (
    id TEXT PRIMARY KEY,
    type TEXT,
    status TEXT,
    handlers TEXT,
    request_method TEXT,
    request_url TEXT,
    request_headers TEXT,
    request_body BLOB,
    request_timestamp INTEGER NOT NULL,
    response_status INTEGER,
    response_status_message TEXT,
    response_headers TEXT,
    response_body BLOB,
    response_timestamp INTEGER
  ) WITHOUT ROWID;
`;

export const down = `
  DROP TABLE handlers;
  DROP TABLE requests;
`;
