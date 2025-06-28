import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import type { Session, SessionContextValue } from "@/types/auth";

const SessionContext = createContext<SessionContextValue | undefined>(
  undefined,
);

interface SessionProviderProps {
  children: ReactNode;
  fallback: ReactNode;
}

async function fetchSession(): Promise<Session | null> {
  const response = await fetch("/api/auth/session", {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch session");
  }

  const data = await response.json();
  return data.session;
}

export function SessionProvider({ children, fallback }: SessionProviderProps) {
  const {
    data: session,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["session"],
    queryFn: fetchSession,
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const contextValue: SessionContextValue = {
    session: session || null,
    isLoading,
    error: error as Error | null,
    refetch,
  };

  return (
    <SessionContext.Provider value={contextValue}>
      {isLoading ? <Skeleton /> : !session ? fallback : children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context;
}
