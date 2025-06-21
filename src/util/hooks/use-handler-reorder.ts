import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Handler } from "@/handlers/schema";

interface ReorderUpdate {
  id: string;
  order: number;
}

interface ReorderHandlersPayload {
  updates: ReorderUpdate[];
}

export function useHandlerReorder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: ReorderHandlersPayload) => {
      const response = await fetch("/api/handlers/reorder", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Failed to reorder handlers");
      }

      return response.json();
    },
    onMutate: async (payload: ReorderHandlersPayload) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["handlers"] });

      // Snapshot the previous value
      const previousHandlers = queryClient.getQueryData<Handler[]>([
        "handlers",
      ]);

      // Optimistically update the cache
      if (previousHandlers) {
        const reorderedHandlers = [...previousHandlers];

        // Create a map of updates for quick lookup
        const updateMap = new Map(payload.updates.map((u) => [u.id, u.order]));

        // Update the order values
        reorderedHandlers.forEach((handler) => {
          const newOrder = updateMap.get(handler.id);
          if (newOrder !== undefined) {
            handler.order = newOrder;
          }
        });

        // Sort by new order
        reorderedHandlers.sort((a, b) => a.order - b.order);

        queryClient.setQueryData(["handlers"], reorderedHandlers);
      }

      return { previousHandlers };
    },
    onError: (err, payload, context) => {
      // If the mutation fails, roll back to the previous value
      if (context?.previousHandlers) {
        queryClient.setQueryData(["handlers"], context.previousHandlers);
      }
    },
    onSuccess: () => {
      // Invalidate and refetch handler data to ensure consistency
      queryClient.invalidateQueries({ queryKey: ["handlers"] });
    },
  });
}
