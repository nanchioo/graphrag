# Graph Project Root Override Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let each new graph project override the default save parent directory while keeping the system-config `projects_root` as the default and preserving safe delete behavior.

**Architecture:** Extend the create-graph API contract with an optional `projects_root` field, normalize it in the Pydantic schema, resolve the effective parent directory in the graph router, and continue storing only the final `root_dir` in the registry. Then preload the system default into the create-graph modal, expose a per-graph `保存位置` field, and relabel the system-config copy so users understand the global value is only the default.

**Tech Stack:** FastAPI, Pydantic v2, pytest, React, TypeScript, Ant Design

---

### Task 1: Add backend create-request support for per-graph `projects_root`

**Files:**
- Modify: `api/schemas/graph.py`
- Modify: `api/routers/graph.py`
- Modify: `tests/unit/api/test_graph_routes.py`
- Test: `tests/unit/api/test_graph_routes.py`

- [ ] **Step 1: Write the failing API tests for custom-root creation and whitespace fallback**

Add these tests to `tests/unit/api/test_graph_routes.py` near the existing graph-creation coverage:

```python
def test_create_graph_allows_per_request_projects_root_override(
    tmp_path: Path,
    graph_client: tuple[
        TestClient, Path, Path, AppConfigService, GraphRegistryService
    ],
):
    client, projects_root, _, _, _ = graph_client
    custom_projects_root = tmp_path / "custom-projects"

    response = client.post(
        "/api/graph",
        json={
            "name": "Custom Root Graph",
            "projects_root": str(custom_projects_root),
        },
    )

    assert response.status_code == 201
    graph_id = response.json()["data"]["id"]
    root_dir = custom_projects_root / graph_id

    assert response.json()["data"]["root_dir"] == str(root_dir)
    assert root_dir.exists()
    assert not (projects_root / graph_id).exists()


def test_create_graph_treats_whitespace_projects_root_as_system_default(
    graph_client: tuple[
        TestClient, Path, Path, AppConfigService, GraphRegistryService
    ],
):
    client, projects_root, _, _, _ = graph_client

    response = client.post(
        "/api/graph",
        json={
            "name": "Whitespace Root Graph",
            "projects_root": "   ",
        },
    )

    assert response.status_code == 201
    graph_id = response.json()["data"]["id"]
    assert response.json()["data"]["root_dir"] == str(projects_root / graph_id)
    assert (projects_root / graph_id).exists()
```

- [ ] **Step 2: Run the focused graph-route tests to verify they fail**

Run:

```powershell
& '.\.venv\Scripts\python.exe' -m pytest tests/unit/api/test_graph_routes.py -k "projects_root or initializes_workspace" -q
```

Expected: FAIL because `GraphCreateRequest` does not yet accept `projects_root`, the router still always uses `system_config.projects_root`, and whitespace values are not normalized.

- [ ] **Step 3: Add schema normalization and route resolution logic**

Update `api/schemas/graph.py` so `GraphCreateRequest` normalizes `projects_root`:

```python
class GraphCreateRequest(BaseModel):
    """Request payload for creating a graph project."""

    name: str
    description: str | None = None
    model_profile_id: str | None = None
    projects_root: str | None = None
    chunking: GraphChunkingCreateRequest | None = None

    @field_validator("projects_root")
    @classmethod
    def validate_projects_root(cls, value: str | None) -> str | None:
        if value is None:
            return None

        normalized = value.strip()
        return normalized or None
```

Update the `create_graph(...)` route in `api/routers/graph.py` so it computes an effective parent directory before appending the generated graph id:

```python
    system_config = app_config_service.get_system_config()
    effective_projects_root = (
        payload.projects_root or system_config.projects_root
    )
    projects_root = graph_registry_service.resolve_root_dir(
        effective_projects_root
    )
    model_profile_id = payload.model_profile_id or system_config.default_model_profile_id

    completion_model = DEFAULT_COMPLETION_MODEL
    embedding_model = DEFAULT_EMBEDDING_MODEL
    if model_profile_id:
        profile = app_config_service.get_model_profile(model_profile_id)
        completion_model = profile.model_name
        embedding_model = profile.embedding_model_name or DEFAULT_EMBEDDING_MODEL

    graph_id = graph_registry_service.generate_graph_id(payload.name)
    root_dir = projects_root / graph_id
```

Do not change the response payload or the registry schema in this task.

- [ ] **Step 4: Run the same focused tests again**

Run:

```powershell
& '.\.venv\Scripts\python.exe' -m pytest tests/unit/api/test_graph_routes.py -k "projects_root or initializes_workspace" -q
```

