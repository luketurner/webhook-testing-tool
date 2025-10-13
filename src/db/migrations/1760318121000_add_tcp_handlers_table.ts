import "@/server-only";

export const up = `
  CREATE TABLE tcp_handlers (
    id TEXT,
    version_id TEXT,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1,
    PRIMARY KEY (id, version_id)
  ) WITHOUT ROWID;
`;

export const down = `
  DROP TABLE tcp_handlers;
`;
