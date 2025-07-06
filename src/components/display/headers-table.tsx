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
import { isSignatureHeader } from "@/util/authorization";

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
                {value}
                {showAuthInspector && key.toLowerCase() === "authorization" && (
                  <>
                    {" "}
                    <AuthorizationInspector
                      value={value}
                      requestBody={requestBody}
                    />
                  </>
                )}
                {showAuthInspector && isSignatureHeader(key) && (
                  <>
                    {" "}
                    <AuthorizationInspector
                      value={value}
                      headerName={key}
                      requestBody={requestBody}
                      isSignatureHeader={true}
                    />
                  </>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
