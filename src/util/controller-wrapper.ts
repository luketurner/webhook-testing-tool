import { apiResponse } from "./api-response";

/**
 * Wraps controller handlers with consistent error handling
 */
export function withErrorHandling(
  handler: (req: Request) => Promise<Response>,
) {
  return async (req: Request) => {
    try {
      return await handler(req);
    } catch (error) {
      console.error(`Handler error:`, error);
      return apiResponse.error(
        error instanceof Error ? error.message : "Internal server error",
        500,
      );
    }
  };
}
