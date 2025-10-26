import {
  Circle,
  Plus,
  Search,
  Archive,
  ArchiveRestore,
  Trash2,
  MoreVertical,
} from "lucide-react";
import { NavLink } from "react-router";
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
import type { RequestEventMeta } from "@/request-events/schema";

export function RequestSidebar() {
  const [showArchived, setShowArchived] = useState(() => {
    return localStorage.getItem("showArchivedRequests") === "true";
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const { data: requests, isLoading: requestsLoading } =
    useResourceList<RequestEventMeta>("requests", {
      includeArchived: showArchived,
    });
  const { connectionState } = useSSEContext();
  const queryClient = useQueryClient();

  const handleToggleArchived = (checked: boolean) => {
    setShowArchived(checked);
    localStorage.setItem("showArchivedRequests", String(checked));
  };

  const deleteAllMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/requests`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete all requests");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requests"] });
      toast.success("All requests deleted");
      setDeleteAllDialogOpen(false);
    },
    onError: (error) => {
      toast.error(`Failed to delete all requests: ${error.message}`);
    },
  });

  const archiveAllMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/requests/bulk-archive`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: [],
          archived_timestamp: Date.now(),
        }),
      });
      if (!response.ok) throw new Error("Failed to archive all requests");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requests"] });
      toast.success("All requests archived");
    },
    onError: (error) => {
      toast.error(`Failed to archive all requests: ${error.message}`);
    },
  });

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

  const activeRequestsCount = useMemo(() => {
    return requests?.filter((r) => !r.archived_timestamp).length || 0;
  }, [requests]);

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
            <div className="flex items-center gap-2">
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
                      archiveAllMutation.isPending || activeRequestsCount === 0
                    }
                  >
                    <Archive className="mr-2 h-4 w-4" />
                    Archive All ({activeRequestsCount})
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setDeleteAllDialogOpen(true)}
                    disabled={
                      deleteAllMutation.isPending || activeRequestsCount === 0
                    }
                    className="text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete All ({activeRequestsCount})
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <NavLink
                to="/requests/new"
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 w-8"
              >
                <Plus className="h-4 w-4" />
                <span className="sr-only">New Request</span>
              </NavLink>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search requests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <label
              htmlFor="show-archived-requests"
              className="text-muted-foreground cursor-pointer"
            >
              Show Archived
            </label>
            <Switch
              id="show-archived-requests"
              checked={showArchived}
              onCheckedChange={handleToggleArchived}
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
                  const isArchived = !!request.archived_timestamp;
                  return (
                    <div
                      key={request.id}
                      className={`border-b last:border-b-0 hover:bg-sidebar-accent group ${
                        isArchived ? "opacity-60" : ""
                      }`}
                    >
                      <NavLink
                        to={`/requests/${request.id}`}
                        className="flex flex-col items-start gap-2 p-4 text-sm leading-tight whitespace-nowrap"
                      >
                        <div className="flex w-full items-center gap-2">
                          <span className={`font-medium ${statusColor}`}>
                            {request.request_method}
                          </span>
                          {isArchived && (
                            <Archive className="h-3 w-3 text-muted-foreground" />
                          )}
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
                        <div className="flex items-center gap-2 text-xs w-full">
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
            <AlertDialogTitle>Delete All Requests</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {activeRequestsCount} active request
              {activeRequestsCount !== 1 ? "s" : ""}. This action cannot be
              undone.
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
