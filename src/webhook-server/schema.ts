import { kvListSchema, type KVList } from "@/util/kv-list";
import { requestEventSchema, type RequestEvent } from "@/request-events/schema";
import { z } from "zod/v4";
import { HTTP_METHODS, isAbsoluteHttpUrl, isAbsolutePath } from "@/util/http";
import { parseBase64 } from "@/util/base64";

export const requestSchema = z
  .object({
    method: z.enum(HTTP_METHODS),
    url: z.string().min(1),
    external: z.boolean().default(false),
    headers: kvListSchema(z.string()),
    query: kvListSchema(z.string()),
    body: z.any(), // TODO
  })
  // internal (external === false) must be an absolute path
  .refine((value) => value.external || isAbsolutePath(value.url), {
    path: ["url"],
    message: "Enter an absolute path starting with /",
  })
  // external (external === true) must be a fully-qualified http(s) url
  .refine((value) => !value.external || isAbsoluteHttpUrl(value.url), {
    path: ["url"],
    message: "Enter a fully-qualified http(s) URL",
  });

export const responseSchema = z.object({
  status: z.number(),
  statusMessage: z.string().nullish(),
  headers: kvListSchema(z.string()),
  body: z.any(), // TODO
  body_raw: z.string().optional(),
  socket: z.string().optional(), // Raw data to write directly to socket, bypassing HTTP protocol
});

export interface HandlerRequest extends z.infer<typeof requestSchema> {
  headers: KVList<string>;
  query: KVList<string>;
}

export interface HandlerResponse extends z.infer<typeof responseSchema> {
  headers: KVList<string>;
  socket?: string; // Raw data to write directly to socket, bypassing HTTP protocol
}

export function requestEventToHandlerRequest(
  event: RequestEvent,
): HandlerRequest {
  return requestSchema.parse({
    method: event.request_method,
    url: event.request_url,
    external: event.type === "outbound",
    headers: event.request_headers,
    query: event.request_query_params,
    body: event.request_body, // TODO -- try base64 decode
  }) as HandlerRequest;
}

export function handlerResponseToRequestEvent(
  resp: HandlerResponse,
): Partial<RequestEvent> {
  const parsed = responseSchema.parse(resp);
  return {
    response_status: parsed.status,
    response_status_message: parsed.statusMessage,
    response_headers: parsed.headers as KVList<string>,
    response_body:
      parsed.body_raw !== undefined
        ? parseBase64(parsed.body_raw)
        : parsed.body === null || parsed.body === undefined
          ? null
          : parseBase64(
              Buffer.from(
                typeof parsed.body === "string"
                  ? parsed.body
                  : JSON.stringify(parsed.body),
              ).toString("base64"),
            ),
  };
}
