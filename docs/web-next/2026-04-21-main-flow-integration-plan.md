# Web Next Main Flow Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `web-next` mock repositories with real backend integration for `Settings`, `Graph Management`, and `Query Workbench`, then make the main create-upload-build-query flow work end to end.

**Architecture:** Keep the existing FastAPI `config`, `graph`, and `query` routes as the primary contract, make only narrow backend fixes where they block the approved flow, and adapt `web-next` to those contracts through thin HTTP repositories. Concentrate real interaction in `Settings`, `Graph Management`, and `Query Workbench`; leave unsupported mock-only surfaces static or downgraded.

**Tech Stack:** FastAPI, Pydantic, pytest, React 18, TypeScript, Vite, React Router

---

## File Map

### Backend

- Modify: `D:/Software/Project/graphrag/api/schemas/config.py`
  Add or align persisted system/model config fields actually used by the live settings flow.
- Modify: `D:/Software/Project/graphrag/api/services/app_config_service.py`
  Persist and return the aligned config/model profile fields.
- Modify: `D:/Software/Project/graphrag/api/schemas/query.py`
  Align request/response shapes with the real query workbench usage.
- Modify: `D:/Software/Project/graphrag/api/services/query_service.py`
  Return frontend-consumable query payload details that can be derived from the current backend flow.
- Modify: `D:/Software/Project/graphrag/api/routers/query.py`
  Keep route behavior aligned with the updated query schema.

### Frontend

- Modify: `D:/Software/Project/graphrag/web-next/src/shared/types/api.ts`
  Narrow and align frontend payload types to the real backend contract.
- Modify: `D:/Software/Project/graphrag/web-next/src/services/repositories/types.ts`
  Expand repository contracts for the real graph/settings/query mutations used in the main flow.
- Create: `D:/Software/Project/graphrag/web-next/src/services/repositories/httpRepositories.ts`
  Add thin HTTP-backed repository implementations.
- Modify: `D:/Software/Project/graphrag/web-next/src/app/providers/RepositoryProvider.tsx`
  Switch from mocks to the new HTTP repositories.
- Modify: `D:/Software/Project/graphrag/web-next/src/pages/settings/SettingsPage.tsx`
  Wire live system config/model profile reads and trim unsupported editable sections.
- Modify: `D:/Software/Project/graphrag/web-next/src/pages/query/QueryWorkbenchPage.tsx`
  Load real graphs and send real queries.
- Modify: `D:/Software/Project/graphrag/web-next/src/features/graph-query/QueryComposer.tsx`
  Support real graph selection.
- Modify: `D:/Software/Project/graphrag/web-next/src/features/graph-query/QueryResultPanel.tsx`
  Render real query payloads defensively.
- Modify: `D:/Software/Project/graphrag/web-next/src/pages/graphs/GraphManagementPage.tsx`
  Become the real main-flow page orchestrating selection and refresh.
- Modify: `D:/Software/Project/graphrag/web-next/src/features/graph-management/GraphListPanel.tsx`
  Add selection and real action hooks.
- Modify: `D:/Software/Project/graphrag/web-next/src/features/graph-management/GraphDetailPanel.tsx`
  Add graph file list, upload, build, delete, and query handoff actions.
- Modify: `D:/Software/Project/graphrag/web-next/src/features/graph-management/CreateGraphWizard.tsx`
  Submit only backend-supported fields.
- Modify: `D:/Software/Project/graphrag/web-next/src/styles/utilities.css`
  Add or adjust layout styles needed for the real graph workflow.

### Tests

- Modify: `D:/Software/Project/graphrag/tests/unit/api/test_config_routes.py`
- Modify: `D:/Software/Project/graphrag/tests/unit/api/test_query_routes.py`
- Modify: `D:/Software/Project/graphrag/tests/unit/api/test_query_service.py`
- Modify: `D:/Software/Project/graphrag/tests/unit/api/test_graph_routes.py`
- Modify: `D:/Software/Project/graphrag/tests/unit/api/test_graph_file_routes.py`
- Modify: `D:/Software/Project/graphrag/tests/unit/api/test_graph_build_routes.py`
- Modify: `D:/Software/Project/graphrag/tests/unit/web/test_web_next_scaffold.py`

## Task 1: Align Live Settings Contract

**Files:**
- Modify: `api/schemas/config.py`
- Modify: `api/services/app_config_service.py`
- Test: `tests/unit/api/test_config_routes.py`

