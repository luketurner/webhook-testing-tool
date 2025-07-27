import "@/server-only";
import { EventEmitter } from "events";
import type { RequestEvent } from "@/request-events/schema";

// AIDEV-NOTE: Shared event emitter for cross-server communication between webhook and dashboard servers
export interface AppEvents {
  "request:created": (event: RequestEvent) => void;
  "request:updated": (event: RequestEvent) => void;
  tcp_connection: (data: { action: string; id: string }) => void;
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
