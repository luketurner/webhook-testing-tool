export type ResourceFetcherAction =
  | "list"
  | "get"
  | "create"
  | "update"
  | "delete";

export type Resource = Record<string, any>;

export type ResourceType =
  | "requests"
  | "handlers"
  | "handler-executions"
  | "tcp-connections"
  | "tcp-handlers";

export interface ResourceFetcherOptions {
  action: ResourceFetcherAction;
  type: ResourceType;
  id?: string;
  resource?: Resource;
}
