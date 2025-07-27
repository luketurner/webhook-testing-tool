import { Circle, Network, Plus, Search } from "lucide-react";
import { NavLink, useParams } from "react-router";
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
import type { TcpConnectionMeta } from "@/tcp-connections/schema";

export function TcpConnectionsSidebar() {
  const { data: connections, isLoading: connectionsLoading } =
    useResourceList<TcpConnectionMeta>("tcp-connections");
  const { connectionState } = useSSEContext();
  const [searchQuery, setSearchQuery] = useState("");
  const params = useParams();

  const filteredConnections = useMemo(() => {
    if (!connections || !searchQuery.trim()) {
      return connections;
    }

    const query = searchQuery.toLowerCase().trim();
    return connections.filter((connection) => {
      const ipMatch = connection.client_ip.toLowerCase().includes(query);
      const portMatch = connection.client_port.toString().includes(query);
      const serverPortMatch = connection.server_port.toString().includes(query);
      const statusMatch = connection.status.toLowerCase().includes(query);

      return ipMatch || portMatch || serverPortMatch || statusMatch;
    });
  }, [connections, searchQuery]);

  return (
    <Sidebar
      collapsible="none"
      className="hidden flex-1 md:flex w-[calc(var(--sidebar-width)-var(--sidebar-width-icon))]"
    >
      <SidebarHeader className="gap-3.5 border-b p-4">
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="text-foreground text-base font-medium">
              TCP Connections
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
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search connections..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup className="px-0">
          <SidebarGroupContent>
            {connectionsLoading ? (
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
            ) : connections && connections.length === 0 ? (
              <EmptyState message="No TCP connections yet." />
            ) : filteredConnections &&
              filteredConnections.length === 0 &&
              searchQuery.trim() ? (
              <EmptyState
                message={`No connections found matching "${searchQuery}"`}
              />
            ) : (
              filteredConnections?.map((connection) => {
                const statusColor =
                  connection.status === "closed"
                    ? "text-green-600"
                    : connection.status === "active"
                      ? "text-yellow-600"
                      : "text-red-600";
                return (
                  <NavLink
                    to={`/tcp-connections/${connection.id}`}
                    key={connection.id}
                    className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex flex-col items-start gap-2 border-b p-4 text-sm leading-tight whitespace-nowrap last:border-b-0"
                  >
                    <div className="flex w-full items-center gap-2">
                      <span className={`font-medium`}>
                        {connection.client_ip}:{connection.client_port}
                      </span>
                      <span className="ml-auto text-xs">
                        <DateDisplay
                          timestamp={connection.open_timestamp}
                          interactive={false}
                        />
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className={`capitalize ${statusColor}`}>
                        {connection.status}
                      </span>
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
