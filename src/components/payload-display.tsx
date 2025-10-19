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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Download, FileText, Package, Maximize2, Copy } from "lucide-react";
import { useState, useEffect } from "react";
import { getExtensionFromMimeType } from "@/util/mime";
import { QueryParamsTable } from "@/components/display/query-params-table";
import type { KVList } from "@/util/kv-list";
import { formatXml, getContentFormat } from "@/util/xml";
import { cn } from "@/util/ui";

const ENCODINGS = [
  { value: "utf8", label: "UTF-8" },
  { value: "ascii", label: "ASCII" },
  { value: "latin1", label: "Latin-1" },
  { value: "base64", label: "Base64" },
  { value: "hex", label: "Hex" },
  { value: "binary", label: "Binary" },
];

interface MultipartPart {
  headers: KVList<string>;
  content: string;
  name?: string;
  filename?: string;
}

// Parse multipart/form-data content
const parseMultipartData = (
  content: string,
  boundary: string,
): MultipartPart[] => {
  const parts: MultipartPart[] = [];
  const boundaryMarker = `--${boundary}`;

  // Split by boundary markers
  const sections = content.split(boundaryMarker);

  for (const section of sections) {
    const trimmed = section.trim();
    if (!trimmed || trimmed === "--" || trimmed.startsWith("--")) continue;

    // Find the double CRLF that separates headers from body
    const headerBodySeparator = trimmed.indexOf("\r\n\r\n");
    if (headerBodySeparator === -1) continue;

    const headerSection = trimmed.substring(0, headerBodySeparator);
    const bodySection = trimmed.substring(headerBodySeparator + 4);

    // Parse headers
    const headers: KVList<string> = [];
    const headerLines = headerSection.split("\r\n");

    let name: string | undefined;
    let filename: string | undefined;

    for (const line of headerLines) {
      if (!line.trim()) continue;

      const colonIndex = line.indexOf(":");
      if (colonIndex === -1) continue;

      const headerName = line.substring(0, colonIndex).trim();
      const headerValue = line.substring(colonIndex + 1).trim();

      headers.push([headerName, headerValue]);

      // Extract name and filename from Content-Disposition header
      if (headerName.toLowerCase() === "content-disposition") {
        const nameMatch = headerValue.match(/name="([^"]+)"/);
        const filenameMatch = headerValue.match(/filename="([^"]+)"/);

        if (nameMatch) name = nameMatch[1];
        if (filenameMatch) filename = filenameMatch[1];
      }
    }

    parts.push({
      headers,
      content: bodySection,
      name,
      filename,
    });
  }

  return parts;
};

