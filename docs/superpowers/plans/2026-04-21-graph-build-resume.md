# Graph Build Resume And File Progress Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add file-level resumable graph builds so failed or interrupted runs can continue without reprocessing successful files, and expose current-file plus per-file build status in the existing UI.

**Architecture:** Keep `GraphRegistryService` as the project-level build truth, and add a persisted per-project `logs/build_manifest.json` that tracks file-level status and fingerprints. Teach `GraphRagWrapperService` to orchestrate one file at a time, reuse GraphRAG update mode for resumed work, enrich `/status` and `/files` with manifest data, and wire the frontend to present start, resume, full rebuild, and file-level progress.

**Tech Stack:** FastAPI, Pydantic v2, asyncio, pandas, GraphRAG callbacks, pytest, React, TypeScript, Ant Design

**Execution Note:** The user explicitly requested direct edits in the main project and no git commits. Do not create a worktree and do not run `git commit`; use focused diffs and verification commands instead.

---

## File Map

- Create: `api/services/graph_build_manifest_service.py` - owns manifest models, file fingerprinting, manifest refresh, and per-file/project state transitions.
- Create: `api/services/graphrag_build_callback.py` - adapts GraphRAG workflow callbacks into project progress updates for the active file.
- Create: `tests/unit/api/test_graph_build_manifest_service.py` - unit coverage for manifest initialization, refresh, file selection, and state transitions.
- Modify: `api/schemas/graph.py` - add build action schema, resumable status fields, and file-level build metadata on `SourceFileItem`.
- Modify: `api/routers/graph.py` - forward the new build action and route file-list reads through the wrapper so file metadata is merged with manifest state.
- Modify: `api/services/source_ingest_service.py` - support loading documents for one relative path at a time so wrapper execution can process files sequentially.
- Modify: `api/services/graphrag_wrapper_service.py` - orchestrate manifest-aware start/resume/full rebuild behavior, callback updates, stale build recovery, and enriched status/file responses.
- Modify: `api/services/graph_status_service.py` - preserve existing high-level business statuses while allowing resumable failures to remain `failed`.
- Modify: `web/src/types/index.ts` - extend build request, status payload, and source file contracts.
- Modify: `web/src/api/client.ts` - keep the client wiring aligned with the new request/response shapes.
- Modify: `web/src/components/BuildStatusCard.tsx` - render current file, file counters, resumable state, and start/resume/full-rebuild actions.
- Modify: `web/src/pages/GraphManagePage.tsx` - add action-aware build handlers and render file-level status inside the source-file list.
- Modify: `tests/unit/api/test_graph_build_routes.py` - route coverage for build payload changes and resumable status fields.
- Modify: `tests/unit/api/test_graph_file_routes.py` - route coverage for manifest-enriched source file items.
- Modify: `tests/unit/api/test_graphrag_wrapper_service.py` - wrapper coverage for sequential per-file execution, update-mode reuse, and current-file progress.
- Modify: `tests/unit/api/test_stale_build_recovery.py` - stale build coverage for resumable interrupted state.
- Modify: `tests/unit/web/test_frontend_scaffold.py` - frontend scaffold assertions for the new UI affordances and request shape.

### Task 1: Extend the API contract for resumable builds and file-aware status

**Files:**
- Modify: `api/schemas/graph.py`
- Modify: `api/routers/graph.py`
- Modify: `tests/unit/api/test_graph_build_routes.py`
- Test: `tests/unit/api/test_graph_build_routes.py`

- [ ] **Step 1: Write the failing route tests for the new build contract**

Add these tests and fake-service expectations to `tests/unit/api/test_graph_build_routes.py`:

```python
class FakeGraphRagWrapperService:
    def __init__(self):
        self.build_calls: list[tuple[str, str, str, bool]] = []
        self.delete_calls: list[str] = []

    def start_build(
        self,
        graph_id: str,
        action: str,
        method: str,
        force_rebuild: bool,
        graph_registry_service: GraphRegistryService,
        **_,
    ) -> GraphBuildPayload:
        self.build_calls.append((graph_id, action, method, force_rebuild))
        graph_registry_service.mark_build_started(graph_id)
        graph = graph_registry_service.get_graph(graph_id)
        return GraphBuildPayload(
            graph_id=graph.id,
            status=graph.status,
            last_build_at=graph.last_build_at,
            last_error=None,
            resumable=action == "resume",
        )

    async def get_status(
        self,
        graph_id: str,
        graph_registry_service: GraphRegistryService,
        **_,
    ) -> GraphStatusPayload:
        graph = graph_registry_service.get_graph(graph_id)
        return GraphStatusPayload(
            graph_id=graph.id,
            status=graph.status,
            last_build_at=graph.last_build_at,
            last_error=None,
            has_source_files=True,
            source_file_count=3,
            document_count=2,
            text_unit_count=8,
            has_artifacts=True,
            artifact_paths=["output", "logs"],
            progress_percent=63,
            progress_stage="text_units_created",
            progress_message="Building current file chunks.",
            resumable=True,
            current_file="input/hr-onboarding.pdf",
            completed_file_count=1,
            failed_file_count=1,
            pending_file_count=1,
        )


def test_start_graph_build_accepts_resume_action(build_client):
    client, _, _, _, fake_wrapper_service = build_client
    create_response = client.post("/api/graph", json={"name": "Resume Graph"})
    graph_id = create_response.json()["data"]["id"]

    build_response = client.post(
        f"/api/graph/{graph_id}/build",
        json={
            "action": "resume",
            "method": "standard",
            "force_rebuild": False,
        },
    )

    assert build_response.status_code == 202
    assert build_response.json()["data"]["resumable"] is True
    assert fake_wrapper_service.build_calls == [
        (graph_id, "resume", "standard", False)
    ]


def test_start_graph_build_rejects_resume_with_force_rebuild(build_client):
    client, _, _, _, _ = build_client
    create_response = client.post("/api/graph", json={"name": "Invalid Resume Graph"})
    graph_id = create_response.json()["data"]["id"]

    response = client.post(
        f"/api/graph/{graph_id}/build",
        json={
            "action": "resume",
            "method": "standard",
            "force_rebuild": True,
        },
    )

    assert response.status_code == 422


def test_get_graph_status_returns_resumable_file_aware_snapshot(build_client):
    client, _, _, graph_registry_service, _ = build_client
    create_response = client.post("/api/graph", json={"name": "Status Graph"})
    graph_id = create_response.json()["data"]["id"]
    graph_registry_service.mark_build_started(graph_id)

    response = client.get(f"/api/graph/{graph_id}/status")

    assert response.status_code == 200
    assert response.json()["data"]["resumable"] is True
    assert response.json()["data"]["current_file"] == "input/hr-onboarding.pdf"
    assert response.json()["data"]["completed_file_count"] == 1
    assert response.json()["data"]["failed_file_count"] == 1
    assert response.json()["data"]["pending_file_count"] == 1
```

- [ ] **Step 2: Run the focused build-route tests to verify they fail**

