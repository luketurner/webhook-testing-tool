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

/**
 * Converts a Unix timestamp to a formatted locale string or returns fallback text
 * @param timestamp - JS date in milliseconds
 * @param fallback - Text to return if timestamp is invalid (default: "N/A")
 * @returns Formatted date string or fallback text
 */
export function formatTimestampOrFallback(
  timestamp: number | null | undefined,
  fallback: string = "N/A",
): string {
  const formatted = formatTimestamp(timestamp);
  return formatted ?? fallback;
}
