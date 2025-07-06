import { DataSection } from "@/components/data-section";
import { DateDisplay } from "@/components/date-display";
import { HeadersTable } from "@/components/display/headers-table";
import { QueryParamsTable } from "@/components/display/query-params-table";
import { TwoPaneLayout } from "@/components/layout/two-pane-layout";
import { PayloadDisplay } from "@/components/payload-display";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import type { RequestEvent } from "@/request-events/schema";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router";

const fetchSharedRequest = async (sharedId: string): Promise<RequestEvent> => {
  const response = await fetch(`/api/shared/${sharedId}`);
  if (!response.ok) {
    throw new Error("Request not found");
  }
  return response.json();
};

export const SharedRequestPage = () => {
  const { sharedId } = useParams();
  const {
    data: request,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["shared-request", sharedId],
    queryFn: () => fetchSharedRequest(sharedId!),
    enabled: !!sharedId,
  });

  const requestBody = atob(request?.request_body ?? "");
  const responseBody = atob(request?.response_body ?? "");

  if (isLoading) {
    return <Skeleton className="h-screen w-full" />;
  }

  if (error || !request) {
    return (
      <div className="p-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              Request not found or no longer shared
            </div>
          </CardContent>
        </Card>
      </div>
    );
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
            <Badge variant="secondary" className="ml-auto">
              Shared View
            </Badge>
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
    </div>
  );
};