- [ ] **Step 1: Write failing backend settings tests**

Add assertions in `tests/unit/api/test_config_routes.py` for the live settings fields we actually want to persist and return, including `llm_provider`, `llm_model`, `api_base`, `deployment`, `api_version`, `concurrency`, `rate_limit_per_minute`, `max_retries`, and `enable_llm_cache`, plus `deployment` on model profiles.

- [ ] **Step 2: Run the targeted settings tests to verify RED**

Run: `uv run pytest tests/unit/api/test_config_routes.py -q`

Expected: failing assertions because the current schemas and service do not expose all of those fields.

- [ ] **Step 3: Implement the minimal config schema/service changes**

Update `api/schemas/config.py` and `api/services/app_config_service.py` so the system config and model profile responses persist only the approved live settings fields and expose them consistently through the current routes.

- [ ] **Step 4: Re-run the targeted settings tests**

Run: `uv run pytest tests/unit/api/test_config_routes.py -q`

Expected: pass.

## Task 2: Align Live Query Contract

**Files:**
- Modify: `api/schemas/query.py`
- Modify: `api/services/query_service.py`
- Modify: `api/routers/query.py`
- Test: `tests/unit/api/test_query_routes.py`
- Test: `tests/unit/api/test_query_service.py`

- [ ] **Step 1: Write failing query tests**

Add route/service assertions for:
- accepted query inputs matching the real workbench
- defensive handling of answer/context shape
- response fields needed by the real workbench, derived from current behavior rather than a new subsystem

- [ ] **Step 2: Run the targeted query tests to verify RED**

Run: `uv run pytest tests/unit/api/test_query_routes.py tests/unit/api/test_query_service.py -q`

Expected: failures showing missing or mismatched query response fields or shape assumptions.

- [ ] **Step 3: Implement minimal query alignment**

Update `api/schemas/query.py`, `api/services/query_service.py`, and `api/routers/query.py` to keep the existing route but return a stable payload the real frontend can consume without mocks.

- [ ] **Step 4: Re-run the targeted query tests**

Run: `uv run pytest tests/unit/api/test_query_routes.py tests/unit/api/test_query_service.py -q`

Expected: pass.

## Task 3: Add Real HTTP Repositories

**Files:**
- Modify: `web-next/src/shared/types/api.ts`
- Modify: `web-next/src/services/repositories/types.ts`
- Create: `web-next/src/services/repositories/httpRepositories.ts`
- Modify: `web-next/src/app/providers/RepositoryProvider.tsx`
- Test: `tests/unit/web/test_web_next_scaffold.py`

- [ ] **Step 1: Write failing frontend repository wiring tests**

Add assertions in `tests/unit/web/test_web_next_scaffold.py` that:
- `RepositoryProvider` no longer creates mock repositories
- HTTP repositories exist
- repository contracts include the mutations needed for the approved main flow

- [ ] **Step 2: Run the targeted frontend scaffold test to verify RED**

Run: `uv run pytest tests/unit/web/test_web_next_scaffold.py -q`

Expected: failures because the app still imports and uses mock repositories.

- [ ] **Step 3: Implement thin HTTP repositories**

Create `httpRepositories.ts`, parse `ApiResponse<T>` centrally, expand repository types for create/upload/build/delete/update/query operations, and switch `RepositoryProvider` to the real repositories.

- [ ] **Step 4: Re-run the targeted frontend scaffold test**

Run: `uv run pytest tests/unit/web/test_web_next_scaffold.py -q`

Expected: pass.

## Task 4: Make SettingsPage Use Real Config and Profiles

**Files:**
- Modify: `web-next/src/pages/settings/SettingsPage.tsx`
- Possibly modify: `web-next/src/features/model-profiles/ModelProfilesPanel.tsx`
- Test: `tests/unit/web/test_web_next_scaffold.py`

- [ ] **Step 1: Extend the failing frontend scaffold test**

Add assertions that `SettingsPage` reads from live repositories in the approved sections and no longer treats unsupported sections like real persisted flows.

- [ ] **Step 2: Run the scaffold test to verify RED**

Run: `uv run pytest tests/unit/web/test_web_next_scaffold.py -q`

Expected: failure on the new settings assertions.

- [ ] **Step 3: Implement minimal live settings UI**

Wire `SettingsPage` to load the real system config and model profiles, keep the live sections editable/readable, and visibly downgrade the unsupported sections.

- [ ] **Step 4: Re-run the scaffold test**