Run: `uv run pytest tests/unit/api/test_graph_build_routes.py -q`

Expected: FAIL because `GraphBuildRequest`, `GraphBuildPayload`, and `GraphStatusPayload` do not include the new fields, and `start_graph_build(...)` does not forward `action`.

- [ ] **Step 3: Extend the schema models in `api/schemas/graph.py`**

Update the build and file contracts like this:

```python
GraphBuildAction = Literal["start", "resume"]
GraphFileBuildStatus = Literal["pending", "building", "succeeded", "failed", "skipped"]


class SourceFileItem(BaseModel):
    name: str
    relative_path: str
    extension: str
    size_bytes: int
    created_at: str
    build_status: GraphFileBuildStatus | None = None
    is_current: bool = False
    attempt_count: int = 0
    last_build_error: str | None = None
    last_built_at: str | None = None
    document_count: int = 0
    text_unit_count: int = 0


class GraphBuildRequest(BaseModel):
    action: GraphBuildAction = "start"
    method: GraphBuildMethod = "standard"
    force_rebuild: bool = False

    @model_validator(mode="after")
    def validate_action_force_rebuild_combo(self) -> "GraphBuildRequest":
        if self.action == "resume" and self.force_rebuild:
            raise ValueError("Resume build cannot be combined with force rebuild.")
        return self


class GraphBuildPayload(BaseModel):
    graph_id: str
    status: str
    last_build_at: str | None = None
    last_error: str | None = None
    resumable: bool = False


class GraphStatusPayload(BaseModel):
    graph_id: str
    status: str
    last_build_at: str | None = None
    last_error: str | None = None
    has_source_files: bool = False
    source_file_count: int = 0
    document_count: int = 0
    text_unit_count: int = 0
    has_artifacts: bool = False
    artifact_paths: list[str] = Field(default_factory=list)
    progress_percent: int = 0
    progress_stage: str = "awaiting_upload"
    progress_message: str = "Waiting for source files."
    resumable: bool = False
    current_file: str | None = None
    completed_file_count: int = 0
    failed_file_count: int = 0
    pending_file_count: int = 0
```

- [ ] **Step 4: Forward the action in `api/routers/graph.py`**

Update the build route call so it becomes:

```python
    build_payload = graphrag_wrapper_service.start_build(
        graph_id=graph_id,
        action=payload.action,
        method=payload.method,
        force_rebuild=payload.force_rebuild,
        app_config_service=app_config_service,
        graph_registry_service=graph_registry_service,
    )
```

- [ ] **Step 5: Run the focused build-route tests again**

Run: `uv run pytest tests/unit/api/test_graph_build_routes.py -q`

Expected: PASS for the new schema validation and build-route forwarding tests.

- [ ] **Step 6: Review the partial diff without committing**

Run: `git diff -- api/schemas/graph.py api/routers/graph.py tests/unit/api/test_graph_build_routes.py`

Expected: only the build-action, resumable status, and file-metadata contract changes are present. Do not commit.

### Task 2: Create the manifest service and add file-scoped document loading

**Files:**
- Create: `api/services/graph_build_manifest_service.py`
- Modify: `api/services/source_ingest_service.py`
- Create: `tests/unit/api/test_graph_build_manifest_service.py`
- Modify: `tests/unit/api/test_graph_file_routes.py`
- Test: `tests/unit/api/test_graph_build_manifest_service.py`
- Test: `tests/unit/api/test_graph_file_routes.py`

- [ ] **Step 1: Write the failing manifest and source-ingest tests**

Add these tests to `tests/unit/api/test_graph_build_manifest_service.py`:

```python
from pathlib import Path

from api.services.graph_build_manifest_service import GraphBuildManifestService


def test_initialize_manifest_creates_pending_entries_for_each_source_file(tmp_path: Path):
    root_dir = tmp_path / "graph"
    input_dir = root_dir / "input"
    input_dir.mkdir(parents=True, exist_ok=True)
    (input_dir / "a.txt").write_text("alpha", encoding="utf-8")
    (input_dir / "b.txt").write_text("beta", encoding="utf-8")

    service = GraphBuildManifestService()
    manifest = service.initialize_manifest(root_dir=root_dir, graph_id="graph-1")

    assert manifest.graph_id == "graph-1"
    assert [item.relative_path for item in manifest.files] == ["a.txt", "b.txt"]
    assert {item.status for item in manifest.files} == {"pending"}
    assert service.manifest_path(root_dir).exists()


def test_refresh_manifest_marks_changed_files_pending_and_drops_deleted_files(tmp_path: Path):
    root_dir = tmp_path / "graph"
    input_dir = root_dir / "input"
    input_dir.mkdir(parents=True, exist_ok=True)
    (input_dir / "a.txt").write_text("alpha", encoding="utf-8")
    (input_dir / "b.txt").write_text("beta", encoding="utf-8")

    service = GraphBuildManifestService()
    manifest = service.initialize_manifest(root_dir=root_dir, graph_id="graph-1")
    manifest = service.mark_file_succeeded(
        root_dir=root_dir,
        relative_path="a.txt",
        document_count=1,
        text_unit_count=3,
    )
    manifest = service.mark_file_succeeded(
        root_dir=root_dir,
        relative_path="b.txt",
        document_count=1,
        text_unit_count=2,
    )

    (input_dir / "a.txt").write_text("alpha changed", encoding="utf-8")
    (input_dir / "b.txt").unlink()
    (input_dir / "c.txt").write_text("gamma", encoding="utf-8")

    refreshed = service.refresh_manifest(root_dir=root_dir, action="resume")

    statuses = {item.relative_path: item.status for item in refreshed.files}
    assert statuses == {
        "a.txt": "pending",
        "c.txt": "pending",
    }


def test_select_files_for_resume_only_returns_pending_and_failed(tmp_path: Path):
    root_dir = tmp_path / "graph"
    input_dir = root_dir / "input"
    input_dir.mkdir(parents=True, exist_ok=True)
    for name in ("a.txt", "b.txt", "c.txt"):
        (input_dir / name).write_text(name, encoding="utf-8")

    service = GraphBuildManifestService()
    manifest = service.initialize_manifest(root_dir=root_dir, graph_id="graph-1")
    service.mark_file_succeeded(root_dir=root_dir, relative_path="a.txt", document_count=1, text_unit_count=1)
    service.mark_file_failed(root_dir=root_dir, relative_path="b.txt", error_message="provider timeout")

    selected = service.select_files_for_action(root_dir=root_dir, action="resume")

    assert [item.relative_path for item in selected] == ["b.txt", "c.txt"]
```

Add this focused file-loading test to `tests/unit/api/test_graph_file_routes.py`:

```python
@pytest.mark.asyncio
async def test_source_ingest_service_can_load_only_selected_relative_paths(tmp_path: Path):
    input_dir = tmp_path / "input"
    input_dir.mkdir(parents=True, exist_ok=True)
    (input_dir / "keep.txt").write_text("keep me", encoding="utf-8")
    (input_dir / "skip.txt").write_text("skip me", encoding="utf-8")

    service = SourceIngestService()
    documents = await service.load_source_documents(
        input_dir,
        relative_paths=["keep.txt"],
    )

    assert [document.title for document in documents] == ["keep.txt"]
```

