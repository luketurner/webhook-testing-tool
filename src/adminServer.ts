import basicAuth from "basic-auth";
import {
  ADMIN_PASSWORD,
  ADMIN_PORT,
  ADMIN_USERNAME,
  DB_FILE,
  DEV,
} from "./config";
import adminPage from "./admin.html";
import { db, WttRequest } from "./db";
import { BunRequest } from "bun";

function apiController<Request extends BunRequest>(
  controller: (req: Request) => Response | Promise<Response>
) {
  return (req: Request) => {
    const creds = basicAuth.parse(req.headers.get("authorization"));
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
      "/request/:id": adminPage,

      // api routes
      "/api/requests": {
        GET: apiController((req) => {
          const requests = db
            .query(
              `SELECT id, resp_status, req_timestamp, req_method, req_url FROM requests ORDER BY req_timestamp DESC`
            )
            .all() as Partial<WttRequest>[];

          return Response.json(requests);
        }),
      },
      "/api/requests/:id": {
        GET: apiController((req) => {
          const request = db
            .query(`SELECT * FROM requests WHERE id = $id`)
            .get({ $id: req.params.id }) as WttRequest;
          request.req_body = request.req_body
            ? request.req_body.toBase64()
            : null;
          request.resp_body = request.resp_body
            ? request.resp_body.toBase64()
            : null;
          request.req_headers = JSON.parse(request.req_headers) ?? {};
          request.resp_headers = JSON.parse(request.resp_headers) ?? {};

          return Response.json(request);
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
