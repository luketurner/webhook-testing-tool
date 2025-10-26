import { base64Schema, fromBufferLike } from "@/util/base64";
import { timestampSchema } from "@/util/datetime";
import { uuidSchema } from "@/util/uuid";
import { z } from "zod/v4";
import type { EntityId } from "@/types/common";

export const TCP_CONNECTION_STATUSES = ["active", "closed", "failed"] as const;

export const tcpConnectionSchema = z.object({
  id: uuidSchema,
  client_ip: z.string().min(1),
  client_port: z.number().min(1).max(65535),
  server_ip: z.string().min(1),
  server_port: z.number().min(1).max(65535),
  received_data: z.preprocess(fromBufferLike, base64Schema).nullish(),
  sent_data: z.preprocess(fromBufferLike, base64Schema).nullish(),
  status: z.enum(TCP_CONNECTION_STATUSES),
  open_timestamp: timestampSchema,
  closed_timestamp: timestampSchema.nullish(),
  archived_timestamp: timestampSchema.nullish(),
});

export const tcpConnectionMetaSchema = tcpConnectionSchema.omit({
  received_data: true,
  sent_data: true,
});

export type TcpConnection = z.infer<typeof tcpConnectionSchema>;
export type TcpConnectionMeta = z.infer<typeof tcpConnectionMetaSchema>;
export type TcpConnectionId = EntityId<TcpConnection>;
export type TcpConnectionStatus = (typeof TCP_CONNECTION_STATUSES)[number];
