import { RequestEventDisplay } from "@/components/request-event-display";
import { Card, CardContent } from "@/components/ui/card";
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
    <RequestEventDisplay
      request={request}
      titleActions={
        <Badge variant="secondary" className="ml-auto">
          Shared View
        </Badge>
      }
    />
  );
};
