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
import type { RequestEventMeta } from "@/request-events/schema";

export function RequestSidebar() {
  const { data: requests, isLoading: requestsLoading } =
    useResourceList<RequestEventMeta>("requests");

  return (
    <Sidebar collapsible="none" className="hidden flex-1 md:flex">
      <SidebarHeader className="gap-3.5 border-b p-4">
        <div className="flex w-full items-center justify-between">
          <div className="text-foreground text-base font-medium">
            Requests
          </div>
          <NavLink
            to="/requests/new"
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 w-8"
          >
            <Plus className="h-4 w-4" />
            <span className="sr-only">New Request</span>
          </NavLink>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup className="px-0">
          <SidebarGroupContent>
            {requestsLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex flex-col gap-2 border-b p-4 last:border-b-0"
                  >
                    <div className="flex w-full items-center gap-2">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="ml-auto h-3 w-12" />
                    </div>
                    <Skeleton className="h-4 w-full" />
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-3 w-8" />
                    </div>
                  </div>
                ))
              : requests?.map((request) => {
                  const statusColor =
                    request.status === "complete"
                      ? "text-green-600"
                      : request.status === "error"
                        ? "text-red-600"
                        : "text-yellow-600";
                  const date = new Date(
                    request.request_timestamp,
                  ).toLocaleString();

                  return (
                    <NavLink
                      to={`/requests/${request.id}`}
                      key={request.id}
                      className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex flex-col items-start gap-2 border-b p-4 text-sm leading-tight whitespace-nowrap last:border-b-0"
                    >
                      <div className="flex w-full items-center gap-2">
                        <span className={`font-medium ${statusColor}`}>
                          {request.request_method}
                        </span>
                        <span className="ml-auto text-xs">{date}</span>
                      </div>
                      <span className="font-medium truncate w-full">
                        {request.request_url}
                      </span>
                      <div className="flex items-center gap-2 text-xs">
                        <span className={`capitalize ${statusColor}`}>
                          {request.status}
                        </span>
                        {request.response_status && (
                          <span className="text-muted-foreground">
                            • {request.response_status}
                          </span>
                        )}
                      </div>
                    </NavLink>
                  );
                })}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}