- [ ] **Step 2: Run the focused manifest and source-ingest tests to verify they fail**

Run: `uv run pytest tests/unit/api/test_graph_build_manifest_service.py tests/unit/api/test_graph_file_routes.py -q`

Expected: FAIL because the manifest service does not exist yet and `load_source_documents(...)` cannot target one relative path.

- [ ] **Step 3: Implement `api/services/graph_build_manifest_service.py`**

Create the manifest service with persisted models and transition helpers:

```python
from __future__ import annotations

import hashlib
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal
from uuid import uuid4

from pydantic import BaseModel, Field

GraphBuildAction = Literal["start", "resume"]
GraphManifestProjectStatus = Literal["pending", "building", "failed", "completed"]
GraphManifestFileStatus = Literal["pending", "building", "succeeded", "failed", "skipped"]


class BuildManifestFileEntry(BaseModel):
    relative_path: str
    name: str
    extension: str
    size_bytes: int
    modified_at: str
    content_hash: str
    status: GraphManifestFileStatus = "pending"
    attempt_count: int = 0
    last_error: str | None = None
    started_at: str | None = None
    finished_at: str | None = None
    document_count: int = 0
    text_unit_count: int = 0


class BuildManifest(BaseModel):
    build_id: str
    graph_id: str
    status: GraphManifestProjectStatus = "pending"
    action: GraphBuildAction = "start"
    current_file: str | None = None
    started_at: str | None = None
    updated_at: str | None = None
    completed_file_count: int = 0
    failed_file_count: int = 0
    pending_file_count: int = 0
    last_error: str | None = None
    resumable: bool = False
    files: list[BuildManifestFileEntry] = Field(default_factory=list)


class GraphBuildManifestService:
    def manifest_path(self, root_dir: Path) -> Path:
        return root_dir / "logs" / "build_manifest.json"

    def load_manifest(self, root_dir: Path) -> BuildManifest:
        return BuildManifest.model_validate_json(
            self.manifest_path(root_dir).read_text(encoding="utf-8")
        )

    def delete_manifest(self, root_dir: Path) -> None:
        path = self.manifest_path(root_dir)
        if path.exists():
            path.unlink()

    def initialize_manifest(self, root_dir: Path, graph_id: str) -> BuildManifest:
        manifest = BuildManifest(
            build_id=uuid4().hex,
            graph_id=graph_id,
            status="pending",
            action="start",
            started_at=datetime.now(timezone.utc).isoformat(),
            updated_at=datetime.now(timezone.utc).isoformat(),
            files=self._scan_input_files(root_dir),
        )
        return self._save_manifest(root_dir, self._recount(manifest))

    def prepare_manifest(
        self,
        root_dir: Path,
        graph_id: str,
        action: GraphBuildAction,
    ) -> BuildManifest:
        if action == "start" or not self.manifest_path(root_dir).exists():
            return self.initialize_manifest(root_dir=root_dir, graph_id=graph_id)
        return self.refresh_manifest(root_dir=root_dir, action=action)

    def refresh_manifest(self, root_dir: Path, action: GraphBuildAction) -> BuildManifest:
        manifest = self.load_manifest(root_dir)
        current_files = {item.relative_path: item for item in self._scan_input_files(root_dir)}
        refreshed_files: list[BuildManifestFileEntry] = []

        for relative_path, current_item in current_files.items():
            previous_item = next(
                (item for item in manifest.files if item.relative_path == relative_path),
                None,
            )
            if previous_item is None:
                refreshed_files.append(current_item)
                continue
            if (
                previous_item.size_bytes == current_item.size_bytes
                and previous_item.modified_at == current_item.modified_at
                and previous_item.content_hash == current_item.content_hash
            ):
                refreshed_files.append(previous_item)
                continue
            refreshed_files.append(current_item.model_copy(update={"status": "pending"}))

        refreshed = manifest.model_copy(
            update={
                "action": action,
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "files": refreshed_files,
            }
        )
        return self._save_manifest(root_dir, self._recount(refreshed))

    def select_files_for_action(
        self,
        root_dir: Path,
        action: GraphBuildAction,
    ) -> list[BuildManifestFileEntry]:
        manifest = self.refresh_manifest(root_dir=root_dir, action=action)
        if action == "start":
            return [item for item in manifest.files if item.status != "skipped"]
        return [item for item in manifest.files if item.status in {"pending", "failed", "building"}]

    def is_resumable(self, root_dir: Path) -> bool:
        path = self.manifest_path(root_dir)
        if not path.exists():
            return False
        manifest = self.load_manifest(root_dir)
        return manifest.resumable or any(
            item.status in {"pending", "failed", "building"} for item in manifest.files
        )

    def mark_file_started(self, root_dir: Path, relative_path: str) -> BuildManifest:
        manifest = self.load_manifest(root_dir)
        now = datetime.now(timezone.utc).isoformat()
        updated_files = [
            item.model_copy(
                update={
                    "status": "building" if item.relative_path == relative_path else item.status,
                    "attempt_count": item.attempt_count + 1 if item.relative_path == relative_path else item.attempt_count,
                    "started_at": now if item.relative_path == relative_path else item.started_at,
                    "last_error": None if item.relative_path == relative_path else item.last_error,
                }
            )
            for item in manifest.files
        ]
        updated = manifest.model_copy(
            update={
                "status": "building",
                "current_file": relative_path,
                "updated_at": now,
                "files": updated_files,
            }
        )
        return self._save_manifest(root_dir, self._recount(updated))

    def mark_file_succeeded(
        self,
        root_dir: Path,
        relative_path: str,
        document_count: int,
        text_unit_count: int,
    ) -> BuildManifest:
        manifest = self.load_manifest(root_dir)
        now = datetime.now(timezone.utc).isoformat()
        updated_files = [
            item.model_copy(
                update={
                    "status": "succeeded" if item.relative_path == relative_path else item.status,
                    "finished_at": now if item.relative_path == relative_path else item.finished_at,
                    "document_count": document_count if item.relative_path == relative_path else item.document_count,
                    "text_unit_count": text_unit_count if item.relative_path == relative_path else item.text_unit_count,
                    "last_error": None if item.relative_path == relative_path else item.last_error,
                }
            )
            for item in manifest.files
        ]
        updated = manifest.model_copy(
            update={
                "current_file": None,
                "updated_at": now,
                "files": updated_files,
            }
        )
        return self._save_manifest(root_dir, self._recount(updated))

    def mark_file_failed(
        self,
        root_dir: Path,
        relative_path: str,
        error_message: str,
    ) -> BuildManifest:
        manifest = self.load_manifest(root_dir)
        now = datetime.now(timezone.utc).isoformat()
        updated_files = [
            item.model_copy(
                update={
                    "status": "failed" if item.relative_path == relative_path else item.status,
                    "finished_at": now if item.relative_path == relative_path else item.finished_at,
                    "last_error": error_message if item.relative_path == relative_path else item.last_error,
                }
            )
            for item in manifest.files
        ]
        updated = manifest.model_copy(
            update={
                "status": "failed",
                "current_file": None,
                "updated_at": now,
                "last_error": error_message,
                "resumable": True,
                "files": updated_files,
            }
        )
        return self._save_manifest(root_dir, self._recount(updated))

    def mark_project_completed(self, root_dir: Path) -> BuildManifest:
        manifest = self.load_manifest(root_dir)
        updated = manifest.model_copy(
            update={
                "status": "completed",
                "current_file": None,
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "last_error": None,
                "resumable": False,
            }
        )
        return self._save_manifest(root_dir, self._recount(updated))

    def update_progress(
        self,
        root_dir: Path,
        relative_path: str,
        stage: str,
        message: str,
    ) -> BuildManifest:
        manifest = self.load_manifest(root_dir)
        updated = manifest.model_copy(
            update={
                "status": "building",
                "current_file": relative_path,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
        )
        return self._save_manifest(root_dir, self._recount(updated))

    def merge_source_items(
        self,
        root_dir: Path,
        items: list[SourceFileItem],
    ) -> list[SourceFileItem]:
        manifest_by_path: dict[str, BuildManifestFileEntry] = {}
        current_file: str | None = None
        if self.manifest_path(root_dir).exists():
            manifest = self.load_manifest(root_dir)
            current_file = manifest.current_file
            manifest_by_path = {
                item.relative_path: item for item in manifest.files
            }

        merged: list[SourceFileItem] = []
        for item in items:
            manifest_item = manifest_by_path.get(item.relative_path)
            merged.append(
                item.model_copy(
                    update={
                        "build_status": None if manifest_item is None else manifest_item.status,
                        "is_current": item.relative_path == current_file,
                        "attempt_count": 0 if manifest_item is None else manifest_item.attempt_count,
                        "last_build_error": None if manifest_item is None else manifest_item.last_error,
                        "last_built_at": None if manifest_item is None else manifest_item.finished_at,
                        "document_count": 0 if manifest_item is None else manifest_item.document_count,
                        "text_unit_count": 0 if manifest_item is None else manifest_item.text_unit_count,
                    }
                )
            )
        return merged

    def _scan_input_files(self, root_dir: Path) -> list[BuildManifestFileEntry]:
        input_dir = root_dir / "input"
        entries: list[BuildManifestFileEntry] = []
        for file_path in sorted(path for path in input_dir.iterdir() if path.is_file()):
            entries.append(
                BuildManifestFileEntry(
                    relative_path=file_path.name,
                    name=file_path.name,
                    extension=file_path.suffix.lower(),
                    size_bytes=file_path.stat().st_size,
                    modified_at=datetime.fromtimestamp(
                        file_path.stat().st_mtime,
                        tz=timezone.utc,
                    ).isoformat(),
                    content_hash=hashlib.sha256(file_path.read_bytes()).hexdigest(),
                )
            )
        return entries

    def _save_manifest(self, root_dir: Path, manifest: BuildManifest) -> BuildManifest:
        path = self.manifest_path(root_dir)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(manifest.model_dump_json(indent=2), encoding="utf-8")
        return manifest

    def _recount(self, manifest: BuildManifest) -> BuildManifest:
        return manifest.model_copy(
            update={
                "completed_file_count": sum(1 for item in manifest.files if item.status == "succeeded"),
                "failed_file_count": sum(1 for item in manifest.files if item.status == "failed"),
                "pending_file_count": sum(1 for item in manifest.files if item.status in {"pending", "building"}),
            }
        )
```

