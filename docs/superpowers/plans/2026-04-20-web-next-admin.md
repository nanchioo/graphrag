# Web Next Admin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a separate `web-next` GraphRAG admin frontend with a complete 9-screen shell, mock-backed repositories, and backend static hosting at `/console-next` without modifying the existing `web` app.

**Architecture:** Create a second Vite + React + TypeScript SPA under `web-next`, expose it through FastAPI as an additional static console, and organize the frontend around repository interfaces plus mock implementations so the UI is phase-1 static but phase-2 integration-ready. Preserve the provided design-system look by owning local tokens, shell primitives, and page layouts inside the repo.

**Tech Stack:** FastAPI, pytest, React, TypeScript, Vite, React Router, CSS, ECharts

---

**Execution note:** The user explicitly requested direct work in the main project and no git commits. Execute this plan in the current workspace, and replace commit steps with diff-review checkpoints.

## File Map

### Backend hosting

- Modify: `main.py`
  Responsibility: mount `web-next/dist` at `/console-next` while preserving existing `/console` hosting.
- Modify: `tests/unit/api/test_static_hosting.py`
  Responsibility: verify the new static-hosted SPA path works and does not break the existing console.

### Frontend package scaffold

- Create: `web-next/package.json`
  Responsibility: independent frontend package metadata, scripts, and dependencies.
- Create: `web-next/tsconfig.json`
- Create: `web-next/tsconfig.app.json`
- Create: `web-next/tsconfig.node.json`
  Responsibility: TypeScript project configuration aligned with the existing `web` app.
- Create: `web-next/vite.config.ts`
  Responsibility: Vite config with `/console-next/` base path and `/api` proxy.
- Create: `web-next/index.html`
  Responsibility: SPA entry document.
- Create: `web-next/src/main.tsx`
  Responsibility: bootstrap React, global styles, and providers.
- Create: `web-next/src/vite-env.d.ts`
  Responsibility: Vite client typings.

### App shell and styling

- Create: `web-next/src/App.tsx`
  Responsibility: top-level provider and router composition.
- Create: `web-next/src/app/router/routes.tsx`
  Responsibility: route table for the 9-screen shell.
- Create: `web-next/src/app/layout/AppShell.tsx`
  Responsibility: sidebar, top header, route outlet, and consistent shell layout.
- Create: `web-next/src/app/layout/nav.ts`
  Responsibility: sidebar metadata with stable route ids and Chinese-first labels.
- Create: `web-next/src/shared/ui/Button.tsx`
- Create: `web-next/src/shared/ui/Card.tsx`
- Create: `web-next/src/shared/ui/StatCard.tsx`
- Create: `web-next/src/shared/ui/PageHeader.tsx`
- Create: `web-next/src/shared/ui/Badge.tsx`
- Create: `web-next/src/shared/ui/EmptyState.tsx`
- Create: `web-next/src/shared/ui/Alert.tsx`
- Create: `web-next/src/shared/ui/Skeleton.tsx`
  Responsibility: shared presentational primitives for all pages.
- Create: `web-next/src/styles/tokens.css`
- Create: `web-next/src/styles/globals.css`
- Create: `web-next/src/styles/utilities.css`
  Responsibility: local design tokens and app-wide styling rules.

### Domain types and repositories

- Create: `web-next/src/shared/types/api.ts`
  Responsibility: backend-compatible payload types mirrored from the current `web` app.
- Create: `web-next/src/services/repositories/types.ts`
  Responsibility: repository interfaces and provider types.
- Create: `web-next/src/services/repositories/mockRepositories.ts`
  Responsibility: construct the phase-1 repository bundle from fixtures.
- Create: `web-next/src/app/providers/RepositoryProvider.tsx`
  Responsibility: React context for repository access.
- Create: `web-next/src/mocks/fixtures/graphs.ts`
- Create: `web-next/src/mocks/fixtures/query.ts`
- Create: `web-next/src/mocks/fixtures/settings.ts`
- Create: `web-next/src/mocks/fixtures/dashboard.ts`
  Responsibility: realistic mock data for the 9-screen app.

### Route pages and feature slices

- Create: `web-next/src/pages/dashboard/DashboardPage.tsx`
- Create: `web-next/src/pages/graphs/GraphManagementPage.tsx`
- Create: `web-next/src/pages/graph-viz/GraphVisualizationPage.tsx`
- Create: `web-next/src/pages/data-sources/DataSourcesPage.tsx`
- Create: `web-next/src/pages/query/QueryWorkbenchPage.tsx`
- Create: `web-next/src/pages/browse/EntityBrowserPage.tsx`
- Create: `web-next/src/pages/jobs/JobMonitorPage.tsx`
- Create: `web-next/src/pages/dify/DifyIntegrationPage.tsx`
- Create: `web-next/src/pages/settings/SettingsPage.tsx`
  Responsibility: route-level page composition.
- Create: `web-next/src/features/graph-management/GraphListPanel.tsx`
- Create: `web-next/src/features/graph-management/GraphDetailPanel.tsx`
- Create: `web-next/src/features/graph-management/BuildStatusPanel.tsx`
- Create: `web-next/src/features/graph-query/QueryComposer.tsx`
- Create: `web-next/src/features/graph-query/QueryResultPanel.tsx`
- Create: `web-next/src/features/model-profiles/ModelProfilesPanel.tsx`
  Responsibility: migration-priority business panels that can later bind to live repositories.

