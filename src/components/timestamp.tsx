import { formatTimestamp } from "@/util/datetime";
import type { Timestamp } from "@/util/timestamp";

interface TimestampProps {
  timestamp: Timestamp | null | undefined;
  fallback?: string;
  className?: string;
}

export function Timestamp({
  timestamp,
  fallback = "N/A",
  className,
}: TimestampProps) {
  if (!timestamp) {
    return <span className={className}>{fallback}</span>;
  }

  return <span className={className}>{formatTimestamp(timestamp)}</span>;
}
