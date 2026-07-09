import { kvListSchema, type KVList } from "@/util/kv-list";
import { z } from "zod/v4";

// AIDEV-NOTE: This file must stay free of `node:http2` imports -- it is reachable
// from the frontend via request-events/schema.ts. The extraction code that does
// import node:http2 lives in src/webhook-server/http2/metadata.ts (server-only).

export const http2SettingsSchema = z.object({
  headerTableSize: z.number().nullish(),
  enablePush: z.boolean().nullish(),
  initialWindowSize: z.number().nullish(),
  maxConcurrentStreams: z.number().nullish(),
  maxFrameSize: z.number().nullish(),
  maxHeaderListSize: z.number().nullish(),
  enableConnectProtocol: z.boolean().nullish(),
});

export const http2HeadersFrameFlagsSchema = z.object({
  end_stream: z.boolean(),
  end_headers: z.boolean(),
});

// AIDEV-NOTE: Deliberately NOT `.strict()`. Phase 2 adds an optional `frames` field;
// leaving this permissive means phase-1 rows and phase-2 rows both parse without a
// data migration. See docs/superpowers/specs/2026-07-09-http2-webhook-support-design.md
export const http2InfoSchema = z.object({
  alpn_protocol: z.string(),
  stream_id: z.number(),
  pseudo_headers: kvListSchema(z.string()),
  weight: z.number().nullish(),
  headers_frame_flags: http2HeadersFrameFlagsSchema,
  local_settings: http2SettingsSchema,
  remote_settings: http2SettingsSchema,
});

export type Http2Settings = z.infer<typeof http2SettingsSchema>;
export type Http2HeadersFrameFlags = z.infer<
  typeof http2HeadersFrameFlagsSchema
>;

export interface Http2Info extends z.infer<typeof http2InfoSchema> {
  pseudo_headers: KVList<string>;
}
