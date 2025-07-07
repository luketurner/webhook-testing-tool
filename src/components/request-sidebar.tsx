import { Circle, Plus, Search } from "lucide-react";
import { NavLink } from "react-router";
import { useState, useMemo } from "react";
import { DateDisplay } from "@/components/date-display";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/empty-state";
import { useResourceList } from "@/dashboard/hooks";
import { useSSEContext } from "@/util/hooks/use-sse";
import type { RequestEventMeta } from "@/request-events/schema";

export function RequestSidebar() {
  const { data: requests, isLoading: requestsLoading } =
    useResourceList<RequestEventMeta>("requests");
  const { connectionState } = useSSEContext();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredRequests = useMemo(() => {
    if (!requests || !searchQuery.trim()) {
      return requests;
    }

    const query = searchQuery.toLowerCase().trim();
    return requests.filter((request) => {
      const methodMatch = request.request_method.toLowerCase().includes(query);
      const urlMatch = request.request_url.toLowerCase().includes(query);
      const statusMatch = request.status.toLowerCase().includes(query);
      const responseStatusMatch = request.response_status
        ?.toString()
        .includes(query);

      return methodMatch || urlMatch || statusMatch || responseStatusMatch;
    });
  }, [requests, searchQuery]);

  return (
    <Sidebar
      collapsible="none"
      className="hidden flex-1 md:flex w-[calc(var(--sidebar-width)-var(--sidebar-width-icon))]"
    >
      <SidebarHeader className="gap-3.5 border-b p-4">
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="text-foreground text-base font-medium">
              Requests
            </div>
            <Circle
              className={`h-2 w-2 ${
                connectionState === "connected"
                  ? "fill-green-500 text-green-500"
                  : connectionState === "connecting"
                    ? "fill-yellow-500 text-yellow-500"
                    : "fill-red-500 text-red-500"
              }`}
            />
          </div>
          <NavLink
            to="/requests/new"
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 w-8"
          >
            <Plus className="h-4 w-4" />
            <span className="sr-only">New Request</span>
          </NavLink>
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search requests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup className="px-0">
          <SidebarGroupContent>
            {requestsLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
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
            ) : requests && requests.length === 0 ? (
              <EmptyState message="No requests yet. Send a request to get started." />
            ) : filteredRequests &&
              filteredRequests.length === 0 &&
              searchQuery.trim() ? (
              <EmptyState
                message={`No requests found matching "${searchQuery}"`}
              />
            ) : (
              filteredRequests?.map((request) => {
                const statusColor =
                  request.status === "complete"
                    ? "text-green-600"
                    : request.status === "error"
                      ? "text-red-600"
                      : "text-yellow-600";
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
                      <span className="ml-auto text-xs">
                        <DateDisplay
                          timestamp={request.request_timestamp}
                          interactive={false}
                        />
                      </span>
                    </div>
                    <span
                      className="font-medium truncate w-full"
                      title={request.request_url}
                    >
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
              })
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
