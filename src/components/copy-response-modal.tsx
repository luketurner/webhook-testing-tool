import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { RequestEvent } from "@/request-events/schema";
import { headerNameDisplay } from "@/util/http";
import { Check, Copy } from "lucide-react";
import { useState } from "react";

interface CopyResponseModalProps {
  request: RequestEvent;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CopyResponseModal = ({
  request,
  open,
  onOpenChange,
}: CopyResponseModalProps) => {
  const [copied, setCopied] = useState(false);

  const responseBody = request.response_body ? atob(request.response_body) : "";
  const responseHeaders = request.response_headers || [];

  const generateRawResponse = () => {
    let rawResponse = `HTTP/1.1 ${request.response_status || 200} ${
      request.response_status_message || "OK"
    }\r\n`;

    // Add headers
    responseHeaders.forEach(([name, value]) => {
      rawResponse += `${headerNameDisplay(name)}: ${value}\r\n`;
    });

    // Add body if present
    if (responseBody) {
      rawResponse += `\r\n${responseBody}`;
    } else {
      rawResponse += "\r\n";
    }

    return rawResponse;
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generateRawResponse());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Copy Response As Raw HTTP</DialogTitle>
          <DialogDescription>
            Copy the response in raw HTTP format
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <div className="relative">
            <pre className="whitespace-pre-wrap break-all bg-muted p-4 rounded-lg overflow-x-auto text-sm">
              <code>{generateRawResponse()}</code>
            </pre>
            <Button
              size="sm"
              variant="outline"
              className="absolute top-2 right-2"
              onClick={handleCopy}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-1" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-1" />
                  Copy
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