Use `hashlib.sha256(file_path.read_bytes()).hexdigest()` for `content_hash`, and always save manifests under `root_dir / "logs"` with UTF-8 JSON.

- [ ] **Step 4: Teach `SourceIngestService` to load specific files**

Update `api/services/source_ingest_service.py` so `load_source_documents(...)` accepts an optional filter:

```python
    async def load_source_documents(
        self,
        input_dir: Path,
        relative_paths: list[str] | None = None,
    ) -> list[TextDocument]:
        storage = FileStorage(str(input_dir))
        allowed_paths = set(relative_paths or [])
        documents: list[TextDocument] = []

        for relative_path in sorted(storage.find(re.compile(r".+"))):
            if allowed_paths and relative_path not in allowed_paths:
                continue

            file_path = storage.get_path(relative_path)
            if not file_path.is_file():
                continue

            reader = self._build_reader(storage, relative_path)
            if reader is None:
                continue

            documents.extend(await reader.read_files())

        return documents
```

- [ ] **Step 5: Run the focused manifest and source-ingest tests again**

Run: `uv run pytest tests/unit/api/test_graph_build_manifest_service.py tests/unit/api/test_graph_file_routes.py -q`

Expected: PASS for manifest creation, refresh, selection, and filtered source loading.

- [ ] **Step 6: Review the partial diff without committing**

Run: `git diff -- api/services/graph_build_manifest_service.py api/services/source_ingest_service.py tests/unit/api/test_graph_build_manifest_service.py tests/unit/api/test_graph_file_routes.py`

Expected: only the new manifest service and file-filtering changes are present. Do not commit.

### Task 3: Wire the wrapper to execute file-by-file, resume safely, and enrich status/files

**Files:**
- Create: `api/services/graphrag_build_callback.py`
- Modify: `api/routers/graph.py`
- Modify: `api/services/graphrag_wrapper_service.py`
- Modify: `api/services/graph_status_service.py`
- Modify: `tests/unit/api/test_graphrag_wrapper_service.py`
- Modify: `tests/unit/api/test_stale_build_recovery.py`
- Modify: `tests/unit/api/test_graph_file_routes.py`
- Test: `tests/unit/api/test_graphrag_wrapper_service.py`
- Test: `tests/unit/api/test_stale_build_recovery.py`
- Test: `tests/unit/api/test_graph_file_routes.py`

- [ ] **Step 1: Write the failing wrapper and stale-recovery tests**

Add these tests to `tests/unit/api/test_graphrag_wrapper_service.py`:

