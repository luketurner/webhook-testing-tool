import { useResource } from "@/dashboard/hooks";
import { useParams, useNavigate } from "react-router";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { Button } from "@/components/ui/button";
import { Trash2, ArrowLeft, Network } from "lucide-react";
import { DataSection } from "@/components/data-section";
import { StatusBadge } from "@/components/status-badge";
import { DateDisplay } from "@/components/date-display";
import { PayloadDisplay } from "@/components/payload-display";
import type { TcpConnection } from "@/tcp-connections/schema";

export const TcpConnectionPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    data: connection,
    isLoading,
    error,
  } = useResource<TcpConnection>("tcp-connections", id || "");

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (error || !connection) {
    return (
      <div className="p-6 space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/")}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Button>
        <div className="text-center text-muted-foreground">
          {error ? "Failed to load connection" : "Connection not found"}
        </div>
      </div>
    );
  }

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this connection?")) {
      return;
    }

    try {
      await fetch(`/api/tcp-connections/${id}`, { method: "DELETE" });
      navigate("/");
    } catch (error) {
      console.error("Failed to delete connection:", error);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div className="flex items-center gap-2">
            <Network className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-2xl font-bold">TCP Connection</h1>
          </div>
        </div>
        <Button variant="destructive" size="sm" onClick={handleDelete}>
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DataSection title="Connection Information">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Status</span>
              <StatusBadge status={connection.status} />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Client</span>
              <span className="text-sm font-mono">
                {connection.client_ip}:{connection.client_port}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Server</span>
              <span className="text-sm font-mono">
                {connection.server_ip}:{connection.server_port}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Opened</span>
              <DateDisplay timestamp={connection.open_timestamp} />
            </div>
            {connection.closed_timestamp && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Closed</span>
                <DateDisplay timestamp={connection.closed_timestamp} />
              </div>
            )}
          </div>
        </DataSection>

        <DataSection title="Connection Statistics">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                Data Received
              </span>
              <span className="text-sm">
                {connection.received_data ? connection.received_data.length : 0}{" "}
                bytes
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Data Sent</span>
              <span className="text-sm">
                {connection.sent_data ? connection.sent_data.length : 0} bytes
              </span>
            </div>
            {connection.open_timestamp && connection.closed_timestamp && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Duration</span>
                <span className="text-sm">
                  {(connection.closed_timestamp ?? Date.now()) -
                    connection.open_timestamp}
                  ms
                </span>
              </div>
            )}
          </div>
        </DataSection>
      </div>

      {connection.received_data && (
        <DataSection title="Received Data">
          <PayloadDisplay
            content={connection.received_data || ""}
            title="Received Data"
            requestId={connection.id}
            contentType="text/plain"
          />
        </DataSection>
      )}

      {connection.sent_data && (
        <DataSection title="Sent Data">
          <PayloadDisplay
            content={connection.sent_data || ""}
            title="Sent Data"
            requestId={connection.id}
            contentType="text/plain"
          />
        </DataSection>
      )}
    </div>
  );
};
