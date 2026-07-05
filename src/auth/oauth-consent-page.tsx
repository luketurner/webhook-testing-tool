import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface PublicClient {
  client_id: string;
  client_name?: string;
  client_uri?: string;
  logo_uri?: string;
}

const SCOPE_DESCRIPTIONS: Record<string, string> = {
  openid: "Confirm your identity",
  profile: "Read your profile information",
  email: "Read your email address",
  offline_access: "Keep access when you are offline",
};

// The OAuth authorize endpoint redirects here (for both login and consent
// prompts) by string-concatenating the signed query onto the page URL. With
// hash routing the params usually land inside the fragment
// (/#/oauth/consent?...), but read the regular query string too in case a
// client or proxy rewrites the URL.
function getOAuthQuery(): URLSearchParams {
  const hash = window.location.hash;
  const hashQueryIndex = hash.indexOf("?");
  const hashQuery =
    hashQueryIndex >= 0 ? hash.slice(hashQueryIndex + 1) : undefined;
  const searchQuery = window.location.search.slice(1) || undefined;

  const params = new URLSearchParams(hashQuery ?? searchQuery ?? "");
  if (hashQuery && searchQuery) {
    for (const [key, value] of new URLSearchParams(searchQuery)) {
      if (!params.has(key)) params.append(key, value);
    }
  }
  return params;
}

async function fetchPublicClient(clientId: string): Promise<PublicClient> {
  const response = await fetch(
    `/api/auth/oauth2/public-client?client_id=${encodeURIComponent(clientId)}`,
    { credentials: "include" },
  );
  if (!response.ok) {
    throw new Error("Failed to load application details");
  }
  return response.json();
}

export function OAuthConsentPage() {
  // Captured once on mount; the signed query must be replayed verbatim
  const [oauthQuery] = useState(getOAuthQuery);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clientId = oauthQuery.get("client_id");
  const scopes = (oauthQuery.get("scope") ?? "").split(" ").filter(Boolean);

  const { data: client } = useQuery({
    queryKey: ["oauth-public-client", clientId],
    queryFn: () => fetchPublicClient(clientId!),
    enabled: !!clientId,
    retry: false,
  });

  const submitConsent = async (accept: boolean) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/oauth2/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ accept, oauth_query: oauthQuery.toString() }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          data.error_description || data.message || "Authorization failed",
        );
      }
      const redirectUri = data.url ?? data.redirect_uri;
      if (typeof redirectUri !== "string") {
        throw new Error("Authorization did not return a redirect URI");
      }
      window.location.href = redirectUri;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authorization failed");
      setIsSubmitting(false);
    }
  };

  if (!clientId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invalid authorization request</CardTitle>
            <CardDescription>
              This page handles application authorization requests, but the
              request parameters are missing. Start the authorization flow from
              the application you want to connect.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const clientName = client?.client_name || clientId;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md" data-testid="oauth-consent-card">
        <CardHeader>
          <CardTitle>Authorize application</CardTitle>
          <CardDescription>
            <span className="font-medium">{clientName}</span> is requesting
            access to your Webhook Testing Tool account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {client?.client_uri && (
            <p className="text-sm text-muted-foreground break-all">
              {client.client_uri}
            </p>
          )}
          <div className="space-y-2">
            <p className="text-sm font-medium">Requested permissions</p>
            {scopes.length > 0 ? (
              <ul className="space-y-1">
                {scopes.map((scope) => (
                  <li key={scope} className="flex items-center gap-2 text-sm">
                    <Badge variant="secondary">{scope}</Badge>
                    <span className="text-muted-foreground">
                      {SCOPE_DESCRIPTIONS[scope] ?? ""}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                Full access to the connected account
              </p>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            This grants the application access to the MCP server, including
            captured requests, TCP connections, and webhook handlers.
          </p>
          {error && <div className="text-sm text-red-600">{error}</div>}
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button
            className="flex-1"
            disabled={isSubmitting}
            onClick={() => submitConsent(true)}
            data-testid="oauth-consent-accept"
          >
            {isSubmitting ? "Authorizing..." : "Authorize"}
          </Button>
          <Button
            className="flex-1"
            variant="outline"
            disabled={isSubmitting}
            onClick={() => submitConsent(false)}
            data-testid="oauth-consent-deny"
          >
            Deny
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
