import { timestampSchema } from "@/util/timestamp";
import { uuidSchema } from "@/util/uuid";
import { z } from "zod/v4";

export const HANDLER_EXECUTION_STATUSES = ["running", "success", "error"] as const;

export const handlerExecutionSchema = z.object({
  id: uuidSchema,
  handler_id: z.string(),
  request_event_id: uuidSchema,
  order: z.number().int().min(0),
  timestamp: timestampSchema,
  status: z.enum(HANDLER_EXECUTION_STATUSES),
  error_message: z.string().nullish(),
});

export const handlerExecutionMetaSchema = handlerExecutionSchema.omit({
  error_message: true,
});

export type HandlerExecution = z.infer<typeof handlerExecutionSchema>;
export type HandlerExecutionMeta = z.infer<typeof handlerExecutionMetaSchema>;
export type HandlerExecutionId = HandlerExecution["id"];
export type HandlerExecutionStatus = (typeof HANDLER_EXECUTION_STATUSES)[number];