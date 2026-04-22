# Graph Creation Chunking Config Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users configure chunking when creating a graph project, and persist those values into the new workspace `settings.yaml`.

**Architecture:** Extend the create-graph contract with a validated `chunking` object, keep `settings.yaml` as the single source of truth, and apply the chosen values inside `ProjectWorkspaceService` immediately after the workspace is initialized. Then wire the new shape through the TypeScript types and the existing create-graph modal so the frontend exposes defaults and prevents invalid combinations before submission.

**Tech Stack:** FastAPI, Pydantic v2, PyYAML, pytest, React, TypeScript, Ant Design

**Execution Note:** The user explicitly requested no git commits during implementation. Do not run `git commit`; use diff review and verification commands instead.

---

### Task 1: Add backend chunking request schema and route-level validation

**Files:**
- Modify: `api/schemas/graph.py`
- Modify: `tests/unit/api/test_graph_routes.py`
- Test: `tests/unit/api/test_graph_routes.py`

- [ ] **Step 1: Write the failing API tests**

Add these tests to `tests/unit/api/test_graph_routes.py` near the existing graph-creation coverage:

```python
def test_create_graph_accepts_chunking_config_and_persists_it_to_workspace(
    graph_client: tuple[
        TestClient, Path, Path, AppConfigService, GraphRegistryService
    ],
):
    client, projects_root, _, _, _ = graph_client

    response = client.post(
        "/api/graph",
        json={
            "name": "Chunked Graph",
            "chunking": {
                "type": "tokens",
                "size": 256,
                "overlap": 32,
                "encoding_model": "cl100k_base",
            },
        },
    )

    assert response.status_code == 201
    graph_id = response.json()["data"]["id"]
    settings_text = (projects_root / graph_id / "settings.yaml").read_text(
        encoding="utf-8"
    )
    assert "size: 256" in settings_text
    assert "overlap: 32" in settings_text
    assert "encoding_model: cl100k_base" in settings_text


def test_create_graph_rejects_chunk_overlap_that_is_not_smaller_than_chunk_size(
    graph_client: tuple[
        TestClient, Path, Path, AppConfigService, GraphRegistryService
    ],
):
    client, _, _, _, _ = graph_client

    response = client.post(
        "/api/graph",
        json={
            "name": "Invalid Chunked Graph",
            "chunking": {
                "type": "tokens",
                "size": 128,
                "overlap": 128,
                "encoding_model": "o200k_base",
            },
        },
    )

    assert response.status_code == 422
```

- [ ] **Step 2: Run the focused graph-route tests to verify they fail**

Run: `& '.\.venv\Scripts\python.exe' -m pytest tests/unit/api/test_graph_routes.py -k chunk -q`

Expected: FAIL because `GraphCreateRequest` does not model `chunking`, invalid chunking is not rejected, and the workspace service does not rewrite `settings.yaml`.

- [ ] **Step 3: Add the chunking schema to `api/schemas/graph.py`**

Insert these imports and models near the top of `api/schemas/graph.py`:

```python
from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator


class GraphChunkingCreateRequest(BaseModel):
    """Chunking configuration accepted during graph creation."""

    type: Literal["tokens"] = "tokens"
    size: int = 1200
    overlap: int = 100
    encoding_model: str = "o200k_base"

    @field_validator("size")
    @classmethod
    def validate_size(cls, value: int) -> int:
        if value <= 0:
            raise ValueError("Chunk size must be greater than 0.")
        return value

    @field_validator("overlap")
    @classmethod
    def validate_overlap(cls, value: int) -> int:
        if value < 0:
            raise ValueError("Chunk overlap must be greater than or equal to 0.")
        return value

    @field_validator("encoding_model")
    @classmethod
    def validate_encoding_model(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("Encoding model is required.")
        return normalized

    @model_validator(mode="after")
    def validate_overlap_smaller_than_size(self) -> "GraphChunkingCreateRequest":
        if self.overlap >= self.size:
            raise ValueError("Chunk overlap must be smaller than chunk size.")
        return self


class GraphCreateRequest(BaseModel):
    """Request payload for creating a graph project."""

    name: str
    description: str | None = None
    model_profile_id: str | None = None
    chunking: GraphChunkingCreateRequest | None = None
```

