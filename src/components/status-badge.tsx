import { cn } from "@/util/ui";

type Status =
  | "complete"
  | "success"
  | "error"
  | "running"
  | "pending"
  | "active"
  | "closed"
  | "failed";

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

const statusStyles: Record<Status, string> = {
  complete: "bg-green-100 text-green-800",
  success: "bg-green-100 text-green-800",
  error: "bg-red-100 text-red-800",
  running: "bg-yellow-100 text-yellow-800",
  pending: "bg-gray-100 text-gray-800",
  active: "bg-blue-100 text-blue-800",
  closed: "bg-gray-100 text-gray-800",
  failed: "bg-red-100 text-red-800",
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "text-xs px-2 py-1 rounded",
        statusStyles[status] || statusStyles.pending,
        className,
      )}
    >
      {status}
    </span>
  );
}
