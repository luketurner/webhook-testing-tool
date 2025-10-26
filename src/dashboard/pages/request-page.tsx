import { CopyRequestModal } from "@/components/copy-request-modal";
import { CopyResponseModal } from "@/components/copy-response-modal";
import { DataSection } from "@/components/data-section";
import { HandlerExecutionItem } from "@/components/handler-execution-item";
import { RequestEventDisplay } from "@/components/request-event-display";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useHandlerExecutions,
  useResource,
  useSendRequest,
} from "@/dashboard/hooks";
import type { HandlerExecution } from "@/handler-executions/schema";
import type { RequestEvent } from "@/request-events/schema";
import { requestEventToHandlerRequest } from "@/webhook-server/schema";
import {
  Copy,
  MoreHorizontal,
  RotateCcw,
  Link,
  Link2Off,
  Plus,
  Archive,
  Trash,
} from "lucide-react";
import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export const RequestPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: request, isLoading: requestLoading } =
    useResource<RequestEvent>("requests", id);
  const { data: handlerExecutions, isLoading: executionsLoading } =
    useHandlerExecutions<HandlerExecution>(id || "");
  const sendRequest = useSendRequest();
  const [copyModalOpen, setCopyModalOpen] = useState(false);
  const [copyResponseModalOpen, setCopyResponseModalOpen] = useState(false);

  const shareRequest = useMutation({
    mutationFn: async (enable: boolean) => {
      const response = await fetch(`/api/requests/${id}/share`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ enable }),
      });

      if (!response.ok) {
        throw new Error("Failed to update sharing");
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["requests", id] });

      if (data.shared) {
        const fullUrl = `${window.location.origin}/#${data.shareUrl}`;
        navigator.clipboard.writeText(fullUrl);
        toast.success("Share link copied to clipboard!");
      } else {
        toast.success("Sharing disabled");
      }
    },
    onError: () => {
      toast.error("Failed to update sharing");
    },
  });

  const archiveRequest = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/requests/${id}/archive`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to archive request");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requests", id] });
      toast.success("Request archived");
    },
    onError: () => {
      toast.error("Failed to archive request");
    },
  });

  const deleteRequest = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/requests/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete request");
      }
    },
    onSuccess: () => {
      toast.success("Request deleted");
      navigate("/");
    },
    onError: () => {
      toast.error("Failed to delete request");
    },
  });

  const handleResendRequest = (requestEvent: RequestEvent) => {
    const handlerRequest = requestEventToHandlerRequest(requestEvent);
    sendRequest.mutate(handlerRequest);
  };

  const handleCreateHandler = () => {
    const searchParams = new URLSearchParams();
    searchParams.set("method", request.request_method);
    searchParams.set("path", request.request_url);
    navigate(`/handlers/new?${searchParams.toString()}`);
  };

  if (requestLoading) {
    return <Skeleton className="h-screen w-full" />;
  }

  if (!request) {
    return <div className="p-4">Request not found</div>;
  }

  return (
    <>
      <RequestEventDisplay
        request={request}
        titleActions={
          <div className="ml-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleResendRequest(request)}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Resend request
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleCreateHandler}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create handler for request
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => shareRequest.mutate(!request.shared_id)}
                  disabled={shareRequest.isPending}
                >
                  {request.shared_id ? (
                    <>
                      <Link2Off className="mr-2 h-4 w-4" />
                      Disable sharing
                    </>
                  ) : (
                    <>
                      <Link className="mr-2 h-4 w-4" />
                      Share request
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setCopyModalOpen(true)}>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy request as...
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setCopyResponseModalOpen(true)}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copy response as...
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => archiveRequest.mutate()}
                  disabled={archiveRequest.isPending}
                >
                  <Archive className="mr-2 h-4 w-4" />
                  Archive request
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => deleteRequest.mutate()}
                  disabled={deleteRequest.isPending}
                  variant="destructive"
                >
                  <Trash className="mr-2 h-4 w-4" />
                  Delete request
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      >
        {/* Handler Executions Section */}
        {handlerExecutions && handlerExecutions.length > 0 && (
          <DataSection title="Handler Executions">
            {executionsLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : (
              <div className="space-y-2">
                {handlerExecutions.map((execution) => (
                  <HandlerExecutionItem
                    key={execution.id}
                    execution={execution}
                  />
                ))}
              </div>
            )}
          </DataSection>
        )}
      </RequestEventDisplay>

      {/* Copy Request Modal */}
      {request && (
        <CopyRequestModal
          request={request}
          open={copyModalOpen}
          onOpenChange={setCopyModalOpen}
        />
      )}

      {/* Copy Response Modal */}
      {request && (
        <CopyResponseModal
          request={request}
          open={copyResponseModalOpen}
          onOpenChange={setCopyResponseModalOpen}
        />
      )}
    </>
  );
};
