---
id: task-22
title: Add formatting for XML/HTML payloads
status: Done
assignee:
  - '@claude'
created_date: '2025-07-09'
updated_date: '2025-07-09'
labels: []
dependencies: []
---

## Description

In PayloadDisplay, support displaying the formatted view for XML/HTML payloads as well as JSON ones (use Content-Type header to determine whether the payload is XML-like, e.g. `application/xml`, `text/html`, etc.)

## Acceptance Criteria

- [x] XML payloads are properly formatted and displayed
- [x] HTML payloads are properly formatted and displayed
- [x] Content-Type headers are correctly used to determine payload type
- [x] Fallback to raw display for unsupported formats
- [x] Existing JSON formatting continues to work

## Implementation Plan

1. Locate PayloadDisplay component and understand current JSON formatting implementation
2. Research XML/HTML formatting libraries or implement native formatting
3. Add Content-Type detection logic to determine payload format
4. Implement XML formatting with proper indentation
5. Implement HTML formatting with proper indentation
6. Add fallback to raw display for unsupported formats
7. Test with various payload types (JSON, XML, HTML, plain text)

## Implementation Notes

### Approach taken
- Used the existing `react-syntax-highlighter` library which already supports XML and HTML syntax highlighting
- Created a custom XML/HTML formatter in `/workspace/src/util/format-xml.ts` to properly indent XML/HTML content
- Implemented content type detection logic that checks both Content-Type headers and content structure

### Features implemented
- Added `getContentFormat()` function to detect content type from MIME type headers and content analysis
- Created `formatXml()` function to format XML/HTML with proper indentation
- Modified PayloadDisplay component to use appropriate syntax highlighting based on detected content type
- The "Pretty" tab now appears for XML and HTML content, not just JSON

### Technical decisions
- Used native JavaScript for XML/HTML formatting instead of adding another dependency
- Leveraged the existing syntax highlighter which already had XML/HTML support
- Content type detection falls back to content analysis if no Content-Type header is present
- The formatter handles self-closing tags, void elements, comments, DOCTYPE, and CDATA sections

### Modified files
- `/workspace/src/components/payload-display.tsx` - Added XML/HTML formatting support
- `/workspace/src/util/format-xml.ts` - New utility file with XML/HTML formatting functions
