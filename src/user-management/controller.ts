import "@/server-only";
import { getUserProfile, updateEmail, updatePassword } from "./actions";
import { apiResponse } from "@/util/api-response";

// T016: User management API controller
// Provides HTTP endpoints for user profile, email update, and password reset

export const userManagementController = {
  "/api/user/profile": {
    GET: withErrorHandling(async (req: Request) => {
      const result = await getUserProfile(req);
      return apiResponse.success(result);
    }),
  },
  "/api/user/email": {
    PUT: withErrorHandling(async (req: Request) => {
      const body = await req.json();
      const result = await updateEmail(req, body.email);
      return apiResponse.success(result);
    }),
  },
  "/api/user/password": {
    PUT: withErrorHandling(async (req: Request) => {
      const body = await req.json();
      const result = await updatePassword(
        req,
        body.currentPassword,
        body.newPassword,
        body.confirmPassword,
      );
      return apiResponse.success(result);
    }),
  },
};

function withErrorHandling(handler: (req: Request) => Promise<Response>) {
  return async (req: Request) => {
    try {
      return await handler(req);
    } catch (error) {
      console.error(`User management handler error:`, error);
      return apiResponse.error(
        error instanceof Error ? error.message : "Internal server error",
        500,
      );
    }
  };
}
