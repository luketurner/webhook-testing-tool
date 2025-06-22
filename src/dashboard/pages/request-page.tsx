import { useResource, useHandlerExecutions } from "@/dashboard/hooks";
import { useParams } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
  TableHead,
  TableHeader,
} from "@/components/ui/table";
import { AuthorizationInspector } from "@/components/authorization-inspector";
import { PayloadDisplay } from "@/components/payload-display";
import { HandlerExecutionItem } from "@/components/handler-execution-item";
import { headerNameDisplay } from "@/util/http";
import type { RequestEvent } from "@/request-events/schema";
import type { HandlerExecution } from "@/handler-executions/schema";

export const RequestPage = () => {
  const { id } = useParams();
  const { data: request, isLoading: requestLoading } =
    useResource<RequestEvent>("requests", id);
  const { data: handlerExecutions, isLoading: executionsLoading } =
    useHandlerExecutions<HandlerExecution>(id || "");

  const requestBody = atob(request?.request_body ?? "");
  const responseBody = atob(request?.response_body ?? "");

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
            <span
              className={`text-xs px-2 py-1 rounded ${
                request.status === "complete"
                  ? "bg-green-100 text-green-800"
                  : request.status === "error"
                    ? "bg-red-100 text-red-800"
                    : "bg-yellow-100 text-yellow-800"
              }`}
            >
              {request.status}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Request Time:</span>
              <span className="ml-2">
                {request.request_timestamp &&
                  new Date(request.request_timestamp * 1000).toLocaleString(
                    undefined,
                    {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    },
                  )}
              </span>
            </div>
            <div>
              <span className="font-medium">Response Time:</span>
              <span className="ml-2">
                {request.response_timestamp
                  ? new Date(request.response_timestamp * 1000).toLocaleString(
                      undefined,
                      {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      },
                    )
                  : "N/A"}
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
        <Card>
          <CardHeader>
            <CardTitle>Handler Executions</CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      )}

      {/* Two-pane Request/Response Layout */}
      <div className="grid grid-cols-2 gap-6">
        {/* Request Pane */}
        <Card>
          <CardHeader>
            <CardTitle>Request</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Request Headers */}
            <div>
              <h4 className="font-medium mb-2">Headers</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(request.request_headers ?? []).map(([k, v]) => (
                    <TableRow key={k}>
                      <TableCell className="font-mono text-xs">
                        {headerNameDisplay(k)}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {v}{" "}
                        {k === "authorization" ? (
                          <AuthorizationInspector value={v as string} />
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Request Body */}
            <div>
              <h4 className="font-medium mb-2">Body</h4>
              <PayloadDisplay content={requestBody} title="request body" />
            </div>
          </CardContent>
        </Card>

        {/* Response Pane */}
        <Card>
          <CardHeader>
            <CardTitle>Response</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Response Headers */}
            <div>
              <h4 className="font-medium mb-2">Headers</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(request.response_headers ?? []).map(([k, v]) => (
                    <TableRow key={k}>
                      <TableCell className="font-mono text-xs">
                        {headerNameDisplay(k)}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{v}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Response Body */}
            <div>
              <h4 className="font-medium mb-2">Body</h4>
              <PayloadDisplay content={responseBody} title="response body" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
