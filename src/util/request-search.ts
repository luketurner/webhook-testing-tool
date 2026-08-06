import type { RequestEventMeta } from "@/request-events/schema";

/**
 * Client-side mirror of the server's SQL LIKE search in
 * `getRequestEventsPage`. Used to decide whether an SSE-delivered request
 * belongs in the current filtered view. Keep the searched fields in sync
 * with the model's search predicate.
 */
export function matchesRequestSearch(
  meta: RequestEventMeta,
  query: string,
): boolean {
  const q = query.toLowerCase().trim();
  if (!q) return true;
  return (
    meta.request_method.toLowerCase().includes(q) ||
    meta.request_url.toLowerCase().includes(q) ||
    meta.status.toLowerCase().includes(q) ||
    (meta.response_status?.toString().includes(q) ?? false)
  );
}
