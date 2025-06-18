import { useDrag, useDrop } from "react-dnd";
import { NavLink } from "react-router";
import { GripVertical } from "lucide-react";
import type { Handler } from "@/handlers/schema";
import { cn } from "@/util/ui";

interface DraggableHandlerItemProps {
  handler: Handler;
  index: number;
  moveHandler: (dragIndex: number, dropIndex: number) => void;
  onReorderComplete?: () => void;
}

const ITEM_TYPE = "handler";

export function DraggableHandlerItem({
  handler,
  index,
  moveHandler,
  onReorderComplete,
}: DraggableHandlerItemProps) {
  const [{ isDragging }, drag, dragPreview] = useDrag({
    type: ITEM_TYPE,
    item: { id: handler.id, index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    end: () => {
      // Trigger reorder API call when dragging ends
      onReorderComplete?.();
    },
  });

  const [{ isOver }, drop] = useDrop({
    accept: ITEM_TYPE,
    hover: (draggedItem: { id: string; index: number }) => {
      if (draggedItem.index !== index) {
        moveHandler(draggedItem.index, index);
        draggedItem.index = index;
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  const dragHandle = (
    <div
      ref={drag as any}
      className="flex items-center px-1 py-2 cursor-grab active:cursor-grabbing opacity-60 hover:opacity-100 transition-opacity"
    >
      <GripVertical className="h-4 w-4" />
    </div>
  );

  const content = (
    <div
      ref={dragPreview as any}
      className={cn(
        "flex items-center gap-2 transition-opacity",
        isDragging && "opacity-50",
      )}
    >
      {dragHandle}
      <NavLink
        to={`/handlers/${handler.id}`}
        className={cn(
          "flex flex-1 flex-col items-start gap-1 whitespace-nowrap rounded-md px-3 py-2 text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          isOver && "bg-sidebar-accent/50",
        )}
      >
        <div className="line-clamp-1 font-medium">
          {handler.name || "Unnamed handler"}
        </div>
        <div className="line-clamp-1 text-xs text-muted-foreground">
          {handler.path}
        </div>
        <div className="line-clamp-1 text-xs text-muted-foreground">
          Handler
          {handler.method !== "*" && ` • ${handler.method.toUpperCase()}`}
        </div>
      </NavLink>
    </div>
  );

  return (
    <div
      ref={drop as any}
      className={cn(
        "transition-colors",
        isOver && "bg-sidebar-accent/20 rounded-md",
      )}
    >
      {content}
    </div>
  );
}
