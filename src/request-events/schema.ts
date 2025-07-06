import { kvListSchema, type KVList } from "@/util/kv-list";
import { base64Schema, fromBufferLike } from "@/util/base64";
import { timestampSchema } from "@/util/datetime";
import { uuidSchema } from "@/util/uuid";
import { z } from "zod/v4";
import { HTTP_METHODS } from "@/util/http";
import { fromJSONString } from "@/util/json";
import type { EntityId } from "@/types/common";
import { BASE_STATUSES, type BaseStatus } from "@/types/status";

export const REQUEST_EVENT_TYPES = ["inbound", "outbound"] as const;
export const REQUEST_EVENT_STATUSES = BASE_STATUSES;

export const certificateSchema = z.any();

export const tlsInfoSchema = z.object({
  protocol: z.string().nullish(),
  cipher: z
    .object({
      name: z.string().nullish(),
      standardName: z.string().nullish(),
      version: z.string().nullish(),
    })
    .nullish(),
  isSessionReused: z.boolean().nullish(),
  peerCertificate: z
    .object({
      subject: certificateSchema.nullish(),
      issuer: certificateSchema.nullish(),
      valid_from: z.string().nullish(),
      valid_to: z.string().nullish(),
      fingerprint: z.string().nullish(),
    })
    .nullish(),
});

export const requestEventSchema = z.object({
  id: uuidSchema,
  type: z.enum(REQUEST_EVENT_TYPES),
  status: z.enum(REQUEST_EVENT_STATUSES),
  shared_id: z.string().nullish(),
  request_method: z.enum(HTTP_METHODS),
  request_url: z.string().min(1),
  request_headers: z.preprocess(fromJSONString, kvListSchema(z.string())),
  request_query_params: z.preprocess(fromJSONString, kvListSchema(z.string())),
  request_body: z.preprocess(fromBufferLike, base64Schema).nullish(),
  request_timestamp: timestampSchema,
  response_status: z.number().min(100).max(600).nullish(),
  response_status_message: z.string().min(1).nullish(),
  response_headers: z
    .preprocess(fromJSONString, kvListSchema(z.string()))
    .nullish(),
  response_body: z.preprocess(fromBufferLike, base64Schema).nullish(),
  response_timestamp: timestampSchema.nullish(),
  tls_info: z.preprocess(fromJSONString, tlsInfoSchema.nullish()).nullish(),
});

export const requestEventMetaSchema = requestEventSchema.omit({
  request_headers: true,
  request_query_params: true,
  request_body: true,
  response_headers: true,
  response_body: true,
  tls_info: true,
});

export interface RequestEvent extends z.infer<typeof requestEventSchema> {
  request_headers: KVList<string>;
  request_query_params: KVList<string>;
  response_headers?: KVList<string> | undefined | null;
}

export type RequestEventMeta = z.infer<typeof requestEventMetaSchema>;
export type RequestId = EntityId<RequestEvent>;
export type RequestEventType = (typeof REQUEST_EVENT_TYPES)[number];
export type RequestEventStatus = BaseStatus;
export type TLSInfo = z.infer<typeof tlsInfoSchema>;
