---
id: task-18
title: Support deleting requests
status: To Do
assignee: []
created_date: '2025-07-08'
labels: []
dependencies: []
---

## Description

Add a dropdown menu to the RequestSidebar with a "Delete all requests" option that will delete all requests in the DB using the clearRequestEvents function. (Note that you'll also need to clearHandlerExecutions() first.) The menu option should be visually "dangerous" (i.e. have red text) and pop up a confirmation modal before deleting the requests.