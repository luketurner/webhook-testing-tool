import "@/server-only";

export const up = `
  ALTER TABLE handlers ADD COLUMN jku TEXT;
  ALTER TABLE handlers ADD COLUMN jwks TEXT;
`;

export const down = `
  ALTER TABLE handlers DROP COLUMN jku;
  ALTER TABLE handlers DROP COLUMN jwks;
`;
