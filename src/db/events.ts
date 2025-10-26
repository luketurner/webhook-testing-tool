import "@/server-only";
import { EventEmitter } from "events";
import type {
  RequestEvent,
  RequestEventMeta,
  RequestId,
} from "@/request-events/schema";
import type {
  TcpConnectionMeta,
  TcpConnectionId,
} from "@/tcp-connections/schema";

// AIDEV-NOTE: Shared event emitter for cross-server communication between webhook and dashboard servers
// Archive/delete event types added for real-time UI synchronization:
// - request:archived/unarchived - Emitted when requests are archived or unarchived (payload: RequestEventMeta)
// - request:deleted - Emitted when request is permanently deleted (payload: RequestId)
// - tcp_connection:archived/unarchived - Emitted for TCP connection archive state changes (payload: TcpConnectionMeta)
// - tcp_connection:deleted - Emitted when TCP connection is permanently deleted (payload: TcpConnectionId)
// Frontend React Query hooks listen to these events to invalidate caches and trigger refetches
export interface AppEvents {
  "request:created": (event: RequestEvent) => void;
  "request:updated": (event: RequestEvent) => void;
  "request:archived": (event: RequestEventMeta) => void;
  "request:unarchived": (event: RequestEventMeta) => void;
  "request:deleted": (id: RequestId) => void;
  tcp_connection: (data: { action: string; id: string }) => void;
  "tcp_connection:archived": (connection: TcpConnectionMeta) => void;
  "tcp_connection:unarchived": (connection: TcpConnectionMeta) => void;
  "tcp_connection:deleted": (id: TcpConnectionId) => void;
}

class TypedEventEmitter extends EventEmitter {
  emit<K extends keyof AppEvents>(
    event: K,
    ...args: Parameters<AppEvents[K]>
  ): boolean {
    return super.emit(event, ...args);
  }

  on<K extends keyof AppEvents>(event: K, listener: AppEvents[K]): this {
    return super.on(event, listener);
  }

  off<K extends keyof AppEvents>(event: K, listener: AppEvents[K]): this {
    return super.off(event, listener);
  }
}

export const appEvents = new TypedEventEmitter();

export function broadcastEvent<K extends keyof AppEvents>(
  event: K,
  ...args: Parameters<AppEvents[K]>
): void {
  appEvents.emit(event, ...args);
}