export const PayloadDisplay = ({
  content,
  title,
  requestId,
  contentType,
  isModal = false,
}: {
  content: string;
  title: string;
  requestId: string;
  contentType?: string;
  isModal?: boolean;
}) => {
  const [encoding, setEncoding] = useState("utf8");
  const [multipartView, setMultipartView] = useState<"parts" | "raw">("parts");
  const [modalOpen, setModalOpen] = useState(false);
  const [prettyContent, setPrettyContent] = useState<string | null>(null);
  const [isFormatting, setIsFormatting] = useState(false);
  const [syntaxLanguage, setSyntaxLanguage] = useState("json");

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

  // Determine content format
  const contentFormat = getContentFormat(contentType, decodedContent);

  // Handle async formatting
  useEffect(() => {
    const formatContent = async () => {
      setIsFormatting(true);
      try {
        switch (contentFormat) {
          case "json":
            setPrettyContent(
              JSON.stringify(JSON.parse(decodedContent), null, 2),
            );
            setSyntaxLanguage("json");
            break;
          case "xml":
            const formattedXml = await formatXml(decodedContent);
            setPrettyContent(formattedXml);
            setSyntaxLanguage("xml");
            break;
          case "html":
            const formattedHtml = await formatXml(decodedContent);
            setPrettyContent(formattedHtml);
            setSyntaxLanguage("html");
            break;
          default:
            setPrettyContent(null);
            break;
        }
      } catch (e) {
        setPrettyContent(null);
      } finally {
        setIsFormatting(false);
      }
    };

    formatContent();
  }, [decodedContent, contentFormat]);

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

  // Parse multipart data if content type matches
  let multipartData: MultipartPart[] | null = null;
  if (contentType?.includes("multipart/form-data")) {
    try {
      const boundaryMatch = contentType.match(/boundary=([^;]+)/);
      if (boundaryMatch) {
        const boundary = boundaryMatch[1].replace(/"/g, "");
        multipartData = parseMultipartData(decodedContent, boundary);
      }
    } catch (e) {
      // If parsing fails, multipartData remains null
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

  const handleCopy = () => {
    navigator.clipboard.writeText(decodedContent);
  };

  if (!content) {
    return <em>No {title.toLowerCase()}.</em>;
  }

  // Common action buttons component
  const ActionButtons = () => (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleCopy}
        className="flex items-center gap-1"
      >
        <Copy className="w-4 h-4" />
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleDownload}
        className="flex items-center gap-1"
        title="Download"
      >
        <Download className="w-4 h-4" />
      </Button>
      {!isModal && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-1"
          title="Open in modal"
        >
          <Maximize2 className="w-4 h-4" />
        </Button>
      )}
    </div>
  );

  // Main content to display
  let mainContent: React.ReactNode;

  // If multipart data exists and we're in parts view, show multipart display
  if (multipartData && multipartView === "parts") {
    mainContent = (
      <>
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-4">
            <h4 className="font-medium">
              Multipart Data ({multipartData.length} parts)
            </h4>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMultipartView("raw")}
              className="flex items-center gap-1"
            >
              <FileText className="w-4 h-4" />
              View Raw
            </Button>
          </div>
          <ActionButtons />
        </div>
        <div className="space-y-6">
          {multipartData.map((part, index) => (
            <div key={index} className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Package className="w-4 h-4" />
                <h5 className="font-medium">
                  Part {index + 1}
                  {part.name && ` - ${part.name}`}
                  {part.filename && ` (${part.filename})`}
                </h5>
              </div>

              {part.headers.length > 0 && (
                <div className="mb-3">
                  <QueryParamsTable
                    queryParams={part.headers}
                    title="Headers"
                  />
                </div>
              )}

              <div className="mt-3">
                <h6 className="font-medium mb-2">Content:</h6>
                <pre className="overflow-x-auto p-2 bg-muted rounded text-sm">
                  <code>{part.content}</code>
                </pre>
              </div>
            </div>
          ))}
        </div>
      </>
    );
  } else {
    // Regular (non-multipart) content
    mainContent = (
      <>
        <Tabs defaultValue="raw" className="w-full">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-4">
              <TabsList>
                <TabsTrigger value="raw">Raw</TabsTrigger>
                {(prettyContent || isFormatting) && (
                  <TabsTrigger value="pretty">Pretty</TabsTrigger>
                )}
              </TabsList>
              <div className="flex items-center gap-2">
                {multipartData && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setMultipartView("parts")}
                    className="flex items-center gap-1"
                  >
                    <Package className="w-4 h-4" />
                    View Parts
                  </Button>
                )}
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
            <ActionButtons />
          </div>
          <TabsContent value="raw">
            <pre
              className={cn("overflow-x-auto p-2 bg-muted rounded text-sm", {
                "text-wrap":
                  encoding === "hex" ||
                  encoding === "binary" ||
                  encoding === "base64",
                "break-all": encoding === "base64",
              })}
            >
              <code>{decodedContent}</code>
            </pre>
          </TabsContent>
          {(prettyContent || isFormatting) && (
            <TabsContent value="pretty">
              <div className="overflow-x-auto">
                {isFormatting ? (
                  <div className="p-4 text-center text-muted-foreground">
                    Formatting...
                  </div>
                ) : prettyContent ? (
                  <SyntaxHighlighter
                    language={syntaxLanguage}
                    className="text-sm"
                  >
                    {prettyContent}
                  </SyntaxHighlighter>
                ) : (
                  <div className="p-4 text-center text-muted-foreground">
                    Unable to format content
                  </div>
                )}
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
  }

  return (
    <>
      {mainContent}

      {!isModal && (
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="sm:max-w-6xl overflow-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>{title}</span>
              </DialogTitle>
            </DialogHeader>
            <PayloadDisplay
              content={content}
              title={title}
              requestId={requestId}
              contentType={contentType}
              isModal={true}
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};