Expected: PASS for the new override and whitespace-fallback tests, and the existing create-graph test should still pass with the system default root.

- [ ] **Step 5: Commit the backend contract change**

Run:

```bash
git add api/schemas/graph.py api/routers/graph.py tests/unit/api/test_graph_routes.py
git commit -m "feat: allow per-graph projects root override"
```

### Task 2: Add clear filesystem safety checks and delete-boundary coverage

**Files:**
- Modify: `api/services/project_workspace_service.py`
- Modify: `tests/unit/api/test_project_workspace_service.py`
- Modify: `tests/unit/api/test_graph_routes.py`
- Test: `tests/unit/api/test_project_workspace_service.py`
- Test: `tests/unit/api/test_graph_routes.py`

- [ ] **Step 1: Write the failing service and delete-boundary tests**

Add these service-level tests to `tests/unit/api/test_project_workspace_service.py`:

```python
import pytest
from fastapi import HTTPException


def test_initialize_workspace_rejects_parent_path_that_is_a_file(tmp_path: Path):
    parent_file = tmp_path / "blocked-parent"
    parent_file.write_text("not-a-directory", encoding="utf-8")

    with pytest.raises(HTTPException) as exc_info:
        ProjectWorkspaceService().initialize_workspace(
            root_dir=parent_file / "graph-root",
            model="qwen3.6-plus",
            embedding_model="text-embedding-v3",
        )

    assert exc_info.value.status_code == 400
    assert "must be a directory" in str(exc_info.value.detail)


def test_initialize_workspace_rejects_existing_root_dir(tmp_path: Path):
    root_dir = tmp_path / "existing-graph-root"
    root_dir.mkdir(parents=True, exist_ok=True)

    with pytest.raises(HTTPException) as exc_info:
        ProjectWorkspaceService().initialize_workspace(
            root_dir=root_dir,
            model="qwen3.6-plus",
            embedding_model="text-embedding-v3",
        )

    assert exc_info.value.status_code == 400
    assert "already exists" in str(exc_info.value.detail)
```

Add this route-level delete test to `tests/unit/api/test_graph_routes.py`:

```python
def test_delete_graph_in_custom_parent_removes_only_graph_workspace(
    tmp_path: Path,
    graph_client: tuple[
        TestClient, Path, Path, AppConfigService, GraphRegistryService
    ],
):
    client, _, _, _, _ = graph_client
    custom_projects_root = tmp_path / "shared-parent"

    create_response = client.post(
        "/api/graph",
        json={
            "name": "Shared Parent Graph",
            "projects_root": str(custom_projects_root),
        },
    )
    assert create_response.status_code == 201

    graph_id = create_response.json()["data"]["id"]
    root_dir = custom_projects_root / graph_id
    sibling_file = custom_projects_root / "keep.txt"
    sibling_file.write_text("keep", encoding="utf-8")

    delete_response = client.delete(f"/api/graph/{graph_id}")

    assert delete_response.status_code == 200
    assert not root_dir.exists()
    assert custom_projects_root.exists()
    assert sibling_file.exists()
```

- [ ] **Step 2: Run the focused safety tests to verify they fail**

Run:

```powershell
& '.\.venv\Scripts\python.exe' -m pytest tests/unit/api/test_project_workspace_service.py tests/unit/api/test_graph_routes.py -k "blocked-parent or existing_root_dir or custom_parent" -q
```

Expected: FAIL because `ProjectWorkspaceService.initialize_workspace(...)` does not yet reject a file parent or a pre-existing final root directory with a clear `HTTPException`.

- [ ] **Step 3: Add explicit workspace-target validation in `ProjectWorkspaceService`**

Update `api/services/project_workspace_service.py` to validate the final root directory before calling `initialize_project_at(...)`:

```python
from pathlib import Path

from fastapi import HTTPException, status
import yaml
from graphrag.cli.initialize import initialize_project_at

from api.schemas.graph import GraphChunkingCreateRequest
from api.services.prompt_localization_service import PromptLocalizationService


class ProjectWorkspaceService:
    def initialize_workspace(
        self,
        root_dir: Path,
        model: str,
        embedding_model: str,
        chunking: GraphChunkingCreateRequest | None = None,
    ) -> None:
        self._validate_workspace_target(root_dir)
        initialize_project_at(
            path=root_dir,
            force=False,
            model=model,
            embedding_model=embedding_model,
        )
        self._prompt_localization_service.localize_workspace_prompts(root_dir)
        self._write_chunking_settings(root_dir, chunking or DEFAULT_CHUNKING_CONFIG)

    def _validate_workspace_target(self, root_dir: Path) -> None:
        parent_dir = root_dir.parent

        if parent_dir.exists() and not parent_dir.is_dir():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Graph projects root path '{parent_dir}' must be a directory.",
            )

        if root_dir.exists():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Graph workspace '{root_dir}' already exists.",
            )
```

