import { timestampSchema } from "@/util/datetime";
import { uuidSchema } from "@/util/uuid";
import { z } from "zod/v4";
import type { EntityId } from "@/types/common";
import { EXECUTION_STATUSES, type ExecutionStatus } from "@/types/status";

export const TCP_HANDLER_EXECUTION_STATUSES = EXECUTION_STATUSES;

export const tcpHandlerExecutionSchema = z.object({
  id: uuidSchema,
  handler_id: z.string(),
  tcp_connection_id: uuidSchema,
  order: z.number().int().min(0),
  timestamp: timestampSchema,
  status: z.enum(TCP_HANDLER_EXECUTION_STATUSES),
  error_message: z.string().nullish(),
  console_output: z.string().nullish(),
});

export const tcpHandlerExecutionMetaSchema = tcpHandlerExecutionSchema.omit({
  error_message: true,
  console_output: true,
});

export type TcpHandlerExecution = z.infer<typeof tcpHandlerExecutionSchema>;
export type TcpHandlerExecutionMeta = z.infer<
  typeof tcpHandlerExecutionMetaSchema
>;
export type TcpHandlerExecutionId = EntityId<TcpHandlerExecution>;
export type TcpHandlerExecutionStatus = ExecutionStatus;
