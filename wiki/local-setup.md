# Local setup

This guide explains how to run the **Flowappz Todo App** monorepo on your machine. The repo is a [pnpm workspace](https://pnpm.io/workspaces) with three apps:

| App | Package | Role | Default URL |
| --- | --- | --- | --- |
| **Backend** | `todo-backend` | Webflow OAuth, API, Postgres | `http://localhost:3000` |
| **Frontend** | `todo-frontend` | Webflow Designer Extension (React) | `http://localhost:1337` |
| **CDN** | `todo-cdn` | Published-site runtime script | `http://localhost:4173` (preview) |

You typically run **backend + frontend** for Designer Extension work. Add **CDN build + preview + release** when you need the script on published Webflow pages.

---

## Prerequisites

- **Node.js** 20+ (LTS recommended)
- **pnpm** 10.x — the root `package.json` pins `pnpm@10.33.2`. Enable via [Corepack](https://pnpm.io/installation): `corepack enable` then `corepack prepare pnpm@10.33.2 --activate`
- **Docker** (for local Postgres), or any Postgres instance you can point `DATABASE_URL` at
- A **Webflow app** (Workspace → Apps) with:
  - OAuth redirect URI: `http://localhost:3000/api/webflow/callback`
  - Scopes: `sites:read`, `custom_code:read`, `custom_code:write` (or match `WEBFLOW_SCOPES` in backend `.env`)
  - Designer Extension dev URL pointing at `http://localhost:1337` while developing

The Webflow CLI (`webflow extension bundle`) is only required for **production extension builds**, not for day-to-day `dev:frontend`.

---

## 1. Clone and install

From the repository root:

```powershell
pnpm install
```

Root scripts delegate to workspace packages:

| Script | What it runs |
| --- | --- |
| `pnpm dev:backend` | Backend with nodemon |
| `pnpm dev:frontend` | Vite dev server (port 1337) + Webflow hot reload |
| `pnpm dev:cdn` | Vite dev server for CDN source |
| `pnpm db:push` | Push Drizzle schema to Postgres |
| `pnpm build:cdn` | Build CDN bundle into `apps/cdn/dist/<version>/` |

On Windows, if `pnpm` is not on your PATH, use `pnpm.cmd` instead (e.g. `pnpm.cmd dev:frontend`).

---

## 2. Database

### Option A — Docker (recommended)

From `apps/backend`:

```powershell
pnpm docker:up
```

This starts Postgres 16 on port **5432** with:

- User / password: `postgres` / `postgres`
- Database: `todo_app`

Matches the default in `apps/backend/.env.example`:

```
DATABASE_URL=postgres://postgres:postgres@localhost:5432/todo_app
```

Stop the container:

```powershell
pnpm docker:down
```

### Option B — Existing Postgres

Set `DATABASE_URL` in `apps/backend/.env` to your instance.

### Apply schema

With Postgres running, from the **repo root**:

```powershell
pnpm db:push
```

---

## 3. Environment files

Copy each example to `.env` and fill in secrets. Do not commit `.env` files.

### Backend — `apps/backend/.env`

```powershell
copy apps\backend\.env.example apps\backend\.env
```

| Variable | Purpose |
| --- | --- |
| `PORT` | API port (default `3000`) |
| `DATABASE_URL` | Postgres connection string |
| `FRONTEND_URL` | CORS origin for the extension (default `http://localhost:1337`) |
| `BACKEND_PUBLIC_URL` | Public base URL used in OAuth/links (default `http://localhost:3000`) |
| `WEBFLOW_CLIENT_ID` / `WEBFLOW_CLIENT_SECRET` | From your Webflow app |
| `WEBFLOW_REDIRECT_URI` | Must be `http://localhost:3000/api/webflow/callback` for local dev |
| `ENCRYPTION_SECRET` | At least 32 characters; used to encrypt stored tokens |

### Frontend — `apps/frontend/.env`

```powershell
copy apps\frontend\.env.example apps\frontend\.env
```

| Variable | Purpose |
| --- | --- |
| `VITE_DATA_CLIENT_URL` | Backend API base (default `http://localhost:3000/api`) |
| `VITE_APP_NAME` / `APP_NAME` | Extension identifier |
| `ENVIRONMENT` | e.g. `development` |

### CDN — `apps/cdn/.env` (optional until you test published pages)

```powershell
copy apps\cdn\.env.example apps\cdn\.env
```

| Variable | Purpose |
| --- | --- |
| `VERSION` | Build folder name under `dist/` (e.g. `0.0.1`) |
| `BACKEND_URL` | Backend root (default `http://localhost:3000`) |
| `PUBLIC_CDN_BASE_URL` | Where the built `script.js` is served locally (default `http://localhost:4173`) |
| `BACKEND_ADMIN_URL` | API base for release registration (default `http://localhost:3000/api`) |
| R2 variables | Leave empty for local dev; upload is skipped |

---

## 4. Run the stack

Use **separate terminals** from the repo root.

### Terminal 1 — Backend

```powershell
pnpm dev:backend
```

Verify: `GET http://localhost:3000/api/health`

### Terminal 2 — Frontend (Designer Extension)

```powershell
pnpm dev:frontend
```

- Dev server: `http://localhost:1337`
- Uses `@xatom/wf-app-hot-reload` for Webflow Designer integration

In Webflow Designer, open your app/extension configured to load the local dev URL.

### Terminal 3 — CDN (only when testing published-site behavior)

1. Ensure backend is running (CDN release registration calls the API).

2. Build and register a release (first time, pass a version bump):

   ```powershell
   pnpm --filter todo-cdn release -- --nr patch
   ```

   Without R2 credentials, the release script builds the bundle, skips R2 upload, and registers `PUBLIC_CDN_BASE_URL/<version>/script.js` with the backend.

3. Serve the built files (Vite preview defaults to port **4173**):

   ```powershell
   cd apps/cdn
   pnpm preview
   ```

   The registered URL should look like: `http://localhost:4173/<version>/script.js` (e.g. `http://localhost:4173/0.0.1/script.js`).

4. In the extension, connect the site and register app scripts so Webflow loads that CDN URL on publish.

For iterative CDN **source** edits without a full release flow, you can run:

```powershell
pnpm dev:cdn
```

That runs the Vite dev server for development; published Webflow pages still use the registered release URL from step 2.

---

## 5. Typical local workflow

1. Start Postgres → `pnpm db:push` (once per schema change).
2. Configure backend and frontend `.env` with Webflow credentials.
3. `pnpm dev:backend` and `pnpm dev:frontend`.
4. Open the extension in Webflow Designer on a site.
5. Complete OAuth install when prompted (backend handles `/api/webflow/callback`).
6. Use **Tasks**, **Settings**, and **Copy** in the extension; paste the todo element in the Designer.
7. When you need live todo behavior on a **published** page: build/register CDN (section 4, terminal 3) and register scripts for the site.

---

## 6. Useful API routes (local)

Backend base: `http://localhost:3000/api`

- `GET /health` — health check
- `GET /sites/validate?siteId=...` — whether the site is connected
- `GET /webflow/install?state=...` — start OAuth
- `GET /webflow/callback` — OAuth redirect (browser only)
- `GET /webflow/cdn-release/latest` — latest CDN release metadata
- `GET /todo/settings/:siteId` / `POST /todo/settings` — per-site todo settings
- `GET /todo/tasks` / `PUT /todo/tasks` — per-site tasks (Designer uses `listId=default`)

See `apps/backend/README.md` for the full route list.

---

## 7. Troubleshooting

| Issue | Things to check |
| --- | --- |
| OAuth fails or redirect mismatch | `WEBFLOW_REDIRECT_URI` exactly matches the Webflow app setting; `BACKEND_PUBLIC_URL` is reachable |
| CORS errors from extension | `FRONTEND_URL` is `http://localhost:1337`; backend restarted after `.env` changes |
| Database connection errors | Postgres running on 5432; `DATABASE_URL` correct; run `pnpm db:push` |
| “No CDN release found” when registering scripts | Run `pnpm --filter todo-cdn release -- --nr patch` with backend up; confirm `GET /api/webflow/cdn-release/latest` returns a release |
| CDN script 404 on publish | `pnpm preview` in `apps/cdn` serving `dist/<version>/`; `PUBLIC_CDN_BASE_URL` matches preview URL and version |
| Frontend cannot reach API | `VITE_DATA_CLIENT_URL` is `http://localhost:3000/api`; backend running |

---

## 8. Production builds (reference)

Not required for local dev, but for completeness:

```powershell
pnpm build:backend
pnpm build:frontend   # bundles Webflow extension zip via Webflow CLI
pnpm build:cdn
```

Backend production start: `pnpm start:backend` (runs compiled `dist/`).

CDN production release (requires R2 env): `pnpm --filter todo-cdn release:production -- --nr patch`