```python
@pytest.mark.asyncio
async def test_run_build_processes_files_sequentially_and_uses_update_mode_after_first_file(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
):
    settings_path = tmp_path / "app_settings.json"
    registry_path = tmp_path / "graph_registry.json"
    projects_root = tmp_path / "projects"

    app_config_service = AppConfigService(settings_path)
    app_config_service.update_system_config(
        SystemConfigPayload(
            projects_root=str(projects_root),
            upload_root=str(projects_root),
            default_model_profile_id=None,
        )
    )
    graph_registry_service = GraphRegistryService(registry_path)
    graph_id = graph_registry_service.generate_graph_id("Sequential Build")
    root_dir = projects_root / graph_id
    ProjectWorkspaceService().initialize_workspace(
        root_dir=root_dir,
        model="gpt-4.1-mini",
        embedding_model="text-embedding-3-small",
    )
    graph_registry_service.create_graph(
        graph_id=graph_id,
        name="Sequential Build",
        description=None,
        root_dir=str(root_dir),
        model_profile_id=None,
    )
    graph_registry_service.mark_build_started(graph_id)
    (root_dir / "input" / "a.txt").write_text("alpha", encoding="utf-8")
    (root_dir / "input" / "b.txt").write_text("beta", encoding="utf-8")

    build_calls: list[dict[str, object]] = []

    def fake_load_config(root_dir: Path):
        return SimpleNamespace(
            output_storage=SimpleNamespace(base_dir=str(root_dir / "output")),
            update_output_storage=SimpleNamespace(base_dir=str(root_dir / "update_output")),
            cache=SimpleNamespace(storage=SimpleNamespace(base_dir=str(root_dir / "cache"))),
            reporting=SimpleNamespace(base_dir=str(root_dir / "logs")),
            vector_store=SimpleNamespace(
                vector_size=1536,
                db_uri=str(root_dir / "output" / "lancedb"),
                index_schema={},
            ),
            embed_text=SimpleNamespace(embedding_model_id="default_embedding_model"),
            get_embedding_model_config=lambda *_: SimpleNamespace(model="text-embedding-3-small"),
        )

    class FakeEmbeddingModel:
        async def embedding_async(self, *, input: list[str]):
            return SimpleNamespace(first_embedding=[0.0] * 1536)

    async def fake_build_index(**kwargs):
        build_calls.append(
            {
                "is_update_run": kwargs["is_update_run"],
                "titles": kwargs["input_documents"]["title"].tolist(),
            }
        )
        return [SimpleNamespace(workflow="done", result=None, state={}, error=None)]

    monkeypatch.setattr("api.services.graphrag_wrapper_service.load_config", fake_load_config)
    monkeypatch.setattr("api.services.graphrag_wrapper_service.build_index", fake_build_index)
    monkeypatch.setattr(
        "api.services.graphrag_wrapper_service.create_embedding",
        lambda *_: FakeEmbeddingModel(),
        raising=False,
    )

    service = GraphRagWrapperService()
    await service.run_build(
        graph_id=graph_id,
        action="start",
        method="standard",
        force_rebuild=False,
        app_config_service=app_config_service,
        graph_registry_service=graph_registry_service,
    )

    assert build_calls == [
        {"is_update_run": False, "titles": ["a.txt"]},
        {"is_update_run": True, "titles": ["b.txt"]},
    ]


@pytest.mark.asyncio
async def test_get_status_includes_resumable_manifest_counts(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    registry_path = tmp_path / "graph_registry.json"
    projects_root = tmp_path / "projects"
    graph_registry_service = GraphRegistryService(registry_path)

    graph_id = graph_registry_service.generate_graph_id("Manifest Status Graph")
    root_dir = projects_root / graph_id
    (root_dir / "input").mkdir(parents=True, exist_ok=True)
    (root_dir / "logs").mkdir(parents=True, exist_ok=True)
    (root_dir / "output").mkdir(parents=True, exist_ok=True)
    (root_dir / "input" / "a.txt").write_text("alpha", encoding="utf-8")
    (root_dir / "input" / "b.txt").write_text("beta", encoding="utf-8")
    (root_dir / "input" / "c.txt").write_text("gamma", encoding="utf-8")

    graph_registry_service.create_graph(
        graph_id=graph_id,
        name="Manifest Status Graph",
        description=None,
        root_dir=str(root_dir),
        model_profile_id=None,
    )
    graph_registry_service.mark_build_failed(graph_id, "provider timeout")

    manifest_service = GraphBuildManifestService()
    manifest_service.initialize_manifest(root_dir=root_dir, graph_id=graph_id)
    manifest_service.mark_file_succeeded(
        root_dir=root_dir,
        relative_path="a.txt",
        document_count=1,
        text_unit_count=4,
    )
    manifest_service.mark_file_failed(
        root_dir=root_dir,
        relative_path="b.txt",
        error_message="provider timeout",
    )

    def fake_load_config(root_dir: Path):
        return SimpleNamespace(
            output_storage=SimpleNamespace(base_dir=str(root_dir / "output")),
            update_output_storage=SimpleNamespace(base_dir=str(root_dir / "update_output")),
            cache=SimpleNamespace(storage=SimpleNamespace(base_dir=str(root_dir / "cache"))),
            reporting=SimpleNamespace(base_dir=str(root_dir / "logs")),
            vector_store=SimpleNamespace(db_uri=str(root_dir / "output" / "lancedb")),
        )

    monkeypatch.setattr("api.services.graphrag_wrapper_service.load_config", fake_load_config)

    service = GraphRagWrapperService(manifest_service=manifest_service)
    payload = await service.get_status(
        graph_id=graph_id,
        graph_registry_service=graph_registry_service,
    )

    assert payload.resumable is True
    assert payload.current_file is None
    assert payload.completed_file_count == 1
    assert payload.failed_file_count == 1
    assert payload.pending_file_count == 1
```

Update `tests/unit/api/test_stale_build_recovery.py` with:

```python
@pytest.mark.asyncio
async def test_get_status_marks_stale_building_as_failed_but_resumable_when_manifest_exists(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
):
    registry_path = tmp_path / "graph_registry.json"
    projects_root = tmp_path / "projects"
    graph_registry_service = GraphRegistryService(registry_path)

    graph_id = graph_registry_service.generate_graph_id("Interrupted Graph")
    root_dir = projects_root / graph_id
    (root_dir / "input").mkdir(parents=True, exist_ok=True)
    (root_dir / "logs").mkdir(parents=True, exist_ok=True)
    (root_dir / "input" / "a.txt").write_text("alpha", encoding="utf-8")

    graph_registry_service.create_graph(
        graph_id=graph_id,
        name="Interrupted Graph",
        description=None,
        root_dir=str(root_dir),
        model_profile_id=None,
    )
    graph_registry_service.mark_build_started(graph_id)

    manifest_service = GraphBuildManifestService()
    manifest_service.initialize_manifest(root_dir=root_dir, graph_id=graph_id)
    manifest_service.mark_file_started(root_dir=root_dir, relative_path="a.txt")

    def fake_load_config(root_dir: Path):
        return SimpleNamespace(
            output_storage=SimpleNamespace(base_dir=str(root_dir / "output")),
            update_output_storage=SimpleNamespace(base_dir=str(root_dir / "update_output")),
            cache=SimpleNamespace(storage=SimpleNamespace(base_dir=str(root_dir / "cache"))),
            reporting=SimpleNamespace(base_dir=str(root_dir / "logs")),
            vector_store=SimpleNamespace(db_uri=str(root_dir / "output" / "lancedb")),
        )

    monkeypatch.setattr("api.services.graphrag_wrapper_service.load_config", fake_load_config)

    service = GraphRagWrapperService(manifest_service=manifest_service)
    payload = await service.get_status(
        graph_id=graph_id,
        graph_registry_service=graph_registry_service,
    )

    assert payload.status == "failed"
    assert payload.last_error == "Previous build was interrupted. Please resume."
    assert payload.resumable is True
```

