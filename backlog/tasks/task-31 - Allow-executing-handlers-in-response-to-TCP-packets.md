---
id: task-31
title: Allow executing handlers in response to TCP packets
status: Done
assignee:
  - '@me'
created_date: '2025-10-13 01:05'
updated_date: '2025-10-13 01:27'
labels: []
dependencies: []
---

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Research existing handlers and tcp-server implementation\n2. Define tcp-handler schema\n3. Create migration for tcp_handlers table\n4. Define tcp-handler model\n5. Define tcp-handler controller\n6. Create TCP code editor component with appropriate types\n7. Create UI pages to manage TCP handler\n8. Update tcp-server to execute tcp-handler on incoming data\n9. Create tcp-handlers.md documentation\n10. Add automated tests for TCP handlers\n11. Update database reset function to include tcp-handlers
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Successfully implemented TCP handler functionality for the Webhook Testing Tool.

## Approach Taken
- Created a new tcp-handlers module following the same pattern as the existing handlers module
- Implemented schema, model, controller, and tests for TCP handlers
- Added UI components for managing TCP handlers, including a dedicated page and code editor with appropriate type declarations
- Integrated TCP handler execution into the tcp-server to process incoming TCP data
- Created comprehensive documentation explaining TCP handler usage

## Features Implemented
1. **Schema and Model** (src/tcp-handlers/):
   - Created Zod schema with enabled flag supporting both boolean and number (SQLite compatibility)
   - Implemented model functions: create, read, update, delete, and getActiveTcpHandler
   - Only enabled TCP handlers are executed on incoming data

2. **Controller and API** (src/tcp-handlers/controller.ts):
   - RESTful API endpoints: GET /api/tcp-handlers, POST /api/tcp-handlers, GET/PUT/DELETE /api/tcp-handlers/:id
   - Added to dashboard server routes

3. **Database** (src/db/migrations/1760318121000_add_tcp_handlers_table.ts):
   - Created tcp_handlers table with id, version_id, name, code, and enabled fields
   - Updated resetDb function to include clearTcpHandlers

4. **UI Components** (src/components/ and src/dashboard/pages/):
   - TcpCodeEditor: Monaco editor with TCP-specific type declarations (data, send, console, shared, sleep, btoa, atob)
   - TcpHandlerForm: Form component with name, enabled toggle, and code editor
   - TcpHandlerPage: Page for managing the single TCP handler with create/update/delete functionality
   - Added TCP Handler navigation item to sidebar
   - Used Dialog component for delete confirmation

5. **TCP Server Integration** (src/tcp-server/index.ts):
   - Modified data handler to check for active TCP handler
   - Executes handler code in sandboxed vm context with appropriate globals
   - Captures console output and manages shared state
   - Falls back to default 'ack' response if no handler is configured
   - Handles handler errors gracefully

6. **Documentation** (src/docs/tcp-handlers.md):
   - Comprehensive guide explaining TCP handler concepts
   - Examples of common use cases (echo server, protocol handler, rate limiter, etc.)
   - Comparison with HTTP handlers
   - Testing instructions using various TCP clients
   - Best practices and troubleshooting

7. **Tests** (src/tcp-handlers/*.spec.ts):
   - Model tests: 22 tests covering CRUD operations, getActiveTcpHandler, and edge cases
   - Schema tests: 23 tests for validation rules
   - All tests passing

## Technical Decisions and Trade-offs
1. **Single Handler Model**: Only one TCP handler can be enabled at a time (as specified in requirements). This simplifies the architecture compared to HTTP handlers which support chaining.

2. **SQLite Boolean Handling**: Added schema transformation to handle SQLite storing booleans as integers (0/1).

3. **Execution Context**: Similar to HTTP handlers but simplified - only data (string) and send(string) function, no request/response objects since TCP is a streaming protocol.

4. **Shared State**: Reused existing shared state system for consistency with HTTP handlers.

5. **Error Handling**: Errors in TCP handlers send 'error' response but don't crash the server. Console output is logged to server logs.

6. **UI Design**: Used Dialog instead of AlertDialog (not yet available in the component library) for delete confirmation.

## Modified or Added Files
- src/tcp-handlers/schema.ts (new)
- src/tcp-handlers/model.ts (new)
- src/tcp-handlers/controller.ts (new)
- src/tcp-handlers/model.spec.ts (new)
- src/tcp-handlers/schema.spec.ts (new)
- src/db/migrations/1760318121000_add_tcp_handlers_table.ts (new)
- src/db/index.ts (updated to add migration and clearTcpHandlers)
- src/tcp-server/index.ts (updated to execute TCP handlers)
- src/components/tcp-code-editor.tsx (new)
- src/components/tcp-handler-form.tsx (new)
- src/components/app-sidebar.tsx (updated to add TCP Handler nav item)
- src/dashboard/pages/tcp-handler-page.tsx (new)
- src/dashboard/app.tsx (updated to add TCP Handler route)
- src/dashboard/server.ts (updated to add TCP handler controller)
- src/docs/tcp-handlers.md (new)
- src/docs/index.ts (updated to export tcp-handlers docs)
- src/types/api.ts (updated to add tcp-handlers to ResourceType)
- All code compiled without errors and all tests passing (45/45)
<!-- SECTION:NOTES:END -->

It should be possible to configure a handler to execute in response to incoming TCP data in the tcp-server. The handler code should have a similar runtime context to what is in the webhook-server/handle-request.ts, but instead of `req`, it should have a variable `data` that contains the incoming data as a string, and a `send(data: string)` function that immediately sends some data back to the other side of the TCP connection.

Since TCP handlers and HTTP handlers are quite different, they should use different models. Create a new `tcp-handlers` directory, similar to the `handlers` directory but for TCP-specific handlers. For now, there can only be a single TCP handler at most.

Also, include UI for managing the TCP handler including an alternate CodeEditor component that includes types for TCP handler execution context as described above.

Remember to include:

1. Defining the tcp-handler model and migration.
2. Defining the tcp-handler schema.
3. Defining the tcp-handler controller.
4. Creating UI to manage the TCP handler.
5. Updating the tcp-server to call the tcp-handler.
6. Creating a new docs page called `tcp-handlers.md` that documents how TCP handlers work.
7. Adding automated tests for TCP handlers.
