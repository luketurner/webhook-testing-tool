import {
  Circle,
  Search,
  Archive,
  ArchiveRestore,
  Trash2,
  MoreVertical,
} from "lucide-react";
import { NavLink, useNavigate } from "react-router";
import { useState, useMemo } from "react";
import { DateDisplay } from "@/components/date-display";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

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
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useResourceList } from "@/dashboard/hooks";
import { useSSEContext } from "@/util/hooks/use-sse";
import type { TcpConnectionMeta } from "@/tcp-connections/schema";

export function TcpConnectionsSidebar() {
  const [showArchived, setShowArchived] = useState(() => {
    return localStorage.getItem("showArchivedTcpConnections") === "true";
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false);
  const navigate = useNavigate();

  const { data: connections, isLoading: connectionsLoading } =
    useResourceList<TcpConnectionMeta>("tcp-connections", {
      includeArchived: showArchived,
    });
  const { connectionState } = useSSEContext();
  const queryClient = useQueryClient();

  const handleToggleArchived = (checked: boolean) => {
    setShowArchived(checked);
    localStorage.setItem("showArchivedTcpConnections", String(checked));
  };

  const deleteAllMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/tcp-connections`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete all TCP connections");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tcp-connections"] });
      toast.success("All TCP connections deleted");
      setDeleteAllDialogOpen(false);
    },
    onError: (error) => {
      toast.error(`Failed to delete all TCP connections: ${error.message}`);
    },
  });

  const archiveAllMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/tcp-connections/bulk-archive`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: [],
          archived_timestamp: Date.now(),
        }),
      });
      if (!response.ok)
        throw new Error("Failed to archive all TCP connections");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tcp-connections"] });
      toast.success("All TCP connections archived");
      navigate("/");
    },
    onError: (error) => {
      toast.error(`Failed to archive all TCP connections: ${error.message}`);
    },
  });

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

  const activeConnectionsCount = useMemo(() => {
    return connections?.filter((c) => !c.archived_timestamp).length || 0;
  }, [connections]);

  return (
    <>
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => archiveAllMutation.mutate()}
                  disabled={
                    archiveAllMutation.isPending || activeConnectionsCount === 0
                  }
                >
                  <Archive className="mr-2 h-4 w-4" />
                  Archive All ({activeConnectionsCount})
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setDeleteAllDialogOpen(true)}
                  disabled={
                    deleteAllMutation.isPending || activeConnectionsCount === 0
                  }
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete All ({activeConnectionsCount})
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search connections..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <label
              htmlFor="show-archived-connections"
              className="text-muted-foreground cursor-pointer"
            >
              Show Archived
            </label>
            <Switch
              id="show-archived-connections"
              checked={showArchived}
              onCheckedChange={handleToggleArchived}
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
                  const isArchived = !!connection.archived_timestamp;
                  return (
                    <div
                      key={connection.id}
                      className={`border-b last:border-b-0 hover:bg-sidebar-accent group ${
                        isArchived ? "opacity-60" : ""
                      }`}
                    >
                      <NavLink
                        to={`/tcp-connections/${connection.id}`}
                        className="flex flex-col items-start gap-2 p-4 text-sm leading-tight whitespace-nowrap"
                      >
                        <div className="flex w-full items-center gap-2">
                          <span className={`font-medium`}>
                            {connection.client_ip}:{connection.client_port}
                          </span>
                          {isArchived && (
                            <Archive className="h-3 w-3 text-muted-foreground" />
                          )}
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
                    </div>
                  );
                })
              )}
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>

      {/* Delete All Confirmation Dialog */}
      <AlertDialog
        open={deleteAllDialogOpen}
        onOpenChange={setDeleteAllDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete All TCP Connections</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {activeConnectionsCount} active TCP
              connection{activeConnectionsCount !== 1 ? "s" : ""}. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteAllMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
