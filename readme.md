# Flowappz Todo App

This project is a monorepo for a Webflow Extension Todo App. It is built using `pnpm` workspaces and contains three main applications:

## 🏗️ Architecture

The monorepo contains the following packages inside the `apps/` directory:

### 1. Backend (`apps/backend`)
An Express.js REST API that powers the application.
- **Language**: TypeScript
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM
- **Key Dependencies**: `express`, `drizzle-orm`, `pg`, `webflow-api`
- **Purpose**: Handles business logic, database operations, and integrates with the Webflow API.

### 2. Frontend (`apps/frontend`)
The user interface built as a Webflow Designer Extension.
- **Framework**: React 18
- **Build Tool**: Vite
- **Styling**: Tailwind CSS, Lucide React (icons)
- **Key Dependencies**: `@webflow/designer-extension-typings`, `axios`
- **Purpose**: Provides the UI for the Webflow extension, communicating with the backend API. It bundles directly into a Webflow Extension using Webflow CLI tools.

### 3. CDN (`apps/cdn`)
A static asset delivery system.
- **Build Tool**: Vite
- **Cloud**: AWS S3 (`@aws-sdk/client-s3`)
- **Purpose**: Handles building and uploading static assets (scripts, styles) to an AWS S3 bucket for CDN distribution.

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- `pnpm` (v10+)
- PostgreSQL (for backend)
- Docker (optional, for local DB via `docker-compose`)

### Installation

1. Install dependencies from the root directory:
```bash
pnpm install
```

2. Set up environment variables:
- Backend: Configure database credentials (`DATABASE_URL`) and Webflow API keys.
- Frontend/CDN: Configure any necessary API endpoints.

### Development Commands

Run these from the root directory:

- **Start Backend**: `pnpm dev:backend`
- **Start Frontend**: `pnpm dev:frontend`
- **Start CDN**: `pnpm dev:cdn`

### Build Commands

- **Build Backend**: `pnpm build:backend`
- **Build Frontend**: `pnpm build:frontend` (This also creates the Webflow extension bundle zip file)
- **Build CDN**: `pnpm build:cdn`

## 🗄️ Database Management

The backend uses Drizzle ORM. You can manage the database using the following commands from the `apps/backend` directory:

- `pnpm db:push`: Push schema changes directly to the database.
- `pnpm db:generate`: Generate migration files.
- `pnpm db:migrate`: Run migrations.
- `pnpm db:studio`: Open Drizzle Studio to view database contents.
