---
id: task-30
title: >-
  Allow handlers to throw a special error that causes the socket to be
  prematurely closed
status: To Do
assignee: []
created_date: '2025-10-13 00:25'
labels: []
dependencies: []
---

When executing handler code in webhook-server, it should be possible to generate invalid HTTP respones. Add two ways to do this:

1. The handler code should be able to throw an AbortSocketError that causes the Express server processing the request to terminate the socket connection instead of returning an HTTP response. 
2. The handler code should also be able to assign `resp.socket` which, if set, will cause the server to write the value directly to the socket and close it afterwards. If `resp.socket` is set, all other properties of the response are ignored.

Remember to add the new functionality, update the types in CodeEditor, and update the handlers.md documentation to explain the new feature.