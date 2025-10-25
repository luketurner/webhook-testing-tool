import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/auth/session-provider";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { UpdateEmailForm } from "./update-email-form";
import { UpdatePasswordForm } from "./update-password-form";

// T017: User Management Page Component
// Displays user profile with email and account creation date
// Handles session expiration per FR-020, FR-021

interface UserProfile {
  success: boolean;
  user: {
    id: string;
    email: string;
    name: string;
    createdAt: number;
  };
}

async function fetchUserProfile(): Promise<UserProfile> {
  const response = await fetch("/api/user/profile", {
    credentials: "include",
  });

  if (!response.ok) {
    // AIDEV-NOTE: Session expiration handling (FR-020, FR-021)
    // When session expires, the API returns 401 or 500 with "Authentication required" error
    // The SessionProvider at the app level will automatically redirect to login
    // when session becomes invalid. This error will trigger a refetch of session state,
    // causing the SessionProvider to show the LoginForm fallback.
    const error = await response
      .json()
      .catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

export function UserManagementPage() {
  const { session, refetch: refetchSession } = useSession();
  const navigate = useNavigate();
  const [currentEmail, setCurrentEmail] = useState("");

  const {
    data: profile,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["user-profile"],
    queryFn: fetchUserProfile,
    retry: false,
    staleTime: 1 * 60 * 1000, // 1 minute
  });

  // Update currentEmail when profile loads
  useEffect(() => {
    if (profile?.user.email) {
      setCurrentEmail(profile.user.email);
    }
  }, [profile]);

  // FR-020, FR-021: Handle session expiration
  useEffect(() => {
    if (error) {
      // Trigger session refetch which will show login form if session expired
      refetchSession();
    }
  }, [error, refetchSession]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="mb-4">
          <h1 className="text-3xl font-bold mb-2">User Management</h1>
          <p className="text-muted-foreground">
            Manage your account settings and credentials
          </p>
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48 mt-2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 space-y-6">
        <div className="mb-4">
          <h1 className="text-3xl font-bold mb-2">User Management</h1>
          <p className="text-muted-foreground">
            Manage your account settings and credentials
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Error</CardTitle>
            <CardDescription>
              Failed to load user profile. Please try again.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {error instanceof Error ? error.message : "Unknown error"}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formattedDate = profile?.user.createdAt
    ? new Date(profile.user.createdAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Unknown";

  return (
    <div className="p-6 space-y-6">
      <div className="mb-4">
        <h1 className="text-3xl font-bold mb-2">User Management</h1>
        <p className="text-muted-foreground">
          Manage your account settings and credentials
        </p>
      </div>

      {/* T020: Profile Display UI */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>
            View your account details and registration date
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Name</label>
            <div className="p-3 bg-muted rounded-md" data-testid="user-name">
              {profile?.user.name}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Email Address</label>
            <div className="p-3 bg-muted rounded-md" data-testid="user-email">
              {profile?.user.email}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Account Created</label>
            <div
              className="p-3 bg-muted rounded-md"
              data-testid="user-created-at"
            >
              {formattedDate}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* T032: Email Update Form */}
      <Card>
        <CardHeader>
          <CardTitle>Update Email Address</CardTitle>
          <CardDescription>Change your account email address</CardDescription>
        </CardHeader>
        <CardContent>
          {profile && (
            <UpdateEmailForm
              currentEmail={currentEmail}
              onEmailUpdated={(newEmail) => {
                setCurrentEmail(newEmail);
                // Optionally refetch profile to update display
              }}
            />
          )}
        </CardContent>
      </Card>

      {/* T045: Password Reset Form */}
      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>Update your account password</CardDescription>
        </CardHeader>
        <CardContent>
          {profile && (
            <UpdatePasswordForm
              onPasswordUpdated={() => {
                // Password updated successfully
                // Session remains valid (no forced logout per requirements)
              }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
