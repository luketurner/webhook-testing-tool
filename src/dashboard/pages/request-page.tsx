import { CopyRequestModal } from "@/components/copy-request-modal";
import { CopyResponseModal } from "@/components/copy-response-modal";
import { DataSection } from "@/components/data-section";
import { DateDisplay } from "@/components/date-display";
import { HeadersTable } from "@/components/display/headers-table";
import { QueryParamsTable } from "@/components/display/query-params-table";
import { HandlerExecutionItem } from "@/components/handler-execution-item";
import { TwoPaneLayout } from "@/components/layout/two-pane-layout";
import { PayloadDisplay } from "@/components/payload-display";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { formatTimestamp } from "@/util/datetime";
import { requestEventToHandlerRequest } from "@/webhook-server/schema";
import {
  Copy,
  MoreHorizontal,
  RotateCcw,
  Share,
  Link,
  Link2Off,
} from "lucide-react";
import { useState } from "react";
import { useParams } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export const RequestPage = () => {
  const { id } = useParams();
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
        const fullUrl = `${window.location.origin}${data.shareUrl}`;
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

  const requestBody = atob(request?.request_body ?? "");
  const responseBody = atob(request?.response_body ?? "");

  const handleResendRequest = (requestEvent: RequestEvent) => {
    const handlerRequest = requestEventToHandlerRequest(requestEvent);
    sendRequest.mutate(handlerRequest);
  };

  if (requestLoading) {
    return <Skeleton className="h-screen w-full" />;
  }

  if (!request) {
    return <div className="p-4">Request not found</div>;
  }

  return (
    <div className="p-4 space-y-6">
      {/* Header Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-4">
            <span className="font-mono text-lg">
              {request.request_method} {request.request_url}
            </span>
            <StatusBadge status={request.status} />
            <div className="ml-auto">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => handleResendRequest(request)}
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Resend request
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
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Request Time:</span>
              <span className="ml-2">
                <DateDisplay timestamp={request.request_timestamp} />
              </span>
            </div>
            <div>
              <span className="font-medium">Response Time:</span>
              <span className="ml-2">
                <DateDisplay timestamp={request.response_timestamp} />
              </span>
            </div>
          </div>
          {request.response_status && (
            <div className="mt-2 text-sm">
              <span className="font-medium">Response Status:</span>
              <span className="ml-2">
                {request.response_status} {request.response_status_message}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

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

      {/* Two-pane Request/Response Layout */}
      <TwoPaneLayout
        leftPane={{
          title: "Request",
          children: (
            <div className="space-y-4">
              <HeadersTable
                headers={request.request_headers ?? []}
                title="Headers"
                requestBody={requestBody}
              />
              <QueryParamsTable
                queryParams={request.request_query_params ?? []}
                title="Query Parameters"
              />
              <div>
                <h4 className="font-medium mb-2">Body</h4>
                <PayloadDisplay content={requestBody} title="request body" />
              </div>
            </div>
          ),
        }}
        rightPane={{
          title: "Response",
          children: (
            <div className="space-y-4">
              <HeadersTable
                headers={request.response_headers ?? []}
                title="Headers"
              />
              <div>
                <h4 className="font-medium mb-2">Body</h4>
                <PayloadDisplay content={responseBody} title="response body" />
              </div>
            </div>
          ),
        }}
      />

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
    </div>
  );
};