Add this route expectation to `tests/unit/api/test_graph_file_routes.py`:

```python
def test_list_graph_files_includes_manifest_build_metadata(graph_file_client):
    client, _, _, _ = graph_file_client
    create_response = client.post("/api/graph", json={"name": "Metadata Graph"})
    graph_id = create_response.json()["data"]["id"]
    client.post(
        f"/api/graph/{graph_id}/files",
        files=[("files", ("notes.txt", b"hello graph", "text/plain"))],
    )

    response = client.get(f"/api/graph/{graph_id}/files")

    assert response.status_code == 200
    item = response.json()["data"]["items"][0]
    assert "build_status" in item
    assert "is_current" in item
    assert "attempt_count" in item
    assert "last_build_error" in item
    assert "last_built_at" in item
```

- [ ] **Step 2: Run the focused wrapper, stale-recovery, and file-route tests to verify they fail**

Run: `uv run pytest tests/unit/api/test_graphrag_wrapper_service.py tests/unit/api/test_stale_build_recovery.py tests/unit/api/test_graph_file_routes.py -q`

Expected: FAIL because the wrapper still executes the entire input set at once, stale builds are not resumable, and `/files` is not manifest-aware.

- [ ] **Step 3: Add the GraphRAG callback adapter**

Create `api/services/graphrag_build_callback.py` with a small callback bridge:

```python
from __future__ import annotations

from graphrag.callbacks.workflow_callbacks import WorkflowCallbacks
from graphrag.logger.progress import Progress


class GraphRagBuildCallback(WorkflowCallbacks):
    def __init__(self, on_stage_change):
        self._on_stage_change = on_stage_change

    def pipeline_start(self, names: list[str]) -> None:
        self._on_stage_change(stage="build_started", message="Build started.")

    def workflow_start(self, name: str, instance: object) -> None:
        self._on_stage_change(stage=name, message=f"Running workflow: {name}")

    def progress(self, progress: Progress) -> None:
        self._on_stage_change(
            stage="workflow_progress",
            message=str(progress),
        )

    def pipeline_error(self, error: BaseException) -> None:
        self._on_stage_change(stage="failed", message=str(error))

    def workflow_end(self, name: str, instance: object) -> None:
        return None

    def pipeline_end(self, results) -> None:
        return None
```

- [ ] **Step 4: Refactor `GraphRagWrapperService` around the manifest**

Update `api/services/graphrag_wrapper_service.py` so the public methods become manifest-aware:

```python
class GraphRagWrapperService:
    _INTERRUPTED_BUILD_MESSAGE = "Previous build was interrupted. Please resume."

    def __init__(
        self,
        source_ingest_service: SourceIngestService | None = None,
        model_profile_validation_service: ModelProfileValidationService | None = None,
        prompt_localization_service: PromptLocalizationService | None = None,
        manifest_service: GraphBuildManifestService | None = None,
    ) -> None:
        self._source_ingest_service = source_ingest_service or SourceIngestService()
        self._model_profile_validation_service = (
            model_profile_validation_service or ModelProfileValidationService()
        )
        self._prompt_localization_service = (
            prompt_localization_service or PromptLocalizationService()
        )
        self._manifest_service = manifest_service or GraphBuildManifestService()

    def start_build(
        self,
        graph_id: str,
        action: str,
        method: str,
        force_rebuild: bool,
        app_config_service: AppConfigService,
        graph_registry_service: GraphRegistryService,
    ) -> GraphBuildPayload:
        graph = self._reconcile_stale_build_state(graph_id, graph_registry_service)
        root_dir = Path(graph.root_dir)

        if action == "resume" and not self._manifest_service.is_resumable(root_dir):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Graph project '{graph_id}' has no resumable build state.",
            )

        updated = graph_registry_service.mark_build_started(graph_id)
        task = asyncio.create_task(
            self.run_build(
                graph_id=graph_id,
                action=action,
                method=method,
                force_rebuild=force_rebuild,
                app_config_service=app_config_service,
                graph_registry_service=graph_registry_service,
            )
        )
        self._tasks[graph_id] = task
        task.add_done_callback(lambda _: self._tasks.pop(graph_id, None))
        return GraphBuildPayload(
            graph_id=updated.id,
            status=updated.status,
            last_build_at=updated.last_build_at,
            last_error=updated.last_error,
            resumable=action == "resume",
        )

    async def run_build(
        self,
        graph_id: str,
        action: str,
        method: str,
        force_rebuild: bool,
        app_config_service: AppConfigService,
        graph_registry_service: GraphRegistryService,
    ) -> None:
        graph = graph_registry_service.get_graph(graph_id)
        root_dir = Path(graph.root_dir)
        env_overrides: dict[str, str | None] | None = None
        current_relative_path: str | None = None

        if graph.model_profile_id:
            profile = app_config_service.get_model_profile(graph.model_profile_id)
            self._sync_model_profile(root_dir, profile)
            env_overrides = self._build_model_env_overrides(profile)

        try:
            if force_rebuild:
                await self._delete_artifact_paths(root_dir)
                self._manifest_service.delete_manifest(root_dir)

            manifest = self._manifest_service.prepare_manifest(
                root_dir=root_dir,
                graph_id=graph_id,
                action=action,
            )
            files_to_run = self._manifest_service.select_files_for_action(
                root_dir=root_dir,
                action=action,
            )

            if not files_to_run:
                self._manifest_service.mark_project_completed(root_dir)
                graph_registry_service.mark_build_succeeded(graph_id)
                return

            with self._project_context(root_dir, env_overrides):
                config = load_config(root_dir=root_dir)
                await self._sync_vector_store_dimensions(config)

                for index, file_entry in enumerate(files_to_run):
                    current_relative_path = file_entry.relative_path
                    self._manifest_service.mark_file_started(root_dir, file_entry.relative_path)
                    documents = await self._source_ingest_service.load_source_documents(
                        root_dir / "input",
                        relative_paths=[file_entry.relative_path],
                    )
                    input_documents = self._to_documents_dataframe(documents)
                    callback = GraphRagBuildCallback(
                        on_stage_change=lambda **event: self._manifest_service.update_progress(
                            root_dir=root_dir,
                            relative_path=file_entry.relative_path,
                            **event,
                        )
                    )
                    outputs = await build_index(
                        config=config,
                        method=IndexingMethod(method),
                        is_update_run=index > 0 or action == "resume",
                        callbacks=[callback],
                        input_documents=input_documents,
                    )
                    errors = [str(output.error) for output in outputs if output.error]
                    if errors:
                        raise RuntimeError(errors[0])

                    after_document_count = len(input_documents)
                    _, after_text_unit_count = self._read_output_counts(root_dir)
                    self._manifest_service.mark_file_succeeded(
                        root_dir=root_dir,
                        relative_path=file_entry.relative_path,
                        document_count=after_document_count,
                        text_unit_count=after_text_unit_count,
                    )

            self._manifest_service.mark_project_completed(root_dir)
            graph_registry_service.mark_build_succeeded(graph_id)
        except Exception as exc:
            if current_relative_path is not None:
                self._manifest_service.mark_file_failed(
                    root_dir=root_dir,
                    relative_path=current_relative_path,
                    error_message=str(exc),
                )
            graph_registry_service.mark_build_failed(graph_id, str(exc))
            raise
```

