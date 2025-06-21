import { useQueryClient } from "@tanstack/react-query";
import { SSEContext, useSSE } from "@/util/hooks/use-sse";

export function SSEProvider({ children }) {
  const queryClient = useQueryClient();

  // Set up SSE connection for real-time updates
  const state = useSSE({
    url: `/api/events/stream`,
    onEvent: (event) => {
      if (
        event.type === "request:created" ||
        event.type === "request:updated"
      ) {
        console.log("event", event.type, event.payload);
        // Invalidate and refetch the requests list to get the latest data
        queryClient.invalidateQueries({ queryKey: ["requests"] });
      }
    },
    onError: (error) => {
      console.error("SSE connection error:", error);
    },
  });

  return <SSEContext value={state}>{children}</SSEContext>;
}
