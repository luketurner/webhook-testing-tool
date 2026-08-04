import type { QueryClient } from "@tanstack/react-query";
import type { RequestEventMeta } from "./schema";
import type { RequestEventPageResponse } from "./use-infinite-requests";
import { matchesRequestSearch } from "@/util/request-search";

interface InfiniteRequestData {
  pages: RequestEventPageResponse[];
  pageParams: unknown[];
}

interface RequestQueryFilter {
  includeArchived: boolean;
  search: string;
}

function readFilter(queryKey: readonly unknown[]): RequestQueryFilter | null {
  const filter = queryKey[1];
  if (
    filter &&
    typeof filter === "object" &&
    "includeArchived" in filter &&
    "search" in filter
  ) {
    return filter as RequestQueryFilter;
  }
  return null;
}

function hasEvent(data: InfiniteRequestData, id: string): boolean {
  return data.pages.some((page) => page.events.some((e) => e.id === id));
}

/**
 * Prepend a newly-created request to every cached infinite-requests view it
 * belongs to (respecting each view's archived scope and search filter).
 */
export function prependRequestToCache(
  queryClient: QueryClient,
  meta: RequestEventMeta,
): void {
  const queries = queryClient
    .getQueryCache()
    .findAll({ queryKey: ["requests"] });

  for (const query of queries) {
    const filter = readFilter(query.queryKey);
    if (!filter) continue; // skip single-resource ["requests", id] entries
    if (meta.archived_timestamp && !filter.includeArchived) continue;
    if (!matchesRequestSearch(meta, filter.search)) continue;

    queryClient.setQueryData<InfiniteRequestData>(query.queryKey, (data) => {
      if (!data?.pages?.length) return data;
      if (hasEvent(data, meta.id)) return data;
      const [first, ...rest] = data.pages;
      return {
        ...data,
        pages: [
          {
            ...first,
            events: [meta, ...first.events],
            total: first.total + 1,
          },
          ...rest,
        ],
      };
    });
  }
}

/**
 * Replace an existing request (matched by id) across all cached pages of
 * every infinite-requests view. No-op for views that have not loaded it.
 */
export function updateRequestInCache(
  queryClient: QueryClient,
  meta: RequestEventMeta,
): void {
  queryClient.setQueriesData<InfiniteRequestData>(
    { queryKey: ["requests"] },
    (data) => {
      if (!data?.pages) return data;
      let changed = false;
      const pages = data.pages.map((page) => {
        if (!page.events.some((e) => e.id === meta.id)) return page;
        changed = true;
        return {
          ...page,
          events: page.events.map((e) =>
            e.id === meta.id ? { ...e, ...meta } : e,
          ),
        };
      });
      return changed ? { ...data, pages } : data;
    },
  );
}
