import prettier from "prettier/standalone";
import htmlPlugin from "prettier/plugins/html";

// AIDEV-NOTE: Utility function to format XML/HTML content with proper indentation using prettier HTML formatter
export async function formatXml(xml: string): Promise<string> {
  try {
    // Use prettier HTML formatter for both XML and HTML content
    return await prettier.format(xml, {
      parser: "html",
      printWidth: 80,
      tabWidth: 2,
      useTabs: false,
      htmlWhitespaceSensitivity: "css",
      plugins: [htmlPlugin],
    });
  } catch (e) {
    // If formatting fails, return the original
    return xml;
  }
}

// Detect if content is likely XML or HTML based on content
export function isXmlOrHtml(content: string): boolean {
  const trimmed = content.trim();
  // Check for common XML/HTML patterns
  return (
    trimmed.startsWith("<?xml") ||
    trimmed.startsWith("<!DOCTYPE") ||
    trimmed.startsWith("<html") ||
    (trimmed.startsWith("<") && trimmed.endsWith(">"))
  );
}

// Determine content type from MIME type
export function getContentFormat(
  contentType: string | undefined,
  content: string,
): "json" | "xml" | "html" | "unknown" {
  const lowerContentType = contentType?.toLowerCase() || "";

  // Check MIME type first
  if (
    lowerContentType.includes("application/json") ||
    lowerContentType.includes("text/json")
  ) {
    return "json";
  }
  if (
    lowerContentType.includes("application/xml") ||
    lowerContentType.includes("text/xml") ||
    lowerContentType.includes("+xml")
  ) {
    return "xml";
  }
  if (
    lowerContentType.includes("text/html") ||
    lowerContentType.includes("application/xhtml")
  ) {
    return "html";
  }

  // If no content type, try to detect from content
  try {
    JSON.parse(content);
    return "json";
  } catch {
    if (isXmlOrHtml(content)) {
      // Try to distinguish between XML and HTML
      if (
        content.toLowerCase().includes("<!doctype html") ||
        content.toLowerCase().includes("<html")
      ) {
        return "html";
      }
      return "xml";
    }
  }

  return "unknown";
}
