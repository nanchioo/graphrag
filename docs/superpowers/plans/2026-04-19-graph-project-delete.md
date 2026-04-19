# Graph Project Delete Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a destructive graph-project delete flow that cancels active builds, deletes the entire project workspace, removes the registry entry, and exposes the action in the admin console.

**Architecture:** Extend the existing graph router, graph schemas, registry service, and GraphRag wrapper service so backend deletion stays centralized in the same service that owns build tasks and the cwd lock. Then wire a dangerous delete action through the frontend client and graph management page so the UI confirms the action, waits for success, and refreshes selection safely.

**Tech Stack:** FastAPI, Pydantic, pytest, React, TypeScript, Ant Design

---

### Task 1: Add backend delete payload and registry deletion support

**Files:**
- Modify: `api/schemas/graph.py`
- Modify: `api/services/graph_registry_service.py`
- Test: `tests/unit/api/test_graph_routes.py`

- [ ] **Step 1: Write the failing tests for registry-backed graph deletion**

Add coverage in `tests/unit/api/test_graph_routes.py` for:
- deleting a graph through the API removes it from the registry
- fetching the same graph afterward returns `404`
- deleting a missing graph returns `404`

- [ ] **Step 2: Run the focused graph route tests to verify they fail**

Run: `& '.\.venv\Scripts\python.exe' -m pytest tests/unit/api/test_graph_routes.py -k delete -q`
Expected: FAIL because there is no graph delete route or payload yet.

- [ ] **Step 3: Add the minimal backend contract**

Implement:
- `DeleteGraphPayload` in `api/schemas/graph.py`
- `GraphRegistryService.delete_graph(graph_id)` in `api/services/graph_registry_service.py`

Keep `delete_graph` responsible only for removing the JSON record and returning the deleted graph entry.

- [ ] **Step 4: Run the same focused tests**

Run: `& '.\.venv\Scripts\python.exe' -m pytest tests/unit/api/test_graph_routes.py -k delete -q`
Expected: still FAIL, but now because the router/service flow is not implemented yet.

- [ ] **Step 5: Commit**

```bash
git add api/schemas/graph.py api/services/graph_registry_service.py tests/unit/api/test_graph_routes.py
git commit -m "feat: add graph delete registry contract"
```

### Task 2: Implement destructive delete in the wrapper service and route

**Files:**
- Modify: `api/routers/graph.py`
- Modify: `api/services/graphrag_wrapper_service.py`
- Modify: `api/services/graph_registry_service.py`
- Modify: `api/schemas/graph.py`
- Modify: `tests/unit/api/test_graphrag_wrapper_service.py`
- Modify: `tests/unit/api/test_graph_build_routes.py`
- Modify: `tests/unit/api/test_graph_routes.py`

- [ ] **Step 1: Write the failing service and route tests**

Add coverage for:
- deleting a graph removes its root directory and registry entry
- deleting a graph with a missing directory still removes the registry entry
- deleting a building graph cancels the active task first
- unsafe delete targets outside the configured projects root are rejected
- the build-route fixture route test returns the expected `DeleteGraphPayload`

- [ ] **Step 2: Run the focused delete-related backend tests to verify they fail**

Run: `& '.\.venv\Scripts\python.exe' -m pytest tests/unit/api/test_graphrag_wrapper_service.py tests/unit/api/test_graph_build_routes.py tests/unit/api/test_graph_routes.py -k delete -q`
Expected: FAIL because the wrapper service and route do not support destructive graph deletion yet.

- [ ] **Step 3: Implement the minimal delete flow**

Implement in `api/services/graphrag_wrapper_service.py`:
- `delete_graph(...)`
- active-task lookup, cancellation, and `CancelledError` handling
- guarded recursive directory deletion under `_cwd_lock`
- path validation that ensures the target is inside `projects_root` and is not `projects_root` itself
- registry deletion only after filesystem deletion succeeds

Implement in `api/routers/graph.py`:
- `DELETE /api/graph/{graph_id}`

