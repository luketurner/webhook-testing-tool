import "@/server-only";

export const up = `
  ALTER TABLE handler_executions ADD COLUMN console_output TEXT;
`;

export const down = `
  ALTER TABLE handler_executions DROP COLUMN console_output;
`;
