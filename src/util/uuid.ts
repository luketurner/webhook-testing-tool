import { z } from "zod/v4";

export const uuidSchema = z.uuid().brand<"uuid">();
export type UUID = z.infer<typeof uuidSchema>;

export const parseUUID = (v: unknown): UUID => uuidSchema.parse(v);
export const randomUUID = (): UUID => parseUUID(crypto.randomUUID());