Keep the delete route unchanged in this task. The new route test should pass once creation stores the custom final `root_dir` and delete continues removing only that exact directory.

- [ ] **Step 4: Run the safety-focused tests again**

Run:

```powershell
& '.\.venv\Scripts\python.exe' -m pytest tests/unit/api/test_project_workspace_service.py tests/unit/api/test_graph_routes.py -k "blocked-parent or existing_root_dir or custom_parent" -q
```

Expected: PASS. The service tests should now raise `400` with clear messages, and the delete test should confirm the shared parent directory remains intact.

- [ ] **Step 5: Commit the workspace-safety change**

Run:

```bash
git add api/services/project_workspace_service.py tests/unit/api/test_project_workspace_service.py tests/unit/api/test_graph_routes.py
git commit -m "feat: validate graph workspace targets"
```

### Task 3: Preload the system default root into the create-graph modal and expose a per-graph `保存位置` field

**Files:**
- Modify: `web/src/types/index.ts`
- Modify: `web/src/pages/GraphManagePage.tsx`
- Modify: `tests/unit/web/test_frontend_scaffold.py`
- Test: `tests/unit/web/test_frontend_scaffold.py`

- [ ] **Step 1: Write the failing frontend source-assertion test**

Add this test to `tests/unit/web/test_frontend_scaffold.py` near the existing graph-create modal assertions:

```python
def test_graph_manage_page_prefills_per_graph_projects_root_from_system_config():
    page_source = Path("web/src/pages/GraphManagePage.tsx").read_text(encoding="utf-8")
    types_source = Path("web/src/types/index.ts").read_text(encoding="utf-8")

    assert "projects_root?: string;" in types_source
    assert "getSystemConfig" in page_source
    assert 'const DEFAULT_PROJECTS_ROOT = "data/projects";' in page_source
    assert "const [systemConfig, setSystemConfig]" in page_source
    assert "projects_root: systemConfig?.projects_root ?? DEFAULT_PROJECTS_ROOT" in page_source
    assert 'label="保存位置"' in page_source
    assert 'name="projects_root"' in page_source
    assert "最终目录将自动生成为 <保存位置>/<图谱ID>" in page_source
```

- [ ] **Step 2: Run the focused frontend test to verify it fails**

Run:

```powershell
& '.\.venv\Scripts\python.exe' -m pytest tests/unit/web/test_frontend_scaffold.py -k "projects_root_from_system_config" -q
```

Expected: FAIL because `GraphCreateRequest` has no `projects_root`, `GraphManagePage` does not load `/api/config/system`, and the create modal has no save-location field.

- [ ] **Step 3: Implement the type and modal changes**

Update `web/src/types/index.ts`:

```typescript
export interface GraphCreateRequest {
  name: string;
  description?: string;
  model_profile_id?: string;
  projects_root?: string;
  chunking?: GraphChunkingCreateRequest;
}
```

Add `getSystemConfig` to the existing API import in `web/src/pages/GraphManagePage.tsx`:

```typescript
import {
  buildGraph,
  clearGraphArtifacts,
  createGraph,
  deleteGraph,
  deleteGraphTextUnit,
  getGraph,
  getGraphFiles,
  getGraphPreview,
  getGraphReports,
  getGraphs,
  getGraphStatus,
  getGraphTextUnits,
  getSystemConfig,
  listModelProfiles,
} from "../api/client";
```

Add `SystemConfigPayload` to the existing type import:

```typescript
import type {
  GraphBuildAction,
  GraphCreateRequest,
  GraphDetailPayload,
  GraphPreviewPayload,
  GraphReportsPayload,
  GraphStatusPayload,
  GraphSummary,
  GraphTextUnitItem,
  GraphTextUnitListPayload,
  ModelProfileResponse,
  SourceFileListPayload,
  SystemConfigPayload,
} from "../types";
```

Add the default constant, state, and loader:

```typescript
const DEFAULT_PROJECTS_ROOT = "data/projects";

const [systemConfig, setSystemConfig] = useState<SystemConfigPayload | null>(null);

async function loadSystemConfig() {
  try {
    const payload = await getSystemConfig();
    setSystemConfig(payload);
  } catch (error) {
    messageApi.error(error instanceof Error ? error.message : "系统配置加载失败");
  }
}
```