### Frontend tests

- Create: `tests/unit/web/test_web_next_scaffold.py`
  Responsibility: source assertions for package metadata, shell wiring, repository contracts, page structure, and migration-ready composition.

### Build artifact

- Create after dependency install: `web-next/package-lock.json`
  Responsibility: lock frontend dependency resolution for reproducible builds.

### Route and shell naming decisions

- Use `/console-next` as the backend-served prefix.
- Use `/console-next/` as the Vite base path.
- Keep internal route ids stable: `dashboard`, `graphs`, `graph-viz`, `sources`, `query`, `browse`, `jobs`, `dify`, `settings`.
- Keep actual UI copy Chinese-first even when internal file names and route ids are English.

## Task 1: Scaffold the standalone `web-next` package

**Files:**
- Create: `web-next/package.json`
- Create: `web-next/tsconfig.json`
- Create: `web-next/tsconfig.app.json`
- Create: `web-next/tsconfig.node.json`
- Create: `web-next/vite.config.ts`
- Create: `web-next/index.html`
- Create: `web-next/src/main.tsx`
- Create: `web-next/src/vite-env.d.ts`
- Create: `web-next/src/App.tsx`
- Test: `tests/unit/web/test_web_next_scaffold.py`

- [ ] **Step 1: Write the failing scaffold assertions**

Add the first test block to `tests/unit/web/test_web_next_scaffold.py`:

```python
import json
from pathlib import Path


def test_web_next_package_declares_scripts_and_dependencies():
    web_root = Path("web-next")
    package_json = json.loads((web_root / "package.json").read_text(encoding="utf-8"))

    assert package_json["name"] == "graphrag-web-next"
    assert package_json["private"] is True
    assert package_json["scripts"] == {
        "dev": "vite",
        "build": "tsc -b && vite build",
        "preview": "vite preview",
    }
    assert "react" in package_json["dependencies"]
    assert "react-dom" in package_json["dependencies"]
    assert "react-router-dom" in package_json["dependencies"]
    assert "echarts" in package_json["dependencies"]


def test_web_next_scaffold_contains_expected_entry_files():
    web_root = Path("web-next")
    expected_paths = [
        web_root / "index.html",
        web_root / "package.json",
        web_root / "tsconfig.json",
        web_root / "tsconfig.app.json",
        web_root / "tsconfig.node.json",
        web_root / "vite.config.ts",
        web_root / "src" / "main.tsx",
        web_root / "src" / "vite-env.d.ts",
        web_root / "src" / "App.tsx",
    ]
    missing_paths = [str(path) for path in expected_paths if not path.exists()]
    assert missing_paths == []
```

- [ ] **Step 2: Run the scaffold test to verify it fails**

Run: `& '.\.venv\Scripts\python.exe' -m pytest tests/unit/web/test_web_next_scaffold.py -k scaffold -q`
Expected: FAIL because `web-next` and its package files do not exist yet.

- [ ] **Step 3: Create the minimal standalone frontend scaffold**

Create the package and entry files with this baseline:

```json
{
  "name": "graphrag-web-next",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "echarts": "^5.6.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.30.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.4",
    "typescript": "^5.6.3",
    "vite": "^5.4.10"
  }
}
```

```ts
// web-next/vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/console-next/",
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 5175,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
```

```tsx
// web-next/src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

```tsx
// web-next/src/App.tsx
export default function App() {
  return <div>web-next bootstrap</div>;
}
```

- [ ] **Step 4: Run the scaffold test again**

Run: `& '.\.venv\Scripts\python.exe' -m pytest tests/unit/web/test_web_next_scaffold.py -k scaffold -q`
Expected: PASS for the scaffold assertions.

- [ ] **Step 5: Review the scaffold diff instead of committing**

Run: `git diff -- web-next tests/unit/web/test_web_next_scaffold.py`
Expected: only the new `web-next` package files and the scaffold test are shown.

## Task 2: Add backend static hosting for `/console-next`

**Files:**
- Modify: `main.py`
- Modify: `tests/unit/api/test_static_hosting.py`

- [ ] **Step 1: Write the failing static-hosting tests for the new console**

Extend `tests/unit/api/test_static_hosting.py` with:

```python
def test_create_app_serves_console_next_spa_when_dist_exists(tmp_path: Path):
    next_dist_dir = tmp_path / "web-next-dist"
    assets_dir = next_dist_dir / "assets"
    assets_dir.mkdir(parents=True, exist_ok=True)

    index_html = (
        "<!doctype html><html><body>"
        '<div id="root"></div>'
        '<script type="module" src="/console-next/assets/app.js"></script>'
        "</body></html>"
    )
    (next_dist_dir / "index.html").write_text(index_html, encoding="utf-8")
    (assets_dir / "app.js").write_text("console.log('console-next');", encoding="utf-8")

    client = TestClient(create_app(web_dist_dir=tmp_path / "missing-dist", web_next_dist_dir=next_dist_dir))

    assert client.get("/console-next").status_code == 200
    assert client.get("/console-next/assets/app.js").text == "console.log('console-next');"
    assert client.get("/console-next/graphs").text == index_html
