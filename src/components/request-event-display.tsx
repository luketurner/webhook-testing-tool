import { DateDisplay } from "@/components/date-display";
import { HeadersTable } from "@/components/display/headers-table";
import { QueryParamsTable } from "@/components/display/query-params-table";
import { TwoPaneLayout } from "@/components/layout/two-pane-layout";
import { PayloadDisplay } from "@/components/payload-display";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RequestEvent } from "@/request-events/schema";
import { findContentTypeHeader } from "@/util/mime";
import type { ReactNode } from "react";

interface RequestEventDisplayProps {
  request: RequestEvent;
  titleActions?: ReactNode;
  children?: ReactNode;
}

export const RequestEventDisplay = ({
  request,
  titleActions,
  children,
}: RequestEventDisplayProps) => {
  const requestBody = request.request_body ?? "";
  const responseBody = request.response_body ?? "";

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
            {titleActions}
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
            <div className="mt-2 text-sm">
              <span className="font-medium">Duration:</span>
              <span className="ml-2">
                {(request.response_timestamp ?? Date.now()) - request.request_timestamp}ms
              </span>
            </div>
            {request.response_status && (
              <div className="mt-2 text-sm">
                <span className="font-medium">Response Status:</span>
                <span className="ml-2">
                  {request.response_status} {request.response_status_message}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Additional content (e.g., handler executions) */}
      {children}

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
                <PayloadDisplay
                  content={requestBody}
                  title="request body"
                  requestId={request.id}
                  contentType={findContentTypeHeader(request.request_headers)}
                />
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
                <PayloadDisplay
                  content={responseBody}
                  title="response body"
                  requestId={request.id}
                  contentType={findContentTypeHeader(
                    request.response_headers ?? [],
                  )}
                />
              </div>
            </div>
          ),
        }}
      />
    </div>
  );
};
