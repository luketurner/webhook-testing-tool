import { cn } from "@/util/ui";
import { headerNameDisplay } from "@/util/http";

interface HttpResponseViewProps {
  status: number;
  statusText: string;
  headers: [string, string][];
  body: string; // base64-encoded
  className?: string;
}

function decodeBody(body: string): string {
  if (!body) return "";
  try {
    const bytes = Uint8Array.from(atob(body), (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return body;
  }
}

export function HttpResponseView({
  status,
  statusText,
  headers,
  body,
  className,
}: HttpResponseViewProps) {
  const decoded = decodeBody(body);
  return (
    <div className={cn("rounded-lg border p-4 space-y-3", className)}>
      <div className="text-sm font-medium">
        Response: {status} {statusText}
      </div>
      {headers.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs font-medium text-muted-foreground">
            Headers
          </div>
          <ul className="text-xs font-mono">
            {headers.map(([name, value], i) => (
              <li key={`${name}-${i}`}>
                {headerNameDisplay(name)}: {value}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="space-y-1">
        <div className="text-xs font-medium text-muted-foreground">Body</div>
        <pre className="text-xs font-mono whitespace-pre-wrap break-all rounded bg-muted p-2 overflow-x-auto">
          {decoded || "(empty)"}
        </pre>
      </div>
    </div>
  );
}
