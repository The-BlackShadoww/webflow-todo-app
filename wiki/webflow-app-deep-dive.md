# 🏗️ Webflow App Development — Complete Deep Dive

> **Your todo-app, dissected end-to-end.** This document is your foundational reference for understanding how Webflow apps are built, how the three pillars (Backend, Frontend, CDN) cooperate, and what patterns every Webflow app must follow.

---

## Table of Contents

1. [The Big Picture — What is a Webflow App?](#1-the-big-picture)
2. [Monorepo Architecture](#2-monorepo-architecture)
3. [The Three Pillars — How They Connect](#3-the-three-pillars)
4. [Complete Request Flow Diagrams](#4-complete-request-flow-diagrams)
5. [Backend Deep Dive](#5-backend-deep-dive)
6. [Frontend Deep Dive](#6-frontend-deep-dive)
7. [CDN Deep Dive](#7-cdn-deep-dive)
8. [Local Development Flow](#8-local-development-flow)
9. [Production Deployment Flow](#9-production-deployment-flow)
10. [Universal Webflow App Principles](#10-universal-webflow-app-principles)
11. [File Map — Every File & Its Purpose](#11-file-map)

---

## 1. The Big Picture

A **Webflow App** (also called a Webflow Extension) is an application that lives inside the Webflow ecosystem in **two separate worlds**:

```mermaid
graph LR
    subgraph "World 1: Design Time"
        A["Webflow Designer<br/>(Browser)"] --> B["Your Extension Panel<br/>(iframe)"]
    end
    subgraph "World 2: Runtime"
        C["Published Website<br/>(User's browser)"] --> D["Your CDN Script<br/>(JavaScript)"]
    end
    subgraph "Shared"
        E["Your Backend API<br/>(Server)"]
    end
    B --> E
    D --> E
```

| World | When | Where | What runs |
|-------|------|-------|-----------|
| **Design Time** | While the site owner is building in Webflow Designer | Inside an `<iframe>` panel in the Designer sidebar | Your **Frontend** (React app) |
| **Runtime** | When someone visits the published website | On the live page as a `<script>` tag | Your **CDN script** (vanilla JS) |
| **Always On** | Both times | Your server | Your **Backend** (Express API) |

> [!IMPORTANT]
> This two-world model is the fundamental concept of Webflow app development. Your Designer Extension configures things; your CDN script makes them come alive on published pages. Your Backend serves both.

---

## 2. Monorepo Architecture

Your project uses a **pnpm workspace monorepo** — three independent apps in one repository.

```mermaid
graph TD
    ROOT["📦 flowappz-todo-app<br/>pnpm-workspace.yaml"]
    ROOT --> BE["apps/backend<br/>todo-backend<br/>Express + Drizzle + PostgreSQL"]
    ROOT --> FE["apps/frontend<br/>todo-frontend<br/>React + Vite + Webflow SDK"]
    ROOT --> CDN["apps/cdn<br/>todo-cdn<br/>Vanilla TS + Vite + R2"]

    style ROOT fill:#1a1a2e,stroke:#e94560,color:#fff
    style BE fill:#0f3460,stroke:#e94560,color:#fff
    style FE fill:#16213e,stroke:#0dba63,color:#fff
    style CDN fill:#1a1a2e,stroke:#f5a623,color:#fff
```

### Why a monorepo?

| Benefit | How |
|---------|-----|
| **Shared TypeScript** | Root `typescript` dependency, shared `tsconfig` patterns |
| **Single install** | `pnpm install` at root installs all three apps |
| **Unified scripts** | `pnpm dev:backend`, `pnpm dev:frontend`, `pnpm dev:cdn` from root |
| **Independent deploys** | Each app has its own `build` script and deployment target |

### Key files at root level:

- [pnpm-workspace.yaml](file:///c:/Users/User/OneDrive/Desktop/todo-app/pnpm-workspace.yaml) — declares `apps/*` as workspace packages
- [package.json](file:///c:/Users/User/OneDrive/Desktop/todo-app/package.json) — root orchestration scripts
- [readme.md](file:///c:/Users/User/OneDrive/Desktop/todo-app/readme.md) — project overview

---

## 3. The Three Pillars — How They Connect

```mermaid
graph TB
    subgraph "DESIGNER (Design Time)"
        WF["Webflow Designer"] -->|"loads iframe"| FE["Frontend<br/>React App<br/>:1337"]
    end

    subgraph "YOUR BACKEND"
        API["Express API<br/>:3000"]
        DB[("PostgreSQL<br/>Database")]
        API <--> DB
    end

    subgraph "PUBLISHED SITE (Runtime)"
        PAGE["Visitor's Browser"] -->|"loads script"| CDNS["CDN Script<br/>script.js"]
    end

    subgraph "CLOUD STORAGE"
        R2["Cloudflare R2<br/>cdn.flowappz.cloud"]
    end

    FE -->|"HTTP API calls<br/>(axios)"| API
    FE -->|"webflow.getSiteInfo()<br/>webflow.notify()"| WF
    FE -->|"Copy XscpData<br/>to clipboard"| WF

    CDNS -->|"Fetch tasks<br/>Save tasks"| API
    CDNS -.->|"loaded from"| R2

    API -->|"Webflow REST API<br/>(register scripts)"| WFAPI["Webflow API<br/>api.webflow.com"]

    style FE fill:#0dba63,stroke:#fff,color:#fff
    style API fill:#e94560,stroke:#fff,color:#fff
    style CDNS fill:#f5a623,stroke:#fff,color:#000
    style DB fill:#533483,stroke:#fff,color:#fff
    style R2 fill:#ff6b35,stroke:#fff,color:#fff
```

### The data contracts between the three pillars:

| From → To | Protocol | Key Endpoints |
|-----------|----------|---------------|
| **Frontend → Backend** | HTTP (axios) | `/api/sites/validate`, `/api/todo/settings`, `/api/todo/tasks`, `/api/webflow/*` |
| **CDN → Backend** | HTTP (fetch) | `/api/todo/tasks` (GET + PUT) |
| **Backend → Webflow API** | HTTP (webflow-api SDK) | OAuth, register scripts, inject custom code |
| **Frontend → Webflow Designer** | JS SDK (`webflow` global) | `getSiteInfo()`, `notify()`, clipboard paste |
| **Upload Script → R2** | AWS S3 SDK | Upload `script.js` to versioned path |
| **Upload Script → Backend** | HTTP (fetch) | `POST /api/webflow/cdn-release` |

---

## 4. Complete Request Flow Diagrams

### 4A. The Full App Lifecycle — From Install to Published Page

```mermaid
sequenceDiagram
    actor Owner as Site Owner
    participant WFD as Webflow Designer
    participant FE as Frontend (iframe)
    participant BE as Backend API
    participant WFAPI as Webflow API
    participant DB as PostgreSQL
    participant R2 as Cloudflare R2
    participant Visitor as Site Visitor

    Note over Owner,Visitor: === PHASE 1: INSTALLATION (OAuth) ===

    Owner->>WFD: Opens extension panel
    WFD->>FE: Loads iframe (localhost:1337 or bundled)
    FE->>FE: webflow.getSiteInfo() → siteId
    FE->>BE: GET /api/sites/validate?siteId=X
    BE->>DB: Check if site has valid token
    DB-->>BE: No valid site
    BE-->>FE: { valid: false }
    FE->>FE: Show AuthScreen
    Owner->>FE: Clicks "Install App"
    FE->>WFD: window.open(backend/api/webflow/install?state=...)
    WFD->>WFAPI: Redirect to Webflow OAuth consent
    Owner->>WFAPI: Grants permission
    WFAPI->>BE: GET /api/webflow/callback?code=ABC
    BE->>WFAPI: Exchange code → access_token
    WFAPI-->>BE: access_token
    BE->>BE: Encrypt token (AES-256-GCM)
    BE->>WFAPI: Get user info + all sites
    BE->>DB: Upsert user + sites
    BE-->>WFD: Redirect to Designer

    Note over Owner,Visitor: === PHASE 2: CONFIGURATION (Designer) ===

    FE->>BE: GET /api/todo/settings/:siteId
    FE->>BE: GET /api/todo/tasks?siteId=X&listId=default
    FE->>BE: POST /api/webflow/register-app-scripts (fire-and-forget)
    BE->>DB: Get latest CDN release
    BE->>BE: Decrypt user token
    BE->>WFAPI: Register inline loader script
    BE->>WFAPI: Add custom code to site footer
    Owner->>FE: Configures settings, adds tasks
    FE->>BE: POST /api/todo/settings + PUT /api/todo/tasks

    Note over Owner,Visitor: === PHASE 3: COPY & PASTE (Designer) ===

    Owner->>FE: Clicks "Copy Element"
    FE->>FE: Build XscpData JSON (todo HTML template)
    FE->>WFD: Copy to clipboard (application/json)
    Owner->>WFD: Ctrl+V / Cmd+V in Designer canvas
    WFD->>WFD: Pastes todo element structure

    Note over Owner,Visitor: === PHASE 4: PUBLISHED SITE (Runtime) ===

    Owner->>WFD: Publishes site
    WFD->>WFD: Includes custom code (loader script) in page footer
    Visitor->>WFD: Visits published site
    WFD-->>Visitor: HTML with loader script in footer
    Visitor->>R2: Loader fetches CDN script.js
    R2-->>Visitor: script.js (with CSS injected)
    Visitor->>Visitor: CDN script finds #flowappz-todo-root
    Visitor->>BE: GET /api/todo/tasks?siteId=X&listId=default
    BE->>DB: Fetch tasks
    DB-->>BE: Tasks array
    BE-->>Visitor: JSON tasks
    Visitor->>Visitor: Render tasks, enable CRUD
    Visitor->>BE: PUT /api/todo/tasks (on user interaction)
```

### 4B. OAuth Flow (Detailed)

```mermaid
sequenceDiagram
    participant FE as Frontend
    participant BE as Backend
    participant WF as Webflow OAuth

    FE->>FE: Build state = base64({ siteId, returnUrl })
    FE->>BE: GET /api/webflow/install?state=eyJ...
    BE->>BE: Build auth URL with client_id + scopes
    BE->>WF: Redirect → authorize?client_id=X&scope=Y&state=Z
    WF->>WF: User grants consent
    WF->>BE: GET /api/webflow/callback?code=ABC&state=eyJ...
    BE->>WF: POST /oauth/access_token (code → token)
    WF-->>BE: { access_token: "wf_..." }
    BE->>BE: encrypt(access_token) → "iv:authTag:ciphertext"
    BE->>BE: Fetch user info + all sites via Webflow API
    BE->>BE: Upsert user + sites in DB
    BE->>BE: Decode state → { siteId, returnUrl }
    BE-->>FE: Redirect to returnUrl (Designer)
```

> [!NOTE]
> The `state` parameter is a base64-encoded JSON containing `{ siteId, returnUrl }`. This is an OAuth standard practice — it lets the callback know which site initiated the auth and where to redirect after completion.

### 4C. CDN Script Injection Flow

```mermaid
sequenceDiagram
    participant Upload as upload.mjs Script
    participant BE as Backend API
    participant DB as PostgreSQL
    participant R2 as Cloudflare R2
    participant WFAPI as Webflow API

    Note over Upload,WFAPI: === CDN RELEASE ===
    Upload->>BE: GET /api/webflow/cdn-release/latest
    BE-->>Upload: { version: "0.0.1" }
    Upload->>Upload: Bump version → "0.0.2"
    Upload->>Upload: pnpm build (Vite → dist/0.0.2/script.js)
    Upload->>Upload: Compute SHA-384 integrity hash
    Upload->>R2: PUT todo-app/dev/0.0.2/script.js
    Upload->>BE: POST /api/webflow/cdn-release { version, url, hash }
    BE->>DB: Upsert cdn_releases row

    Note over Upload,WFAPI: === SCRIPT REGISTRATION (per site) ===
    BE->>DB: Get latest CDN release
    BE->>BE: Build inline loader: createElement('script').src = CDN_URL
    BE->>WFAPI: POST /sites/:id/registered_scripts/inline
    BE->>WFAPI: PUT /sites/:id/custom_code (add to footer)
```

> [!IMPORTANT]
> The CDN script is NOT loaded directly via `<script src="...">` in the page HTML. Instead, Webflow's **Custom Code** system injects a small **inline loader script** into the site footer, which dynamically creates a `<script>` element pointing to your CDN URL. This is the standard Webflow pattern for app scripts.

---

## 5. Backend Deep Dive

### 5A. Architecture Layers

```mermaid
graph LR
    subgraph "API Layer"
        R1["routes/sites.ts"]
        R2["routes/todo.ts"]
        R3["routes/webflow.ts"]
    end
    subgraph "Controller Layer"
        C1["controllers/sites.ts"]
        C2["controllers/todo.ts"]
        C3["controllers/todoTasks.ts"]
        C4["controllers/webflow.ts"]
    end
    subgraph "Service Layer"
        S1["services/webflow/auth.ts"]
        S2["services/webflow/api.ts"]
        S3["services/webflow/serializer.ts"]
    end
    subgraph "Repository Layer"
        RP1["repository/user.ts"]
        RP2["repository/site.ts"]
        RP3["repository/todoSettings.ts"]
        RP4["repository/todoTasks.ts"]
        RP5["repository/cdnRelease.ts"]
    end
    subgraph "Infrastructure"
        DB["db.ts (Drizzle + pg)"]
        CR["lib/crypto.ts"]
        INJ["lib/injectTodoScript.ts"]
    end

    R1 --> C1
    R2 --> C2 & C3
    R3 --> C4
    C1 --> RP2
    C2 --> RP3
    C3 --> RP4
    C4 --> S1 & S2 & S3 & RP1 & RP2 & RP5 & INJ
    S3 --> CR
    C4 --> CR
    INJ --> RP5 & S2
    RP1 & RP2 & RP3 & RP4 & RP5 --> DB

    style R1 fill:#e94560,color:#fff
    style R2 fill:#e94560,color:#fff
    style R3 fill:#e94560,color:#fff
```

### 5B. Database Schema

```mermaid
erDiagram
    users ||--o{ sites : "has many"
    sites ||--o| todoSettings : "has one (via siteId)"
    sites ||--o{ todoTasks : "has many (via siteId)"
    cdnReleases {
        serial id PK
        varchar version UK
        varchar hostedLocation
        varchar integrityHash
        timestamp createdAt
    }
    users {
        serial id PK
        varchar webflowUserId UK
        varchar email UK
        varchar firstName
        varchar lastName
        varchar accessToken "AES-256-GCM encrypted"
        timestamp createdAt
        timestamp updatedAt
    }
    sites {
        serial id PK
        varchar siteId UK "Webflow site ID"
        varchar workspaceId
        varchar displayName
        varchar previewUrl
        integer userId FK
        timestamp createdAt
        timestamp updatedAt
    }
    todoSettings {
        serial id PK
        varchar siteId UK
        boolean allowAdd "default true"
        boolean allowEdit "default true"
        boolean allowDelete "default true"
        boolean showCompleted "default true"
        boolean persistInBrowser "default true"
        varchar theme "system | light | dark"
    }
    todoTasks {
        serial id PK
        varchar siteId
        varchar listId
        varchar taskId UK "composite with siteId+listId"
        text text
        boolean completed "default false"
        integer position "default 0"
    }
```

### 5C. Token Security Flow

```mermaid
graph LR
    A["Raw Webflow Token<br/>wf_abc123..."] -->|"encrypt()"| B["AES-256-GCM<br/>iv:authTag:ciphertext"]
    B -->|"Stored in DB"| C[("users.accessToken<br/>column")]
    C -->|"decrypt()"| D["Raw Token<br/>wf_abc123..."]
    D -->|"Used in API call"| E["Webflow API<br/>Authorization header"]

    style A fill:#ff6b35,color:#fff
    style B fill:#0dba63,color:#fff
    style C fill:#533483,color:#fff
    style D fill:#ff6b35,color:#fff
```

**How encryption works** in [lib/crypto.ts](file:///c:/Users/User/OneDrive/Desktop/todo-app/apps/backend/src/lib/crypto.ts):
- **Algorithm**: AES-256-GCM (authenticated encryption)
- **Key**: SHA-256 hash of `ENCRYPTION_SECRET` env var → 32-byte key
- **Encrypt**: Random 12-byte IV + GCM auth tag → stored as `iv:authTag:ciphertext` (hex, colon-separated)
- **Decrypt**: Splits on `:`, reconstructs GCM decipher → returns original token
- **Backward compat**: If no colons found, returns value as-is (for old plaintext tokens)

### 5D. Every API Route

| Method | Route | Controller | Purpose |
|--------|-------|------------|---------|
| GET | `/api/health` | inline | Health check |
| GET | `/api/sites/validate` | `sites.validateSite` | Check if site is authenticated |
| GET | `/api/webflow/install` | inline redirect | Start OAuth flow |
| GET | `/api/webflow/callback` | `webflow.handleAuthorizationCallback` | OAuth callback |
| GET | `/api/webflow/sites` | `webflow.getSiteByWebflowId` | Get site by Webflow ID |
| DELETE | `/api/webflow/sites` | `webflow.logout` | Clear access token |
| POST | `/api/webflow/register-app-scripts` | `webflow.registerCustomScript` | Inject CDN script into site |
| POST | `/api/webflow/register-all-scripts` | `webflow.registerAllSites` | Inject CDN script into ALL sites |
| GET | `/api/webflow/cdn-release/latest` | `webflow.getLatestRelease` | Latest CDN version |
| POST | `/api/webflow/cdn-release` | `webflow.saveCdnRelease` | Register new CDN release |
| GET | `/api/todo/settings/:siteId` | `todo.getSettings` | Get site settings |
| POST | `/api/todo/settings` | `todo.saveSettings` | Upsert site settings |
| GET | `/api/todo/tasks` | `todoTasks.getTasks` | Get tasks for site/list |
| PUT | `/api/todo/tasks` | `todoTasks.replaceTasks` | Bulk replace all tasks |
| POST | `/api/todo/tasks` | `todoTasks.createTask` | Create single task |
| PATCH | `/api/todo/tasks/:taskId` | `todoTasks.updateTask` | Update single task |
| DELETE | `/api/todo/tasks/:taskId` | `todoTasks.deleteTask` | Delete single task |

### 5E. CORS Configuration

The backend allows requests from:
- `FRONTEND_URL` (e.g., `http://localhost:1337`)
- Any origins in `ALLOWED_ORIGINS` (comma-separated)
- Hardcoded: `http://localhost:1337`, `http://localhost:5173`
- **Dynamic**: Any `*.webflow.com` or `*.webflow.io` hostname — this is critical because the Designer Extension iframe runs from a Webflow subdomain

---

## 6. Frontend Deep Dive

### 6A. The Extension Architecture

```mermaid
graph TD
    WFD["Webflow Designer Browser Window"]
    WFD -->|"creates iframe"| IFRAME["Extension iframe<br/>src=localhost:1337 (dev)<br/>or bundled HTML (prod)"]

    subgraph "Inside the iframe"
        MAIN["main.tsx<br/>ReactDOM.createRoot"]
        MAIN --> APP["App.tsx<br/>Root Component<br/>State Machine"]
        APP --> CTX["AppContext.tsx<br/>React Context"]
        APP --> SB["Sidebar.tsx<br/>Navigation"]
        APP --> AUTH["AuthScreen.tsx"]
        APP --> LOAD["LoadingScreen.tsx"]
        APP --> DASH["Dashboard.tsx"]
        APP --> TASKS["TasksView.tsx"]
        APP --> SETTINGS["SettingsView.tsx"]
        APP --> COPY["CopyElementView.tsx"]
        COPY --> TMPL["todoTemplate.ts<br/>XscpData Builder"]
        APP --> API["apiService.ts<br/>Axios Client"]
    end

    IFRAME <-->|"webflow global SDK"| WFD
    API <-->|"HTTP"| BACKEND["Backend API"]

    style WFD fill:#4353ff,color:#fff
    style IFRAME fill:#1a1a2e,color:#fff,stroke:#0dba63
```

### 6B. App State Machine

```mermaid
stateDiagram-v2
    [*] --> Loading: App mounts
    Loading --> CheckingSite: webflow.getSiteInfo()
    CheckingSite --> ValidatingSite: GET /api/sites/validate
    ValidatingSite --> NeedsAuth: valid = false
    ValidatingSite --> FetchingData: valid = true
    NeedsAuth --> [*]: Show AuthScreen
    FetchingData --> Ready: Parallel fetch (site + settings + tasks)
    FetchingData --> NeedsAuth: 401/404 error
    Ready --> Dashboard: activeId = dashboard
    Ready --> TasksView: activeId = tasks
    Ready --> SettingsView: activeId = settings
    Ready --> CopyView: activeId = copy
```

### 6C. The Copy-to-Clipboard Magic (Most Important Feature)

This is the core mechanism that bridges your extension with the Webflow Designer canvas:

```mermaid
graph TD
    A["User clicks 'Copy Element'<br/>in CopyElementView.tsx"] --> B["buildTodoWebflowTemplate()<br/>Constructs XscpData JSON"]
    B --> C["JSON with nodes[], styles[],<br/>custom attributes"]
    C --> D["document.execCommand('copy')<br/>with custom 'copy' event listener"]
    D --> E["clipboardData.setData(<br/>'application/json', jsonString)"]
    E --> F["User pastes in Designer<br/>Ctrl+V / Cmd+V"]
    F --> G["Webflow reads 'application/json'<br/>from clipboard"]
    G --> H["Webflow creates HTML elements<br/>with all styles + attributes"]

    style A fill:#0dba63,color:#fff
    style E fill:#e94560,color:#fff
    style G fill:#4353ff,color:#fff
```

> [!IMPORTANT]
> **Why `document.execCommand('copy')` and not `navigator.clipboard.writeText()`?**
> Webflow's paste handler reads the `application/json` MIME type from the synchronous `ClipboardEvent.clipboardData`. The async Clipboard API doesn't support custom MIME types in the same way. This is a critical Webflow-specific pattern.

**What gets pasted** — the [todoTemplate.ts](file:///c:/Users/User/OneDrive/Desktop/todo-app/apps/frontend/src/templates/todoTemplate.ts) file builds this HTML structure:

```
flowappz-todo-root (div, container)                    ← Custom attrs: theme, permissions
├── flowappz-todo-header (flex row)
│   └── flowappz-todo-title (h2: "Todo List")
├── flowappz-todo-form (flex row)
│   ├── flowappz-todo-input (text input)
│   └── flowappz-todo-add-button (submit button)
├── flowappz-todo-list (flex column)
│   └── [for each task]:
│       flowappz-todo-item (flex row)                  ← First item = template for CDN
│       ├── flowappz-todo-checkbox (checkbox)
│       ├── flowappz-todo-text (div with text)
│       └── flowappz-todo-delete (button)
└── flowappz-todo-empty (hidden: "No tasks yet.")
```

Each element carries **custom attributes** (like `flowappz-todo-allow-add="true"`) that the CDN runtime script reads to know what features to enable.

### 6D. Build Pipeline (5 Steps)

```mermaid
graph LR
    A["npm install"] --> B["tsc<br/>(type check)"]
    B --> C["vite build<br/>(bundle to public/)"]
    C --> D["modify-html.cjs<br/>(script type=module → defer)"]
    D --> E["webflow extension bundle<br/>(zip public/ + webflow.json)"]
    E --> F["rename-bundle-zip-file.js<br/>(→ todo-app-DEV.zip)"]

    style A fill:#1a1a2e,color:#fff
    style E fill:#4353ff,color:#fff
    style F fill:#0dba63,color:#fff
```

> [!NOTE]
> The `modify-html.cjs` step is essential — Webflow's extension iframe doesn't support ES module `<script>` tags, so `type="module" crossorigin` is replaced with `defer`.

### 6E. Webflow Designer SDK Usage

Your extension uses two key APIs from the `webflow` global object:

| API | Where Used | Purpose |
|-----|-----------|---------|
| `webflow.getSiteInfo()` | [App.tsx](file:///c:/Users/User/OneDrive/Desktop/todo-app/apps/frontend/src/App.tsx) | Get current site's `siteId` and `shortName` |
| `webflow.notify()` | [CopyElementView.tsx](file:///c:/Users/User/OneDrive/Desktop/todo-app/apps/frontend/src/views/CopyElementView.tsx) | Show toast notifications in Designer |

The `@webflow/designer-extension-typings` package provides TypeScript types for this global.

---

## 7. CDN Deep Dive

### 7A. What the CDN Script Does

The [script.ts](file:///c:/Users/User/OneDrive/Desktop/todo-app/apps/cdn/src/script.ts) is a **self-contained, framework-free** JavaScript file that runs on published Webflow pages.

```mermaid
graph TD
    A["Page loads"] --> B{"document.readyState?"}
    B -->|"loading"| C["Wait for DOMContentLoaded"]
    B -->|"interactive/complete"| D["init()"]
    C --> D
    D --> E["Find all #flowappz-todo-root elements"]
    E --> F["For each root: renderTodo()"]

    F --> G["Read options from custom attributes"]
    G --> H["Read identity (siteId from html[data-wf-site])"]
    H --> I["Prepare template (clone first item)"]
    I --> J["Apply theme (dark/light/system)"]
    J --> K["Fetch tasks from API"]
    K --> L["paint() — render all tasks"]

    L --> M["User interactions"]
    M --> N["Add / Edit / Toggle / Delete"]
    N --> O["commit() — optimistic update"]
    O --> P["paint() immediately"]
    O --> Q["saveDatabaseTasks() in background"]

    style D fill:#f5a623,color:#000
    style K fill:#e94560,color:#fff
    style O fill:#0dba63,color:#fff
```

### 7B. How the CDN Script Connects to Pasted HTML

The CDN script uses **element IDs and custom attributes** as a contract with the pasted HTML from the Designer Extension:

| Selector / Attribute | Purpose |
|----------------------|---------|
| `#flowappz-todo-root` | Root container — script entry point |
| `#flowappz-todo-form` | Add-task form |
| `#flowappz-todo-input` | Text input field |
| `#flowappz-todo-add-button` | Submit button |
| `#flowappz-todo-list` | Task list container |
| `#flowappz-todo-empty` | Empty state message |
| `#flowappz-todo-item-template` | First task item, used as clone template |
| `[flowappz-todo-item="true"]` | Identifies task items |
| `[flowappz-todo-checkbox="true"]` | Identifies checkboxes |
| `flowappz-todo-allow-add` | Permission attribute on root |
| `flowappz-todo-theme` | Theme attribute on root |
| `html[data-wf-site]` | Webflow's own site ID (read by CDN) |

> [!TIP]
> This attribute-based contract is a powerful pattern. The Designer Extension configures behavior through HTML attributes, and the CDN script reads them at runtime. No server round-trip needed for configuration!

### 7C. Optimistic Updates Pattern

```mermaid
sequenceDiagram
    participant User as Site Visitor
    participant CDN as CDN Script
    participant API as Backend API

    User->>CDN: Toggles task checkbox
    CDN->>CDN: Update local tasks array
    CDN->>CDN: paint() — instant UI update
    CDN->>CDN: saveRequestId++ (race guard)
    CDN->>API: PUT /api/todo/tasks (background)

    Note over CDN: Status: "Saving tasks..."

    API-->>CDN: 200 OK + saved tasks
    CDN->>CDN: if (requestId === latest) update state
    CDN->>CDN: Clear status message
```

### 7D. Versioning & Release Flow

```mermaid
graph LR
    A["upload.mjs"] --> B["GET /cdn-release/latest<br/>→ version 0.0.1"]
    B --> C["Bump: 0.0.1 → 0.0.2"]
    C --> D["pnpm build<br/>→ dist/0.0.2/script.js"]
    D --> E["SHA-384 integrity hash"]
    E --> F{"R2 credentials?"}
    F -->|"Yes"| G["Upload to R2<br/>todo-app/dev/0.0.2/script.js"]
    F -->|"No"| H["Use PUBLIC_CDN_BASE_URL<br/>localhost:4173/0.0.2/script.js"]
    G --> I["POST /cdn-release<br/>{ version, url, hash }"]
    H --> I

    style A fill:#f5a623,color:#000
    style G fill:#ff6b35,color:#fff
    style I fill:#e94560,color:#fff
```

### 7E. CSS Injection — No Separate CSS File

The [vite.config.ts](file:///c:/Users/User/OneDrive/Desktop/todo-app/apps/cdn/vite.config.ts) uses `vite-plugin-css-injected-by-js` which **bundles CSS directly into the JavaScript**. At runtime, the JS injects a `<style>` tag into the page's `<head>`.

**Why?** Only ONE file (`script.js`) needs to be hosted and loaded. No separate CSS request = faster loading and simpler deployment.

---

## 8. Local Development Flow

### 8A. What Runs Where

```mermaid
graph TB
    subgraph "Terminal 1"
        T1["pnpm dev:backend<br/>nodemon + ts-node<br/>→ localhost:3000"]
    end

    subgraph "Terminal 2"
        T2["pnpm dev:frontend<br/>Vite + hot reload<br/>→ localhost:1337"]
    end

    subgraph "Terminal 3 (optional)"
        T3["pnpm dev:cdn<br/>Vite dev server<br/>→ localhost:5173"]
    end

    subgraph "Docker"
        PG[("PostgreSQL 16<br/>localhost:5432<br/>todo_app DB")]
    end

    subgraph "Browser"
        WFD["Webflow Designer<br/>+ Extension panel"]
    end

    T1 <--> PG
    T2 <-->|"axios HTTP"| T1
    WFD -->|"loads iframe"| T2
    T2 <-->|"webflow SDK"| WFD
    T3 -.->|"optional: test CDN"| WFD

    style T1 fill:#e94560,color:#fff
    style T2 fill:#0dba63,color:#fff
    style T3 fill:#f5a623,color:#000
    style PG fill:#533483,color:#fff
```

### 8B. Setup Checklist

| Step | Command | What Happens |
|------|---------|--------------|
| 1 | `pnpm install` | Install all dependencies for all 3 apps |
| 2 | `pnpm docker:up` (in apps/backend) | Start PostgreSQL container |
| 3 | Copy `.env.example` → `.env` for each app | Configure secrets |
| 4 | `pnpm db:push` | Push Drizzle schema to database |
| 5 | `pnpm dev:backend` | Start Express API on :3000 |
| 6 | `pnpm dev:frontend` | Start Vite dev server on :1337 |
| 7 | Open Webflow Designer | Configure app dev URL to :1337 |

### 8C. Hot Reload in Development

The frontend uses `@xatom/wf-app-hot-reload` — a Vite plugin that sends WebSocket messages to refresh the extension iframe inside Webflow Designer whenever you save a file. This means you get near-instant feedback without manually refreshing.

---

## 9. Production Deployment Flow

```mermaid
graph TD
    subgraph "Build Phase"
        B1["pnpm build:backend<br/>tsc + tsc-alias → dist/"]
        B2["pnpm build:frontend<br/>Vite → public/ → webflow extension bundle → .zip"]
        B3["pnpm --filter todo-cdn release:production -- --nr patch<br/>Build + R2 upload + register"]
    end

    subgraph "Deploy Phase"
        D1["Backend → Cloud Server<br/>(Railway, Fly.io, etc.)<br/>pnpm start:backend"]
        D2["Frontend → Webflow App Dashboard<br/>Upload .zip file"]
        D3["CDN → Cloudflare R2<br/>(auto-uploaded by release script)"]
    end

    subgraph "Runtime"
        R1["Backend API<br/>serves HTTP requests"]
        R2["Webflow Designer<br/>loads extension from bundle"]
        R3["Published pages<br/>load script.js from R2"]
    end

    B1 --> D1 --> R1
    B2 --> D2 --> R2
    B3 --> D3 --> R3
    R2 -->|"API calls"| R1
    R3 -->|"API calls"| R1

    style D1 fill:#e94560,color:#fff
    style D2 fill:#0dba63,color:#fff
    style D3 fill:#f5a623,color:#000
```

### Production vs Local — Key Differences

| Aspect | Local Development | Production |
|--------|-------------------|------------|
| **Backend** | `nodemon` with ts-node, auto-restart | Compiled JS from `dist/`, `node dist/index.js` |
| **Frontend** | Vite dev server on :1337, hot reload | Bundled `.zip`, uploaded to Webflow marketplace |
| **CDN Script** | Optional `vite preview` on :4173 | Hosted on Cloudflare R2, served via CDN |
| **Database** | Docker PostgreSQL locally | Managed PostgreSQL (e.g., Supabase, Neon) |
| **OAuth redirect** | `localhost:3000/api/webflow/callback` | `yourdomain.com/api/webflow/callback` |
| **CORS** | Allows localhost origins | Allows production + webflow.com domains |
| **Tokens** | Encrypted same way | Encrypted same way |

---

## 10. Universal Webflow App Principles

> [!CAUTION]
> These are the essential patterns and requirements that EVERY Webflow app must follow — not just your todo app. Master these and you can build any Webflow app.

### Principle 1: The Two-World Architecture

Every Webflow app that affects published pages needs both:
- A **Designer Extension** (React iframe in the Designer sidebar) for configuration
- A **CDN Runtime Script** (vanilla JS loaded on published pages) for functionality

They communicate through your backend and through HTML attributes on pasted elements.

### Principle 2: OAuth is Mandatory

Webflow requires OAuth 2.0 for any app accessing site data. Your flow must:
1. Register your app in the Webflow dashboard with correct redirect URIs and scopes
2. Implement the authorization code flow (redirect → consent → callback → token exchange)
3. **Encrypt and securely store** access tokens (never store plaintext tokens)
4. Handle token refresh/expiration gracefully

### Principle 3: The Copy-Paste Contract

To inject your UI into the Webflow Designer canvas, you must:
1. Build an `@webflow/XscpData` JSON payload (Webflow's clipboard format)
2. Copy it to clipboard using `document.execCommand('copy')` with `application/json` MIME type
3. Your pasted elements carry **custom attributes** that your CDN script reads at runtime
4. Use stable, namespaced IDs and attribute names (e.g., `flowappz-todo-*`)

### Principle 4: CDN Script Injection via Custom Code

To get your script running on published pages:
1. Register an **inline loader script** via the Webflow API (`POST /sites/:id/registered_scripts/inline`)
2. Add it to the site's **custom code footer** (`PUT /sites/:id/custom_code`)
3. The loader dynamically creates a `<script>` element pointing to your CDN-hosted script
4. Version your CDN scripts and track releases in your database

### Principle 5: Attribute-Based Configuration

Instead of making API calls to fetch configuration on every page load, bake settings into HTML attributes:
- The Designer Extension writes settings as custom attributes on pasted elements
- The CDN script reads these attributes at runtime
- This reduces API calls and improves published page performance

### Principle 6: Extension iframe Constraints

- The extension runs in an `<iframe>` inside the Webflow Designer
- **No ES modules** — build output must use `defer` scripts, not `type="module"`
- Use the `webflow` global SDK for Designer integration (site info, notifications)
- Match the Designer's dark theme aesthetic for consistency
- Bundle size matters — keep the extension lightweight

### Principle 7: Graceful Degradation

- CDN script should **fall back** to reading HTML content if the API fails
- Use optimistic updates for responsiveness
- Handle race conditions in async saves (save request ID pattern)
- Show clear status messages during loading/saving/errors

### Principle 8: Security Essentials

| What | How |
|------|-----|
| Token storage | AES-256-GCM encryption at rest |
| CORS | Whitelist specific origins + dynamic `*.webflow.com` |
| API validation | Validate `siteId` ownership before returning data |
| CDN integrity | SHA-384 Subresource Integrity hash |
| Environment secrets | `.env` files, never committed to git |

### Principle 9: Versioned CDN Releases

- Version every CDN build (`dist/<version>/script.js`)
- Track releases in your database with version, URL, and integrity hash
- Keep old versions available (don't delete `emptyOutDir: false`)
- Separate release flows for dev/staging/production environments

### Principle 10: The Webflow API Surface

Key Webflow API endpoints every app developer should know:

| Endpoint | Purpose |
|----------|---------|
| `POST /oauth/access_token` | Exchange auth code for access token |
| `GET /token/authorized_by` | Get authenticated user info |
| `GET /sites` / `GET /sites/:id` | List/get sites |
| `POST /sites/:id/registered_scripts/inline` | Register a script for a site |
| `GET /sites/:id/custom_code` | Get site's custom code entries |
| `PUT /sites/:id/custom_code` | Update site's custom code (inject your script) |

---

## 11. File Map — Every File & Its Purpose

### Root

| File | Purpose |
|------|---------|
| [package.json](file:///c:/Users/User/OneDrive/Desktop/todo-app/package.json) | Root workspace scripts |
| [pnpm-workspace.yaml](file:///c:/Users/User/OneDrive/Desktop/todo-app/pnpm-workspace.yaml) | Declares `apps/*` as workspace packages |
| [readme.md](file:///c:/Users/User/OneDrive/Desktop/todo-app/readme.md) | Project overview |
| [wiki/local-setup.md](file:///c:/Users/User/OneDrive/Desktop/todo-app/wiki/local-setup.md) | Detailed local setup guide |

---

### Backend (`apps/backend/`)

| File | Purpose |
|------|---------|
| [package.json](file:///c:/Users/User/OneDrive/Desktop/todo-app/apps/backend/package.json) | Dependencies & scripts (dev, build, db commands) |
| [tsconfig.json](file:///c:/Users/User/OneDrive/Desktop/todo-app/apps/backend/tsconfig.json) | TypeScript config with `@/*` path alias |
| [drizzle.config.ts](file:///c:/Users/User/OneDrive/Desktop/todo-app/apps/backend/drizzle.config.ts) | Drizzle ORM config (schema path, DB URL) |
| [docker-compose.dev.yml](file:///c:/Users/User/OneDrive/Desktop/todo-app/apps/backend/docker-compose.dev.yml) | PostgreSQL 16 container for local dev |
| [src/index.ts](file:///c:/Users/User/OneDrive/Desktop/todo-app/apps/backend/src/index.ts) | Express server entry — CORS, body parsing, routes |
| [src/db.ts](file:///c:/Users/User/OneDrive/Desktop/todo-app/apps/backend/src/db.ts) | Drizzle + pg Pool initialization |
| [src/db/schema.ts](file:///c:/Users/User/OneDrive/Desktop/todo-app/apps/backend/src/db/schema.ts) | All 5 database tables + relations |
| [src/api/index.ts](file:///c:/Users/User/OneDrive/Desktop/todo-app/apps/backend/src/api/index.ts) | API router — mounts sub-routes |
| [src/api/sites.ts](file:///c:/Users/User/OneDrive/Desktop/todo-app/apps/backend/src/api/sites.ts) | Site validation route |
| [src/api/todo.ts](file:///c:/Users/User/OneDrive/Desktop/todo-app/apps/backend/src/api/todo.ts) | Todo settings + tasks routes |
| [src/api/webflow.ts](file:///c:/Users/User/OneDrive/Desktop/todo-app/apps/backend/src/api/webflow.ts) | OAuth, CDN release, script registration routes |
| [src/controllers/sites.ts](file:///c:/Users/User/OneDrive/Desktop/todo-app/apps/backend/src/controllers/sites.ts) | Site validation logic |
| [src/controllers/todo.ts](file:///c:/Users/User/OneDrive/Desktop/todo-app/apps/backend/src/controllers/todo.ts) | Settings CRUD logic |
| [src/controllers/todoTasks.ts](file:///c:/Users/User/OneDrive/Desktop/todo-app/apps/backend/src/controllers/todoTasks.ts) | Tasks CRUD logic (normalize, serialize, bulk replace) |
| [src/controllers/webflow.ts](file:///c:/Users/User/OneDrive/Desktop/todo-app/apps/backend/src/controllers/webflow.ts) | OAuth callback, script injection, CDN release, logout |
| [src/repository/user.ts](file:///c:/Users/User/OneDrive/Desktop/todo-app/apps/backend/src/repository/user.ts) | User upsert + token clearing |
| [src/repository/site.ts](file:///c:/Users/User/OneDrive/Desktop/todo-app/apps/backend/src/repository/site.ts) | Site lookup, validation, deletion |
| [src/repository/todoSettings.ts](file:///c:/Users/User/OneDrive/Desktop/todo-app/apps/backend/src/repository/todoSettings.ts) | Settings upsert + lookup |
| [src/repository/todoTasks.ts](file:///c:/Users/User/OneDrive/Desktop/todo-app/apps/backend/src/repository/todoTasks.ts) | Task CRUD with transactions |
| [src/repository/cdnRelease.ts](file:///c:/Users/User/OneDrive/Desktop/todo-app/apps/backend/src/repository/cdnRelease.ts) | CDN release upsert + latest lookup |
| [src/services/webflow/auth.ts](file:///c:/Users/User/OneDrive/Desktop/todo-app/apps/backend/src/services/webflow/auth.ts) | Webflow OAuth client + token exchange |
| [src/services/webflow/api.ts](file:///c:/Users/User/OneDrive/Desktop/todo-app/apps/backend/src/services/webflow/api.ts) | WebflowApiClient class (SDK wrapper) |
| [src/services/webflow/serializer.ts](file:///c:/Users/User/OneDrive/Desktop/todo-app/apps/backend/src/services/webflow/serializer.ts) | Map Webflow API responses → DB format |
| [src/lib/crypto.ts](file:///c:/Users/User/OneDrive/Desktop/todo-app/apps/backend/src/lib/crypto.ts) | AES-256-GCM encrypt/decrypt for tokens |
| [src/lib/injectTodoScript.ts](file:///c:/Users/User/OneDrive/Desktop/todo-app/apps/backend/src/lib/injectTodoScript.ts) | Build + register + inject CDN loader script |
| [src/config/scripts.ts](file:///c:/Users/User/OneDrive/Desktop/todo-app/apps/backend/src/config/scripts.ts) | Script display name constant |
| [src/constants/todo.ts](file:///c:/Users/User/OneDrive/Desktop/todo-app/apps/backend/src/constants/todo.ts) | DEFAULT_LIST_ID = "default" |
| [scripts/migrate-initial-tasks.ts](file:///c:/Users/User/OneDrive/Desktop/todo-app/apps/backend/scripts/migrate-initial-tasks.ts) | One-time migration script |

---

### Frontend (`apps/frontend/`)

| File | Purpose |
|------|---------|
| [package.json](file:///c:/Users/User/OneDrive/Desktop/todo-app/apps/frontend/package.json) | Dependencies & build pipeline scripts |
| [webflow.json](file:///c:/Users/User/OneDrive/Desktop/todo-app/apps/frontend/webflow.json) | Webflow extension manifest (name, size) |
| [vite.config.ts](file:///c:/Users/User/OneDrive/Desktop/todo-app/apps/frontend/vite.config.ts) | Production Vite build config |
| [vite-dev.config.mjs](file:///c:/Users/User/OneDrive/Desktop/todo-app/apps/frontend/vite-dev.config.mjs) | Dev server config with hot reload plugin |
| [index.html](file:///c:/Users/User/OneDrive/Desktop/todo-app/apps/frontend/index.html) | Vite entry HTML |
| [tailwind.config.cjs](file:///c:/Users/User/OneDrive/Desktop/todo-app/apps/frontend/tailwind.config.cjs) | Tailwind + Inter font |
| [postcss.config.cjs](file:///c:/Users/User/OneDrive/Desktop/todo-app/apps/frontend/postcss.config.cjs) | PostCSS pipeline |
| [src/main.tsx](file:///c:/Users/User/OneDrive/Desktop/todo-app/apps/frontend/src/main.tsx) | React entry point |
| [src/App.tsx](file:///c:/Users/User/OneDrive/Desktop/todo-app/apps/frontend/src/App.tsx) | Root component — state machine, routing, init |
| [src/index.css](file:///c:/Users/User/OneDrive/Desktop/todo-app/apps/frontend/src/index.css) | Global CSS with Tailwind directives |
| [src/types.ts](file:///c:/Users/User/OneDrive/Desktop/todo-app/apps/frontend/src/types.ts) | Shared TypeScript types |
| [src/vite-env.d.ts](file:///c:/Users/User/OneDrive/Desktop/todo-app/apps/frontend/src/vite-env.d.ts) | Webflow global type augmentation |
| [src/modify-html.cjs](file:///c:/Users/User/OneDrive/Desktop/todo-app/apps/frontend/src/modify-html.cjs) | Post-build: module → defer script tags |
| [src/contexts/AppContext.tsx](file:///c:/Users/User/OneDrive/Desktop/todo-app/apps/frontend/src/contexts/AppContext.tsx) | React Context for global state |
| [src/components/Sidebar.tsx](file:///c:/Users/User/OneDrive/Desktop/todo-app/apps/frontend/src/components/Sidebar.tsx) | Navigation sidebar with icons |
| [src/components/Toggle.tsx](file:///c:/Users/User/OneDrive/Desktop/todo-app/apps/frontend/src/components/Toggle.tsx) | Reusable toggle checkbox |
| [src/services/apiService.ts](file:///c:/Users/User/OneDrive/Desktop/todo-app/apps/frontend/src/services/apiService.ts) | Axios client — all backend API calls |
| [src/templates/todoTemplate.ts](file:///c:/Users/User/OneDrive/Desktop/todo-app/apps/frontend/src/templates/todoTemplate.ts) | XscpData payload builder (360 lines) |
| [src/utils/tasks.ts](file:///c:/Users/User/OneDrive/Desktop/todo-app/apps/frontend/src/utils/tasks.ts) | Task normalization from API |
| [src/constants/todo.ts](file:///c:/Users/User/OneDrive/Desktop/todo-app/apps/frontend/src/constants/todo.ts) | DEFAULT_LIST_ID = "default" |
| [src/views/AuthScreen.tsx](file:///c:/Users/User/OneDrive/Desktop/todo-app/apps/frontend/src/views/AuthScreen.tsx) | OAuth initiation screen |
| [src/views/Dashboard.tsx](file:///c:/Users/User/OneDrive/Desktop/todo-app/apps/frontend/src/views/Dashboard.tsx) | Home screen with stats |
| [src/views/TasksView.tsx](file:///c:/Users/User/OneDrive/Desktop/todo-app/apps/frontend/src/views/TasksView.tsx) | Task CRUD interface |
| [src/views/SettingsView.tsx](file:///c:/Users/User/OneDrive/Desktop/todo-app/apps/frontend/src/views/SettingsView.tsx) | Settings toggles |
| [src/views/CopyElementView.tsx](file:///c:/Users/User/OneDrive/Desktop/todo-app/apps/frontend/src/views/CopyElementView.tsx) | Copy-to-clipboard for Designer paste |
| [src/views/LoadingScreen.tsx](file:///c:/Users/User/OneDrive/Desktop/todo-app/apps/frontend/src/views/LoadingScreen.tsx) | Loading spinner |
| [cmd/rename-bundle-zip-file.js](file:///c:/Users/User/OneDrive/Desktop/todo-app/apps/frontend/cmd/rename-bundle-zip-file.js) | Post-build zip renamer |

---

### CDN (`apps/cdn/`)

| File | Purpose |
|------|---------|
| [package.json](file:///c:/Users/User/OneDrive/Desktop/todo-app/apps/cdn/package.json) | Dependencies & release scripts |
| [vite.config.ts](file:///c:/Users/User/OneDrive/Desktop/todo-app/apps/cdn/vite.config.ts) | Build config — CSS-in-JS, versioned output |
| [tsconfig.json](file:///c:/Users/User/OneDrive/Desktop/todo-app/apps/cdn/tsconfig.json) | TypeScript config |
| [src/script.ts](file:///c:/Users/User/OneDrive/Desktop/todo-app/apps/cdn/src/script.ts) | Main runtime — 388 lines, full todo CRUD on published pages |
| [src/style.css](file:///c:/Users/User/OneDrive/Desktop/todo-app/apps/cdn/src/style.css) | Dark theme + focus styles (injected by JS) |
| [src/vite-env.d.ts](file:///c:/Users/User/OneDrive/Desktop/todo-app/apps/cdn/src/vite-env.d.ts) | Compile-time constant types |
| [scripts/upload.mjs](file:///c:/Users/User/OneDrive/Desktop/todo-app/apps/cdn/scripts/upload.mjs) | Build + version bump + R2 upload + release registration |

---

## 🎯 Quick Reference: How Things Connect

````carousel
### Frontend → Backend
```
apiService.ts uses axios to call:
  GET  /api/sites/validate        → Check auth
  GET  /api/webflow/sites         → Get site data
  POST /api/webflow/register-app-scripts → Inject CDN
  GET  /api/todo/settings/:siteId → Load settings
  POST /api/todo/settings         → Save settings
  GET  /api/todo/tasks            → Load tasks
  PUT  /api/todo/tasks            → Save tasks
```
<!-- slide -->
### CDN → Backend
```
script.ts uses fetch() to call:
  GET /api/todo/tasks?siteId=X&listId=Y  → Load tasks
  PUT /api/todo/tasks                     → Save tasks
```
<!-- slide -->
### Frontend → Webflow Designer
```
App.tsx:     webflow.getSiteInfo()   → Get siteId
CopyView:    webflow.notify()        → Show toasts
CopyView:    clipboardData.setData() → Paste elements
```
<!-- slide -->
### Backend → Webflow API
```
auth.ts:    POST /oauth/access_token       → Exchange code
api.ts:     GET  /token/authorized_by      → User info
api.ts:     GET  /sites                    → List sites
api.ts:     POST /sites/:id/registered_scripts/inline → Register script
api.ts:     PUT  /sites/:id/custom_code    → Inject custom code
```
<!-- slide -->
### Upload Script → Backend + R2
```
upload.mjs:
  GET  /api/webflow/cdn-release/latest → Get current version
  POST /api/webflow/cdn-release        → Register new release
  PUT  R2 bucket                       → Upload script.js
```
````

---

> [!TIP]
> **Your next step**: Build something more complex! Now that you understand the three-pillar architecture, OAuth flow, XscpData clipboard format, and CDN script injection pattern, you have the foundational knowledge to build any Webflow app — whether it's an analytics dashboard, a form builder, a CMS plugin, or an e-commerce tool. The patterns are the same; only the business logic changes.
