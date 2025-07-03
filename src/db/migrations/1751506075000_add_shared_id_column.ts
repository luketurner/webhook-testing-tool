import "@/server-only";

export const up = `
  ALTER TABLE requests ADD COLUMN shared_id TEXT;
`;

export const down = `
  ALTER TABLE requests DROP COLUMN shared_id;
`;