Also add a wrapper helper used by the file route:

```python
    async def list_source_files(
        self,
        graph_id: str,
        graph_registry_service: GraphRegistryService,
    ) -> list[SourceFileItem]:
        graph = graph_registry_service.get_graph(graph_id)
        root_dir = Path(graph.root_dir)
        items = await self._source_ingest_service.list_files(root_dir / "input")
        return self._manifest_service.merge_source_items(root_dir=root_dir, items=items)
```

Update the GET files route in `api/routers/graph.py` to call `graphrag_wrapper_service.list_source_files(...)` instead of reading `SourceIngestService` directly.

- [ ] **Step 5: Keep high-level status normalization simple**

`api/services/graph_status_service.py` should stay conservative:

```python
    def resolve_status(
        self,
        raw_status: str,
        has_source_files: bool,
        has_artifacts: bool,
    ) -> str:
        if raw_status == "building":
            return "building"
        if raw_status == "failed":
            return "failed"
        if raw_status == "ready" and has_artifacts:
            return "ready"
        if has_source_files:
            return "awaiting_build"
        return "awaiting_upload"
```

Do not add a separate public `interrupted` business status. Resumability is surfaced through `payload.resumable`.

- [ ] **Step 6: Run the focused wrapper, stale-recovery, and file-route tests again**

Run: `uv run pytest tests/unit/api/test_graphrag_wrapper_service.py tests/unit/api/test_stale_build_recovery.py tests/unit/api/test_graph_file_routes.py -q`

Expected: PASS for per-file sequencing, stale resumability, and manifest-enriched `/files`.

- [ ] **Step 7: Review the backend diff without committing**

Run: `git diff -- api/services/graphrag_build_callback.py api/services/graphrag_wrapper_service.py api/services/graph_status_service.py api/routers/graph.py tests/unit/api/test_graphrag_wrapper_service.py tests/unit/api/test_stale_build_recovery.py tests/unit/api/test_graph_file_routes.py`

Expected: only the manifest-aware orchestration, callback, and file-route changes are present. Do not commit.

### Task 4: Update the frontend types and UI for start, resume, full rebuild, and per-file state

**Files:**
- Modify: `web/src/types/index.ts`
- Modify: `web/src/api/client.ts`
- Modify: `web/src/components/BuildStatusCard.tsx`
- Modify: `web/src/pages/GraphManagePage.tsx`
- Modify: `tests/unit/web/test_frontend_scaffold.py`
- Test: `tests/unit/web/test_frontend_scaffold.py`

- [ ] **Step 1: Write the failing frontend scaffold assertions**

Add these assertions to `tests/unit/web/test_frontend_scaffold.py`:

```python
def test_graph_manage_page_supports_resume_and_full_rebuild_actions():
    page_source = Path("web/src/pages/GraphManagePage.tsx").read_text(encoding="utf-8")
    card_source = Path("web/src/components/BuildStatusCard.tsx").read_text(encoding="utf-8")
    types_source = Path("web/src/types/index.ts").read_text(encoding="utf-8")

    assert 'export type GraphBuildAction = "start" | "resume"' in types_source
    assert "resumable: boolean;" in types_source
    assert "current_file?: string | null;" in types_source
    assert "completed_file_count: number;" in types_source
    assert "failed_file_count: number;" in types_source
    assert "pending_file_count: number;" in types_source
    assert "build_status?: " in types_source
    assert "Resume Build" in card_source
    assert "Full Rebuild" in card_source
    assert "current_file" in card_source
    assert "handleBuildAction" in page_source
    assert 'action: "resume"' in page_source
    assert 'force_rebuild: true' in page_source


def test_graph_manage_page_renders_file_level_build_tags():
    page_source = Path("web/src/pages/GraphManagePage.tsx").read_text(encoding="utf-8")
    assert "build_status" in page_source
    assert "is_current" in page_source
    assert "attempt_count" in page_source
    assert "last_build_error" in page_source
    assert "text_unit_count" in page_source
```

- [ ] **Step 2: Run the focused frontend scaffold test to verify it fails**

Run: `uv run pytest tests/unit/web/test_frontend_scaffold.py -k "resume or build_tags" -q`

Expected: FAIL because the frontend types, card, and page logic do not expose the new contract yet.

- [ ] **Step 3: Extend the TypeScript contracts and client wiring**

Update `web/src/types/index.ts` like this:

```ts
export type GraphBuildMethod = "standard" | "fast";
export type GraphBuildAction = "start" | "resume";

export interface SourceFileItem {
  name: string;
  relative_path: string;
  extension: string;
  size_bytes: number;
  created_at: string;
  build_status?: "pending" | "building" | "succeeded" | "failed" | "skipped" | null;
  is_current?: boolean;
  attempt_count?: number;
  last_build_error?: string | null;
  last_built_at?: string | null;
  document_count?: number;
  text_unit_count?: number;
}

export interface GraphBuildRequest {
  action: GraphBuildAction;
  method: GraphBuildMethod;
  force_rebuild: boolean;
}

export interface GraphBuildPayload {
  graph_id: string;
  status: string;
  last_build_at?: string | null;
  last_error?: string | null;
  resumable: boolean;
}

export interface GraphStatusPayload {
  graph_id: string;
  status: string;
  last_build_at?: string | null;
  last_error?: string | null;
  has_source_files: boolean;
  source_file_count: number;
  document_count: number;
  text_unit_count: number;
  has_artifacts: boolean;
  artifact_paths: string[];
  progress_percent: number;
  progress_stage: string;
  progress_message: string;
  resumable: boolean;
  current_file?: string | null;
  completed_file_count: number;
  failed_file_count: number;
  pending_file_count: number;
}
```

`web/src/api/client.ts` does not need new endpoints; it only needs to accept the updated `GraphBuildRequest` and return the richer payloads through the existing functions.

- [ ] **Step 4: Expand `BuildStatusCard.tsx`**

Refactor the card props and action area like this:

```tsx
interface BuildStatusCardProps {
  status: GraphStatusPayload | null;
  actionError?: string | null;
  busy?: boolean;
  onStartBuild: () => Promise<void> | void;
  onResumeBuild: () => Promise<void> | void;
  onFullRebuild: () => Promise<void> | void;
  onRefresh: () => Promise<void> | void;
  onClearArtifacts: () => Promise<void> | void;
}

<Button type="primary" size="small" loading={busy} onClick={() => void onStartBuild()}>
  Start Build
</Button>
{status?.resumable ? (
  <Button size="small" loading={busy} onClick={() => void onResumeBuild()}>
    Resume Build
  </Button>
) : null}
<Button size="small" danger loading={busy} onClick={() => void onFullRebuild()}>
  Full Rebuild
</Button>
```

