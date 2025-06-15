import { z } from "zod/v4";

export const timestampSchema = z.number().min(0).brand<"timestamp">();
export type Timestamp = z.infer<typeof timestampSchema>;

export function now() {
  return timestampSchema.parse(Date.now());
}
