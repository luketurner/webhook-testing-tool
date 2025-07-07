import SyntaxHighlighter from "react-syntax-highlighter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download } from "lucide-react";
import { useState } from "react";
import { getExtensionFromMimeType } from "@/util/mime";
import { QueryParamsTable } from "@/components/display/query-params-table";
import type { KVList } from "@/util/kv-list";

const ENCODINGS = [
  { value: "utf8", label: "UTF-8" },
  { value: "ascii", label: "ASCII" },
  { value: "latin1", label: "Latin-1" },
  { value: "base64", label: "Base64" },
  { value: "hex", label: "Hex" },
  { value: "binary", label: "Binary" },
];

export const PayloadDisplay = ({
  content,
  title,
  requestId,
  contentType,
}: {
  content: string;
  title: string;
  requestId: string;
  contentType?: string;
}) => {
  const [encoding, setEncoding] = useState("utf8");

  const getDecodedContent = () => {
    try {
      // First decode from base64 to get the raw bytes
      let rawContent: string;
      try {
        rawContent = atob(content);
      } catch {
        return "Invalid Base64 input data";
      }

      // Then apply the selected encoding interpretation
      switch (encoding) {
        case "utf8":
          return rawContent;
        case "ascii":
          // For ASCII, filter out non-ASCII characters and show them as replacement chars
          return rawContent.replace(/[^\x00-\x7F]/g, "�");
        case "latin1":
          // Latin-1 is a subset of Unicode, so we can display it directly
          return rawContent;
        case "base64":
          // Show the original base64 content
          return content;
        case "hex":
          // Convert raw bytes to hex representation
          return rawContent
            .split("")
            .map((char) => char.charCodeAt(0).toString(16).padStart(2, "0"))
            .join(" ");
        case "binary":
          // Show binary representation of each byte
          return rawContent
            .split("")
            .map((char) => char.charCodeAt(0).toString(2).padStart(8, "0"))
            .join(" ");
        default:
          return rawContent;
      }
    } catch (e) {
      return `Error decoding as ${encoding}: ${e}`;
    }
  };

  const decodedContent = getDecodedContent();

  let prettyContent: string | null = null;
  try {
    prettyContent = JSON.stringify(JSON.parse(decodedContent), null, 2);
  } catch (e) {}

  // Parse form-encoded data if content type matches
  let formData: KVList<string> | null = null;
  if (contentType?.includes("application/x-www-form-urlencoded")) {
    try {
      const params = new URLSearchParams(atob(content));
      formData = Array.from(params.entries());
    } catch (e) {
      // If parsing fails, formData remains null
    }
  }

  const handleDownload = () => {
    // Download the raw content (decoded from base64)
    let rawContent: string;
    try {
      rawContent = atob(content);
    } catch {
      rawContent = content; // fallback if not valid base64
    }

    const blob = new Blob([rawContent], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const extension = getExtensionFromMimeType(contentType || "");
    link.download = `${requestId}-${title.toLowerCase().replace(/\s+/g, "-")}${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!content) {
    return <em>No {title.toLowerCase()}.</em>;
  }

  return (
    <>
      <Tabs defaultValue="raw" className="w-full">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-4">
            <TabsList>
              <TabsTrigger value="raw">Raw</TabsTrigger>
              {prettyContent && (
                <TabsTrigger value="pretty">Pretty</TabsTrigger>
              )}
            </TabsList>
            <div className="flex items-center gap-2">
              <Select value={encoding} onValueChange={setEncoding}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ENCODINGS.map((enc) => (
                    <SelectItem key={enc.value} value={enc.value}>
                      {enc.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            className="flex items-center gap-1"
          >
            <Download className="w-4 h-4" />
            Download
          </Button>
        </div>
        <TabsContent value="raw">
          <pre className="overflow-x-auto p-2 bg-muted rounded text-sm">
            <code>{decodedContent}</code>
          </pre>
        </TabsContent>
        {prettyContent && (
          <TabsContent value="pretty">
            <div className="overflow-x-auto">
              <SyntaxHighlighter language="json" className="text-sm">
                {prettyContent}
              </SyntaxHighlighter>
            </div>
          </TabsContent>
        )}
      </Tabs>
      {formData && (
        <div className="mt-4">
          <QueryParamsTable queryParams={formData} title="Form Data" />
        </div>
      )}
    </>
  );
};