```

- [ ] **Step 2: Run the static-hosting tests to verify they fail**

Run: `& '.\.venv\Scripts\python.exe' -m pytest tests/unit/api/test_static_hosting.py -q`
Expected: FAIL because `create_app()` and `main.py` do not support `web_next_dist_dir` or `/console-next` yet.

- [ ] **Step 3: Generalize static hosting and mount `web-next`**

Refactor `main.py` into a reusable helper and add the second console:

```python
WEB_DIST_DIR = Path("web/dist")
WEB_NEXT_DIST_DIR = Path("web-next/dist")
CONSOLE_PREFIX = "/console"
CONSOLE_NEXT_PREFIX = "/console-next"


def _configure_spa_routes(
    app: FastAPI,
    dist_dir: Path,
    prefix: str,
    asset_mount_name: str,
) -> None:
    index_file = dist_dir / "index.html"
    if not index_file.exists():
        return

    assets_dir = dist_dir / "assets"
    if assets_dir.exists():
        app.mount(f"{prefix}/assets", StaticFiles(directory=assets_dir), name=asset_mount_name)

    @app.get(prefix, include_in_schema=False)
    @app.get(f"{prefix}/", include_in_schema=False)
    async def serve_index() -> FileResponse:
        return FileResponse(index_file)

    @app.get(f"{prefix}/{{relative_path:path}}", include_in_schema=False)
    async def serve_app(relative_path: str) -> FileResponse:
        target = _resolve_console_target(dist_dir, relative_path)
        if target and target.is_file():
            return FileResponse(target)
        if Path(relative_path).suffix:
            raise HTTPException(status_code=404, detail="Frontend asset not found.")
        return FileResponse(index_file)
