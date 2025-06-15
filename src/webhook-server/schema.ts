import { kvListSchema } from "@/util/kv-list";
import type { RequestEvent } from "@/request-events/schema";
import { z } from "zod/v4";
import { HTTP_METHODS } from "@/util/http";

export const requestSchema = z.object({
  method: z.enum(HTTP_METHODS),
  url: z.string().min(1),
  headers: kvListSchema(z.string()),
  body: z.any(), // TODO
});

export const responseSchema = z.object({
  status: z.number(),
  statusMessage: z.string().nullish(),
  headers: kvListSchema(z.string()),
  body: z.any(), // TODO
});

export type HandlerRequest = z.infer<typeof requestSchema>;
export type HandlerResponse = z.infer<typeof responseSchema>;

export function requestEventToHandlerRequest(
  event: RequestEvent
): HandlerRequest {
  return requestSchema.parse({
    method: event.request_method,
    url: event.request_url,
    headers: event.request_headers,
    body: event.request_body, // TODO -- try base64 decode
  });
}

export function handlerResponseToRequestEvent(
  resp: HandlerResponse
): Partial<RequestEvent> {
  const parsed = responseSchema.parse(resp);
  return {
    response_status: parsed.status,
    response_status_message: parsed.statusMessage,
    response_headers: parsed.headers,
    response_body: parsed.body,
  };
}