Update `openCreateModal()` and the initial page-load effect:

```typescript
function openCreateModal() {
  createForm.resetFields();
  createForm.setFieldsValue({
    projects_root: systemConfig?.projects_root ?? DEFAULT_PROJECTS_ROOT,
    chunking: DEFAULT_CHUNKING_CONFIG,
  });
  setCreateOpen(true);
}

useEffect(() => {
  void loadGraphs();
  void loadProfiles();
  void loadSystemConfig();
}, []);
```

Update the create form `initialValues` and insert the `保存位置` field between the model-profile selector and the chunking section:

```tsx
<Form
  form={createForm}
  layout="vertical"
  initialValues={{
    projects_root: systemConfig?.projects_root ?? DEFAULT_PROJECTS_ROOT,
    chunking: DEFAULT_CHUNKING_CONFIG,
  }}
  onFinish={(values) => void handleCreateGraph(values)}
>
  <Form.Item<GraphCreateRequest>
    label="保存位置"
    name="projects_root"
    rules={[{ required: true, whitespace: true }]}
    extra="最终目录将自动生成为 <保存位置>/<图谱ID>"
  >
    <Input placeholder="例如: data/projects" />
  </Form.Item>
```

- [ ] **Step 4: Run the focused frontend test again**

Run:

```powershell
& '.\.venv\Scripts\python.exe' -m pytest tests/unit/web/test_frontend_scaffold.py -k "projects_root_from_system_config" -q
```

Expected: PASS. The source assertions should confirm the new request type, system-config preload, and helper text are present.

- [ ] **Step 5: Commit the create-modal save-location feature**

Run:

```bash
git add web/src/types/index.ts web/src/pages/GraphManagePage.tsx tests/unit/web/test_frontend_scaffold.py
git commit -m "feat: add per-graph save location field"
```

### Task 4: Clarify the system-config copy and run the end-to-end regression suite for this feature

**Files:**
- Modify: `web/src/pages/ModelConfigPage.tsx`
- Modify: `tests/unit/web/test_frontend_scaffold.py`
- Test: `tests/unit/api/test_graph_routes.py`
- Test: `tests/unit/api/test_project_workspace_service.py`
- Test: `tests/unit/web/test_frontend_scaffold.py`

- [ ] **Step 1: Write the failing system-config copy test**

Add this test to `tests/unit/web/test_frontend_scaffold.py`:

```python
def test_model_config_page_describes_projects_root_as_default_graph_save_location():
    page_source = Path("web/src/pages/ModelConfigPage.tsx").read_text(encoding="utf-8")

    assert "默认图谱保存位置" in page_source
    assert "新建图谱时会默认使用这里，也可以按图谱单独修改。" in page_source
```

- [ ] **Step 2: Run the focused copy test to verify it fails**

Run:

```powershell
& '.\.venv\Scripts\python.exe' -m pytest tests/unit/web/test_frontend_scaffold.py -k "default_graph_save_location" -q
```

Expected: FAIL because `ModelConfigPage` still labels `projects_root` as `图谱项目根目录` and has no helper text clarifying it is only the default.

- [ ] **Step 3: Update the system-config copy**

Update `web/src/pages/ModelConfigPage.tsx` so the user-facing text reflects the approved design:

```tsx
<Typography.Paragraph className="muted-text">
  统一管理 OpenAI、Azure OpenAI 和 Ollama 配置，并维护图谱项目默认保存位置。
</Typography.Paragraph>

<Form.Item<SystemConfigPayload>
  label="默认图谱保存位置"
  name="projects_root"
  extra="新建图谱时会默认使用这里，也可以按图谱单独修改。"
  rules={[{ required: true }]}
>
  <Input />
</Form.Item>
```

Do not change the payload shape or route names in this task. This is copy-only.

- [ ] **Step 4: Run the full regression suite for the feature**

Run:

```powershell
& '.\.venv\Scripts\python.exe' -m pytest tests/unit/api/test_graph_routes.py tests/unit/api/test_project_workspace_service.py tests/unit/web/test_frontend_scaffold.py -q
```

Expected: PASS. The API tests should cover default path behavior, per-graph override behavior, delete safety, and workspace validation. The web tests should cover the new create-modal field and the updated system-config copy.

- [ ] **Step 5: Commit the copy update and verified feature slice**

Run:

```bash
git add web/src/pages/ModelConfigPage.tsx tests/unit/web/test_frontend_scaffold.py
git commit -m "docs: clarify default graph save location copy"
```
