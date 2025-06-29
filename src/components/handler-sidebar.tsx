import { Plus } from "lucide-react";
import { NavLink } from "react-router";
import React, { useCallback, useState } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { useResourceList } from "@/dashboard/hooks";
import type { Handler } from "@/handlers/schema";
import { DraggableHandlerItem } from "./draggable-handler-item";
import { useHandlerReorder } from "@/util/hooks/use-handler-reorder";

export function HandlerSidebar() {
  const { data: handlers, isLoading: handlersLoading } =
    useResourceList<Handler>("handlers");
  const [localHandlers, setLocalHandlers] = useState<Handler[]>([]);
  const reorderMutation = useHandlerReorder();

  // Update local state when handlers change
  React.useEffect(() => {
    if (handlers) {
      setLocalHandlers([...handlers]);
    }
  }, [handlers]);

  const moveHandler = useCallback((dragIndex: number, dropIndex: number) => {
    setLocalHandlers((prevHandlers) => {
      const newHandlers = [...prevHandlers];
      const draggedHandler = newHandlers[dragIndex];

      // Remove the dragged item
      newHandlers.splice(dragIndex, 1);
      // Insert it at the new position
      newHandlers.splice(dropIndex, 0, draggedHandler);

      return newHandlers;
    });
  }, []);

  const handleReorderComplete = useCallback(() => {
    // Create updates array with new order values
    const updates = localHandlers.map((handler, index) => ({
      id: handler.id,
      order: index + 1, // 1-based ordering
    }));

    // Only call API if order actually changed
    const hasOrderChanged = updates.some((update, index) => {
      const originalHandler = handlers?.find((h) => h.id === update.id);
      return originalHandler && originalHandler.order !== update.order;
    });

    if (hasOrderChanged) {
      reorderMutation.mutate({ updates });
    }
  }, [localHandlers, handlers, reorderMutation]);

  const displayHandlers =
    localHandlers.length > 0 ? localHandlers : handlers || [];

  return (
    <DndProvider backend={HTML5Backend}>
      <Sidebar collapsible="none" className="hidden flex-1 md:flex">
        <SidebarHeader className="gap-3.5 border-b p-4">
          <div className="flex w-full items-center justify-between">
            <div className="text-foreground text-base font-medium">
              Handlers
            </div>
            <NavLink
              to="/handlers/new"
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 w-8"
            >
              <Plus className="h-4 w-4" />
              <span className="sr-only">New Handler</span>
            </NavLink>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup className="px-0">
            <SidebarGroupContent>
              {handlersLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex flex-col gap-2 border-b p-4 last:border-b-0"
                  >
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                ))
              ) : displayHandlers.length === 0 ? (
                <EmptyState message="No handlers yet. Create a handler to get started." />
              ) : (
                displayHandlers.map((handler, index) => (
                  <div key={handler.id} className="border-b last:border-b-0">
                    <DraggableHandlerItem
                      handler={handler}
                      index={index}
                      moveHandler={moveHandler}
                      onReorderComplete={handleReorderComplete}
                    />
                  </div>
                ))
              )}
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
    </DndProvider>
  );
}
