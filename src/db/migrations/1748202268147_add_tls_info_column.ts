import "@/server-only";

export const up = `
  ALTER TABLE requests ADD COLUMN tls_info TEXT;
`;

export const down = `
  ALTER TABLE requests DROP COLUMN tls_info;
`;
