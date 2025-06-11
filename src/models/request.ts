import "@/server-only";
import { db } from "../db";

export type Headers = Record<string, number | string | string[]>;

export interface Request {
  method: string;
  url: string;
  headers: Headers;
  body: Uint8Array | Buffer | null;
  timestamp: Date;
}

export interface Response {
  status: number;
  statusMessage: string;
  headers: Headers;
  body: Uint8Array | Buffer | null;
  timestamp: Date;
}

export type RequestEventType = "inbound" | "outbound";
export type RequestEventStatus = "running" | "complete" | "error";

export interface HandlerExecution {
  handler: string;
  timestamp: number;
}

export interface RequestEvent {
  id: string;
  type: RequestEventType;
  status: RequestEventStatus;
  request: Request;
  response?: Response;
  handlers: HandlerExecution[];
}

export interface RequestClient extends Omit<Request, "body"> {
  body: string | null;
}

export interface ResponseClient extends Omit<Response, "body"> {
  body: string | null;
}

export interface RequestEventClient
  extends Omit<RequestEvent, "request" | "response"> {
  request: RequestClient;
  response?: ResponseClient;
}

export interface RequestEventMetadata {
  id: string;
  type: RequestEventType;
  status: RequestEventStatus;
  request: Pick<Request, "url" | "method" | "timestamp">;
  response?: Pick<Response, "status" | "timestamp">;
}

export interface RequestEventRaw {
  id: string;
  type: string;
  status: string;
  request_method: string;
  request_url: string;
  request_headers: string;
  request_body: Uint8Array | null;
  request_timestamp: number;
  response_status?: string;
  response_status_message?: string;
  response_headers?: string;
  response_body?: Uint8Array | null;
  response_timestamp?: number;
  handlers: string;
}

function deserializeRequestMetadata(
  raw: RequestEventRaw
): RequestEventMetadata {
  return {
    id: raw.id,
    type: raw.type as RequestEventType,
    status: raw.status as RequestEventStatus,
    request: {
      method: raw.request_method,
      url: raw.request_url,
      timestamp: new Date(raw.request_timestamp),
    },
    ...(raw.response_status
      ? {
          response: {
            status: parseInt(raw.response_status, 10),
            timestamp: new Date(raw.response_timestamp!),
          },
        }
      : null),
  };
}

function deserializeRequest(raw: RequestEventRaw): RequestEvent {
  const meta = deserializeRequestMetadata(raw);
  return {
    ...meta,
    request: {
      ...meta.request,
      body: raw.request_body,
      headers: raw.request_headers ? JSON.parse(raw.request_headers) : {},
    },
    ...(meta.response
      ? {
          response: {
            ...meta.response,
            statusMessage: raw.response_status_message,
            body: raw.response_body,
            headers: raw.response_headers
              ? JSON.parse(raw.response_headers)
              : {},
          },
        }
      : null),
    handlers: raw.handlers ? JSON.parse(raw.handlers) : [],
  };
}

function serializeRequest(request: RequestEvent): RequestEventRaw {
  return {
    id: request.id,
    type: request.type,
    status: request.status,
    request_body: request.request.body,
    request_headers: JSON.stringify(request.request.headers),
    request_method: request.request.method,
    request_timestamp: request.request.timestamp.getTime(),
    request_url: request.request.url,
    ...(request.response ? serializeResponse(request.response) : null),
    handlers: JSON.stringify(request.handlers ?? []),
  };
}

function serializeResponse(response: Response) {
  return {
    response_body: response.body,
    response_headers: JSON.stringify(response.headers),
    response_status: response.status.toString(),
    response_status_message: response.statusMessage,
    response_timestamp: response.timestamp.getTime(),
  };
}

export function getInboundRequests(): RequestEventMetadata[] {
  const data = db
    .query(
      "SELECT id, type, status, request_method, request_url, request_timestamp, response_status, response_timestamp FROM requests WHERE type = 'inbound' ORDER BY request_timestamp DESC"
    )
    .all() as RequestEventRaw[];
  return data.map(deserializeRequestMetadata);
}

export function getRequest(id: string): RequestEvent | null {
  const data = db
    .query("SELECT * FROM requests WHERE id = $id")
    .get({ id }) as RequestEventRaw | null;
  return data ? deserializeRequest(data) : null;
}

export function startRequest(req: Omit<RequestEvent, "response">) {
  db.query(
    `
    INSERT INTO requests (
      id,
      type,
      request_method,
      request_url,
      request_headers,
      request_body,
      request_timestamp
    ) VALUES (
      $id,
      $type,
      $request_method,
      $request_url,
      $request_headers,
      $request_body,
      $request_timestamp
    )
  `
  ).run({
    ...serializeRequest(req),
  });
}

export function completeRequest(
  req: Pick<RequestEvent, "id" | "status" | "response" | "handlers">
) {
  db.query(
    `
      UPDATE requests
      SET
        status = $status,
        handlers = $handlers,
        response_status = $response_status,
        response_status_message = $response_status_message,
        response_headers = $response_headers,
        response_body = $response_body,
        response_timestamp = $response_timestamp
      WHERE id = $id
    `
  ).run({
    ...serializeResponse(req.response!),
    status: req.status || "complete",
    id: req.id,
    handlers: JSON.stringify(req.handlers ?? []),
  });
}
