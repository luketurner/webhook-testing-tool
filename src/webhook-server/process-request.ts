import "@/server-only";
import type { RequestEvent, TLSInfo } from "@/request-events/schema";
import type { Http2Info } from "@/request-events/http2-info";
import { createRequestEvent, updateRequestEvent } from "@/request-events/model";
import { appEvents } from "@/db/events";
import { handleRequest } from "./handle-request";
import { isAbortSocketError } from "./errors";
import { randomUUID } from "@/util/uuid";
import { now } from "@/util/datetime";
import { fromBufferLike, type Base64 } from "@/util/base64";
import type { KVList } from "@/util/kv-list";
import type { HttpMethod } from "@/util/http";

export interface NormalizedRequest {
  method: HttpMethod;
  url: string;
  headers: KVList<string>;
  queryParams: KVList<string>;
  body: Base64 | null;
  httpVersion: string;
  tlsInfo: TLSInfo | null;
  http2Info: Http2Info | null;
}

export type ResponseOutcome =
  | { kind: "abort" }
  | { kind: "raw"; data: string }
  | {
      kind: "http";
      status: number;
      headers: KVList<string>;
      body: Buffer | null;
    };

export interface SentResponse {
  status: number | null;
  statusMessage: string | null;
  headers: KVList<string>;
  body: Buffer | null;
}

/**
 * A transport adapter. `send` performs the write and resolves with what was
 * ACTUALLY transmitted, which is not always what the handler asked for
 * (Express adds content-length, etag, etc.).
 */
export interface Responder {
  send(outcome: ResponseOutcome): Promise<SentResponse>;
}

export const EMPTY_SENT: SentResponse = {
  status: null,
  statusMessage: null,
  headers: [],
  body: null,
};

interface RawSocketResponse {
  _socketRawData?: string;
}

// AIDEV-NOTE: Single owner of the RequestEvent lifecycle for every transport.
// Express (HTTP/1.x) and the HTTP/2 stream handler both funnel through here.
export async function processRequest(
  normalized: NormalizedRequest,
  responder: Responder,
): Promise<void> {
  const event: RequestEvent = {
    id: randomUUID(),
    type: "inbound",
    status: "running",
    request_url: normalized.url,
    request_method: normalized.method,
    request_timestamp: now(),
    request_body: normalized.body,
    request_headers: normalized.headers,
    request_query_params: normalized.queryParams,
    tls_info: normalized.tlsInfo,
    http_version: normalized.httpVersion,
    http2_info: normalized.http2Info,
  };

  const createdEvent = createRequestEvent(event);
  appEvents.emit("request:created", createdEvent);

  const [error, response] = await handleRequest(event);

  const outcome = toResponseOutcome(error, response);
  const sent = await responder.send(outcome);

  const updatedEvent = updateRequestEvent({
    id: event.id,
    status: "complete",
    response_status: sent.status,
    response_status_message: sent.statusMessage,
    response_headers: sent.headers,
    response_body:
      sent.body && sent.body.length > 0 ? fromBufferLike(sent.body) : null,
    response_timestamp: now(),
  });
  appEvents.emit("request:updated", updatedEvent);
}

function toResponseOutcome(
  error: Error | null,
  response: Partial<RequestEvent>,
): ResponseOutcome {
  if (error && isAbortSocketError(error)) {
    return { kind: "abort" };
  }

  // AIDEV-NOTE: If a handler sets `resp.socket`, raw data bypasses normal HTTP
  // response handling entirely; the transport adapter writes it directly to
  // the socket (or, on HTTP/2 where that's impossible, resets the stream).
  const rawData = (response as RawSocketResponse)?._socketRawData;
  if (rawData) {
    return { kind: "raw", data: rawData };
  }

  const status =
    typeof response?.response_status === "number"
      ? response.response_status
      : 200;

  return {
    kind: "http",
    status,
    headers: response?.response_headers ?? [],
    body:
      response?.response_body === null || response?.response_body === undefined
        ? null
        : Buffer.from(response.response_body, "base64"),
  };
}
