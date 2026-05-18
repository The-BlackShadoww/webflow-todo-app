# Todo App Frontend

This app is the Webflow Designer Extension for building and copying the todo element.

## What this frontend does

1. Checks the current Webflow site through the backend.
2. Sends unauthenticated sites through the Webflow OAuth install flow.
3. Lets the user create starter todo tasks.
4. Lets the user configure todo behavior.
5. Copies a Webflow-native `@webflow/XscpData` payload into the clipboard.
6. The pasted element uses stable `flowappz-todo-*` IDs and attributes for the future CDN script.

## Main screens

- Home: simple status and build order.
- Tasks: create, edit, complete, and delete starter tasks.
- Settings: configure published-page behavior.
- Copy: copy the todo element for Webflow Designer.

## Local setup

1. Copy `.env.example` to `.env`.
2. Make sure the backend runs on `http://localhost:3000`.
3. Run `pnpm.cmd dev:frontend` from the repo root.
4. The frontend dev server runs at `http://localhost:1337`.
5. Open the extension through Webflow Designer during development.
