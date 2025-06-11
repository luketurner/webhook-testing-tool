import "@/server-only";
import basicAuth from "basic-auth";
import type { BunRequest } from "bun";
import { ADMIN_PASSWORD, ADMIN_USERNAME, DB_FILE, DEV } from "./config-server";
import indexPage from "./index.html";
import { seedRequestData } from "./lib/seed";
import { sendWebhookRequest } from "./lib/sendRequest";
import {
  deleteHandler,
  getAllHandlers,
  getHandler,
  insertHandler,
  updateHandler,
} from "./models/handler";
import {
  getInboundRequests,
  getRequest,
  type RequestEventClient,
} from "./models/request";
import { ADMIN_PORT } from "./config-shared";

function apiController<Request extends BunRequest>(
  controller: (req: Request) => Response | Promise<Response>
) {
  return (req: Request) => {
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
    return controller(req);
  };
}

export const startAdminServer = () =>
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
      "/api/requests": {
        GET: apiController((req) => {
          return Response.json(getInboundRequests());
        }),
      },
      "/api/requests/seed": {
        POST: apiController(async (req) => {
          await seedRequestData();
          return Response.json({ status: "ok" });
        }),
      },
      "/api/requests/send": {
        POST: apiController(async (req) => {
          await sendWebhookRequest(await req.json());
          return Response.json({ status: "ok" });
        }),
      },
      "/api/requests/:id": {
        GET: apiController((req) => {
          const request = getRequest(req.params.id);

          if (!request) {
            return new Response(null, { status: 404 });
          }

          const requestForClient: RequestEventClient = {
            ...request,
            request: {
              ...request.request,
              body: request.request.body?.toBase64() ?? null,
            },
            ...(request.response
              ? {
                  response: {
                    ...request.response,
                    body: request.response.body?.toBase64() ?? null,
                  },
                }
              : null),
          };

          return Response.json(requestForClient);
        }),
      },
      "/api/handlers": {
        GET: apiController((req) => {
          return Response.json(getAllHandlers());
        }),
        POST: apiController(async (req) => {
          const body = await req.json();
          insertHandler(body);
          return Response.json({ status: "ok" });
        }),
      },
      "/api/handlers/:id": {
        GET: apiController((req) => {
          return Response.json(getHandler(req.params.id));
        }),
        PUT: apiController(async (req) => {
          const body = await req.json();
          updateHandler(body);
          return Response.json({ status: "ok" });
        }),
        DELETE: apiController(async (req) => {
          deleteHandler(req.params.id);
          return Response.json({ status: "deleted" });
        }),
      },
      "/api/db/export": {
        GET: apiController((req) => {
          return new Response(Bun.file(DB_FILE), {
            headers: {
              "content-disposition": `attachment; filename="database-${Date.now()}.sqlite"`,
            },
          });
        }),
      },
      "/*": new Response(null, { status: 404 }),
    },
    // error() {},
  });
