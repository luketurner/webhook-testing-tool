import { DataSection } from "@/components/data-section";
import { HeadersTable } from "@/components/display/headers-table";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Http2Info, Http2Settings } from "@/request-events/http2-info";

const SETTING_KEYS: (keyof Http2Settings)[] = [
  "headerTableSize",
  "enablePush",
  "initialWindowSize",
  "maxConcurrentStreams",
  "maxFrameSize",
  "maxHeaderListSize",
  "enableConnectProtocol",
];

function formatSetting(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}

interface Http2InfoSectionProps {
  info: Http2Info;
}

export function Http2InfoSection({ info }: Http2InfoSectionProps) {
  return (
    <DataSection title="HTTP/2">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Badge variant="secondary">ALPN: {info.alpn_protocol}</Badge>
          <Badge variant="outline">Stream {info.stream_id}</Badge>
          {typeof info.weight === "number" && (
            <Badge variant="outline">Weight {info.weight}</Badge>
          )}
          {info.headers_frame_flags.end_stream && <Badge>END_STREAM</Badge>}
          {info.headers_frame_flags.end_headers && <Badge>END_HEADERS</Badge>}
        </div>

        <HeadersTable
          headers={info.pseudo_headers}
          title="Pseudo-headers"
          showAuthInspector={false}
        />

        <div>
          <h4 className="font-medium mb-2">Settings</h4>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Setting</TableHead>
                <TableHead>Local</TableHead>
                <TableHead>Remote</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {SETTING_KEYS.map((key) => (
                <TableRow key={key}>
                  <TableCell className="font-mono text-xs">{key}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {formatSetting(info.local_settings[key])}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {formatSetting(info.remote_settings[key])}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </DataSection>
  );
}
