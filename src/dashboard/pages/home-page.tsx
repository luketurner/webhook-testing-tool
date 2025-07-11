import { useResourceList, useServerConfig } from "@/dashboard/hooks";
import { useWebhookUrl } from "@/util/hooks/use-webhook-url";
import { DataSection } from "@/components/data-section";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Link } from "react-router";
import { Plus } from "lucide-react";
import type { RequestEventMeta } from "@/request-events/schema";
import type { Handler } from "@/handlers/schema";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";

export const HomePage = () => {
  const { data: requests } = useResourceList<RequestEventMeta>("requests");
  const { data: handlers } = useResourceList<Handler>("handlers");
  const { baseUrl } = useWebhookUrl();
  const { data: serverConfig } = useServerConfig();

  const recentRequests = requests?.slice(0, 5) || [];
  const activeHandlers =
    handlers?.filter((h) => h.code && h.code.trim() !== "") || [];

  return (
    <div className="p-6 space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Webhook Testing Tool</h1>
        <p className="text-muted-foreground">
          Test and debug HTTP requests with custom handlers
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DataSection title="Recent Requests">
          {recentRequests.length === 0 ? (
            <div className="space-y-4">
              <EmptyState message="No requests yet" />
              <Link to="/requests/new">
                <Button className="w-full">
                  <Plus className="mr-2 h-4 w-4" />
                  Send First Request
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {recentRequests.map((request) => (
                <Link
                  key={request.id}
                  to={`/requests/${request.id}`}
                  className="block p-3 rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      {request.request_method} {request.request_url}
                    </span>
                    <span
                      className={`text-xs ${
                        request.status === "complete"
                          ? "text-green-600"
                          : request.status === "error"
                            ? "text-red-600"
                            : "text-yellow-600"
                      }`}
                    >
                      {request.status}
                    </span>
                  </div>
                </Link>
              ))}
              <Link
                to="/requests"
                className="block text-center py-2 text-sm text-muted-foreground hover:text-foreground"
              >
                View all requests →
              </Link>
            </div>
          )}
        </DataSection>

        <DataSection title="Active Handlers">
          {activeHandlers.length === 0 ? (
            <div className="space-y-4">
              <EmptyState message="No active handlers" />
              <Link to="/handlers/new">
                <Button className="w-full">
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Handler
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {activeHandlers.map((handler) => (
                <Link
                  key={handler.id}
                  to={`/handlers/${handler.id}/edit`}
                  className="block p-3 rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{handler.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {handler.method} {handler.path}
                    </span>
                  </div>
                </Link>
              ))}
              <Link
                to="/handlers"
                className="block text-center py-2 text-sm text-muted-foreground hover:text-foreground"
              >
                View all handlers →
              </Link>
            </div>
          )}
        </DataSection>
      </div>

      <div className="mt-8 p-6 bg-muted rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Quick Start</h2>
        <div className="text-sm text-muted-foreground mb-4 max-w-lg">
          <Table>
            <TableBody>
              <TableRow>
                <TableCell>Webhook (HTTP)</TableCell>
                <TableCell>
                  {baseUrl.replace(/^https:/, "http:")}:
                  {serverConfig?.webhookPort}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Webhook (HTTPS)</TableCell>
                <TableCell>
                  {baseUrl}:{serverConfig?.webhookSslPort}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
        <div className="flex gap-2">
          <Link to="/requests/new">
            <Button variant="outline" size="sm">
              Send Test Request
            </Button>
          </Link>
          <Link to="/handlers/new">
            <Button variant="outline" size="sm">
              Create Handler
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