Update fake route-service fixtures in `tests/unit/api/test_graph_build_routes.py` as needed.

- [ ] **Step 4: Run the focused backend delete tests again**

Run: `& '.\.venv\Scripts\python.exe' -m pytest tests/unit/api/test_graphrag_wrapper_service.py tests/unit/api/test_graph_build_routes.py tests/unit/api/test_graph_routes.py -k delete -q`
Expected: PASS for all delete-focused tests.

- [ ] **Step 5: Commit**

```bash
git add api/routers/graph.py api/services/graphrag_wrapper_service.py api/services/graph_registry_service.py api/schemas/graph.py tests/unit/api/test_graphrag_wrapper_service.py tests/unit/api/test_graph_build_routes.py tests/unit/api/test_graph_routes.py
git commit -m "feat: add destructive graph project deletion"
```

### Task 3: Wire graph deletion through the frontend

**Files:**
- Modify: `web/src/api/client.ts`
- Modify: `web/src/types/index.ts`
- Modify: `web/src/pages/GraphManagePage.tsx`
- Modify: `web/src/components/BuildStatusCard.tsx`
- Modify: `tests/unit/web/test_frontend_scaffold.py`

- [ ] **Step 1: Write the failing frontend source assertions**

Add assertions in `tests/unit/web/test_frontend_scaffold.py` that verify:
- `client.ts` exports a graph delete helper
- `GraphManagePage.tsx` references delete flow state and confirmation handling
- `BuildStatusCard.tsx` includes a dangerous delete action entry point

- [ ] **Step 2: Run the frontend scaffold tests to verify they fail**

Run: `& '.\.venv\Scripts\python.exe' -m pytest tests/unit/web/test_frontend_scaffold.py -k delete -q`
Expected: FAIL because the frontend files do not mention graph deletion yet.

- [ ] **Step 3: Implement the minimal frontend delete flow**

Implement:
- `deleteGraph(graphId)` in `web/src/api/client.ts`
- `DeleteGraphPayload` in `web/src/types/index.ts`
- delete button and callback plumbing in `web/src/components/BuildStatusCard.tsx`
- confirmation modal, request handling, list refresh, selection fallback, and empty-state cleanup in `web/src/pages/GraphManagePage.tsx`

Keep the UI behavior synchronous: wait for backend success before removing anything from local state.

- [ ] **Step 4: Run the frontend scaffold tests again**

Run: `& '.\.venv\Scripts\python.exe' -m pytest tests/unit/web/test_frontend_scaffold.py -k delete -q`
Expected: PASS for all delete-related frontend assertions.

- [ ] **Step 5: Commit**

```bash
git add web/src/api/client.ts web/src/types/index.ts web/src/pages/GraphManagePage.tsx web/src/components/BuildStatusCard.tsx tests/unit/web/test_frontend_scaffold.py
git commit -m "feat: add graph delete console action"
```

### Task 4: Run final verification for the feature slice

**Files:**
- Modify: none
- Test: `tests/unit/api/test_graphrag_wrapper_service.py`
- Test: `tests/unit/api/test_graph_build_routes.py`
- Test: `tests/unit/api/test_graph_routes.py`
- Test: `tests/unit/web/test_frontend_scaffold.py`

- [ ] **Step 1: Run the full targeted verification suite**

Run: `& '.\.venv\Scripts\python.exe' -m pytest tests/unit/api/test_graphrag_wrapper_service.py tests/unit/api/test_graph_build_routes.py tests/unit/api/test_graph_routes.py tests/unit/web/test_frontend_scaffold.py -q`
Expected: PASS with no delete-related failures.

- [ ] **Step 2: Review the diff for scope drift**

Run: `git diff -- api web tests/unit`
Expected: only the planned graph-delete files and assertions are changed.

- [ ] **Step 3: Commit**

```bash
git add api web tests/unit
git commit -m "feat: add graph project deletion"
```