- [ ] **Step 4: Run the same focused tests again**

Run: `& '.\.venv\Scripts\python.exe' -m pytest tests/unit/api/test_graph_routes.py -k chunk -q`

Expected: the invalid-input test now passes with `422`, but the persistence test still FAILS because `ProjectWorkspaceService.initialize_workspace(...)` does not yet apply the custom chunking block.

- [ ] **Step 5: Review the partial diff without committing**

Run: `git diff -- api/schemas/graph.py tests/unit/api/test_graph_routes.py`

Expected: only the new chunking schema and the route tests are present. Do not commit.

### Task 2: Teach workspace initialization to write the chunking block into `settings.yaml`

**Files:**
- Modify: `api/services/project_workspace_service.py`
- Modify: `api/routers/graph.py`
- Modify: `tests/unit/api/test_project_workspace_service.py`
- Modify: `tests/unit/api/test_graph_routes.py`
- Test: `tests/unit/api/test_project_workspace_service.py`
- Test: `tests/unit/api/test_graph_routes.py`

- [ ] **Step 1: Write the failing workspace-service tests**

Add these tests to `tests/unit/api/test_project_workspace_service.py`:

```python
import yaml

from api.schemas.graph import GraphChunkingCreateRequest


def test_initialize_workspace_writes_custom_chunking_settings(tmp_path: Path):
    root_dir = tmp_path / "chunked-workspace"

    ProjectWorkspaceService().initialize_workspace(
        root_dir=root_dir,
        model="qwen3.6-plus",
        embedding_model="text-embedding-v3",
        chunking=GraphChunkingCreateRequest(
            type="tokens",
            size=256,
            overlap=32,
            encoding_model="cl100k_base",
        ),
    )

    settings_data = yaml.safe_load((root_dir / "settings.yaml").read_text(encoding="utf-8"))

    assert settings_data["chunking"] == {
        "type": "tokens",
        "size": 256,
        "overlap": 32,
        "encoding_model": "cl100k_base",
    }


def test_initialize_workspace_keeps_default_chunking_when_not_overridden(tmp_path: Path):
    root_dir = tmp_path / "default-chunking-workspace"

    ProjectWorkspaceService().initialize_workspace(
        root_dir=root_dir,
        model="qwen3.6-plus",
        embedding_model="text-embedding-v3",
    )

    settings_data = yaml.safe_load((root_dir / "settings.yaml").read_text(encoding="utf-8"))

    assert settings_data["chunking"] == {
        "type": "tokens",
        "size": 1200,
        "overlap": 100,
        "encoding_model": "o200k_base",
    }
```

- [ ] **Step 2: Run the focused workspace and route tests to verify they fail**

Run: `& '.\.venv\Scripts\python.exe' -m pytest tests/unit/api/test_project_workspace_service.py tests/unit/api/test_graph_routes.py -k chunk -q`

Expected: FAIL because `initialize_workspace(...)` does not accept a `chunking` argument and does not rewrite YAML after initialization.

- [ ] **Step 3: Implement the minimal workspace rewrite flow**

Update `api/services/project_workspace_service.py` to import `yaml` and the new request model, define defaults, and rewrite only the `chunking` block:

```python
from pathlib import Path

import yaml
from graphrag.cli.initialize import initialize_project_at

from api.schemas.graph import GraphChunkingCreateRequest
from api.services.prompt_localization_service import PromptLocalizationService


DEFAULT_CHUNKING_CONFIG = GraphChunkingCreateRequest()


class ProjectWorkspaceService:
    ...

    def initialize_workspace(
        self,
        root_dir: Path,
        model: str,
        embedding_model: str,
        chunking: GraphChunkingCreateRequest | None = None,
    ) -> None:
        initialize_project_at(
            path=root_dir,
            force=False,
            model=model,
            embedding_model=embedding_model,
        )
        self._prompt_localization_service.localize_workspace_prompts(root_dir)
        self._write_chunking_settings(root_dir, chunking or DEFAULT_CHUNKING_CONFIG)

    def _write_chunking_settings(
        self,
        root_dir: Path,
        chunking: GraphChunkingCreateRequest,
    ) -> None:
        settings_path = root_dir / "settings.yaml"
        settings_data = yaml.safe_load(settings_path.read_text(encoding="utf-8"))
        settings_data["chunking"] = chunking.model_dump()
        settings_path.write_text(
            yaml.safe_dump(settings_data, sort_keys=False, allow_unicode=True),
            encoding="utf-8",
        )
```

