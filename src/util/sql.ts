import "@/server-only";

import type { ZodObject } from "zod/v4";

function keys(schema: ZodObject) {
  return Object.keys(schema.shape);
}

export function keysForSelect(schema: ZodObject) {
  return keys(schema)
    .map((k) => `"${k}"`)
    .join(", ");
}

export function keysForUpdate(schema: ZodObject, values: Record<string, any>) {
  return keys(schema)
    .filter((k) => values[k] !== undefined)
    .map((k) => `"${k}" = $${k}`)
    .join(", ");
}

export function keysForInsertFields(
  schema: ZodObject,
  values: Record<string, any>
) {
  return keys(schema)
    .filter((k) => values[k] !== undefined)
    .map((k) => `"${k}"`)
    .join(", ");
}

export function keysForInsertValues(
  schema: ZodObject,
  values: Record<string, any>
) {
  return keys(schema)
    .filter((k) => values[k] !== undefined)
    .map((k) => `$${k}`)
    .join(", ");
}
