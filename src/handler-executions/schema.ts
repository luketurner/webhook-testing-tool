import { timestampSchema } from "@/util/datetime";
import { uuidSchema } from "@/util/uuid";
import { z } from "zod/v4";
import type { EntityId } from "@/types/common";
import { EXECUTION_STATUSES, type ExecutionStatus } from "@/types/status";

export const HANDLER_EXECUTION_STATUSES = EXECUTION_STATUSES;

export const handlerExecutionSchema = z.object({
  id: uuidSchema,
  handler_id: z.string(),
  request_event_id: uuidSchema,
  order: z.number().int().min(0),
  timestamp: timestampSchema,
  status: z.enum(HANDLER_EXECUTION_STATUSES),
  error_message: z.string().nullish(),
  response_data: z.string().nullish(),
  locals_data: z.string().nullish(),
  console_output: z.string().nullish(),
});

export const handlerExecutionMetaSchema = handlerExecutionSchema.omit({
  error_message: true,
  response_data: true,
  locals_data: true,
  console_output: true,
});

export type HandlerExecution = z.infer<typeof handlerExecutionSchema>;
export type HandlerExecutionMeta = z.infer<typeof handlerExecutionMetaSchema>;
export type HandlerExecutionId = EntityId<HandlerExecution>;
export type HandlerExecutionStatus = ExecutionStatus;