Update the create route in `api/routers/graph.py` so the existing call becomes:

```python
    project_workspace_service.initialize_workspace(
        root_dir=root_dir,
        model=completion_model,
        embedding_model=embedding_model,
        chunking=payload.chunking,
    )
```

- [ ] **Step 4: Run the focused workspace and route tests again**

Run: `& '.\.venv\Scripts\python.exe' -m pytest tests/unit/api/test_project_workspace_service.py tests/unit/api/test_graph_routes.py -k chunk -q`

Expected: PASS for the chunking-specific backend tests.

- [ ] **Step 5: Review the backend diff without committing**

Run: `git diff -- api/routers/graph.py api/services/project_workspace_service.py tests/unit/api/test_project_workspace_service.py tests/unit/api/test_graph_routes.py`

Expected: only the planned router and workspace changes are present. Do not commit.

### Task 3: Extend TypeScript types and the create-graph modal with chunking inputs

**Files:**
- Modify: `web/src/types/index.ts`
- Modify: `web/src/pages/GraphManagePage.tsx`
- Modify: `tests/unit/web/test_frontend_scaffold.py`
- Test: `tests/unit/web/test_frontend_scaffold.py`

- [ ] **Step 1: Write the failing frontend scaffold assertions**

Add assertions like these to `tests/unit/web/test_frontend_scaffold.py`:

```python
def test_graph_manage_page_exposes_chunking_fields_in_create_modal():
    page_source = Path("web/src/pages/GraphManagePage.tsx").read_text(encoding="utf-8")
    types_source = Path("web/src/types/index.ts").read_text(encoding="utf-8")

    assert "GraphChunkingCreateRequest" in types_source
    assert "chunking?: GraphChunkingCreateRequest" in types_source
    assert 'name={["chunking", "size"]}' in page_source
    assert 'name={["chunking", "overlap"]}' in page_source
    assert 'name={["chunking", "encoding_model"]}' in page_source
    assert 'name={["chunking", "type"]}' in page_source
    assert "o200k_base" in page_source
    assert "1200" in page_source
    assert "100" in page_source
    assert "Chunk overlap must be smaller than chunk size." in page_source
```

- [ ] **Step 2: Run the focused frontend scaffold test to verify it fails**

Run: `& '.\.venv\Scripts\python.exe' -m pytest tests/unit/web/test_frontend_scaffold.py -k chunking -q`

Expected: FAIL because the TypeScript types and create modal do not include chunking fields yet.

- [ ] **Step 3: Update the TypeScript request contract**

Extend `web/src/types/index.ts` with the new nested request type:

```ts
export interface GraphChunkingCreateRequest {
  type: "tokens";
  size: number;
  overlap: number;
  encoding_model: string;
}

export interface GraphCreateRequest {
  name: string;
  description?: string;
  model_profile_id?: string;
  chunking?: GraphChunkingCreateRequest;
}
```

- [ ] **Step 4: Implement the create-modal chunking inputs**

Update `web/src/pages/GraphManagePage.tsx` with a shared default object, modal-open initialization, and nested form fields:

```ts
import {
  Button,
  Card,
  Descriptions,
  Divider,
  Empty,
  Form,
  Input,
  InputNumber,
  List,
  Modal,
  Select,
  Space,
  Spin,
  Typography,
  message,
} from "antd";

const DEFAULT_CHUNKING_CONFIG = {
  type: "tokens" as const,
  size: 1200,
  overlap: 100,
  encoding_model: "o200k_base",
};

function openCreateModal() {
  setCreateOpen(true);
  createForm.setFieldsValue({
    chunking: DEFAULT_CHUNKING_CONFIG,
  });
}
```

