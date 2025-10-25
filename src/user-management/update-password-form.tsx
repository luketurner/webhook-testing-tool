import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { passwordResetSchema, type PasswordResetInput } from "./schemas";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useState } from "react";

// T043: Password Reset Form Component
// T044: Form submit handler with loading state
// Uses React Hook Form with mode: "onBlur"
// Three fields: currentPassword, newPassword, confirmPassword

interface UpdatePasswordFormProps {
  onPasswordUpdated: () => void;
}

export function UpdatePasswordForm({
  onPasswordUpdated,
}: UpdatePasswordFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<PasswordResetInput>({
    resolver: zodResolver(passwordResetSchema),
    mode: "onBlur",
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(data: PasswordResetInput) {
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/user/password", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error || "Failed to update password");
        return;
      }

      toast.success("Password updated successfully");

      // Reset form
      form.reset();

      // Notify parent
      onPasswordUpdated();
    } catch (error) {
      toast.error("An unexpected error occurred");
      console.error("Password update error:", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="currentPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Current Password</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  placeholder="Enter current password"
                  {...field}
                  disabled={isSubmitting}
                  data-testid="current-password-input"
                />
              </FormControl>
              <FormDescription>
                Enter your current password for verification
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="newPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>New Password</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  placeholder="Enter new password"
                  {...field}
                  disabled={isSubmitting}
                  data-testid="new-password-input"
                />
              </FormControl>
              <FormDescription>
                Must be at least 8 characters. Supports unicode and emoji.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm New Password</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  placeholder="Confirm new password"
                  {...field}
                  disabled={isSubmitting}
                  data-testid="confirm-password-input"
                />
              </FormControl>
              <FormDescription>Re-enter your new password</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          disabled={isSubmitting || !form.formState.isDirty}
          data-testid="password-submit-button"
        >
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isSubmitting ? "Updating..." : "Update Password"}
        </Button>
      </form>
    </Form>
  );
}
