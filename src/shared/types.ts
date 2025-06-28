import { HTTP_METHODS } from "@/util/http";

export type HttpMethod = (typeof HTTP_METHODS)[number];

export type EntityId = string;

export interface ApiResponse<T = unknown> {
  status: "ok" | "error" | "deleted";
  data?: T;
  message?: string;
}

export type RequestStatus = "running" | "complete" | "error";

export type HandlerExecutionStatus = "running" | "success" | "error";
