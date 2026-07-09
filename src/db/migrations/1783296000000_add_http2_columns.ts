import "@/server-only";

export const up = `
  ALTER TABLE requests ADD COLUMN http2_info TEXT;
  ALTER TABLE requests ADD COLUMN http_version TEXT;
`;

export const down = `
  ALTER TABLE requests DROP COLUMN http2_info;
  ALTER TABLE requests DROP COLUMN http_version;
`;