```

Then call it from `create_app()` for both consoles:

```python
def create_app(
    web_dist_dir: Path | None = None,
    web_next_dist_dir: Path | None = None,
) -> FastAPI:
    app = FastAPI(
        title=APP_NAME,
        version=APP_VERSION,
        description="FastAPI wrapper layer for GraphRAG management and query APIs.",
    )
    app.add_exception_handler(HTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(Exception, unhandled_exception_handler)
    for router in (graph_router, config_router, query_router):
        app.include_router(router)
    _configure_spa_routes(app, (web_dist_dir or WEB_DIST_DIR).resolve(), CONSOLE_PREFIX, "graphrag-web-assets")
    _configure_spa_routes(app, (web_next_dist_dir or WEB_NEXT_DIST_DIR).resolve(), CONSOLE_NEXT_PREFIX, "graphrag-web-next-assets")
    return app
```

- [ ] **Step 4: Run the static-hosting tests again**

Run: `& '.\.venv\Scripts\python.exe' -m pytest tests/unit/api/test_static_hosting.py -q`
Expected: PASS for both `/console` and `/console-next` hosting checks.

- [ ] **Step 5: Review the backend hosting diff instead of committing**

Run: `git diff -- main.py tests/unit/api/test_static_hosting.py`
Expected: only the generalized SPA-hosting helper and `/console-next` tests are shown.

## Task 3: Build the design tokens, shell primitives, and routed app frame

**Files:**
- Modify: `web-next/src/App.tsx`
- Create: `web-next/src/app/router/routes.tsx`
- Create: `web-next/src/app/layout/AppShell.tsx`
- Create: `web-next/src/app/layout/nav.ts`
- Create: `web-next/src/shared/ui/Button.tsx`
- Create: `web-next/src/shared/ui/Card.tsx`
- Create: `web-next/src/shared/ui/StatCard.tsx`
- Create: `web-next/src/shared/ui/PageHeader.tsx`
- Create: `web-next/src/shared/ui/Badge.tsx`
- Create: `web-next/src/shared/ui/EmptyState.tsx`
- Create: `web-next/src/shared/ui/Alert.tsx`
- Create: `web-next/src/shared/ui/Skeleton.tsx`
- Create: `web-next/src/styles/tokens.css`
- Create: `web-next/src/styles/globals.css`
- Create: `web-next/src/styles/utilities.css`
- Modify: `web-next/src/main.tsx`
- Test: `tests/unit/web/test_web_next_scaffold.py`

- [ ] **Step 1: Write the failing shell and router assertions**

Add these checks to `tests/unit/web/test_web_next_scaffold.py`:

```python
def test_web_next_shell_wires_routes_and_tokens():
    app_source = Path("web-next/src/App.tsx").read_text(encoding="utf-8")
    route_source = Path("web-next/src/app/router/routes.tsx").read_text(encoding="utf-8")
    shell_source = Path("web-next/src/app/layout/AppShell.tsx").read_text(encoding="utf-8")
    nav_source = Path("web-next/src/app/layout/nav.ts").read_text(encoding="utf-8")
    tokens_source = Path("web-next/src/styles/tokens.css").read_text(encoding="utf-8")

    assert "RouterProvider" in app_source
    assert 'path: "/dashboard"' in route_source
    assert 'path: "/graphs"' in route_source
    assert 'path: "/settings"' in route_source
    assert "AppShell" in shell_source
    assert "Dashboard" in nav_source
    assert "图谱管理" in nav_source
    assert "--brand-600: #155EEF;" in tokens_source
    assert "--sidebar-w: 240px;" in tokens_source
```

- [ ] **Step 2: Run the routed-shell assertions to verify they fail**

Run: `& '.\.venv\Scripts\python.exe' -m pytest tests/unit/web/test_web_next_scaffold.py -k shell -q`
Expected: FAIL because the router, shell, nav metadata, and token files do not exist yet.

- [ ] **Step 3: Implement the app shell and shared styling**

Create the route table and shell using this shape:

```ts
// web-next/src/app/layout/nav.ts
export const navItems = [
  { id: "dashboard", label: "Dashboard", to: "/dashboard" },
  { id: "graphs", label: "图谱管理", to: "/graphs" },
  { id: "graph-viz", label: "图谱可视化", to: "/graphs/demo-001/viz" },
  { id: "sources", label: "数据源", to: "/sources" },
  { id: "query", label: "查询测试台", to: "/query" },
  { id: "browse", label: "实体 / 关系浏览", to: "/browse" },
  { id: "jobs", label: "任务监控", to: "/jobs" },
  { id: "dify", label: "Dify 对接", to: "/dify" },
  { id: "settings", label: "系统设置", to: "/settings" },
];
```

```tsx
// web-next/src/app/layout/AppShell.tsx
import { NavLink, Outlet } from "react-router-dom";
import { navItems } from "./nav";

export function AppShell() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        {navItems.map((item) => (
          <NavLink key={item.id} to={item.to} className="nav-link">
            {item.label}
          </NavLink>
        ))}
      </aside>
      <div className="main-panel">
        <header className="top-header">GraphRAG Admin</header>
        <main className="page-body">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
```

```tsx
// web-next/src/app/router/routes.tsx
import { Navigate, createBrowserRouter } from "react-router-dom";
import { AppShell } from "../layout/AppShell";

function PlaceholderPage({ title }: { title: string }) {
  return <div>{title}</div>;
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: "/dashboard", element: <PlaceholderPage title="Dashboard" /> },
      { path: "/graphs", element: <PlaceholderPage title="图谱管理" /> },
      { path: "/graphs/:graphId/viz", element: <PlaceholderPage title="图谱可视化" /> },
      { path: "/sources", element: <PlaceholderPage title="数据源" /> },
      { path: "/query", element: <PlaceholderPage title="查询测试台" /> },
      { path: "/browse", element: <PlaceholderPage title="实体 / 关系浏览" /> },
      { path: "/jobs", element: <PlaceholderPage title="任务监控" /> },
      { path: "/dify", element: <PlaceholderPage title="Dify 对接" /> },
      { path: "/settings", element: <PlaceholderPage title="系统设置" /> },
    ],
  },
]);
```

```css
/* web-next/src/styles/tokens.css */
:root {
  --brand-600: #155EEF;
  --accent-500: #6366F1;
  --bg-canvas: #F7F8FA;
  --bg-card: #FFFFFF;
  --border-subtle: #E5E7EB;
  --fg-primary: #0D0D0D;
  --fg-secondary: #676F83;
  --sidebar-w: 240px;
  --header-h: 56px;
}
```

Then update `web-next/src/main.tsx` and `web-next/src/App.tsx` to import the styles and render `RouterProvider`.

- [ ] **Step 4: Run the shell assertions again**

Run: `& '.\.venv\Scripts\python.exe' -m pytest tests/unit/web/test_web_next_scaffold.py -k shell -q`
Expected: PASS for the shell, route, nav, and token assertions.

- [ ] **Step 5: Review the shell diff instead of committing**

Run: `git diff -- web-next/src tests/unit/web/test_web_next_scaffold.py`
Expected: the new shell, routes, shared UI primitives, and CSS token files are shown.

## Task 4: Add repository contracts, mock fixtures, and provider wiring

**Files:**
- Create: `web-next/src/shared/types/api.ts`
- Create: `web-next/src/services/repositories/types.ts`
- Create: `web-next/src/services/repositories/mockRepositories.ts`
- Create: `web-next/src/app/providers/RepositoryProvider.tsx`
- Create: `web-next/src/mocks/fixtures/graphs.ts`
- Create: `web-next/src/mocks/fixtures/query.ts`
- Create: `web-next/src/mocks/fixtures/settings.ts`
- Create: `web-next/src/mocks/fixtures/dashboard.ts`
- Modify: `web-next/src/App.tsx`
- Test: `tests/unit/web/test_web_next_scaffold.py`

- [ ] **Step 1: Write the failing data-layer assertions**

Add these checks to `tests/unit/web/test_web_next_scaffold.py`:

```python
def test_web_next_data_layer_uses_repository_contracts():
    api_types_source = Path("web-next/src/shared/types/api.ts").read_text(encoding="utf-8")
    repository_types_source = Path("web-next/src/services/repositories/types.ts").read_text(encoding="utf-8")
    repository_provider_source = Path("web-next/src/app/providers/RepositoryProvider.tsx").read_text(encoding="utf-8")
    mock_repositories_source = Path("web-next/src/services/repositories/mockRepositories.ts").read_text(encoding="utf-8")

    assert "export interface GraphDetailPayload" in api_types_source
    assert "export interface GraphStatusPayload" in api_types_source
    assert "export interface GraphRepository" in repository_types_source
    assert "export interface QueryRepository" in repository_types_source
    assert "createContext" in repository_provider_source
    assert "useRepositories" in repository_provider_source
    assert "createMockRepositories" in mock_repositories_source
