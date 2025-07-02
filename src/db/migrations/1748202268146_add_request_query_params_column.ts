import "@/server-only";

export const up = `
  ALTER TABLE requests ADD COLUMN request_query_params TEXT NOT NULL DEFAULT '[]';
`;

export const down = `
  ALTER TABLE requests DROP COLUMN request_query_params;
`;
