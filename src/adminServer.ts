import basicAuth from "basic-auth";
import {
  ADMIN_PASSWORD,
  ADMIN_PORT,
  ADMIN_USERNAME,
  DB_FILE,
  DEV,
} from "./config";
import adminPage from "./admin.html";
import { BunRequest } from "bun";
import {
  getInboundRequests,
  getRequest,
  RequestEventClient,
} from "./models/request";
import { getAllHandlers, insertHandler, updateHandler } from "./models/handler";

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
    development: DEV,
    routes: {
      // page routes
      "/": adminPage,
      "/requests/:id": adminPage,
      "/handlers/:id": adminPage,

      // api routes
      "/api/requests": {
        GET: apiController((req) => {
          return Response.json(getInboundRequests());
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
        PUT: apiController(async (req) => {
          const body = await req.json();
          updateHandler(body);
          return Response.json({ status: "ok" });
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
