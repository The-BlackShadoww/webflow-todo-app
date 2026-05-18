# Todo App Backend

This backend follows the same product shape as the advanced-search backend, but without search-specific services.

## What this backend does

1. Handles Webflow OAuth callbacks.
2. Stores authenticated Webflow users and their sites.
3. Lets the Designer Extension validate whether the current site is connected.
4. Stores the latest CDN script release URL.
5. Registers the todo CDN script into a Webflow site through Webflow custom code APIs.
6. Stores per-site todo settings for the future extension UI.

## Main API routes

- `GET /api/health`
- `GET /api/sites/validate?siteId=...`
- `GET /api/webflow/install?state=...`
- `GET /api/webflow/callback`
- `GET /api/webflow/sites?siteId=...`
- `DELETE /api/webflow/sites?siteId=...`
- `POST /api/webflow/register-app-scripts`
- `GET /api/webflow/cdn-release/latest`
- `POST /api/webflow/cdn-release`
- `POST /api/webflow/register-all-scripts`
- `GET /api/todo/settings/:siteId`
- `POST /api/todo/settings`

## Setup later

1. Copy `.env.example` to `.env`.
2. Fill in Webflow app credentials and database URL.
3. Run `pnpm install` from the repo root.
4. Run `pnpm db:push`.
5. Run `pnpm dev:backend`.
