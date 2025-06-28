import { cn } from "@/util/ui";

interface ErrorMessageProps {
  message: string;
  variant?: "inline" | "alert";
  className?: string;
}

export function ErrorMessage({
  message,
  variant = "inline",
  className,
}: ErrorMessageProps) {
  if (variant === "alert") {
    return (
      <div
        className={cn(
          "bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md text-sm",
          className,
        )}
      >
        {message}
      </div>
    );
  }

  return <p className={cn("text-sm text-red-600", className)}>{message}</p>;
}
