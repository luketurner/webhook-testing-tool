// AIDEV-NOTE: Common schema patterns to reduce duplication across entity schemas

/**
 * Parse a single database query result with a Zod schema
 */
export function parseQueryResult<T>(result: unknown, schema: any): T {
  return schema.parse(result);
}

/**
 * Parse multiple database query results with a Zod schema
 */
export function parseQueryResults<T>(results: unknown[], schema: any): T[] {
  return results.map((result) => schema.parse(result));
}
