import "@/server-only";
import type { ServerHttp2Stream } from "node:http2";
import type { Http2Info, Http2Settings } from "@/request-events/http2-info";
import type { KVList } from "@/util/kv-list";
import { parseHeadersFrameFlags } from "./headers";

interface RawSettings {
  headerTableSize?: number;
  enablePush?: boolean;
  initialWindowSize?: number;
  maxConcurrentStreams?: number;
  maxFrameSize?: number;
  maxHeaderListSize?: number;
  enableConnectProtocol?: boolean;
}

interface AlpnSession {
  alpnProtocol?: string;
}

function toSettings(raw: RawSettings | undefined): Http2Settings {
  return {
    headerTableSize: raw?.headerTableSize ?? null,
    enablePush: raw?.enablePush ?? null,
    initialWindowSize: raw?.initialWindowSize ?? null,
    maxConcurrentStreams: raw?.maxConcurrentStreams ?? null,
    maxFrameSize: raw?.maxFrameSize ?? null,
    maxHeaderListSize: raw?.maxHeaderListSize ?? null,
    enableConnectProtocol: raw?.enableConnectProtocol ?? null,
  };
}

export function extractHttp2Info(
  stream: ServerHttp2Stream,
  pseudoHeaders: KVList<string>,
  flags: number,
): Http2Info {
  const session = stream.session;
  const alpn = (session as unknown as AlpnSession | undefined)?.alpnProtocol;

  return {
    alpn_protocol: alpn ?? "h2",
    stream_id: stream.id ?? 0,
    pseudo_headers: pseudoHeaders,
    weight: stream.state?.weight ?? null,
    headers_frame_flags: parseHeadersFrameFlags(flags),
    local_settings: toSettings(session?.localSettings),
    remote_settings: toSettings(session?.remoteSettings),
  };
}