Use the new open handler on the existing "新建图库" button, and add these form items inside the modal form:

```tsx
<Divider>切片配置</Divider>
<Form.Item<GraphCreateRequest>
  label="切片方式"
  name={["chunking", "type"]}
  initialValue={DEFAULT_CHUNKING_CONFIG.type}
>
  <Select
    options={[{ label: "tokens", value: "tokens" }]}
  />
</Form.Item>
<Form.Item<GraphCreateRequest>
  label="切片大小"
  name={["chunking", "size"]}
  initialValue={DEFAULT_CHUNKING_CONFIG.size}
  rules={[{ required: true, type: "number", min: 1 }]}
>
  <InputNumber min={1} style={{ width: "100%" }} />
</Form.Item>
<Form.Item<GraphCreateRequest>
  label="重叠大小"
  name={["chunking", "overlap"]}
  initialValue={DEFAULT_CHUNKING_CONFIG.overlap}
  dependencies={[["chunking", "size"]]}
  rules={[
    { required: true, type: "number", min: 0 },
    ({ getFieldValue }) => ({
      validator(_, value) {
        const size = getFieldValue(["chunking", "size"]);
        if (typeof value !== "number" || typeof size !== "number" || value < size) {
          return Promise.resolve();
        }
        return Promise.reject(
          new Error("Chunk overlap must be smaller than chunk size."),
        );
      },
    }),
  ]}
>
  <InputNumber min={0} style={{ width: "100%" }} />
</Form.Item>
<Form.Item<GraphCreateRequest>
  label="编码模型"
  name={["chunking", "encoding_model"]}
  initialValue={DEFAULT_CHUNKING_CONFIG.encoding_model}
  rules={[{ required: true, whitespace: true }]}
>
  <Input placeholder="例如: o200k_base" />
</Form.Item>
```

Also change the modal-open button from `onClick={() => setCreateOpen(true)}` to `onClick={openCreateModal}`, and after successful create keep `createForm.resetFields()` so the next open starts clean before defaults are reapplied.

- [ ] **Step 5: Run the focused frontend scaffold test again**

Run: `& '.\.venv\Scripts\python.exe' -m pytest tests/unit/web/test_frontend_scaffold.py -k chunking -q`

Expected: PASS for the chunking-related frontend assertions.

- [ ] **Step 6: Review the frontend diff without committing**

Run: `git diff -- web/src/types/index.ts web/src/pages/GraphManagePage.tsx tests/unit/web/test_frontend_scaffold.py`

Expected: only the request type, modal fields, defaults, and scaffold assertions are present. Do not commit.

### Task 4: Run the final verification slice and confirm there is no scope drift

**Files:**
- Modify: none
- Test: `tests/unit/api/test_project_workspace_service.py`
- Test: `tests/unit/api/test_graph_routes.py`
- Test: `tests/unit/web/test_frontend_scaffold.py`

- [ ] **Step 1: Run the full targeted verification suite**

Run: `& '.\.venv\Scripts\python.exe' -m pytest tests/unit/api/test_project_workspace_service.py tests/unit/api/test_graph_routes.py tests/unit/web/test_frontend_scaffold.py -q`

Expected: PASS with no chunking-related failures.

- [ ] **Step 2: Review the implementation diff for scope drift**

Run: `git diff -- api/schemas/graph.py api/routers/graph.py api/services/project_workspace_service.py web/src/types/index.ts web/src/pages/GraphManagePage.tsx tests/unit/api/test_project_workspace_service.py tests/unit/api/test_graph_routes.py tests/unit/web/test_frontend_scaffold.py`

Expected: only the planned files are changed, with no unrelated edits and no git commits created.

- [ ] **Step 3: Smoke-check the persisted YAML shape manually**

Run after creating one graph through the UI or API during manual verification:

`Get-Content -Path 'D:\Software\Project\graphrag\data\projects\<graph-id>\settings.yaml'`

Expected: the `chunking` block shows the selected `type`, `size`, `overlap`, and `encoding_model` values, and the rest of the YAML remains intact.
