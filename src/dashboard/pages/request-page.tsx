import { CopyRequestModal } from "@/components/copy-request-modal";
import { DataSection } from "@/components/data-section";
import { DateDisplay } from "@/components/date-display";
import { HeadersTable } from "@/components/display/headers-table";
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
import { Copy, MoreHorizontal, RotateCcw } from "lucide-react";
import { useState } from "react";
import { useParams } from "react-router";

export const RequestPage = () => {
  const { id } = useParams();
  const { data: request, isLoading: requestLoading } =
    useResource<RequestEvent>("requests", id);
  const { data: handlerExecutions, isLoading: executionsLoading } =
    useHandlerExecutions<HandlerExecution>(id || "");
  const sendRequest = useSendRequest();
  const [copyModalOpen, setCopyModalOpen] = useState(false);

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
                  <DropdownMenuItem onClick={() => setCopyModalOpen(true)}>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy as...
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
    </div>
  );
};
