import { useResource, useHandlerExecutions } from "@/dashboard/hooks";
import { ExpandIcon, ChevronDown, ChevronRight } from "lucide-react";
import { useParams } from "react-router";
import { useState } from "react";
import SyntaxHighlighter from "react-syntax-highlighter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
  TableHead,
  TableHeader,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  parseAuthorizationHeader,
  isBasicAuth,
  isDigestAuth,
  isGenericBearerAuth,
  isJWTAuth,
} from "@/util/authorization";
import { headerNameDisplay } from "@/util/http";
import type { RequestEvent } from "@/request-events/schema";
import type { HandlerExecution } from "@/handler-executions/schema";

const AuthorizationInspector = ({ value }: { value: string }) => {
  const parsed = parseAuthorizationHeader(value);
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="size-8">
          <ExpandIcon />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isBasicAuth(parsed)
              ? "Basic"
              : isDigestAuth(parsed)
                ? "Digest"
                : isGenericBearerAuth(parsed)
                  ? "Bearer"
                  : isJWTAuth(parsed)
                    ? "JWT"
                    : "Unrecognized"}{" "}
            Authorization
          </DialogTitle>
          <DialogDescription>
            Details about the Authorization header
          </DialogDescription>
        </DialogHeader>
        {isBasicAuth(parsed) ? (
          <Table>
            <TableBody>
              <TableRow>
                <TableCell>Raw Header</TableCell>
                <TableCell>{parsed.rawHeader}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Username</TableCell>
                <TableCell>{parsed.username}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Password</TableCell>
                <TableCell>{parsed.password}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        ) : isDigestAuth(parsed) ? (
          <Table>
            <TableBody>
              <TableRow>
                <TableCell>Raw Header</TableCell>
                <TableCell>{parsed.rawHeader}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        ) : isGenericBearerAuth(parsed) ? (
          <Table>
            <TableBody>
              <TableRow>
                <TableCell>Raw Header</TableCell>
                <TableCell>{parsed.rawHeader}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Token</TableCell>
                <TableCell>{parsed.token}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        ) : isJWTAuth(parsed) ? (
          <Table>
            <TableBody>
              <TableRow>
                <TableCell>Raw Header</TableCell>
                <TableCell>{parsed.rawHeader}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Headers</TableCell>
                <TableCell>
                  {parsed.headers
                    ? JSON.stringify(parsed.headers)
                    : parsed.decodedHeaders || parsed.rawHeaders}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Payload</TableCell>
                <TableCell>
                  {parsed.payload
                    ? JSON.stringify(parsed.payload)
                    : parsed.decodedPayload || parsed.rawPayload}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Signature</TableCell>
                <TableCell>{parsed.rawSignature}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        ) : (
          <Table>
            <TableBody>
              <TableRow>
                <TableCell>Raw Header</TableCell>
                <TableCell>{parsed.rawHeader}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        )}
        <DialogFooter>
          <DialogClose asChild>
            <Button>Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const PayloadDisplay = ({
  content,
  title,
}: {
  content: string;
  title: string;
}) => {
  let prettyContent: string | null = null;
  try {
    prettyContent = JSON.stringify(JSON.parse(content), null, 2);
  } catch (e) {}

  if (!content) {
    return <em>No {title.toLowerCase()}.</em>;
  }

  return (
    <Tabs defaultValue="raw" className="w-full">
      <TabsList>
        <TabsTrigger value="raw">Raw</TabsTrigger>
        {prettyContent && <TabsTrigger value="pretty">Pretty</TabsTrigger>}
      </TabsList>
      <TabsContent value="raw">
        <pre className="overflow-x-auto p-2 bg-muted rounded text-sm">
          <code>{content}</code>
        </pre>
      </TabsContent>
      {prettyContent && (
        <TabsContent value="pretty">
          <div className="overflow-x-auto">
            <SyntaxHighlighter language="json" className="text-sm">
              {prettyContent}
            </SyntaxHighlighter>
          </div>
        </TabsContent>
      )}
    </Tabs>
  );
};

const HandlerExecutionItem = ({
  execution,
}: {
  execution: HandlerExecution;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  let localsData = null;
  let responseData = null;

  try {
    localsData = execution.locals_data
      ? JSON.parse(execution.locals_data)
      : null;
  } catch (e) {}

  try {
    responseData = execution.response_data
      ? JSON.parse(execution.response_data)
      : null;
  } catch (e) {}

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 hover:bg-muted rounded">
        {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        <span className="font-medium">{execution.handler_id}</span>
        <span
          className={`text-xs px-2 py-1 rounded ${
            execution.status === "success"
              ? "bg-green-100 text-green-800"
              : execution.status === "error"
                ? "bg-red-100 text-red-800"
                : "bg-yellow-100 text-yellow-800"
          }`}
        >
          {execution.status}
        </span>
        <span className="text-xs text-muted-foreground ml-auto">
          {new Date(execution.timestamp * 1000).toLocaleString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          })}
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent className="pl-6 pt-2">
        {execution.error_message && (
          <div className="mb-4">
            <h5 className="font-medium text-red-600 mb-1">Error Message</h5>
            <p className="text-sm bg-red-50 p-2 rounded">
              {execution.error_message}
            </p>
          </div>
        )}
        {localsData && (
          <div className="mb-4">
            <h5 className="font-medium mb-1">Locals</h5>
            <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
              <code>{JSON.stringify(localsData, null, 2)}</code>
            </pre>
          </div>
        )}
        {responseData && (
          <div className="mb-4">
            <h5 className="font-medium mb-1">Response Data</h5>
            <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
              <code>{JSON.stringify(responseData, null, 2)}</code>
            </pre>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
};

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
                {request.request_timestamp && new Date(request.request_timestamp * 1000).toLocaleString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                })}
              </span>
            </div>
            <div>
              <span className="font-medium">Response Time:</span>
              <span className="ml-2">
                {request.response_timestamp ? new Date(request.response_timestamp * 1000).toLocaleString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                }) : "N/A"}
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
