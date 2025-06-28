import { ZodError, type ZodType } from "zod";

/**
 * Parses data with a Zod schema and returns either the parsed data or an error message
 */
export function parseWithError<T>(
  schema: ZodType<T>,
  data: unknown,
): { data: T; error: null } | { data: null; error: string } {
  try {
    return { data: schema.parse(data), error: null };
  } catch (error) {
    if (error instanceof ZodError) {
      return { data: null, error: error.errors[0].message };
    }
    return { data: null, error: "Invalid data" };
  }
}

/**
 * Safely parses data with a Zod schema, returning undefined on error
 */
export function safeParse<T>(schema: ZodType<T>, data: unknown): T | undefined {
  const result = schema.safeParse(data);
  return result.success ? result.data : undefined;
}
