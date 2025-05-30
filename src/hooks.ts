import useSWRMutation from "swr/mutation";
import useSWR, { useSWRConfig } from "swr";
import { useCallback } from "react";

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

export interface ResourceFetcherParameters {
  resource?: Resource;
}

export async function resourceFetcher(
  { action, type, id }: ResourceFetcherOptions,
  { arg }: { arg: ResourceFetcherParameters } = { arg: {} }
) {
  const url =
    action === "list" || action === "create"
      ? `/api/${type}`
      : `/api/${type}/${id}`;
  let init: RequestInit | undefined = undefined;
  switch (action) {
    case "create":
      init = { method: "POST", body: JSON.stringify(arg.resource) };
      break;
    case "update":
      init = { method: "PUT", body: JSON.stringify(arg.resource) };
      break;
    case "delete":
      init = { method: "DELETE" };
      break;
  }
  const resp = await fetch(url, init);
  return await resp.json();
}

export function useResource<T>(type: ResourceType, id: string | number) {
  return useSWR<T>({ id, action: "get", type });
}

export function useResourceList<T>(type: ResourceType) {
  return useSWR<T[]>({ action: "list", type });
}

export function useResourceCreator(type: ResourceType) {
  const { mutate } = useSWRConfig();

  const stuff = useSWRMutation(
    { type, action: "create" as ResourceFetcherAction },
    resourceFetcher
  );
  const trigger = useCallback(
    async (...args) => {
      await stuff.trigger(...args);
      mutate({ type, action: "list" });
    },
    [stuff.trigger]
  );
  return { ...stuff, trigger };
}

export function useResourceUpdater(type: ResourceType, id: string) {
  const { mutate } = useSWRConfig();

  const stuff = useSWRMutation(
    { type, id, action: "update" as ResourceFetcherAction },
    resourceFetcher
  );
  const trigger = useCallback(
    async (...args) => {
      await stuff.trigger(...args);
      mutate({ type, action: "list" });
      mutate({ type, action: "get", id });
    },
    [stuff.trigger]
  );
  return { ...stuff, trigger };
}

export function useResourceDeleter(type: ResourceType, id: string) {
  const { mutate } = useSWRConfig();

  const stuff = useSWRMutation(
    { type, id, action: "delete" as ResourceFetcherAction },
    resourceFetcher
  );
  const trigger = useCallback(
    async (...args) => {
      await stuff.trigger(...args);
      mutate({ type, action: "list" });
      mutate({ type, action: "get", id });
    },
    [stuff.trigger]
  );
  return { ...stuff, trigger };
}
