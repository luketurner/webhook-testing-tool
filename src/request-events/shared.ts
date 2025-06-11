export type Headers = Record<string, number | string | string[]>;

export interface Request {
  method: string;
  url: string;
  headers: Headers;
  body: Uint8Array | Buffer | null;
  timestamp: Date;
}

export interface Response {
  status: number;
  statusMessage: string;
  headers: Headers;
  body: Uint8Array | Buffer | null;
  timestamp: Date;
}

export type RequestEventType = "inbound" | "outbound";
export type RequestEventStatus = "running" | "complete" | "error";

export interface HandlerExecution {
  handler: string;
  timestamp: number;
}

export interface RequestEvent {
  id: string;
  type: RequestEventType;
  status: RequestEventStatus;
  request: Request;
  response?: Response;
  handlers: HandlerExecution[];
}

export interface RequestClient extends Omit<Request, "body"> {
  body: string | null;
}

export interface ResponseClient extends Omit<Response, "body"> {
  body: string | null;
}

export interface RequestEventClient
  extends Omit<RequestEvent, "request" | "response"> {
  request: RequestClient;
  response?: ResponseClient;
}

export interface RequestEventMetadata {
  id: string;
  type: RequestEventType;
  status: RequestEventStatus;
  request: Pick<Request, "url" | "method" | "timestamp">;
  response?: Pick<Response, "status" | "timestamp">;
}
