import "@/server-only";
import Router from "router";

import { getAllHandlers } from "@/handlers/model";
import type { RequestEvent } from "@/request-events/schema";
import { now } from "@/util/datetime";
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
import { HandlerErrors, isHandlerError } from "./errors";
import { parseAuthorizationHeader, isJWTAuth } from "@/util/authorization";
import { verifyJWT, type JWTVerificationResult } from "@/util/jwt-verification";
import { getSharedState, updateSharedState } from "@/shared-state/model";
import { Transpiler } from "bun";

type NextFunction = (error?: Error) => void;

async function performJWTVerification(
  req: HandlerRequest,
  handler: { jku?: string; jwks?: string },
): Promise<JWTVerificationResult | null> {
  // Only verify if handler has JWT configuration
  if (!handler.jku && !handler.jwks) {
    return null;
  }

  // Look for Authorization header
  const authHeader = req.headers.find(
    ([key]) => key.toLowerCase() === "authorization",
  )?.[1];

  if (!authHeader) {
    return {
      isValid: false,
      error: "No Authorization header found for JWT verification",
    };
  }

  // Parse the authorization header
  const parsedAuth = parseAuthorizationHeader(authHeader);

  // Check if it's a JWT
  if (!isJWTAuth(parsedAuth)) {
    return {
      isValid: false,
      error: "Authorization header does not contain a valid JWT",
    };
  }

  // Verify the JWT
  return await verifyJWT(parsedAuth, {
    jku: handler.jku,
    jwks: handler.jwks,
  });
}

export async function handleRequest(
  requestEvent: RequestEvent,
): Promise<[Error | null, Partial<RequestEvent>]> {
  const handlers = getAllHandlers();
  const router = Router();
  const locals: Record<string, unknown> = {};
  let executionOrder = 0;

  // Load shared state for all handlers
  const shared = getSharedState();

  for (const handler of handlers) {
    router[handler.method === "*" ? "use" : handler.method.toLowerCase()](
      handler.path,
      async (
        req: HandlerRequest,
        resp: HandlerResponse,
        next: NextFunction,
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
          console_output: null,
        };

        // Create the execution record with "running" status
        createHandlerExecution(handlerExecution);

        const consoleOutput: string[] = [];

        try {
          // Perform JWT verification if configured
          const jwtVerification = await performJWTVerification(req, handler);

          const ctx = {
            requestEvent,
            jwtVerification,
          };

          const captureConsole = {
            log: (...args: unknown[]) => {
              consoleOutput.push(
                `[LOG] ${args.map((arg) => (typeof arg === "string" ? arg : JSON.stringify(arg))).join(" ")}`,
              );
            },
            debug: (...args: unknown[]) => {
              consoleOutput.push(
                `[DEBUG] ${args.map((arg) => (typeof arg === "string" ? arg : JSON.stringify(arg))).join(" ")}`,
              );
            },
            info: (...args: unknown[]) => {
              consoleOutput.push(
                `[INFO] ${args.map((arg) => (typeof arg === "string" ? arg : JSON.stringify(arg))).join(" ")}`,
              );
            },
            warn: (...args: unknown[]) => {
              consoleOutput.push(
                `[WARN] ${args.map((arg) => (typeof arg === "string" ? arg : JSON.stringify(arg))).join(" ")}`,
              );
            },
            error: (...args: unknown[]) => {
              consoleOutput.push(
                `[ERROR] ${args.map((arg) => (typeof arg === "string" ? arg : JSON.stringify(arg))).join(" ")}`,
              );
            },
          };

          // Add JWT utility functions for handlers
          const jwtUtils = {
            isJWTVerified: () => jwtVerification?.isValid === true,
            getJWTError: () => jwtVerification?.error || null,
            getJWTAlgorithm: () => jwtVerification?.algorithm || null,
            getJWTKeyId: () => jwtVerification?.keyId || null,
            requireJWTVerification: () => {
              if (!jwtVerification) {
                throw new HandlerErrors.UnauthorizedError(
                  "JWT verification not configured for this handler",
                );
              }
              if (!jwtVerification.isValid) {
                throw new HandlerErrors.UnauthorizedError(
                  `JWT verification failed: ${jwtVerification.error}`,
                );
              }
            },
          };

          const transpiler = new Transpiler({ loader: "ts" });
          const code = transpiler.transformSync(handler.code);

          await runInNewContext(code, {
            req: deepFreeze(req),
            resp,
            locals,
            ctx: deepFreeze(ctx),
            console: captureConsole,
            jwt: jwtUtils,
            shared: shared.data,
            ...HandlerErrors,
          });
          // Update to success status with captured data
          updateHandlerExecution({
            id: executionId,
            status: "success",
            response_data: JSON.stringify(resp),
            locals_data: JSON.stringify(locals),
            console_output:
              consoleOutput.length > 0 ? consoleOutput.join("\n") : null,
          });
          next();
        } catch (e) {
          console.error("Error running script", e);

          if (isHandlerError(e)) {
            resp.status = e.statusCode;
            resp.body = {
              error: e.message,
            };
          } else {
            resp.status = 500;
            resp.body = {
              error:
                "Error running responder script. See application logs for more details.",
            };
          }

          // Update to error status with error message and captured data
          updateHandlerExecution({
            id: executionId,
            status: "error",
            error_message: e instanceof Error ? e.message : String(e),
            response_data: JSON.stringify(resp),
            locals_data: JSON.stringify(locals),
            console_output:
              consoleOutput.length > 0 ? consoleOutput.join("\n") : null,
          });
          next(e);
        }
      },
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

        // Save the shared state after all handlers have executed
        updateSharedState(shared.data);

        resolve([error, handlerResponseToRequestEvent(response)]);
      },
    );
  });
}
