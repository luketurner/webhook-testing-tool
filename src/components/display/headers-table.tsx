import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AuthorizationInspector } from "@/components/authorization-inspector";
import { headerNameDisplay } from "@/util/http";
import type { KVList } from "@/util/kv-list";
import { isSignatureHeader } from "@/util/hmac";
import { ExpandIcon } from "lucide-react";

// AIDEV-NOTE: Extracted headers table component to reduce duplication in request-page.tsx

interface HeadersTableProps {
  headers: KVList<string>;
  title?: string;
  showAuthInspector?: boolean;
  requestBody?: string;
}

export function HeadersTable({
  headers,
  title,
  showAuthInspector = true,
  requestBody,
}: HeadersTableProps) {
  if (headers.length === 0) {
    return null;
  }

  return (
    <div>
      {title && <h4 className="font-medium mb-2">{title}</h4>}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Value</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {headers.map(([key, value], index) => (
            <TableRow key={index}>
              <TableCell className="font-mono text-xs">
                {headerNameDisplay(key)}
              </TableCell>
              <TableCell className="font-mono text-xs">
                {showAuthInspector && key.toLowerCase() === "authorization" ? (
                  <AuthorizationInspector
                    value={value}
                    requestBody={requestBody}
                    trigger={
                      <span className="cursor-pointer hover:underline hover:bg-muted/50 rounded px-1 py-0.5 -mx-1 -my-0.5 transition-colors inline-flex items-center gap-1">
                        <ExpandIcon className="w-3 h-3 opacity-60" />
                        {value}
                      </span>
                    }
                  />
                ) : showAuthInspector && isSignatureHeader(key) ? (
                  <AuthorizationInspector
                    value={value}
                    headerName={key}
                    requestBody={requestBody}
                    isSignatureHeader={true}
                    trigger={
                      <span className="cursor-pointer hover:underline hover:bg-muted/50 rounded px-1 py-0.5 -mx-1 -my-0.5 transition-colors inline-flex items-center gap-1">
                        <ExpandIcon className="w-3 h-3 opacity-60" />
                        {value}
                      </span>
                    }
                  />
                ) : (
                  value
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
