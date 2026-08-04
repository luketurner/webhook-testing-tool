import { useQueryClient } from "@tanstack/react-query";
import { SSEContext, useSSE } from "@/util/hooks/use-sse";
import { requestEventMetaSchema } from "@/request-events/schema";
import {
  prependRequestToCache,
  updateRequestInCache,
} from "@/request-events/request-cache";

export function SSEProvider({ children }) {
  const queryClient = useQueryClient();

  const state = useSSE({
    url: `/api/events/stream`,
    onEvent: (event) => {
      if (event.type === "request:created") {
        const parsed = requestEventMetaSchema.safeParse(event.payload);
        if (parsed.success) {
          prependRequestToCache(queryClient, parsed.data);
        } else {
          queryClient.invalidateQueries({ queryKey: ["requests"] });
        }
      } else if (event.type === "request:updated") {
        const parsed = requestEventMetaSchema.safeParse(event.payload);
        if (parsed.success) {
          updateRequestInCache(queryClient, parsed.data);
        } else {
          queryClient.invalidateQueries({ queryKey: ["requests"] });
        }
      } else if (
        event.type === "request:archived" ||
        event.type === "request:unarchived" ||
        event.type === "request:deleted"
      ) {
        // User-initiated, low-frequency: a targeted refetch is fine.
        queryClient.invalidateQueries({ queryKey: ["requests"] });
      } else if (
        event.type === "tcp_connection:created" ||
        event.type === "tcp_connection:updated" ||
        event.type === "tcp_connection:closed" ||
        event.type === "tcp_connection:failed" ||
        event.type === "tcp_connection:archived" ||
        event.type === "tcp_connection:unarchived" ||
        event.type === "tcp_connection:deleted"
      ) {
        queryClient.invalidateQueries({ queryKey: ["tcp-connections"] });
      }
    },
    onError: (error) => {
      console.error("SSE connection error:", error);
    },
  });

  return <SSEContext value={state}>{children}</SSEContext>;
}