Add extra description rows for:

```tsx
<Descriptions.Item label="Current File">
  {status.current_file ?? "None"}
</Descriptions.Item>
<Descriptions.Item label="Completed Files">
  {status.completed_file_count}
</Descriptions.Item>
<Descriptions.Item label="Failed Files">
  {status.failed_file_count}
</Descriptions.Item>
<Descriptions.Item label="Pending Files">
  {status.pending_file_count}
</Descriptions.Item>
```

- [ ] **Step 5: Make `GraphManagePage.tsx` action-aware and render file build metadata**

Replace the single build handler with one reusable function:

```tsx
async function handleBuildAction(
  action: "start" | "resume",
  forceRebuild: boolean,
) {
  if (!selectedGraphId) {
    return;
  }

  try {
    setActionLoading(true);
    setBuildAttemptError(null);
    const buildPayload = await buildGraph(selectedGraphId, {
      action,
      method: "standard",
      force_rebuild: forceRebuild,
    });

    setGraphStatus((current) => ({
      graph_id: buildPayload.graph_id,
      status: buildPayload.status,
      last_build_at: buildPayload.last_build_at ?? current?.last_build_at ?? null,
      last_error: buildPayload.last_error ?? null,
      has_source_files: current?.has_source_files ?? (graphFiles?.total ?? 0) > 0,
      source_file_count: current?.source_file_count ?? graphFiles?.total ?? 0,
      document_count: current?.document_count ?? 0,
      text_unit_count: current?.text_unit_count ?? 0,
      has_artifacts: current?.has_artifacts ?? false,
      artifact_paths: current?.artifact_paths ?? [],
      progress_percent: current?.progress_percent ?? 20,
      progress_stage: current?.progress_stage ?? "build_started",
      progress_message: current?.progress_message ?? "Build started.",
      resumable: buildPayload.resumable,
      current_file: current?.current_file ?? null,
      completed_file_count: current?.completed_file_count ?? 0,
      failed_file_count: current?.failed_file_count ?? 0,
      pending_file_count: current?.pending_file_count ?? graphFiles?.total ?? 0,
    }));
  } finally {
    setActionLoading(false)
  }
}
```

Wire the card like this:

```tsx
<BuildStatusCard
  status={graphStatus}
  actionError={buildAttemptError}
  busy={actionLoading}
  onStartBuild={async () => handleBuildAction("start", false)}
  onResumeBuild={async () => handleBuildAction("resume", false)}
  onFullRebuild={async () => handleBuildAction("start", true)}
  onRefresh={async () => {
    if (selectedGraphId) {
      await hydrateGraph(selectedGraphId)
    }
  }}
  onClearArtifacts={async () => handleClearArtifacts()}
/>
```

Render status tags in the file list:

```tsx
renderItem={(item) => (
  <List.Item>
    <Space direction="vertical" size={2} style={{ width: "100%" }}>
      <Space>
        <Typography.Text strong>{item.name}</Typography.Text>
        {item.build_status ? <Tag>{item.build_status}</Tag> : null}
        {item.is_current ? <Tag color="processing">current</Tag> : null}
      </Space>
      <Typography.Text className="muted-text">
        {item.extension} | {item.size_bytes} bytes | attempts {item.attempt_count ?? 0}
      </Typography.Text>
      {item.last_built_at ? (
        <Typography.Text className="muted-text">
          last built {item.last_built_at}
        </Typography.Text>
      ) : null}
      {item.last_build_error ? (
        <Typography.Text type="danger">{item.last_build_error}</Typography.Text>
      ) : null}
      <Typography.Text className="muted-text">
        docs {item.document_count ?? 0} | chunks {item.text_unit_count ?? 0}
      </Typography.Text>
    </Space>
  </List.Item>
)}
```

- [ ] **Step 6: Run the focused frontend scaffold test again**

Run: `uv run pytest tests/unit/web/test_frontend_scaffold.py -k "resume or build_tags" -q`

Expected: PASS for the new type, action, and file-list UI assertions.

- [ ] **Step 7: Review the frontend diff without committing**

Run: `git diff -- web/src/types/index.ts web/src/api/client.ts web/src/components/BuildStatusCard.tsx web/src/pages/GraphManagePage.tsx tests/unit/web/test_frontend_scaffold.py`

Expected: only the planned build action and file-state UI changes are present. Do not commit.

### Task 5: Run the integrated verification suite and a manual resume smoke check

**Files:**
- Modify: none
- Test: `tests/unit/api/test_graph_build_routes.py`
- Test: `tests/unit/api/test_graph_file_routes.py`
- Test: `tests/unit/api/test_graph_build_manifest_service.py`
- Test: `tests/unit/api/test_graphrag_wrapper_service.py`
- Test: `tests/unit/api/test_stale_build_recovery.py`
- Test: `tests/unit/web/test_frontend_scaffold.py`

- [ ] **Step 1: Run the full targeted backend and frontend test slice**

Run: `uv run pytest tests/unit/api/test_graph_build_routes.py tests/unit/api/test_graph_file_routes.py tests/unit/api/test_graph_build_manifest_service.py tests/unit/api/test_graphrag_wrapper_service.py tests/unit/api/test_stale_build_recovery.py tests/unit/web/test_frontend_scaffold.py -q`

Expected: PASS with the resumable-build, stale-recovery, route, and frontend assertions all green.

- [ ] **Step 2: Run the frontend production build**

Run from `web/`: `cmd /c npm.cmd run build`

Expected: PASS in `web/` with no TypeScript errors and no missing prop/type regressions from the new build/status contracts.

- [ ] **Step 3: Review the final implementation diff for scope drift**

Run: `git diff -- api/schemas/graph.py api/routers/graph.py api/services/source_ingest_service.py api/services/graph_build_manifest_service.py api/services/graphrag_build_callback.py api/services/graphrag_wrapper_service.py api/services/graph_status_service.py web/src/types/index.ts web/src/api/client.ts web/src/components/BuildStatusCard.tsx web/src/pages/GraphManagePage.tsx tests/unit/api/test_graph_build_routes.py tests/unit/api/test_graph_file_routes.py tests/unit/api/test_graph_build_manifest_service.py tests/unit/api/test_graphrag_wrapper_service.py tests/unit/api/test_stale_build_recovery.py tests/unit/web/test_frontend_scaffold.py`

Expected: only the files in this plan are changed, there are no accidental commits, and unrelated workspace edits remain untouched.

- [ ] **Step 4: Manual smoke check the resumable behavior**

Run the app, create a graph with at least two source files, trigger a build, force one run to fail, and then verify:

```text
1. The failed project status stays "failed" but exposes resumable=true.
2. The source-file list shows one or more files as succeeded and one as failed.
3. Clicking "Resume Build" skips previously succeeded files and retries only failed/pending files.
4. logs/build_manifest.json reflects the same file states shown in the UI.
```

If any of those checks diverge, fix the backend manifest merge first, then re-run the targeted tests before touching the frontend copy.
