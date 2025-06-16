import "@/server-only";
import Router from "router";

import { getAllHandlers } from "@/handlers/model";
import type { RequestEvent } from "@/request-events/schema";
import { now } from "@/util/timestamp";
import { runInNewContext } from "vm";
import { deepFreeze } from "@/util/object";
import { randomUUID } from "@/util/uuid";
import {
  createHandlerExecution,
  updateHandlerExecution,
} from "@/handler-executions/model";
import type { HandlerExecution } from "@/handler-executions/schema";
import {
  handlerResponseToRequestEvent,
  requestEventToHandlerRequest,
  type HandlerRequest,
  type HandlerResponse,
} from "./schema";

type NextFunction = (error?: Error) => void;

export async function handleRequest(
  requestEvent: RequestEvent
): Promise<[Error | null, Partial<RequestEvent>]> {
  const handlers = getAllHandlers();
  const router = Router();
  const locals: Record<string, unknown> = {};
  let executionOrder = 0;

  for (const handler of handlers) {
    router[handler.method === "*" ? "use" : handler.method.toLowerCase()](
      handler.path,
      async (
        req: HandlerRequest,
        resp: HandlerResponse,
        next: NextFunction
      ) => {
        const currentOrder = executionOrder++;
        const executionId = randomUUID();
        const timestamp = now();

        const handlerExecution: HandlerExecution = {
          id: executionId,
          handler_id: handler.id,
          request_event_id: requestEvent.id,
          order: currentOrder,
          timestamp,
          status: "running",
          error_message: null,
          response_data: null,
          locals_data: null,
        };

        // Create the execution record with "running" status
        createHandlerExecution(handlerExecution);

        try {
          const ctx = { requestEvent };
          await runInNewContext(handler.code, {
            req: deepFreeze(req),
            resp,
            locals,
            ctx: deepFreeze(ctx),
          });
          // Update to success status with captured data
          updateHandlerExecution({
            id: executionId,
            status: "success",
            response_data: JSON.stringify(resp),
            locals_data: JSON.stringify(locals),
          });
          next();
        } catch (e) {
          console.error("Error running script", e);
          resp.status = 500;
          resp.body = {
            error:
              "Error running responder script. See application logs for more details.",
          };
          // Update to error status with error message and captured data
          updateHandlerExecution({
            id: executionId,
            status: "error",
            error_message: e instanceof Error ? e.message : String(e),
            response_data: JSON.stringify(resp),
            locals_data: JSON.stringify(locals),
          });
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
  return new Promise((resolve) => {
    router(
      requestEventToHandlerRequest(requestEvent),
      response,
      (err?: Error) => {
        if (err) error = err;
        resolve([error, handlerResponseToRequestEvent(response)]);
      }
    );
  });
}
