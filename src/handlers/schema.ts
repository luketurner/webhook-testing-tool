import { HTTP_METHODS } from "@/util/http";
import { uuidSchema } from "@/util/uuid";
import { z } from "zod/v4";
import type { EntityId } from "@/types/common";

export const handlerSchema = z.object({
  id: uuidSchema,
  version_id: z.string().min(1),
  name: z.string().min(1),
  code: z.string().min(1),
  path: z.string().min(1),
  method: z.enum(["*", ...HTTP_METHODS]),
  order: z.number().int().min(0),
});

export const handlerMetaSchema = handlerSchema.omit({
  code: true,
});

export const bulkReorderSchema = z.object({
  updates: z
    .array(
      z.object({
        id: uuidSchema,
        order: z.number().int().min(0),
      }),
    )
    .min(1),
});

export type Handler = z.infer<typeof handlerSchema>;
export type HandlerMeta = z.infer<typeof handlerMetaSchema>;
export type HandlerId = EntityId<Handler>;
export type BulkReorderRequest = z.infer<typeof bulkReorderSchema>;
