import "@/server-only";
import { auth } from "./index";

export const authController = {
  "/api/auth/sign-in": {
    POST: async (req: Request) => {
      try {
        const body = await req.json();
        const result = await auth.api.signInEmail({
          body: {
            email: body.email,
            password: body.password,
          },
          asResponse: true,
        });

        return result;
      } catch (error) {
        console.error("Sign in error:", error);
        return new Response(JSON.stringify({ error: "Invalid credentials" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }
    },
  },
  "/api/auth/sign-out": {
    POST: async (req: Request) => {
      try {
        const result = await auth.api.signOut({
          headers: req.headers,
          asResponse: true,
        });

        return result;
      } catch (error) {
        console.error("Sign out error:", error);
        return new Response(JSON.stringify({ error: "Sign out failed" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
    },
  },
  "/api/auth/session": {
    GET: async (req: Request) => {
      try {
        const session = await auth.api.getSession({
          headers: req.headers,
        });

        if (!session) {
          return new Response(JSON.stringify({ session: null }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ session }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        console.error("Get session error:", error);
        return new Response(
          JSON.stringify({ error: "Failed to get session" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          },
        );
      }
    },
  },
};
