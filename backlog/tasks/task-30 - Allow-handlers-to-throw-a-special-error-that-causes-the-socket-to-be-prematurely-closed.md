---
id: task-30
title: >-
  Allow handlers to throw a special error that causes the socket to be
  prematurely closed
status: Done
assignee:
  - '@claude'
created_date: '2025-10-13 00:25'
updated_date: '2025-10-13 00:44'
labels: []
dependencies: []
---

When executing handler code in webhook-server, it should be possible to generate invalid HTTP respones. Add two ways to do this:

1. The handler code should be able to throw an AbortSocketError that causes the Express server processing the request to terminate the socket connection instead of returning an HTTP response. 
2. The handler code should also be able to assign `resp.socket` which, if set, will cause the server to write the value directly to the socket and close it afterwards. If `resp.socket` is set, all other properties of the response are ignored.

Remember to add the new functionality, update the types in CodeEditor, and update the handlers.md documentation to explain the new feature.

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Handler can throw AbortSocketError to terminate socket,Handler can set resp.socket to write raw data to socket,TypeScript types are updated in CodeEditor,Documentation is updated in handlers.md,Tests verify both new features work correctly
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Examine existing handler execution and error handling code\n2. Create AbortSocketError class in errors.ts\n3. Update webhook server to handle AbortSocketError and resp.socket\n4. Update TypeScript types in CodeEditor\n5. Update handlers.md documentation\n6. Write tests for both features\n7. Run tests and linting
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented two new features for generating invalid HTTP responses in handlers:

1. **AbortSocketError**: A new error class that immediately terminates the socket connection without sending any HTTP response. When thrown from handler code, it causes the Express server to destroy the socket connection.

2. **resp.socket property**: Allows handlers to write raw data directly to the TCP socket, bypassing the HTTP protocol entirely. When set, all other response properties (status, headers, body) are ignored.

## Modified files:
- src/webhook-server/errors.ts: Added AbortSocketError class and isAbortSocketError helper
- src/webhook-server/schema.ts: Added optional socket property to response schema
- src/webhook-server/handle-request.ts: Added handling for AbortSocketError and resp.socket
- src/webhook-server/index.ts: Added socket abortion and raw socket data writing logic
- src/components/code-editor.tsx: Added TypeScript declarations for new features
- src/docs/handlers.md: Added comprehensive documentation with examples
- src/webhook-server/handle-request.spec.ts: Added 9 new tests covering both features

## Technical decisions:
- AbortSocketError does NOT extend HandlerError because it requires special handling (no HTTP response)
- Used a special _socketRawData property to pass raw socket data from handle-request to webhook server
- Empty strings are supported for resp.socket (checking for undefined rather than truthy value)
- Handler execution records track socket abortion with "Socket aborted" error messages
<!-- SECTION:NOTES:END -->
