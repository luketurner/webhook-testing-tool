import "@/server-only";
import { getUserProfile, updateEmail, updatePassword } from "./actions";
import { apiResponse } from "@/util/api-response";

// T016: User management API controller
// Provides HTTP endpoints for user profile, email update, and password reset

export const userManagementController = {
  "/api/user/profile": {
    GET: async (req: Request) => {
      const result = await getUserProfile(req);
      return apiResponse.success(result);
    },
  },
  "/api/user/email": {
    PUT: async (req: Request) => {
      const body = await req.json();
      const result = await updateEmail(req, body.email);
      return apiResponse.success(result);
    },
  },
  "/api/user/password": {
    PUT: async (req: Request) => {
      const body = await req.json();
      const result = await updatePassword(
        req,
        body.currentPassword,
        body.newPassword,
        body.confirmPassword,
      );
      return apiResponse.success(result);
    },
  },
};