import "@/server-only";

import { dbController } from "@/db/controller";
import { handlerController } from "@/handlers/controller";
import { requestEventController } from "@/request-events/controller";
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

      "/*": new Response(null, { status: 404 }),
    },
    // error() {},
  });

export type ControllerMethod = (req: Request) => Response | Promise<Response>;
export type Controller = Record<
  string,
  ControllerMethod | Record<string, ControllerMethod>
>;

function buildControllerMethod<Request extends BunRequest>(
  controller: ControllerMethod,
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

function buildController<T, R>(controller: Controller): Controller {
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
