# Todo App CDN

This app is the published-site runtime for the todo element copied by the Webflow Designer Extension.

## What this CDN script does

1. Finds pasted todo elements by `#flowappz-todo-root`.
2. Reads behavior options from `flowappz-todo-*` attributes.
3. Loads and saves tasks via the backend `/api/todo/tasks` endpoint.
4. Handles add, complete, edit, and delete interactions.

## Main files

- `src/script.ts`: runtime behavior for published Webflow pages.
- `src/style.css`: tiny runtime CSS for focus and dark-mode support.
- `scripts/upload.mjs`: builds, optionally uploads to Cloudflare R2, and registers the release with the backend.

## Local build

1. Copy `.env.example` to `.env`.
2. Keep `VERSION=0.0.1` and `BACKEND_URL=http://localhost:3000` for local testing.
3. Run `pnpm --filter todo-cdn build` from the repo root.

## Release flow later

The backend registers the latest CDN release on Webflow sites. To create the first release, run:

```powershell
pnpm --filter todo-cdn release -- --nr patch
```

For production, fill the R2 variables and run:

```powershell
pnpm --filter todo-cdn release:production -- --nr patch
```
