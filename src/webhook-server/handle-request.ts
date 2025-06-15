import "@/server-only";
import Router from "router";
import { getAllHandlers } from "@/handlers/model";
import type { RequestEvent } from "@/request-events/schema";
import { now } from "@/util/timestamp";
import { runInNewContext } from "vm";
import {
  handlerResponseToRequestEvent,
  requestEventToHandlerRequest,
  type HandlerResponse,
} from "./schema";

export async function handleRequest(
  requestEvent: RequestEvent
): Promise<[Error | null, Partial<RequestEvent>]> {
  const handlers = getAllHandlers();
  const router = Router();
  for (const handler of handlers) {
    router[handler.method === "*" ? "use" : handler.method.toLowerCase()](
      handler.path,
      async (req, resp, next) => {
        const handlerExecution = { handler: handler.id, timestamp: now() };
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
  const response: HandlerResponse = {
    headers: [],
    status: 200,
    statusMessage: null,
    body: null,
  };
  let error: Error | null = null;
  requestEvent.handlers = [];
  return new Promise((resolve) => {
    router(requestEventToHandlerRequest(requestEvent), response, (err) => {
      if (err) error = err;
      resolve([error, handlerResponseToRequestEvent(response)]);
    });
  });
}
