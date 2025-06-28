import { cn } from "@/util/ui";

interface EmptyStateProps {
  message?: string;
  className?: string;
}

export function EmptyState({
  message = "No data available",
  className,
}: EmptyStateProps) {
  return (
    <div className={cn("text-center py-8 text-gray-500", className)}>
      <p className="text-sm">{message}</p>
    </div>
  );
}
