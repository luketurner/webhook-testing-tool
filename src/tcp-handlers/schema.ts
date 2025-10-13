import { uuidSchema } from "@/util/uuid";
import { z } from "zod/v4";
import type { EntityId } from "@/types/common";

export const tcpHandlerSchema = z.object({
  id: uuidSchema,
  version_id: z.string().min(1),
  name: z.string().min(1),
  code: z.string().min(1),
  enabled: z
    .union([z.boolean(), z.number()])
    .transform((val) => (typeof val === "number" ? val !== 0 : val)),
});

export const tcpHandlerMetaSchema = tcpHandlerSchema.omit({
  code: true,
});

export type TcpHandler = z.infer<typeof tcpHandlerSchema>;
export type TcpHandlerMeta = z.infer<typeof tcpHandlerMetaSchema>;
export type TcpHandlerId = EntityId<TcpHandler>;
