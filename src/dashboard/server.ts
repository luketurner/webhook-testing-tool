import "@/server-only";

import { dbController } from "@/db/controller";
import { handlerController } from "@/handlers/controller";
import { requestEventController } from "@/request-events/controller";
import { appEvents } from "@/db/events";
import basicAuth from "basic-auth";
import type { BunRequest } from "bun";
import { ADMIN_PASSWORD, ADMIN_USERNAME, DEV } from "../config-server";
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

      // api routes
      ...buildController(requestEventController),
      ...buildController(handlerController),
      ...buildController(dbController),

      // SSE endpoint
      "/api/events/stream": buildControllerMethod(sseEndpoint),

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

function buildControllerMethod<Request extends BunRequest>(
  controller: ControllerMethod,
) {
  return (req: Request, server: Bun.Server) => {
    const creds = basicAuth.parse(req.headers.get("authorization")!);
    if (
      !creds ||
      creds.name !== ADMIN_USERNAME ||
      creds.pass !== ADMIN_PASSWORD
    ) {
      return new Response(null, {
        status: 401,
        headers: { "WWW-Authenticate": "Basic" },
      });
    }
    return controller(req, server);
  };
}

function buildController(controller: Controller): Controller {
  return Object.entries(controller).reduce(
    (m, [k, v]) => ({
      ...m,
      [k]:
        typeof v === "function"
          ? buildControllerMethod(v)
          : Object.entries(v).reduce(
              (m2, [k2, v2]) => ({ ...m2, [k2]: buildControllerMethod(v2) }),
              {},
            ),
    }),
    {},
  );
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
