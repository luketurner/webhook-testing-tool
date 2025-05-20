import { db } from "@/db";
import Router from "router";
import { runInNewContext } from "vm";
import { RequestEvent, Response } from "./request";

export interface Handler {
  id: string;
  versionId: string;
  name: string;
  code: string;
  path: string;
  method: string;
  order: number;
}

export type handlerMetadata = Pick<
  Handler,
  "id" | "versionId" | "name" | "path" | "method" | "order"
>;

export interface HandlerRaw {
  id: string;
  version_id: string;
  name: string;
  code: string;
  path: string;
  method: string;
  order: number;
}

function serializeHandler(handler: Handler): HandlerRaw {
  return {
    id: handler.id,
    version_id: handler.versionId,
    name: handler.name,
    code: handler.code,
    path: handler.path,
    method: handler.method,
    order: handler.order,
  };
}

function deserializeHandler(handler: HandlerRaw): Handler {
  return {
    id: handler.id,
    versionId: handler.version_id,
    name: handler.name,
    code: handler.code,
    path: handler.path,
    method: handler.method,
    order: handler.order,
  };
}

export function getAllHandlers() {
  const data = db
    .query("SELECT * FROM handlers ORDER BY order ASC")
    .all() as HandlerRaw[];
  return data.map(deserializeHandler);
}

export function getRouter() {
  const handlers = getAllHandlers();
  const router = Router();
  for (const handler of handlers) {
    router[handler.method === "*" ? "use" : handler.method.toLowerCase()](
      handler.path,
      async (req, resp, next) => {
        try {
          await runInNewContext(handler.code, { req, resp });
          next();
        } catch (e) {
          console.error("Error running script", e);
          resp.status = 500;
          resp.body = {
            error:
              "Error running responder script. See application logs for more details.",
          };
          next(e);
        }
      }
    );
  }
  return router;
}

export async function handleRequest(
  requestEvent: RequestEvent
): Promise<[Error, Partial<Response>]> {
  const router = getRouter();
  const response: Partial<Response> = {
    headers: {},
    status: 200,
  };
  let error: Error;
  router(requestEvent.request, response, (err) => {
    console.error("err", err);
  });
  return [error, response];
}

export function insertHandler(handler: Handler) {
  db.query(
    `
    INSERT INTO handlers (
      id,
      version_id,
      method,
      path,
      code,
      order
    ) VALUES (
      $id,
      $version_id,
      $method,
      $path,
      $code,
      $order,
    )
  `
  ).run({
    ...serializeHandler(handler),
  });
}

export function updateHandler(handler: Handler) {
  db.query(
    `
      UPDATE handlers
      SET
        method = $method,
        path = $path,
        code = $code,
        order = $order
      WHERE id = $id AND version_id = $version_id
    `
  ).run({
    ...serializeHandler(handler),
  });
}

export function handlerTableSchema() {
  return `
  CREATE TABLE IF NOT EXISTS handlers (
    id TEXT,
    version_id TEXT,
    method TEXT,
    path TEXT,
    code TEXT,
    order INTEGER,
    PRIMARY KEY handlersPk (id, version_id)
  ) WITHOUT ROWID;
  `;
}
