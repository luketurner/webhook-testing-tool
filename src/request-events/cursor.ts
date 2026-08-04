import { z } from "zod/v4";
import { timestampSchema, type Timestamp } from "@/util/datetime";
import { uuidSchema } from "@/util/uuid";
import type { RequestId } from "./schema";

export interface RequestCursor {
  request_timestamp: Timestamp;
  id: RequestId;
}

const cursorSchema = z.object({
  request_timestamp: timestampSchema,
  id: uuidSchema,
});

export function encodeRequestCursor(cursor: RequestCursor): string {
  return `${cursor.request_timestamp}_${cursor.id}`;
}

export function decodeRequestCursor(raw: string): RequestCursor {
  const separator = raw.indexOf("_");
  if (separator === -1) {
    throw new Error("Invalid cursor: missing separator");
  }
  const timestampPart = raw.slice(0, separator);
  const idPart = raw.slice(separator + 1);
  return cursorSchema.parse({
    request_timestamp: Number(timestampPart),
    id: idPart,
  }) as RequestCursor;
}
