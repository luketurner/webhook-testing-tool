import { useResourceList } from "@/dashboard/hooks";
import { Network } from "lucide-react";
import { Link, useParams } from "react-router";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { StatusBadge } from "@/components/status-badge";
import { DateDisplay } from "@/components/date-display";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import type { TcpConnectionMeta } from "@/tcp-connections/schema";

export function TcpConnectionsSidebar() {
  const { data: connections, isLoading } =
    useResourceList<TcpConnectionMeta>("tcp-connections");
  const params = useParams();

  if (isLoading) {
    return (
      <Sidebar collapsible="none" className="flex-1 min-w-[240px]">
        <LoadingSkeleton />
      </Sidebar>
    );
  }

  return (
    <Sidebar collapsible="none" className="flex-1 min-w-[240px]">
      <SidebarHeader className="bg-background">
        <div className="flex items-center justify-between px-2">
          <span className="text-sm font-medium">TCP Connections</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu className="gap-0">
          {!connections || connections.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No TCP connections yet
            </div>
          ) : (
            connections.map((connection) => (
              <SidebarMenuItem key={connection.id}>
                <SidebarMenuButton
                  asChild
                  isActive={params.id === connection.id}
                  className="h-auto py-2 px-3 flex flex-col items-start gap-1"
                >
                  <Link to={`/tcp-connections/${connection.id}`}>
                    <div className="flex items-center gap-2 w-full">
                      <Network className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium truncate">
                        {connection.client_ip}:{connection.client_port}
                      </span>
                      <StatusBadge
                        status={connection.status}
                        className="ml-auto"
                      />
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground w-full">
                      <span>Port {connection.server_port}</span>
                      <span className="ml-auto">
                        <DateDisplay timestamp={connection.open_timestamp} />
                      </span>
                    </div>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))
          )}
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
}
