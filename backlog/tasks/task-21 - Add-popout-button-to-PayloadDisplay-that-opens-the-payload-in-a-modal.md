---
id: task-21
title: Add popout button to PayloadDisplay that opens the payload in a modal
status: Done
assignee: []
created_date: '2025-07-09'
updated_date: '2025-07-09'
labels: []
dependencies: []
---

## Description

In the PayloadDisplay component, add a button to open the payload view in a large modal so the user can see more of it at once. The modal should reuse the PayloadDisplay component intenrally to display the payload with all the encoding, etc. options. It should also have a "Copy" button to copy the payload (in the currently displayed encoding) to clipboard.

## Implementation Plan

1. Find and examine the PayloadDisplay component
2. Install shadcn/ui dialog component
3. Add popout button to PayloadDisplay
4. Implement modal that reuses PayloadDisplay
5. Add copy button to modal

## Implementation Notes

Implemented popout functionality for PayloadDisplay component:

- Added Dialog imports from shadcn/ui
- Added Maximize2 and Copy icons from lucide-react
- Added isModal prop to PayloadDisplay to control nested modal behavior
- Added modalOpen state to manage dialog visibility
- Added handleCopy function to copy decoded content to clipboard
- Added popout button next to download button in both multipart and tabs views
- Implemented modal that reuses PayloadDisplay component with isModal=true
- Added copy button in modal header that copies current decoded content
- Modal uses max-width 90vw and max-height 90vh with overflow auto for responsive sizing

Modified files:
- src/components/payload-display.tsx
