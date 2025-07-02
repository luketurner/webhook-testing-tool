import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { KVList } from "@/util/kv-list";

// AIDEV-NOTE: Query parameters table component for displaying query string parameters
// Similar to HeadersTable but without authorization inspection since query params
// don't contain auth tokens

interface QueryParamsTableProps {
  queryParams: KVList<string>;
  title?: string;
}

export function QueryParamsTable({
  queryParams,
  title,
}: QueryParamsTableProps) {
  if (queryParams.length === 0) {
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
          {queryParams.map(([key, value], index) => (
            <TableRow key={index}>
              <TableCell className="font-mono text-xs">{key}</TableCell>
              <TableCell className="font-mono text-xs">{value}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
