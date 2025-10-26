import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { HandlerRequest } from "../webhook-server/schema";
import type {
  Resource,
  ResourceType,
  ResourceFetcherOptions,
} from "@/types/api";

export async function resourceFetcher(
  {
    action,
    type,
    id,
    includeArchived,
  }: ResourceFetcherOptions & { includeArchived?: boolean },
  resource?: Resource,
) {
  let url = "";
  if (type === "handler-executions" && id) {
    url = `/api/requests/${id}/handler-executions`;
  } else if (type === "tcp-handler-executions" && id) {
    url = `/api/tcp-connections/${id}/handler-executions`;
  } else {
    url =
      action === "list" || action === "create"
        ? `/api/${type}`
        : `/api/${type}/${id}`;
  }

  // Add includeArchived query parameter for list actions
  if (action === "list" && includeArchived !== undefined) {
    url += `?includeArchived=${includeArchived}`;
  }

  let init: RequestInit | undefined = undefined;
  switch (action) {
    case "create":
      init = { method: "POST", body: JSON.stringify(resource) };
      break;
    case "update":
      init = { method: "PUT", body: JSON.stringify(resource) };
      break;
    case "delete":
      init = { method: "DELETE" };
      break;
  }
  const resp = await fetch(url, init);
  return await resp.json();
}

export function useResource<T>(type: ResourceType, id: string | number) {
  return useQuery<T>({
    queryKey: [type, id],
    queryFn: () => resourceFetcher({ action: "get", type, id: String(id) }),
  });
}

export function useResourceList<T>(
  type: ResourceType,
  options?: { includeArchived?: boolean },
) {
  const includeArchived = options?.includeArchived ?? false;
  return useQuery<T[]>({
    queryKey: [type, includeArchived ? "with-archived" : "active-only"],
    queryFn: () => resourceFetcher({ action: "list", type, includeArchived }),
  });
}

export function useResourceCreator(type: ResourceType) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (resource: Resource) =>
      resourceFetcher({ action: "create", type }, resource),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [type] });
    },
  });
}

export function useResourceUpdater(type: ResourceType, id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (resource: Resource) =>
      resourceFetcher({ action: "update", type, id }, resource),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [type] });
      queryClient.invalidateQueries({ queryKey: [type, id] });
    },
  });
}

export function useResourceDeleter(type: ResourceType, id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => resourceFetcher({ action: "delete", type, id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [type] });
      queryClient.invalidateQueries({ queryKey: [type, id] });
    },
  });
}

export function useSendRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: HandlerRequest) => {
      // Ensure body is base64-encoded
      let processedRequest = { ...request };
      if (request.body !== null && request.body !== undefined) {
        if (typeof request.body === "string") {
          // If it's already a valid base64 string, keep it; otherwise encode it
          try {
            // Test if it's valid base64 by trying to decode and re-encode
            const decoded = atob(request.body);
            const reencoded = btoa(decoded);
            if (reencoded !== request.body) {
              // Not valid base64, encode it
              processedRequest.body = btoa(request.body);
            }
          } catch {
            // Not valid base64, encode it
            processedRequest.body = btoa(request.body);
          }
        } else {
          // Convert non-string bodies to JSON and then base64
          processedRequest.body = btoa(JSON.stringify(request.body));
        }
      }

      const requestPromise = fetch("/api/requests/send", {
        method: "POST",
        body: JSON.stringify(processedRequest),
      });
      toast.promise(requestPromise, {
        loading: "Sending request...",
        success: async (resp) => {
          const webhookResponse = (await resp.json())?.response;
          return {
            message: `Request succeeded!`,
            description: `${webhookResponse.status} ${webhookResponse.statusText}`,
          };
        },
        error: (e) => {
          return {
            message: `Request failed!`,
            description: `Error: ${e}`,
          };
        },
      });
      return requestPromise;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requests"] });
    },
  });
}

export function useHandlerExecutions<T>(requestId: string) {
  return useQuery<T[]>({
    queryKey: ["handler-executions", requestId],
    queryFn: () =>
      resourceFetcher({
        action: "list",
        type: "handler-executions",
        id: requestId,
      }),
    enabled: !!requestId,
  });
}

export function useTcpHandlerExecutions<T>(connectionId: string) {
  return useQuery<T[]>({
    queryKey: ["tcp-handler-executions", connectionId],
    queryFn: () =>
      resourceFetcher({
        action: "list",
        type: "tcp-handler-executions",
        id: connectionId,
      }),
    enabled: !!connectionId,
  });
}

export function useManualPages() {
  return useQuery({
    queryKey: ["manual-pages"],
    queryFn: async (): Promise<string[]> => {
      const response = await fetch("/api/manual");
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
  });
}

export function useManualPage(pageName: string | null) {
  return useQuery({
    queryKey: ["manual-page", pageName],
    queryFn: async (): Promise<string> => {
      if (!pageName) {
        throw new Error("Page name is required");
      }

      const response = await fetch(`/api/manual/${pageName}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`Manual page '${pageName}' not found`);
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.text();
    },
    enabled: !!pageName,
  });
}

export interface ServerConfig {
  webhookPort: number;
  webhookSslPort: number;
  webhookSslEnabled: boolean;
  publicWebhookPort?: number;
  publicWebhookSslPort?: number;
  tcpPort: number;
  publicTcpPort?: number;
}

export function useServerConfig() {
  return useQuery({
    queryKey: ["server-config"],
    queryFn: async (): Promise<ServerConfig> => {
      const response = await fetch("/api/config");
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
  });
}

export function useServerUrls() {
  const { data: serverConfig } = useServerConfig();
  const hostname = window.location.hostname;

  const httpPort =
    serverConfig?.publicWebhookPort || serverConfig?.webhookPort || 80;
  const httpsPort =
    serverConfig?.publicWebhookSslPort || serverConfig?.webhookSslPort || 443;
  const tcpPort = serverConfig?.publicTcpPort || serverConfig?.tcpPort || 3000;

  const httpUrl = `http://${hostname}${httpPort == 80 ? "" : `:${httpPort}`}/`;
  const httpsUrl =
    serverConfig?.publicWebhookSslPort || serverConfig?.webhookSslEnabled
      ? `https://${hostname}${httpsPort == 443 ? "" : `:${httpsPort}`}/`
      : null;
  const tcpHost = `${hostname}:${tcpPort}`;

  const getFullUrl = (path: string) => {
    // use HTTPS if we can, otherwise fall back to HTTP
    const baseUrl = httpsUrl || httpUrl;
    // Ensure path doesn't start with /, since baseUrl ends with /
    const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
    return `${baseUrl}${normalizedPath}`;
  };

  return {
    httpUrl,
    httpsUrl,
    tcpHost,
    getFullUrl,
  };
}
