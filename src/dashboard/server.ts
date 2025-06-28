import "@/server-only";

import { dbController } from "@/db/controller";
import { handlerController } from "@/handlers/controller";
import { requestEventController } from "@/request-events/controller";
import { handlerExecutionController } from "@/handler-executions/controller";
import { authController } from "@/auth/controller";
import { withAuth } from "@/auth/middleware";
import { appEvents } from "@/db/events";
import type { BunRequest } from "bun";
import { DEV } from "../config-server";
import { ADMIN_PORT } from "../config-shared";
import indexPage from "./index.html";

export const startDashboardServer = () =>
  Bun.serve({
    port: ADMIN_PORT,
    development: DEV && {
      hmr: true,
      console: true,
    },

    routes: {
      // page routes
      "/": indexPage,
      "/requests/:id": indexPage,
      "/handlers": indexPage,
      "/handlers/:id": indexPage,

      // auth routes (no auth required)
      ...authController,

      // protected api routes
      ...buildController(requestEventController),
      ...buildController(handlerController),
      ...buildController(handlerExecutionController),
      ...buildController(dbController),

      // SSE endpoint
      "/api/events/stream": withAuth(sseEndpoint),

      "/*": new Response(null, { status: 404 }),
    },
    // error() {},
  });

export type ControllerMethod = (
  req: Request,
  server: Bun.Server,
) => Response | Promise<Response>;
export type Controller = Record<
  string,
  ControllerMethod | Record<string, ControllerMethod>
>;

function buildControllerMethod(controller: ControllerMethod): ControllerMethod {
  return withAuth(controller);
}

function buildController(controller: Controller): Controller {
  const result: Controller = {};

  for (const [k, v] of Object.entries(controller)) {
    if (typeof v === "function") {
      result[k] = buildControllerMethod(v);
    } else {
      const nested: Record<string, ControllerMethod> = {};
      for (const [k2, v2] of Object.entries(v)) {
        nested[k2] = buildControllerMethod(v2);
      }
      result[k] = nested;
    }
  }

  return result;
}

function sseEndpoint(req: BunRequest, server: Bun.Server) {
  let cleanup: (() => void) | null = null;

  server.timeout(req, 0);

  const stream = new ReadableStream({
    start(controller) {
      try {
        // Send initial connection message
        controller.enqueue(
          `data: ${JSON.stringify({ type: "connected" })}\n\n`,
        );

        // Set up event listeners
        const onRequestCreated = (event: any) => {
          try {
            controller.enqueue(
              `data: ${JSON.stringify({
                type: "request:created",
                payload: { id: event.id, status: event.status },
              })}\n\n`,
            );
          } catch (error) {
            console.error("Error sending request:created event:", error);
          }
        };

        const onRequestUpdated = (event: any) => {
          try {
            controller.enqueue(
              `data: ${JSON.stringify({
                type: "request:updated",
                payload: { id: event.id, status: event.status },
              })}\n\n`,
            );
          } catch (error) {
            console.error("Error sending request:updated event:", error);
          }
        };

        appEvents.on("request:created", onRequestCreated);
        appEvents.on("request:updated", onRequestUpdated);

        // Keep-alive ping every 30 seconds
        const keepAlive = setInterval(() => {
          try {
            controller.enqueue(`data: ${JSON.stringify({ type: "ping" })}\n\n`);
          } catch (error) {
            console.error("Error sending ping:", error);
            clearInterval(keepAlive);
          }
        }, 30000);

        // Store cleanup function
        cleanup = () => {
          clearInterval(keepAlive);
          appEvents.off("request:created", onRequestCreated);
          appEvents.off("request:updated", onRequestUpdated);
        };
      } catch (error) {
        console.error("Error setting up SSE stream:", error);
        controller.error(error);
      }
    },
    cancel() {
      // Called when the stream is cancelled (e.g., client disconnects)
      if (cleanup) {
        cleanup();
        cleanup = null;
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Cache-Control",
    },
  });
}
