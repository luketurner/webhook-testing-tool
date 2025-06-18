import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { HandlerRequest } from "../webhook-server/schema";

export type ResourceFetcherAction =
  | "list"
  | "get"
  | "create"
  | "update"
  | "delete";

export type Resource = Record<string, any>;

export type ResourceType = "requests" | "handlers";

export interface ResourceFetcherOptions {
  action: ResourceFetcherAction;
  type: ResourceType;
  id?: string;
  resource?: Resource;
}

export async function resourceFetcher(
  { action, type, id }: ResourceFetcherOptions,
  resource?: Resource
) {
  const url =
    action === "list" || action === "create"
      ? `/api/${type}`
      : `/api/${type}/${id}`;
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

export function useResourceList<T>(type: ResourceType) {
  return useQuery<T[]>({
    queryKey: [type],
    queryFn: () => resourceFetcher({ action: "list", type }),
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

export function useSendDemoRequests() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await fetch("/api/requests/seed", {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requests"] });
    },
  });
}

export function useSendRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: HandlerRequest) => {
      const requestPromise = fetch("/api/requests/send", {
        method: "POST",
        body: JSON.stringify(request),
      });
      toast.promise(requestPromise, {
        loading: "Sending request...",
        success: (resp) => {
          return {
            message: `Request succeeded!`,
            description: `${resp.status} ${resp.statusText}`,
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
