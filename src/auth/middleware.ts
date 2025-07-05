import "@/server-only";
import { auth } from "./index";
import type { BunRequest } from "bun";
import type { ControllerMethod } from "@/dashboard/server";

export function withAuth(controller: ControllerMethod): ControllerMethod {
  return async (req: BunRequest, server: Bun.Server) => {
    try {
      // Get session from request headers
      const session = await auth.api.getSession({
        headers: req.headers,
      });

      if (!session) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Add session to request for use in controllers
      (req as any).session = session;
    } catch (error) {
      console.error("Auth middleware error:", error);
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
    return await controller(req, server);
  };
}
