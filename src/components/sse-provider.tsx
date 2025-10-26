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
        event.type === "request:updated" ||
        event.type === "request:archived" ||
        event.type === "request:unarchived" ||
        event.type === "request:deleted"
      ) {
        console.log("event", event.type, event.payload);
        // Invalidate and refetch the requests list to get the latest data
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
        console.log("event", event.type, event.payload);
        // Invalidate and refetch the TCP connections list to get the latest data
        queryClient.invalidateQueries({ queryKey: ["tcp-connections"] });
      }
    },
    onError: (error) => {
      console.error("SSE connection error:", error);
    },
  });

  return <SSEContext value={state}>{children}</SSEContext>;
}
