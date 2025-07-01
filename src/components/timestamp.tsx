import { formatTimestamp } from "@/util/datetime";
import type { Timestamp } from "@/util/timestamp";

interface TimestampProps {
  timestamp: Timestamp | null | undefined;
  fallback?: string;
  className?: string;
}

/**
 * @deprecated Use DateDisplay component instead for interactive date displays
 * AIDEV-NOTE: This component is kept for backward compatibility but new code should use DateDisplay
 */
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
