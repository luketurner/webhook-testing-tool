import "@/server-only";

export const up = `
  ALTER TABLE handler_executions ADD COLUMN response_data TEXT;
  ALTER TABLE handler_executions ADD COLUMN locals_data TEXT;
`;

export const down = `
  ALTER TABLE handler_executions DROP COLUMN response_data;
  ALTER TABLE handler_executions DROP COLUMN locals_data;
`;