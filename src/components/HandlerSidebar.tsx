import { Plus } from "lucide-react";
import { NavLink } from "react-router";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { useResourceList } from "@/dashboard/hooks";
import type { Handler } from "@/handlers/schema";

export function HandlerSidebar() {
  const { data: handlers, isLoading: handlersLoading } =
    useResourceList<Handler>("handlers");

  return (
    <Sidebar collapsible="none" className="hidden flex-1 md:flex">
      <SidebarHeader className="gap-3.5 border-b p-4">
        <div className="flex w-full items-center justify-between">
          <div className="text-foreground text-base font-medium">Handlers</div>
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
            {handlersLoading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex flex-col gap-2 border-b p-4 last:border-b-0"
                  >
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                ))
              : handlers?.map((handler) => (
                  <NavLink
                    to={`/handlers/${handler.id}`}
                    key={handler.id}
                    className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex flex-col items-start gap-2 border-b p-4 text-sm leading-tight whitespace-nowrap last:border-b-0"
                  >
                    <span className="font-medium truncate w-full">
                      {handler.name || "Unnamed handler"}
                    </span>
                    <span className="text-muted-foreground text-xs truncate w-full">
                      {handler.path}
                    </span>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Handler</span>
                      {handler.method && (
                        <span>• {handler.method.toUpperCase()}</span>
                      )}
                    </div>
                  </NavLink>
                ))}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
