import "@/server-only";

export const up = `
  ALTER TABLE requests ADD COLUMN archived_timestamp INTEGER;
  ALTER TABLE tcp_connections ADD COLUMN archived_timestamp INTEGER;
`;

export const down = `
  ALTER TABLE requests DROP COLUMN archived_timestamp;
  ALTER TABLE tcp_connections DROP COLUMN archived_timestamp;
`;
