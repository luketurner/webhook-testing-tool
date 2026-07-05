import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface AuthorizedApplication {
  id: string;
  clientId: string;
  scopes: string[];
  createdAt: string | number;
  client: {
    client_id: string;
    client_name?: string;
    client_uri?: string;
  } | null;
}

async function fetchConsents(): Promise<AuthorizedApplication[]> {
  const response = await fetch("/api/oauth/consents", {
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error("Failed to load authorized applications");
  }
  return response.json();
}

async function revokeConsent(id: string): Promise<void> {
  const response = await fetch(`/api/oauth/consents/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error("Failed to revoke application access");
  }
}

export function AuthorizedApplications() {
  const queryClient = useQueryClient();

  const {
    data: consents,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["oauth-consents"],
    queryFn: fetchConsents,
    retry: false,
  });

  const revokeMutation = useMutation({
    mutationFn: revokeConsent,
    onSuccess: () => {
      toast.success("Application access revoked");
      queryClient.invalidateQueries({ queryKey: ["oauth-consents"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to revoke");
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Authorized Applications</CardTitle>
        <CardDescription>
          Applications you have granted access to via OAuth, such as MCP
          clients. Revoking access invalidates the application's tokens.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && <Skeleton className="h-10 w-full" />}
        {error && (
          <p className="text-sm text-red-600">
            {error instanceof Error ? error.message : "Failed to load"}
          </p>
        )}
        {consents && consents.length === 0 && (
          <p
            className="text-sm text-muted-foreground"
            data-testid="no-authorized-applications"
          >
            No applications have been authorized.
          </p>
        )}
        {consents?.map((consent) => (
          <div
            key={consent.id}
            className="flex items-center justify-between gap-4 p-3 bg-muted rounded-md"
            data-testid="authorized-application"
          >
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-medium truncate">
                {consent.client?.client_name || consent.clientId}
              </p>
              <div className="flex flex-wrap gap-1">
                {consent.scopes.map((scope) => (
                  <Badge key={scope} variant="secondary">
                    {scope}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Authorized {new Date(consent.createdAt).toLocaleDateString()}
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={revokeMutation.isPending}
                >
                  Revoke
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Revoke access?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {consent.client?.client_name || consent.clientId} will no
                    longer be able to access your account. It can request access
                    again later.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => revokeMutation.mutate(consent.id)}
                  >
                    Revoke access
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
