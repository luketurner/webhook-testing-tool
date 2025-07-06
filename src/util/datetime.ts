import { z } from "zod/v4";
import { DateTime } from "luxon";

export const timestampSchema = z.number().min(0).brand<"timestamp">();
export type Timestamp = z.infer<typeof timestampSchema>;

/**
 * Converts a Unix timestamp to a formatted locale string using Luxon
 * @param timestamp - JS date in milliseconds
 * @returns Formatted date string or null if timestamp is invalid
 */
export function formatTimestamp(
  timestamp: Timestamp | number | null | undefined,
): string | null {
  if (!timestamp) {
    return null;
  }

  const dt = DateTime.fromMillis(timestamp);
  if (!dt.isValid) {
    return null;
  }

  return dt.toLocaleString(DateTime.DATETIME_SHORT);
}

export function now() {
  return timestampSchema.parse(Date.now());
}
