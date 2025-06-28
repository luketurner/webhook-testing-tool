import "@/server-only";
import { auth } from "./index";
import { apiResponse } from "@/util/api-response";
import { withErrorHandling } from "@/util/controller-wrapper";

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
