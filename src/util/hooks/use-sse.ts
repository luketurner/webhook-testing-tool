import { createContext, useContext, useEffect, useRef, useState } from "react";

export interface SSEEvent {
  type:
    | "connected"
    | "request:created"
    | "request:updated"
    | "request:archived"
    | "request:unarchived"
    | "request:deleted"
    | "ping"
    | "tcp_connection:created"
    | "tcp_connection:updated"
    | "tcp_connection:closed"
    | "tcp_connection:failed"
    | "tcp_connection:archived"
    | "tcp_connection:unarchived"
    | "tcp_connection:deleted";
  payload?: {
    id: string;
    status?: string;
  };
}

export interface SSEOptions {
  url: string;
  onEvent?: (event: SSEEvent) => void;
  onError?: (error: Event) => void;
  reconnectDelay?: number;
  maxReconnectAttempts?: number;
}

export type SSEConnectionState =
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

export interface SSEState {
  connectionState: SSEConnectionState;
  lastEvent: SSEEvent;
}

// AIDEV-NOTE: Custom hook for consuming Server-Sent Events with authentication and reconnection
export function useSSE(options: SSEOptions): SSEState {
  const [connectionState, setConnectionState] =
    useState<SSEConnectionState>("disconnected");
  const [lastEvent, setLastEvent] = useState<SSEEvent | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);

  const {
    url,
    onEvent,
    onError,
    reconnectDelay = 5000,
    maxReconnectAttempts = 5,
  } = options;

  const connect = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    setConnectionState("connecting");

    // Create EventSource
    // Note: EventSource doesn't support custom headers directly
    // The server should handle auth via cookies or we embed auth in URL for simplicity
    const eventSource = new EventSource(url);

    eventSource.onopen = () => {
      console.log("SSE connection opened");
      setConnectionState("connected");
      reconnectAttemptsRef.current = 0;
    };

    eventSource.onmessage = (event) => {
      try {
        const data: SSEEvent = JSON.parse(event.data);
        setLastEvent(data);
        onEvent?.(data);
      } catch (error) {
        console.error("Failed to parse SSE event:", error);
      }
    };

    eventSource.onerror = (error) => {
      console.error("SSE error:", error);
      onError?.(error);

      // Check if connection is closed
      if (eventSource.readyState === EventSource.CLOSED) {
        setConnectionState("disconnected");

        // Attempt to reconnect
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          console.log(
            `Attempting to reconnect... (${reconnectAttemptsRef.current}/${maxReconnectAttempts})`,
          );

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectDelay);
        } else {
          setConnectionState("error");
          console.error("Max reconnection attempts reached");
        }
      } else {
        setConnectionState("error");
      }
    };

    eventSourceRef.current = eventSource;
  };

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setConnectionState("disconnected");
    reconnectAttemptsRef.current = 0;
  };

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [url]);

  return {
    connectionState,
    lastEvent,
  };
}

export const SSEContext = createContext<SSEState>({
  connectionState: "disconnected",
  lastEvent: null,
});

export function useSSEContext() {
  return useContext(SSEContext);
}
