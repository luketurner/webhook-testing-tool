import { ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import { useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { DateDisplay } from "@/components/date-display";
import { Button } from "@/components/ui/button";
import { useResource } from "@/dashboard/hooks";
import type { TcpHandlerExecution } from "@/tcp-handler-executions/schema";
import type { TcpHandler } from "@/tcp-handlers/schema";
import { Link } from "react-router";

export const TcpHandlerExecutionItem = ({
  execution,
}: {
  execution: TcpHandlerExecution;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { data: handler } = useResource<TcpHandler>(
    "tcp-handlers",
    execution.handler_id,
  );

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 hover:bg-muted rounded">
        {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        {handler ? (
          <div className="flex items-center gap-2">
            <span className="font-medium">{handler.name}</span>
          </div>
        ) : (
          <span className="font-medium">{execution.handler_id}</span>
        )}
        <span
          className={`text-xs px-2 py-1 rounded ${
            execution.status === "success"
              ? "bg-green-100 text-green-800"
              : execution.status === "error"
                ? "bg-red-100 text-red-800"
                : "bg-yellow-100 text-yellow-800"
          }`}
        >
          {execution.status}
        </span>
        <span className="text-xs text-muted-foreground ml-auto">
          <DateDisplay timestamp={execution.timestamp} interactive={false} />
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent className="pl-6 pt-2">
        {/* Handler Execution Details */}
        <div className="mb-4 p-3 bg-muted/50 rounded">
          <div className="flex items-center justify-between mb-2">
            <h5 className="font-medium">Handler Execution Details</h5>
            {handler && (
              <Button asChild variant="ghost" size="sm">
                <Link to={`/tcp-handlers/${handler.id}`}>
                  <ExternalLink className="h-4 w-4 mr-1" />
                  View Handler
                </Link>
              </Button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="font-medium">Execution ID:</span>
              <span className="ml-2 font-mono text-xs">{execution.id}</span>
            </div>
            <div>
              <span className="font-medium">Execution Time:</span>
              <span className="ml-2">
                <DateDisplay
                  timestamp={execution.timestamp}
                  interactive={true}
                />
              </span>
            </div>
            <div>
              <span className="font-medium">Handler ID:</span>
              <span className="ml-2 font-mono text-xs">
                {execution.handler_id}
              </span>
            </div>
            <div>
              <span className="font-medium">Order:</span>
              <span className="ml-2">{execution.order}</span>
            </div>
          </div>
        </div>

        {execution.error_message && (
          <div className="mb-4">
            <h5 className="font-medium text-red-600 mb-1">Error Message</h5>
            <p className="text-sm bg-red-50 p-2 rounded">
              {execution.error_message}
            </p>
          </div>
        )}
        {execution.console_output && (
          <div className="mb-4">
            <h5 className="font-medium mb-1">Console Output</h5>
            <pre className="text-xs bg-slate-900 text-green-400 p-3 rounded overflow-x-auto font-mono">
              <code>{execution.console_output}</code>
            </pre>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
};
