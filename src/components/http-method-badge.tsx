import { cn } from "@/util/ui";
import type { HttpMethod } from "@/util/http";

interface HttpMethodBadgeProps {
  method: HttpMethod;
  className?: string;
}

const methodStyles: Record<HttpMethod, string> = {
  GET: "bg-blue-100 text-blue-800",
  POST: "bg-green-100 text-green-800",
  PUT: "bg-yellow-100 text-yellow-800",
  PATCH: "bg-orange-100 text-orange-800",
  DELETE: "bg-red-100 text-red-800",
  HEAD: "bg-purple-100 text-purple-800",
  OPTIONS: "bg-gray-100 text-gray-800",
};

export function HttpMethodBadge({ method, className }: HttpMethodBadgeProps) {
  return (
    <span
      className={cn(
        "text-xs font-medium px-2 py-1 rounded",
        methodStyles[method] || "bg-gray-100 text-gray-800",
        className,
      )}
    >
      {method}
    </span>
  );
}
