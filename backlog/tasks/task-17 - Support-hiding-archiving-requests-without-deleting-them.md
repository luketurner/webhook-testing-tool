---
id: task-17
title: Support hiding/archiving requests without deleting them
status: To Do
assignee: []
created_date: '2025-07-08'
labels: []
dependencies: []
---

## Description

Add the ability to "archive" requests without deleting them. To support this, add a new column to the request_events table called archived_at. When the user chooses to archive a request, set the archived_at to the current time. When displaying the list of requests in the sidenav, filter out all archived requests by default. Add a "Show archived" checkbox the user can use to display archived requests. To start with, the only way to archive requests would be to click an "Archive all requests" option in the RequestSidebar dropdown menu.