---
id: task-16
title: Support uploading files and serving them from handlers
status: To Do
assignee: []
created_date: '2025-07-08'
labels: []
dependencies: []
---

## Description

Create a new option in the Tools menu of the AppSidebar called "Uploaded files..." When the user clicks this, it should bring up a modal for them to view and manage their uploaded files. Uploaded files will be stored in a `data/user/files` directory by default. Then, create an API for these files to be referenced in handler code. For example, to allow the handler to return a file in the `resp.body_raw` property. When loaded into the handler code, the file should be made available as a base64 string. Use sync filesystem APIs for the handler functions.

## Acceptance Criteria

- [ ] Create a new option in the Tools menu of the AppSidebar called "Uploaded files..." When the user clicks this, it should bring up a modal for them to view and manage their uploaded files.
- [ ] The modal should allow users to view metadata, download, and delete existing files, as well as create new ones.
- [ ] The uploaded files should be stored in a directory controlled by the WTT_USER_FILES_DIR environment variable, defaulting to `data/user/files/`.
- [ ] Handlers should be able to call `useFile('foo.txt')` to read the contents of the uploaded `foo.txt` file as a base64 string.
- [ ] Impose a 50 MB limit on uploaded files, and a 500 MB limit on the total size of the uploaded files directory.
- [ ] The file manager modal should display the MB usage of the uploaded files directory so users know if they're nearing the limit.