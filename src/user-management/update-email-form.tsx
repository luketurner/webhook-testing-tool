import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { emailUpdateSchema, type EmailUpdateInput } from "./schemas";
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

// T030: Email Update Form Component
// T031: Form submit handler with loading state
// Uses React Hook Form with mode: "onBlur" per FR-012a
// Handles loading state per FR-017, FR-018, FR-019

interface UpdateEmailFormProps {
  currentEmail: string;
  onEmailUpdated: (newEmail: string) => void;
}

export function UpdateEmailForm({
  currentEmail,
  onEmailUpdated,
}: UpdateEmailFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<EmailUpdateInput>({
    resolver: zodResolver(emailUpdateSchema),
    mode: "onBlur", // FR-012a: Validate on blur
    defaultValues: {
      email: currentEmail,
    },
  });

  async function onSubmit(data: EmailUpdateInput) {
    // FR-017: Disable button during processing
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/user/email", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        // FR-012: Error feedback
        toast.error(result.error || "Failed to update email");
        return;
      }

      // FR-011: Success feedback
      toast.success("Email updated successfully");

      // Update parent component
      onEmailUpdated(result.user.email);

      // Reset form to new email
      form.reset({ email: result.user.email });
    } catch (error) {
      toast.error("An unexpected error occurred");
      console.error("Email update error:", error);
    } finally {
      // FR-018: Re-enable button on completion
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>New Email Address</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="your.email@example.com"
                  {...field}
                  disabled={isSubmitting}
                  data-testid="email-input"
                />
              </FormControl>
              <FormDescription>
                Enter your new email address. You'll use this to log in.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          disabled={isSubmitting || !form.formState.isDirty}
          data-testid="email-submit-button"
        >
          {/* FR-019: Show loading indicator */}
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isSubmitting ? "Updating..." : "Update Email"}
        </Button>
      </form>
    </Form>
  );
}
