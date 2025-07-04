import "@/server-only";

export const up = `
  CREATE TABLE shared_state (
    id TEXT PRIMARY KEY DEFAULT 'singleton',
    data TEXT NOT NULL DEFAULT '{}',
    updated_at INTEGER NOT NULL
  );

  INSERT INTO shared_state (id, data, updated_at) VALUES ('singleton', '{}', unixepoch() * 1000);
`;

export const down = `
  DROP TABLE shared_state;
`;