Run: `uv run pytest tests/unit/web/test_web_next_scaffold.py -q`

Expected: pass.

## Task 5: Make QueryWorkbench Use Real Graphs and Real Queries

**Files:**
- Modify: `web-next/src/pages/query/QueryWorkbenchPage.tsx`
- Modify: `web-next/src/features/graph-query/QueryComposer.tsx`
- Modify: `web-next/src/features/graph-query/QueryResultPanel.tsx`
- Test: `tests/unit/web/test_web_next_scaffold.py`

- [ ] **Step 1: Extend the failing frontend scaffold test**

Add assertions that:
- query workbench is no longer hard-coded to `demo-001`
- the composer supports a real graph selector
- the result panel handles live payloads defensively

- [ ] **Step 2: Run the scaffold test to verify RED**

Run: `uv run pytest tests/unit/web/test_web_next_scaffold.py -q`

Expected: failure on the new query assertions.

- [ ] **Step 3: Implement the minimal real query workbench**

Load graphs from the live repository, choose a real default graph, submit the current backend-supported parameters, and render the returned answer/context without assuming mock-only fields always exist.

- [ ] **Step 4: Re-run the scaffold test**

Run: `uv run pytest tests/unit/web/test_web_next_scaffold.py -q`

Expected: pass.

## Task 6: Make Graph Management the Real Main-Flow Surface

**Files:**
- Modify: `web-next/src/pages/graphs/GraphManagementPage.tsx`
- Modify: `web-next/src/features/graph-management/GraphListPanel.tsx`
- Modify: `web-next/src/features/graph-management/GraphDetailPanel.tsx`
- Modify: `web-next/src/features/graph-management/CreateGraphWizard.tsx`
- Modify: `web-next/src/styles/utilities.css`
- Test: `tests/unit/web/test_web_next_scaffold.py`
- Test: `tests/unit/api/test_graph_routes.py`
- Test: `tests/unit/api/test_graph_file_routes.py`
- Test: `tests/unit/api/test_graph_build_routes.py`

- [ ] **Step 1: Write failing graph flow tests**

Add or extend tests so they describe the approved live graph flow:
- route tests for any missing graph payload behavior that blocks the UI
- frontend scaffold tests showing graph page selection/detail/create/upload/build behavior is wired through repositories rather than mocks

- [ ] **Step 2: Run the targeted graph tests to verify RED**

Run: `uv run pytest tests/unit/api/test_graph_routes.py tests/unit/api/test_graph_file_routes.py tests/unit/api/test_graph_build_routes.py tests/unit/web/test_web_next_scaffold.py -q`

Expected: failures that identify the remaining gaps.

- [ ] **Step 3: Implement the minimal real graph flow**

Change the graph page so it:
- loads live graphs
- keeps a selected graph
- submits create requests through the wizard using only backend-supported fields
- shows graph detail and build status for the selected graph
- uploads source files for that graph
- starts a build
- supports delete and refresh
- offers a clear handoff to query after build

- [ ] **Step 4: Re-run the targeted graph tests**

Run: `uv run pytest tests/unit/api/test_graph_routes.py tests/unit/api/test_graph_file_routes.py tests/unit/api/test_graph_build_routes.py tests/unit/web/test_web_next_scaffold.py -q`

Expected: pass.

## Task 7: Verify the Main Flow End to End

**Files:**
- No code changes required unless verification reveals a defect

- [ ] **Step 1: Run the combined backend verification**

Run: `uv run pytest tests/unit/api/test_config_routes.py tests/unit/api/test_query_routes.py tests/unit/api/test_query_service.py tests/unit/api/test_graph_routes.py tests/unit/api/test_graph_file_routes.py tests/unit/api/test_graph_build_routes.py tests/unit/web/test_web_next_scaffold.py -q`

Expected: all targeted tests pass.

- [ ] **Step 2: Run the frontend build**

Run: `cmd /c npm.cmd run build`
Workdir: `D:/Software/Project/graphrag/web-next`

Expected: successful TypeScript and Vite build.

- [ ] **Step 3: If verification fails, fix only the reported blockers**

Make the smallest change needed, then re-run the exact failing verification command before moving on.

- [ ] **Step 4: Report verified status**

Summarize what now works, what remains intentionally static, and which commands were used as evidence.

## Notes

- Do not create new commits during execution. The user explicitly asked for direct inline implementation without self-committing.
- Keep all markdown planning/design artifacts inside the project docs tree, not under workflow-only directories.