```

- [ ] **Step 2: Run the repository assertions to verify they fail**

Run: `& '.\.venv\Scripts\python.exe' -m pytest tests/unit/web/test_web_next_scaffold.py -k repository -q`
Expected: FAIL because the mirrored API types, repository interfaces, and provider files do not exist yet.

- [ ] **Step 3: Implement the mirrored types, repository interfaces, and mock provider**

Create the backend-compatible type surface:

```ts
// web-next/src/shared/types/api.ts
export interface GraphSummary {
  id: string;
  name: string;
  status: string;
  model_profile_id?: string | null;
}

export interface GraphDetailPayload {
  id: string;
  name: string;
  description?: string | null;
  root_dir: string;
  status: string;
  model_profile_id?: string | null;
  created_at: string;
  last_build_at?: string | null;
}

export interface GraphStatusPayload {
  graph_id: string;
  status: string;
  text_unit_count: number;
  has_artifacts: boolean;
  progress_percent: number;
  progress_stage: string;
  progress_message: string;
}

export interface ModelProfileResponse {
  id: string;
  provider: "openai" | "azure" | "ollama";
  name: string;
  base_url: string;
  model_name: string;
  is_default: boolean;
  has_api_key: boolean;
}

export interface SystemConfigPayload {
  projects_root: string;
  upload_root: string;
  default_model_profile_id?: string | null;
}

export interface QueryResponsePayload {
  graph_id: string;
  mode: "global" | "local" | "drift";
  answer: string;
  context: Record<string, unknown>;
}
```

Create the repository contracts:

```ts
// web-next/src/services/repositories/types.ts
import type {
  GraphDetailPayload,
  GraphStatusPayload,
  GraphSummary,
  QueryResponsePayload,
  SystemConfigPayload,
  ModelProfileResponse,
} from "../../shared/types/api";

export interface GraphRepository {
  listGraphs(): Promise<GraphSummary[]>;
  getGraph(graphId: string): Promise<GraphDetailPayload>;
  getGraphStatus(graphId: string): Promise<GraphStatusPayload>;
}

export interface QueryRepository {
  runSampleQuery(graphId: string, mode: "global" | "local" | "drift"): Promise<QueryResponsePayload>;
}

export interface SettingsRepository {
  getSystemConfig(): Promise<SystemConfigPayload>;
  listModelProfiles(): Promise<ModelProfileResponse[]>;
}

export interface RepositoryBundle {
  graphRepository: GraphRepository;
  queryRepository: QueryRepository;
  settingsRepository: SettingsRepository;
}
```

Wire the provider:

```tsx
// web-next/src/app/providers/RepositoryProvider.tsx
import { PropsWithChildren, createContext, useContext, useMemo } from "react";
import { createMockRepositories } from "../../services/repositories/mockRepositories";
import type { RepositoryBundle } from "../../services/repositories/types";

const RepositoryContext = createContext<RepositoryBundle | null>(null);

export function RepositoryProvider({ children }: PropsWithChildren) {
  const repositories = useMemo(() => createMockRepositories(), []);
  return <RepositoryContext.Provider value={repositories}>{children}</RepositoryContext.Provider>;
}

export function useRepositories() {
  const value = useContext(RepositoryContext);
  if (!value) {
    throw new Error("RepositoryProvider is missing");
  }
  return value;
}
```

Then wrap `RouterProvider` inside `RepositoryProvider` in `web-next/src/App.tsx`.

- [ ] **Step 4: Run the repository assertions again**

Run: `& '.\.venv\Scripts\python.exe' -m pytest tests/unit/web/test_web_next_scaffold.py -k repository -q`
Expected: PASS for the repository and provider assertions.

- [ ] **Step 5: Review the data-layer diff instead of committing**

Run: `git diff -- web-next/src tests/unit/web/test_web_next_scaffold.py`
Expected: only the mirrored types, mock fixtures, repository interfaces, and provider wiring are shown.

## Task 5: Implement the migration-priority pages

**Files:**
- Modify: `web-next/src/app/router/routes.tsx`
- Create: `web-next/src/pages/graphs/GraphManagementPage.tsx`
- Create: `web-next/src/pages/query/QueryWorkbenchPage.tsx`
- Create: `web-next/src/pages/settings/SettingsPage.tsx`
- Create: `web-next/src/features/graph-management/GraphListPanel.tsx`
- Create: `web-next/src/features/graph-management/GraphDetailPanel.tsx`
- Create: `web-next/src/features/graph-management/BuildStatusPanel.tsx`
- Create: `web-next/src/features/graph-query/QueryComposer.tsx`
- Create: `web-next/src/features/graph-query/QueryResultPanel.tsx`
- Create: `web-next/src/features/model-profiles/ModelProfilesPanel.tsx`
- Modify: `tests/unit/web/test_web_next_scaffold.py`

- [ ] **Step 1: Write the failing assertions for the 3 migration-ready screens**

Add these checks to `tests/unit/web/test_web_next_scaffold.py`:

```python
def test_web_next_core_pages_are_repository_driven():
    graph_page_source = Path("web-next/src/pages/graphs/GraphManagementPage.tsx").read_text(encoding="utf-8")
    graph_detail_panel_source = Path("web-next/src/features/graph-management/GraphDetailPanel.tsx").read_text(encoding="utf-8")
    query_page_source = Path("web-next/src/pages/query/QueryWorkbenchPage.tsx").read_text(encoding="utf-8")
    settings_page_source = Path("web-next/src/pages/settings/SettingsPage.tsx").read_text(encoding="utf-8")

    assert "useRepositories" in graph_page_source
    assert "GraphListPanel" in graph_page_source
    assert "GraphDetailPanel" in graph_page_source
    assert "BuildStatusPanel" in graph_detail_panel_source
    assert "图谱管理" in graph_page_source

    assert "QueryComposer" in query_page_source
    assert "QueryResultPanel" in query_page_source
    assert "查询测试台" in query_page_source
    assert "global" in query_page_source
    assert "drift" in query_page_source

    assert "ModelProfilesPanel" in settings_page_source
    assert "系统设置" in settings_page_source
    assert "默认模型配置" in settings_page_source
