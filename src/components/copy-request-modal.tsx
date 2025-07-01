import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { RequestEvent } from "@/request-events/schema";
import { useWebhookUrl } from "@/util/hooks/use-webhook-url";
import { Check, Copy } from "lucide-react";
import { useState } from "react";

interface CopyRequestModalProps {
  request: RequestEvent;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CopyRequestModal = ({
  request,
  open,
  onOpenChange,
}: CopyRequestModalProps) => {
  const [copiedTab, setCopiedTab] = useState<string | null>(null);
  const { getFullUrl } = useWebhookUrl();

  const requestBody = request.request_body ? atob(request.request_body) : "";
  const headers = request.request_headers || [];
  const fullUrl = getFullUrl(request.request_url);

  const generateCurlCommand = () => {
    let curlParts = [`curl -X ${request.request_method}`];

    // Add headers
    headers.forEach(([name, value]) => {
      curlParts.push(`  -H "${name}: ${value}"`);
    });

    // Add body if present
    if (requestBody) {
      const escapedBody = requestBody
        .replace(/"/g, '\\"')
        .replace(/\n/g, "\\n");
      curlParts.push(`  -d "${escapedBody}"`);
    }

    // Add URL
    curlParts.push(`  "${fullUrl}"`);

    return curlParts.join(" \\\n");
  };

  const generateFetchCode = () => {
    const fetchOptions: any = {
      method: request.request_method,
    };

    // Add headers if present
    if (headers.length > 0) {
      fetchOptions.headers = {};
      headers.forEach(([name, value]) => {
        fetchOptions.headers[name] = value;
      });
    }

    // Add body if present
    if (requestBody && request.request_method !== "GET") {
      fetchOptions.body = requestBody;
    }

    const optionsString = JSON.stringify(fetchOptions, null, 2);

    return `fetch("${fullUrl}", ${optionsString})
  .then(response => response.text())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));`;
  };

  const handleCopy = async (text: string, tab: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedTab(tab);
      setTimeout(() => setCopiedTab(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Copy Request As</DialogTitle>
          <DialogDescription>
            Choose a format to copy the request code
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="curl" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="curl">cURL</TabsTrigger>
            <TabsTrigger value="fetch">Fetch (Node.js)</TabsTrigger>
          </TabsList>

          <TabsContent value="curl" className="space-y-2">
            <div className="relative">
              <pre className="whitespace-pre-wrap break-all bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                <code>{generateCurlCommand()}</code>
              </pre>
              <Button
                size="sm"
                variant="outline"
                className="absolute top-2 right-2"
                onClick={() => handleCopy(generateCurlCommand(), "curl")}
              >
                {copiedTab === "curl" ? (
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
          </TabsContent>

          <TabsContent value="fetch" className="space-y-2">
            <div className="relative">
              <pre className="whitespace-pre-wrap break-all bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                <code>{generateFetchCode()}</code>
              </pre>
              <Button
                size="sm"
                variant="outline"
                className="absolute top-2 right-2"
                onClick={() => handleCopy(generateFetchCode(), "fetch")}
              >
                {copiedTab === "fetch" ? (
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
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
