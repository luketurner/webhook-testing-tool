import { kvListSchema } from "@/util/kv-list";
import { base64Schema, fromBufferLike } from "@/util/base64";
import { timestampSchema } from "@/util/timestamp";
import { uuidSchema } from "@/util/uuid";
import { z } from "zod/v4";
import { HTTP_METHODS } from "@/util/http";
import { fromJSONString } from "@/util/json";

export const REQUEST_EVENT_TYPES = ["inbound", "outbound"] as const;
export const REQUEST_EVENT_STATUSES = ["running", "complete", "error"] as const;

export const requestEventSchema = z.object({
  id: uuidSchema,
  type: z.enum(REQUEST_EVENT_TYPES),
  status: z.enum(REQUEST_EVENT_STATUSES),
  request_method: z.enum(HTTP_METHODS),
  request_url: z.string().min(1),
  request_headers: z.preprocess(fromJSONString, kvListSchema(z.string())),
  request_body: z.preprocess(fromBufferLike, base64Schema).nullish(),
  request_timestamp: timestampSchema,
  response_status: z.number().min(100).max(600).nullish(),
  response_status_message: z.string().min(1).nullish(),
  response_headers: z
    .preprocess(fromJSONString, kvListSchema(z.string()))
    .nullish(),
  response_body: z.preprocess(fromBufferLike, base64Schema).nullish(),
  response_timestamp: timestampSchema.nullish(),
});

export const requestEventMetaSchema = requestEventSchema.omit({
  request_headers: true,
  request_body: true,
  response_headers: true,
  response_body: true,
});

export type RequestEvent = z.infer<typeof requestEventSchema>;
export type RequestEventMeta = z.infer<typeof requestEventMetaSchema>;
export type RequestId = RequestEvent["id"];
export type RequestEventType = (typeof REQUEST_EVENT_TYPES)[number];
export type RequestEventStatus = (typeof REQUEST_EVENT_STATUSES)[number];