```

- [ ] **Step 2: Run the core-page assertions to verify they fail**

Run: `& '.\.venv\Scripts\python.exe' -m pytest tests/unit/web/test_web_next_scaffold.py -k core_pages -q`
Expected: FAIL because the 3 route pages and feature panels do not exist yet.

- [ ] **Step 3: Implement the 3 migration-priority screens around repository data**

Compose the graph page like this:

```tsx
// web-next/src/pages/graphs/GraphManagementPage.tsx
import { useEffect, useState } from "react";
import { useRepositories } from "../../app/providers/RepositoryProvider";
import type { GraphSummary } from "../../shared/types/api";
import { PageHeader } from "../../shared/ui/PageHeader";
import { GraphListPanel } from "../../features/graph-management/GraphListPanel";
import { GraphDetailPanel } from "../../features/graph-management/GraphDetailPanel";

export function GraphManagementPage() {
  const { graphRepository } = useRepositories();
  const [graphs, setGraphs] = useState<GraphSummary[]>([]);
  const [selectedGraphId, setSelectedGraphId] = useState<string | null>(null);

  useEffect(() => {
    void graphRepository.listGraphs().then((items) => {
      setGraphs(items);
      setSelectedGraphId(items[0]?.id ?? null);
    });
  }, [graphRepository]);

  return (
    <>
      <PageHeader title="图谱管理" description="查看图谱详情、构建状态和源数据准备情况。" />
      <section className="two-column-layout">
        <GraphListPanel graphs={graphs} selectedGraphId={selectedGraphId} onSelect={setSelectedGraphId} />
        <GraphDetailPanel graphId={selectedGraphId} />
      </section>
    </>
  );
}
```

Compose the query page like this:

```tsx
// web-next/src/pages/query/QueryWorkbenchPage.tsx
import { PageHeader } from "../../shared/ui/PageHeader";
import { QueryComposer } from "../../features/graph-query/QueryComposer";
import { QueryResultPanel } from "../../features/graph-query/QueryResultPanel";

export function QueryWorkbenchPage() {
  return (
    <>
      <PageHeader title="查询测试台" description="在接入应用前，先验证 GraphRAG 的检索效果。" />
      <section className="two-column-layout">
        <QueryComposer />
        <QueryResultPanel />
      </section>
    </>
  );
}
```

Compose the settings page like this:

```tsx
// web-next/src/pages/settings/SettingsPage.tsx
import { ModelProfilesPanel } from "../../features/model-profiles/ModelProfilesPanel";
import { Card } from "../../shared/ui/Card";
import { PageHeader } from "../../shared/ui/PageHeader";

export function SettingsPage() {
  return (
    <>
      <PageHeader title="系统设置" description="管理系统路径、默认模型配置和模型档案。" />
      <div className="stack-lg">
        <Card title="系统路径配置">
          <div className="stack-sm">
            <div>projects_root: D:/Software/Project/graphrag/data/projects</div>
            <div>upload_root: D:/Software/Project/graphrag/data/uploads</div>
            <div>默认模型配置: deepseek-chat-default</div>
          </div>
        </Card>
        <ModelProfilesPanel />
      </div>
    </>
  );
}
```

Back the graph detail area with a dedicated feature panel:

```tsx
// web-next/src/features/graph-management/GraphDetailPanel.tsx
import { useEffect, useState } from "react";
import { useRepositories } from "../../app/providers/RepositoryProvider";
import type { GraphDetailPayload, GraphStatusPayload } from "../../shared/types/api";
import { Card } from "../../shared/ui/Card";
import { EmptyState } from "../../shared/ui/EmptyState";
import { BuildStatusPanel } from "./BuildStatusPanel";

export function GraphDetailPanel({ graphId }: { graphId: string | null }) {
  const { graphRepository } = useRepositories();
  const [graph, setGraph] = useState<GraphDetailPayload | null>(null);
  const [status, setStatus] = useState<GraphStatusPayload | null>(null);

  useEffect(() => {
    if (!graphId) {
      setGraph(null);
      setStatus(null);
      return;
    }
    void Promise.all([
      graphRepository.getGraph(graphId),
      graphRepository.getGraphStatus(graphId),
    ]).then(([detail, nextStatus]) => {
      setGraph(detail);
      setStatus(nextStatus);
    });
  }, [graphId, graphRepository]);

  if (!graphId) {
    return <EmptyState title="未选择图谱" description="先从左侧列表选择一个图谱。" />;
  }

  return (
    <div className="stack-lg">
      <Card title={graph?.name ?? "加载中"}>{graph?.description ?? "暂无描述"}</Card>
      <BuildStatusPanel status={status} />
    </div>
  );
}
```

```tsx
// web-next/src/features/graph-management/BuildStatusPanel.tsx
import type { GraphStatusPayload } from "../../shared/types/api";
import { Card } from "../../shared/ui/Card";

