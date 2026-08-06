import { useInfiniteQuery } from "@tanstack/react-query";
import { z } from "zod/v4";
import { requestEventMetaSchema } from "./schema";

// Validate the API response shape so an endpoint regression fails fast here
// rather than surfacing as a confusing error deep in the render tree.
export const requestEventPageResponseSchema = z.object({
  events: z.array(requestEventMetaSchema),
  nextCursor: z.string().nullable(),
  total: z.number(),
});

// Derived from the schema so the runtime contract and the type never drift.
export type RequestEventPageResponse = z.infer<
  typeof requestEventPageResponseSchema
>;

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
      return requestEventPageResponseSchema.parse(await resp.json());
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}
