# Dify External Knowledge Adapter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Dify external knowledge retrieval endpoint that lets Dify use built GraphRAG projects as external knowledge bases.

**Architecture:** Add a small FastAPI adapter under `/api/dify/retrieval`. The adapter validates Dify's bearer token, maps Dify `knowledge_id` to a GraphRAG `graph_id`, runs the existing GraphRAG query service in `local` mode, and converts returned context records into Dify `records`.

**Tech Stack:** FastAPI, Pydantic v2, pytest, existing GraphRAG admin API services.

---

## File Structure

- Create `api/schemas/dify.py`: Dify request/response DTOs and retrieval setting defaults.
- Create `api/services/dify_retrieval_service.py`: adapter service that calls `QueryService` and formats Dify records.
- Create `api/routers/dify.py`: HTTP endpoint, bearer auth, empty validation request handling.
- Modify `api/deps.py`: provider for `DifyRetrievalService`.
- Modify `main.py`: include Dify router.
- Modify `README.md`: add Dify external knowledge setup instructions.
- Create `tests/unit/api/test_dify_retrieval_service.py`: service-level conversion tests.
- Create `tests/unit/api/test_dify_routes.py`: route/auth tests.

## Task 1: Service Schema And Conversion

**Files:**
- Create: `api/schemas/dify.py`
- Create: `api/services/dify_retrieval_service.py`
- Test: `tests/unit/api/test_dify_retrieval_service.py`

- [ ] **Step 1: Write failing service tests**

Test that sources become Dify records, `knowledge_id` is passed as `graph_id`, `top_k` limits output, and score threshold filters records.

- [ ] **Step 2: Run the service test and verify it fails**

Run: `uv run pytest tests/unit/api/test_dify_retrieval_service.py -q`

Expected: FAIL because `api.services.dify_retrieval_service` does not exist.

- [ ] **Step 3: Implement schemas and service**

Add request models with optional fields so Dify's API connection probe can post an empty body. Add a service method:

```python
async def retrieve(
    self,
    request: DifyRetrievalRequest,
    app_config_service: AppConfigService,
    graph_registry_service: GraphRegistryService,
) -> DifyRetrievalResponse:
    ...
```

Use `QueryRequest(graph_id=request.knowledge_id, question=request.query, mode="local")` and convert `payload.context["sources"]` to records first. Fall back to reports/entities only when sources are absent.

- [ ] **Step 4: Run the service test and verify it passes**

Run: `uv run pytest tests/unit/api/test_dify_retrieval_service.py -q`

Expected: PASS.

## Task 2: FastAPI Route And Auth

**Files:**
- Create: `api/routers/dify.py`
- Modify: `api/deps.py`
- Modify: `main.py`
- Test: `tests/unit/api/test_dify_routes.py`

- [ ] **Step 1: Write failing route tests**

Cover:

- missing or wrong bearer token returns `403`
- empty body with valid token returns `{"records": []}`
- valid body returns service records

- [ ] **Step 2: Run the route test and verify it fails**

Run: `uv run pytest tests/unit/api/test_dify_routes.py -q`

Expected: FAIL because `/api/dify/retrieval` is not mounted.

- [ ] **Step 3: Implement route**

Read `Authorization`, compare against `DIFY_EXTERNAL_KNOWLEDGE_API_KEY` with local default `dify-graphrag-local`, and call the service. Use an optional body parameter so Dify's connection check succeeds.

- [ ] **Step 4: Run route tests and targeted API tests**

Run:

```powershell
uv run pytest tests/unit/api/test_dify_routes.py tests/unit/api/test_dify_retrieval_service.py tests/unit/api/test_main.py -q
```

Expected: PASS.

## Task 3: Operator Documentation

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add Dify setup instructions**

Document:

- start GraphRAG on `0.0.0.0:8000`
- set `DIFY_EXTERNAL_KNOWLEDGE_API_KEY`
- Dify endpoint: `http://host.docker.internal:8000/api/dify`
- Dify external knowledge ID: GraphRAG `graph_id`
- API key value: the configured bearer key

- [ ] **Step 2: Run final verification**

Run:

```powershell
uv run pytest tests/unit/api/test_dify_routes.py tests/unit/api/test_dify_retrieval_service.py tests/unit/api/test_query_routes.py tests/unit/api/test_main.py -q
```

Expected: PASS.
