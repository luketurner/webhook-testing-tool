import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { DateDisplay } from "@/components/date-display";
import type { HandlerExecution } from "@/handler-executions/schema";

export const HandlerExecutionItem = ({
  execution,
}: {
  execution: HandlerExecution;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  let localsData = null;
  let responseData = null;

  try {
    localsData = execution.locals_data
      ? JSON.parse(execution.locals_data)
      : null;
  } catch (e) {}

  try {
    responseData = execution.response_data
      ? JSON.parse(execution.response_data)
      : null;
  } catch (e) {}

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 hover:bg-muted rounded">
        {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        <span className="font-medium">{execution.handler_id}</span>
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
          <DateDisplay
            timestamp={execution.timestamp * 1000}
            interactive={false}
          />
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent className="pl-6 pt-2">
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
        {localsData && (
          <div className="mb-4">
            <h5 className="font-medium mb-1">Locals</h5>
            <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
              <code>{JSON.stringify(localsData, null, 2)}</code>
            </pre>
          </div>
        )}
        {responseData && (
          <div className="mb-4">
            <h5 className="font-medium mb-1">Response Data</h5>
            <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
              <code>{JSON.stringify(responseData, null, 2)}</code>
            </pre>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
};
