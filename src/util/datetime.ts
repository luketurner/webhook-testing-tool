import { DateTime } from "luxon";

/**
 * Converts a Unix timestamp to a formatted locale string using Luxon
 * @param timestamp - JS date in milliseconds
 * @returns Formatted date string or null if timestamp is invalid
 */
export function formatTimestamp(
  timestamp: number | null | undefined,
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
