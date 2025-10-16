import "@/server-only";

import { dbController } from "@/db/controller";
import { handlerController } from "@/handlers/controller";
import { requestEventController } from "@/request-events/controller";
import { handlerExecutionController } from "@/handler-executions/controller";
import { authController } from "@/auth/controller";
import { tcpConnectionController } from "@/tcp-connections/controller";
import { tcpHandlerController } from "@/tcp-handlers/controller";
import { tcpHandlerExecutionController } from "@/tcp-handler-executions/controller";
import { withAuth } from "@/auth/middleware";
import { getRequestEventBySharedId } from "@/request-events/model";
import { appEvents } from "@/db/events";
import type { BunRequest } from "bun";
import {
  DEV,
  ADMIN_PORT,
  WEBHOOK_PORT,
  WEBHOOK_SSL_PORT,
  WEBHOOK_SSL_ENABLED,
  DASHBOARD_SSL_ENABLED,
  SSL_CERT_PATH,
  SSL_KEY_PATH,
  TCP_PORT,
  PUBLIC_WEBHOOK_PORT,
  PUBLIC_WEBHOOK_SSL_PORT,
  PUBLIC_TCP_PORT,
} from "@/config";
import indexPage from "./index.html";
import { marked } from "marked";
import { manualPages } from "@/docs";

export const startDashboardServer = () =>
  Bun.serve({
    port: ADMIN_PORT,
    development: DEV && {
      hmr: true,
      console: true,
    },

    tls: DASHBOARD_SSL_ENABLED
      ? {
          key: Bun.file(SSL_KEY_PATH),
          cert: Bun.file(SSL_CERT_PATH),
        }
      : undefined,

    routes: {
      "/": indexPage,

      // auth routes (no auth required)
      ...authController,

      // public shared request endpoint (no auth required)
      "/api/shared/:sharedId": (req) => {
        const request = getRequestEventBySharedId(req.params.sharedId);

        if (!request) {
          return new Response(null, { status: 404 });
        }

        // Return request without handler executions for security
        return Response.json(request);
      },

      // protected api routes
      ...buildController(requestEventController),
      ...buildController(handlerController),
      ...buildController(handlerExecutionController),
      ...buildController(dbController),
      ...buildController(tcpConnectionController),
      ...buildController(tcpHandlerController),
      ...buildController(tcpHandlerExecutionController),
      ...buildController({
        "/api/config": {
          GET: () => {
            return Response.json({
              webhookPort: WEBHOOK_PORT,
              webhookSslPort: WEBHOOK_SSL_PORT,
              webhookSslEnabled: WEBHOOK_SSL_ENABLED,
              tcpPort: TCP_PORT,
              publicWebhookPort: PUBLIC_WEBHOOK_PORT,
              publicWebhookSslPort: PUBLIC_WEBHOOK_SSL_PORT,
              publicTcpPort: PUBLIC_TCP_PORT,
            });
          },
        },
      }),

      // SSE endpoint
      "/api/events/stream": withAuth(sseEndpoint),

      // Manual pages endpoint
      "/api/manual/:pageName": async (req) => {
        const pageName = req.params.pageName;
        try {
          const markdown = await Bun.file(manualPages[pageName]).text();
          const html = await marked(markdown, {
            breaks: true,
            gfm: true,
          });
          return new Response(html, {
            headers: { "Content-Type": "text/html" },
          });
        } catch (error) {
          console.error(`Failed to load manual page: ${pageName}`, error);
          return new Response(null, { status: 500 });
        }
      },

      // Manual pages list endpoint
      "/api/manual": async () => {
        return Response.json(Object.keys(manualPages));
      },

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

        const onTcpConnectionEvent = (data: { action: string; id: string }) => {
          try {
            controller.enqueue(
              `data: ${JSON.stringify({
                type: `tcp_connection:${data.action}`,
                payload: { id: data.id },
              })}\n\n`,
            );
          } catch (error) {
            console.error(
              `Error sending tcp_connection:${data.action} event:`,
              error,
            );
          }
        };

        appEvents.on("request:created", onRequestCreated);
        appEvents.on("request:updated", onRequestUpdated);
        appEvents.on("tcp_connection", onTcpConnectionEvent);

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
          appEvents.off("tcp_connection", onTcpConnectionEvent);
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
