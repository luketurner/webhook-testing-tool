export interface User {
  id: string;
  email: string;
  name?: string;
}

export interface Session {
  user: User;
  sessionId: string;
  expiresAt: string;
}

export interface SessionContextValue {
  session: Session | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}
