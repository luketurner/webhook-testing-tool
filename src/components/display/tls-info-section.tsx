import { DataSection } from "@/components/data-section";
import { Badge } from "@/components/ui/badge";
import type { TLSInfo } from "@/request-events/schema";

interface TlsInfoSectionProps {
  info: TLSInfo;
}

export function TlsInfoSection({ info }: TlsInfoSectionProps) {
  const cert = info.peerCertificate;

  return (
    <DataSection title="TLS">
      <div className="space-y-3 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          {info.protocol && <Badge variant="secondary">{info.protocol}</Badge>}
          {info.cipher?.name && (
            <Badge variant="outline">{info.cipher.name}</Badge>
          )}
          {info.isSessionReused && (
            <Badge variant="outline">Session reused</Badge>
          )}
        </div>

        {cert && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="font-medium">Valid from:</span>
              <span className="ml-2 font-mono text-xs">
                {cert.valid_from ?? "—"}
              </span>
            </div>
            <div>
              <span className="font-medium">Valid to:</span>
              <span className="ml-2 font-mono text-xs">
                {cert.valid_to ?? "—"}
              </span>
            </div>
            <div className="col-span-2">
              <span className="font-medium">Fingerprint:</span>
              <span className="ml-2 font-mono text-xs break-all">
                {cert.fingerprint ?? "—"}
              </span>
            </div>
          </div>
        )}
      </div>
    </DataSection>
  );
}
