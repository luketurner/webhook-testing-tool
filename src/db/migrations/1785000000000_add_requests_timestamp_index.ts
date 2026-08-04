import "@/server-only";

export const up = `
  CREATE INDEX IF NOT EXISTS idx_requests_timestamp
    ON requests (request_timestamp, id);
`;

export const down = `
  DROP INDEX IF EXISTS idx_requests_timestamp;
`;