export function BuildStatusPanel({ status }: { status: GraphStatusPayload | null }) {
  return (
    <Card title="构建状态">
      <div>status: {status?.status ?? "unknown"}</div>
      <div>text_unit_count: {status?.text_unit_count ?? 0}</div>
      <div>progress: {status?.progress_percent ?? 0}%</div>
      <div>stage: {status?.progress_stage ?? "idle"}</div>
    </Card>
  );
}
```

Keep the query screen split into composer and result panels:

```tsx
// web-next/src/features/graph-query/QueryComposer.tsx
import { Card } from "../../shared/ui/Card";

export function QueryComposer() {
  return (
    <Card title="查询参数">
      <div>Mode: global / local / drift</div>
      <div>Graph: demo-001</div>
      <div>Question: GraphRAG 如何组织社区报告？</div>
    </Card>
  );
}
```

Keep the settings screen model management in a separate panel:

```tsx
// web-next/src/features/model-profiles/ModelProfilesPanel.tsx
import { Card } from "../../shared/ui/Card";

export function ModelProfilesPanel() {
  return (
    <Card title="模型列表">
      <div>DeepSeek Chat · 默认</div>
      <div>text-embedding-3-small · OpenAI</div>
      <div>Azure GPT-4o · 备用</div>
    </Card>
  );
}
```

Ensure these pages render realistic loading, empty, and populated mock states through the repository bundle.

Update `web-next/src/app/router/routes.tsx` in the same step so the placeholder elements for `/graphs`, `/query`, and `/settings` are replaced by imported real page components.

- [ ] **Step 4: Run the core-page assertions again**

Run: `& '.\.venv\Scripts\python.exe' -m pytest tests/unit/web/test_web_next_scaffold.py -k core_pages -q`
Expected: PASS for the graph-management, query, and settings assertions.

- [ ] **Step 5: Review the core-page diff instead of committing**

Run: `git diff -- web-next/src tests/unit/web/test_web_next_scaffold.py`
Expected: only the 3 migration-priority pages and their feature panels are shown.

## Task 6: Implement the remaining 6 route pages

**Files:**
- Modify: `web-next/src/app/router/routes.tsx`
- Create: `web-next/src/pages/dashboard/DashboardPage.tsx`
- Create: `web-next/src/pages/graph-viz/GraphVisualizationPage.tsx`
- Create: `web-next/src/pages/data-sources/DataSourcesPage.tsx`
- Create: `web-next/src/pages/browse/EntityBrowserPage.tsx`
- Create: `web-next/src/pages/jobs/JobMonitorPage.tsx`
- Create: `web-next/src/pages/dify/DifyIntegrationPage.tsx`
- Modify: `tests/unit/web/test_web_next_scaffold.py`

- [ ] **Step 1: Write the failing assertions for the remaining 6 routes**

Add these checks to `tests/unit/web/test_web_next_scaffold.py`:

```python
def test_web_next_supporting_pages_cover_all_phase_one_routes():
    dashboard_source = Path("web-next/src/pages/dashboard/DashboardPage.tsx").read_text(encoding="utf-8")
    viz_source = Path("web-next/src/pages/graph-viz/GraphVisualizationPage.tsx").read_text(encoding="utf-8")
    sources_source = Path("web-next/src/pages/data-sources/DataSourcesPage.tsx").read_text(encoding="utf-8")
    browse_source = Path("web-next/src/pages/browse/EntityBrowserPage.tsx").read_text(encoding="utf-8")
    jobs_source = Path("web-next/src/pages/jobs/JobMonitorPage.tsx").read_text(encoding="utf-8")
    dify_source = Path("web-next/src/pages/dify/DifyIntegrationPage.tsx").read_text(encoding="utf-8")

    assert "Dify" in dashboard_source
    assert "最近构建任务" in dashboard_source
    assert "force" in viz_source
    assert "community" in viz_source
    assert "数据源" in sources_source
    assert "Chunk" in sources_source
    assert "实体" in browse_source
    assert "关系" in browse_source
    assert "任务监控" in jobs_source
    assert "Token" in jobs_source
    assert "Dify 对接" in dify_source
    assert "Endpoint" in dify_source
```

- [ ] **Step 2: Run the supporting-page assertions to verify they fail**

Run: `& '.\.venv\Scripts\python.exe' -m pytest tests/unit/web/test_web_next_scaffold.py -k supporting_pages -q`
Expected: FAIL because the remaining 6 route pages do not exist yet.

- [ ] **Step 3: Implement the remaining 6 phase-one screens**

Use this route-page shape:

```tsx
// web-next/src/pages/dashboard/DashboardPage.tsx
import { PageHeader } from "../../shared/ui/PageHeader";
import { StatCard } from "../../shared/ui/StatCard";

