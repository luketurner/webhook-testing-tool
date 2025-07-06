/**
 * Map of MIME types to file extensions
 */
const MIME_TO_EXTENSION: Record<string, string> = {
  // Text formats
  "text/plain": ".txt",
  "text/html": ".html",
  "text/css": ".css",
  "text/javascript": ".js",
  "text/csv": ".csv",
  "text/xml": ".xml",

  // Application formats
  "application/json": ".json",
  "application/xml": ".xml",
  "application/pdf": ".pdf",
  "application/zip": ".zip",
  "application/gzip": ".gz",
  "application/x-tar": ".tar",
  "application/javascript": ".js",
  "application/x-javascript": ".js",
  "application/octet-stream": ".bin",

  // Office documents
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    ".docx",
  "application/vnd.ms-excel": ".xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
  "application/vnd.ms-powerpoint": ".ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation":
    ".pptx",

  // Image formats
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
  "image/svg+xml": ".svg",
  "image/bmp": ".bmp",
  "image/tiff": ".tiff",
  "image/x-icon": ".ico",

  // Audio formats
  "audio/mpeg": ".mp3",
  "audio/wav": ".wav",
  "audio/ogg": ".ogg",
  "audio/mp4": ".m4a",
  "audio/webm": ".webm",

  // Video formats
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "video/ogg": ".ogv",
  "video/avi": ".avi",
  "video/mov": ".mov",
  "video/wmv": ".wmv",

  // Font formats
  "font/woff": ".woff",
  "font/woff2": ".woff2",
  "font/ttf": ".ttf",
  "font/otf": ".otf",
  "application/font-woff": ".woff",
  "application/font-woff2": ".woff2",
  "application/x-font-ttf": ".ttf",
  "application/x-font-otf": ".otf",
};

/**
 * Get file extension from MIME type
 * @param mimeType - The MIME type (e.g., "application/pdf")
 * @returns The file extension (e.g., ".pdf") or ".txt" as fallback
 */
export function getExtensionFromMimeType(mimeType: string): string {
  if (!mimeType) {
    return ".txt";
  }

  // Normalize MIME type by removing parameters and converting to lowercase
  const normalizedMimeType = mimeType.split(";")[0].trim().toLowerCase();

  // Return the mapped extension or fallback to .txt
  return MIME_TO_EXTENSION[normalizedMimeType] || ".txt";
}

/**
 * Extract MIME type from Content-Type header value
 * @param contentType - The Content-Type header value (e.g., "application/json; charset=utf-8")
 * @returns The MIME type (e.g., "application/json")
 */
export function extractMimeType(contentType: string): string {
  if (!contentType) {
    return "";
  }

  return contentType.split(";")[0].trim().toLowerCase();
}

/**
 * Find Content-Type header from headers array
 * @param headers - Array of [key, value] tuples
 * @returns The Content-Type header value or undefined
 */
export function findContentTypeHeader(
  headers: [string, string][],
): string | undefined {
  if (!headers) {
    return undefined;
  }

  const header = headers.find(([key]) => key.toLowerCase() === "content-type");

  return header?.[1];
}
