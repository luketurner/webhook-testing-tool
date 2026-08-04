import { useInfiniteQuery } from "@tanstack/react-query";
import type { RequestEventMeta } from "./schema";

export interface RequestEventPageResponse {
  events: RequestEventMeta[];
  nextCursor: string | null;
  total: number;
}

const PAGE_SIZE = 50;

export function useInfiniteRequests(options: {
  includeArchived: boolean;
  search: string;
}) {
  const { includeArchived, search } = options;
  return useInfiniteQuery({
    queryKey: ["requests", { includeArchived, search }],
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }): Promise<RequestEventPageResponse> => {
      const params = new URLSearchParams();
      params.set("includeArchived", String(includeArchived));
      params.set("limit", String(PAGE_SIZE));
      if (search.trim()) params.set("search", search.trim());
      if (pageParam) params.set("cursor", pageParam);
      const resp = await fetch(`/api/requests?${params.toString()}`);
      if (!resp.ok) {
        throw new Error(`Failed to load requests (${resp.status})`);
      }
      return resp.json();
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}