export function DashboardPage() {
  return (
    <>
      <PageHeader title="Dashboard" description="概览图谱规模、构建状态、查询活动和 Dify 状态。" />
      <section className="stats-grid">
        <StatCard label="图谱总数" value="12" tone="brand" />
        <StatCard label="运行中任务" value="3" tone="info" />
        <StatCard label="近 24h 查询" value="128" tone="neutral" />
        <StatCard label="Dify 状态" value="已连接" tone="success" />
      </section>
    </>
  );
}
```

```tsx
// web-next/src/pages/graph-viz/GraphVisualizationPage.tsx
import { useState } from "react";
import { Button } from "../../shared/ui/Button";
import { Card } from "../../shared/ui/Card";
import { PageHeader } from "../../shared/ui/PageHeader";

export function GraphVisualizationPage() {
  const [view, setView] = useState<"force" | "community">("force");
  return (
    <>
      <PageHeader title="图谱可视化" description="在关系图和社区视图之间切换。" />
      <Card title="视图切换">
        <Button onClick={() => setView("force")}>force</Button>
        <Button onClick={() => setView("community")}>community</Button>
      </Card>
    </>
  );
}
```

```tsx
// web-next/src/pages/dify/DifyIntegrationPage.tsx
import { Card } from "../../shared/ui/Card";
import { PageHeader } from "../../shared/ui/PageHeader";

export function DifyIntegrationPage() {
  return (
    <>
      <PageHeader title="Dify 对接" description="配置 Endpoint、API Key、数据集映射和同步状态。" />
      <Card title="连接配置">Endpoint / API Key / 回调 URL</Card>
    </>
  );
}
```

Create the remaining route pages with the same level of specificity:

```tsx
// web-next/src/pages/data-sources/DataSourcesPage.tsx
import { Card } from "../../shared/ui/Card";
import { PageHeader } from "../../shared/ui/PageHeader";

export function DataSourcesPage() {
  return (
    <>
      <PageHeader title="数据源" description="管理导入来源、reader 类型和 Chunk 参数。" />
      <Card title="导入配置">
        <div>Reader: parquet</div>
        <div>Chunk size: 1200</div>
        <div>Chunk overlap: 100</div>
      </Card>
    </>
  );
}
```

```tsx
// web-next/src/pages/browse/EntityBrowserPage.tsx
import { Card } from "../../shared/ui/Card";
import { PageHeader } from "../../shared/ui/PageHeader";

export function EntityBrowserPage() {
  return (
    <>
      <PageHeader title="实体 / 关系浏览" description="按实体、关系和 Community 维度浏览抽取结果。" />
      <Card title="实体概览">实体 / 关系 / Community mock table</Card>
    </>
  );
}
```

```tsx
// web-next/src/pages/jobs/JobMonitorPage.tsx
import { Card } from "../../shared/ui/Card";
import { PageHeader } from "../../shared/ui/PageHeader";

export function JobMonitorPage() {
  return (
    <>
      <PageHeader title="任务监控" description="查看构建进度、错误和 Token 消耗。" />
      <Card title="运行中任务">Token / Duration / Progress</Card>
    </>
  );
}
```

Replace the remaining placeholder route elements in `web-next/src/app/router/routes.tsx` so `/dashboard`, `/graphs/:graphId/viz`, `/sources`, `/browse`, `/jobs`, and `/dify` import and render these real pages.

- [ ] **Step 4: Run the supporting-page assertions again**

Run: `& '.\.venv\Scripts\python.exe' -m pytest tests/unit/web/test_web_next_scaffold.py -k supporting_pages -q`
Expected: PASS for all 6 supporting-route assertions.

- [ ] **Step 5: Review the supporting-page diff instead of committing**

Run: `git diff -- web-next/src tests/unit/web/test_web_next_scaffold.py`
Expected: only the 6 remaining route pages and their supporting mock content are shown.

## Task 7: Install dependencies and run final verification

**Files:**
- Create: `web-next/package-lock.json`
- Test: `tests/unit/api/test_static_hosting.py`
- Test: `tests/unit/web/test_web_next_scaffold.py`

- [ ] **Step 1: Install the `web-next` npm dependencies**

Run: `cmd /c npm.cmd install`
Working directory: `D:\Software\Project\graphrag\web-next`
Expected: `package-lock.json` is created and install completes without dependency errors.

- [ ] **Step 2: Run the frontend production build**

Run: `cmd /c npm.cmd run build`
Working directory: `D:\Software\Project\graphrag\web-next`
Expected: PASS and `web-next/dist` is created.

- [ ] **Step 3: Run the targeted verification suite**

Run: `& '.\.venv\Scripts\python.exe' -m pytest tests/unit/api/test_static_hosting.py tests/unit/web/test_web_next_scaffold.py -q`
Expected: PASS for the new static-hosting and `web-next` source assertions.

- [ ] **Step 4: Review the final scope**

Run: `git diff -- main.py web-next tests/unit/api/test_static_hosting.py tests/unit/web/test_web_next_scaffold.py`
Expected: diff is limited to `web-next`, the static hosting update in `main.py`, and the two new or updated test files.

- [ ] **Step 5: Capture the no-commit checkpoint**

Run: `git status --short`
Expected: modified and new files remain unstaged or staged according to the execution preference, with no commit created because the user requested direct work on the main project.
