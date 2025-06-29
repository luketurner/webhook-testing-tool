import { z } from "zod/v4";

// AIDEV-NOTE: Common request handling utilities to reduce duplication across controllers

/**
 * Parse and validate request body JSON with a Zod schema
 */
export async function parseRequestBody<T>(
  req: Request,
  schema: z.ZodSchema<T>,
): Promise<T> {
  const body = await req.json();
  return schema.parse(body);
}

/**
 * Create a standardized 404 response
 */
export function notFoundResponse(
  message: string = "Resource not found",
): Response {
  return Response.json({ error: message }, { status: 404 });
}
