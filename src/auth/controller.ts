import "@/server-only";
import { auth } from "./index";
import { apiResponse } from "@/util/api-response";

export const authController = {
  "/api/auth/sign-in": {
    POST: withErrorHandling(async (req: Request) => {
      const body = await req.json();
      const result = await auth.api.signInEmail({
        body: {
          email: body.email,
          password: body.password,
        },
        asResponse: true,
      });

      return result;
    }),
  },
  "/api/auth/sign-out": {
    POST: withErrorHandling(async (req: Request) => {
      const result = await auth.api.signOut({
        headers: req.headers,
        asResponse: true,
      });

      return result;
    }),
  },
  "/api/auth/session": {
    GET: withErrorHandling(async (req: Request) => {
      const session = await auth.api.getSession({
        headers: req.headers,
      });

      return apiResponse.success({ session });
    }),
  },
};

function withErrorHandling(handler: (req: Request) => Promise<Response>) {
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
