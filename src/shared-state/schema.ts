import { z } from "zod";
import { fromJSONString } from "@/util/json";

export const sharedStateDataSchema = z.record(z.string(), z.any());
export const sharedStateSchema = z.object({
  id: z.string(),
  data: z.preprocess(fromJSONString, sharedStateDataSchema),
  updated_at: z.number(),
});

export type SharedState = z.infer<typeof sharedStateSchema>;
export type SharedStateData = z.infer<typeof sharedStateDataSchema>;
