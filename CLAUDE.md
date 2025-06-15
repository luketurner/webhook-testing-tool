# `CLAUDE.md` - Webhook Testing Tool

## Project Context

Webhook Testing Took (WTT) is a self-hosted app for testing and debugging HTTP requests. It includes a generic HTTP server that responds to any request, as well as a React-based admin dashboard for viewing past requests and responses.

## Critical Architecture Decisions

### Zod Schemas

Zod schemas are preferred for validation and parsing because they are declarative and strongly typed. Zod should be used to parse data received from user input, database queries, or any other external data source.

### Bun Server

The admin dashboard is served with `Bun.serve` because it has a clean API and automatically bundles/compiles `.html` documents.

Whenever a new route is added in the admin dashboard router, it must also be added as a static route in `src/dashboard/server.ts`.

### Express Server

The webhook server uses Express because it allows you to write code after the response is sent by overwriting the `res.end` function.

### Frontend conventions

- Use components from shadcn/ui framework whenever possible. (https://ui.shadcn.com/docs/components)
- New components can be installed with `bunx`, e.g. to install the `button` component, you'd run `bunx --bun shadcn@latest add button`.
- If there is no existing shadcn/ui component, create reusable components in `src/components` wherever possible.
- Use Tailwind classes for all styles.
- Do not edit files in `src/components/ui`, those are managed by the shadcn code generator.
- Do not edit `src/util/ui.ts`, that is required by the shadcn code generator.

### Client-Server Architecture

WTT uses a single codebase (the `src/` directory) for both the client (React frontend) and server (Bun backend).

- The main Typescript entrypoint for the client is `src/dashboard/client.tsx`.
- The main Typescript entrypoint for the server is `src/server.ts`.

Some files are "server-only", indicated by `import "@/server-only";` being present in the file. These files must never be imported from the frontend.

## Code Style and Patterns

### Anchor comments

Add specially formatted comments throughout the codebase, where appropriate, for yourself as inline knowledge that can be easily `grep`ped for.

### Guidelines:

- Use `AIDEV-NOTE:`, `AIDEV-TODO:`, or `AIDEV-QUESTION:` (all-caps prefix) for comments aimed at AI and developers.
- **Important:** Before scanning files, always first try to **grep for existing anchors** `AIDEV-*` in relevant subdirectories.
- **Update relevant anchors** when modifying associated code.
- **Do not remove `AIDEV-NOTE`s** without explicit human instruction.
- Make sure to add relevant anchor comments, whenever a file or piece of code is:
  - too complex, or
  - very important, or
  - confusing, or
  - could have a bug

### Organize your project by feature areas

Organize your project into subdirectories based on the features or your application or common themes to the code in those directories.

Avoid creating subdirectories based on the type of code that lives in those directories. For example, avoid creating directories like components, directives, and services.

Avoid putting so many files into one directory that it becomes hard to read or navigate. As the number files in a directory grows, consider splitting further into additional sub-directories.

### One concept per file

Prefer focusing source files on a single concept. When in doubt, go with the approach that leads to smaller files.

### Util directory

If a helper function would be useful across multiple feature areas, put it in an appropriate file in the `./src/util` directory.
