import "@/server-only";
import { db } from "../db";
import Router from "router";
import { runInNewContext } from "vm";
import { type RequestEvent, type Response } from "./request";
import type { HTTP_METHODS } from "@/lib/utils";

export type HandlerMethod = (typeof HTTP_METHODS)[number];

export interface Handler {
  id: string;
  versionId: string;
  name: string;
  code: string;
  path: string;
  method: HandlerMethod;
  order: number;
}

export type HandlerMetadata = Pick<
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
    .query('SELECT * FROM handlers ORDER BY "order" ASC')
    .all() as HandlerRaw[];
  return data.map(deserializeHandler);
}

export function getHandler(id: string) {
  const data = db
    .query("SELECT * FROM handlers WHERE id = $id")
    .get({ id }) as HandlerRaw;
  return deserializeHandler(data);
}

export function deleteHandler(id: string) {
  db.run("DELETE FROM handlers WHERE id = ?", [id]);
}

export async function handleRequest(
  requestEvent: RequestEvent
): Promise<[Error | null, Partial<Response>]> {
  const handlers = getAllHandlers();
  const router = Router();
  for (const handler of handlers) {
    router[handler.method === "*" ? "use" : handler.method.toLowerCase()](
      handler.path,
      async (req, resp, next) => {
        const handlerExecution = { handler: handler.id, timestamp: Date.now() };
        try {
          await runInNewContext(handler.code, { req, resp });
          requestEvent.handlers.push(handlerExecution);
          next();
        } catch (e) {
          console.error("Error running script", e);
          resp.status = 500;
          resp.body = {
            error:
              "Error running responder script. See application logs for more details.",
          };
          requestEvent.handlers.push(handlerExecution);
          next(e);
        }
      }
    );
  }
  const response: Partial<Response> = {
    headers: {},
    status: 200,
  };
  let error: Error | null = null;
  requestEvent.handlers = [];
  return new Promise((resolve) => {
    router(requestEvent.request, response, (err) => {
      if (err) error = err;
      resolve([error, response]);
    });
  });
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
      "order",
      name
    ) VALUES (
      $id,
      $version_id,
      $method,
      $path,
      $code,
      $order,
      $name
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
        "order" = $order,
        name = $name
      WHERE id = $id AND version_id = $version_id
    `
  ).run({
    ...serializeHandler(handler),
  });
}

export function clearHandlers() {
  db.run(`DELETE FROM handlers`);
}
