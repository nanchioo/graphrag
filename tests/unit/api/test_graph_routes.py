# Copyright (c) 2024 Microsoft Corporation.
# Licensed under the MIT License

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from api.deps import (
    get_app_config_service,
    get_graph_registry_service,
    get_graphrag_wrapper_service,
    get_model_profile_validation_service,
)
from api.schemas.config import SystemConfigPayload
from api.services.app_config_service import AppConfigService
from api.services.graph_registry_service import GraphRegistryService
from main import app


class NoOpModelProfileValidationService:
    """Test validator that allows all model profile saves."""

    def validate_create_request(self, *_args, **_kwargs) -> None:
        return None

    def validate_update_request(self, *_args, **_kwargs) -> None:
        return None


class FakeGraphDeleteWrapperService:
    """Fake wrapper service used to verify delete-route task cancellation behavior."""

    def __init__(self, cancelled: bool):
        self.cancelled = cancelled
        self.cancel_calls: list[str] = []

    async def cancel_active_build(self, graph_id: str) -> bool:
        self.cancel_calls.append(graph_id)
        return self.cancelled


@pytest.fixture
def graph_client(
    tmp_path: Path,
) -> tuple[TestClient, Path, Path, AppConfigService, GraphRegistryService]:
    """Create a test client with isolated graph/config storage."""

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

    app.dependency_overrides[get_app_config_service] = lambda: app_config_service
    app.dependency_overrides[get_graph_registry_service] = (
        lambda: graph_registry_service
    )
    app.dependency_overrides[get_model_profile_validation_service] = (
        lambda: NoOpModelProfileValidationService()
    )

    with TestClient(app) as client:
        yield client, projects_root, registry_path, app_config_service, graph_registry_service

    app.dependency_overrides.clear()


def test_list_graphs_returns_empty_registry(
    graph_client: tuple[
        TestClient, Path, Path, AppConfigService, GraphRegistryService
    ],
):
    client, _, registry_path, _, _ = graph_client

    response = client.get("/api/graph")

    assert response.status_code == 200
    assert response.json() == {
        "success": True,
        "message": "Graph projects loaded.",
        "data": {
            "items": [],
            "total": 0,
        },
    }
    assert registry_path.exists()


def test_create_graph_initializes_workspace_and_registers_project(
    graph_client: tuple[
        TestClient, Path, Path, AppConfigService, GraphRegistryService
    ],
):
    client, projects_root, registry_path, _, _ = graph_client

    profile_response = client.post(
        "/api/config/models",
        json={
            "provider": "openai",
            "name": "Project Default",
            "base_url": "https://api.openai.com/v1",
            "api_key": "sk-project-secret",
            "model_name": "gpt-4.1-mini",
            "embedding_model_name": "text-embedding-3-small",
            "is_default": False,
        },
    )
    assert profile_response.status_code == 201
    profile_id = profile_response.json()["data"]["id"]

    create_response = client.post(
        "/api/graph",
        json={
            "name": "Customer Service Graph",
            "description": "客服知识图谱",
            "model_profile_id": profile_id,
        },
    )

    assert create_response.status_code == 201
    payload = create_response.json()
    graph_id = payload["data"]["id"]
    root_dir = projects_root / graph_id

    assert payload["success"] is True
    assert payload["message"] == "Graph project created."
    assert payload["data"]["name"] == "Customer Service Graph"
    assert payload["data"]["description"] == "客服知识图谱"
    assert payload["data"]["model_profile_id"] == profile_id
    assert payload["data"]["status"] == "initialized"
    assert payload["data"]["root_dir"] == str(root_dir)
    assert payload["data"]["last_build_at"] is None
    assert payload["data"]["created_at"]

    assert root_dir.exists()
    assert (root_dir / "settings.yaml").exists()
    assert (root_dir / ".env").exists()
    assert (root_dir / "prompts").exists()
    assert (root_dir / "input").exists()

    settings_text = (root_dir / "settings.yaml").read_text(encoding="utf-8")
    assert "model: gpt-4.1-mini" in settings_text
    assert "model: text-embedding-3-small" in settings_text

    list_response = client.get("/api/graph")
    assert list_response.status_code == 200
    assert list_response.json() == {
        "success": True,
        "message": "Graph projects loaded.",
        "data": {
            "items": [
                {
                    "id": graph_id,
                    "name": "Customer Service Graph",
                    "status": "awaiting_upload",
                    "model_profile_id": profile_id,
                }
            ],
            "total": 1,
        },
    }

    detail_response = client.get(f"/api/graph/{graph_id}")
    assert detail_response.status_code == 200
    assert detail_response.json() == {
        "success": True,
        "message": "Graph project loaded.",
        "data": payload["data"],
    }

    registry_text = registry_path.read_text(encoding="utf-8")
    assert graph_id in registry_text


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


def test_graph_registry_service_resolves_relative_root_dir_against_project_root(
    tmp_path: Path,
):
    project_root = tmp_path / "repo"
    registry_path = project_root / "config" / "graph_registry.json"
    registry_service = GraphRegistryService(registry_path, project_root=project_root)

    project_root.mkdir(parents=True, exist_ok=True)
    registry_service.create_graph(
        graph_id="relative-root-graph",
        name="Relative Root Graph",
        description=None,
        root_dir="data/projects/relative-root-graph",
        model_profile_id=None,
    )

    graph = registry_service.get_graph("relative-root-graph")

    assert graph.root_dir == str(
        (project_root / "data" / "projects" / "relative-root-graph").resolve()
    )


def test_delete_graph_removes_project_from_registry_and_subsequent_get_returns_404(
    graph_client: tuple[
        TestClient, Path, Path, AppConfigService, GraphRegistryService
    ],
):
    client, projects_root, _, _, _ = graph_client

    create_response = client.post(
        "/api/graph",
        json={
            "name": "Delete Me",
            "description": "delete route test",
        },
    )
    assert create_response.status_code == 201
    graph_id = create_response.json()["data"]["id"]
    root_dir = projects_root / graph_id

    delete_response = client.delete(f"/api/graph/{graph_id}")

    assert delete_response.status_code == 200
    assert delete_response.json() == {
        "success": True,
        "message": "Graph project deleted.",
        "data": {
            "graph_id": graph_id,
            "status": "deleted",
            "deleted_root_dir": str(root_dir),
            "cancelled_build": False,
        },
    }
    assert not root_dir.exists()

    detail_response = client.get(f"/api/graph/{graph_id}")
    assert detail_response.status_code == 404
    assert "was not found" in detail_response.json()["message"]


def test_delete_graph_returns_404_when_project_is_missing(
    graph_client: tuple[
        TestClient, Path, Path, AppConfigService, GraphRegistryService
    ],
):
    client, _, _, _, _ = graph_client

    response = client.delete("/api/graph/missing-graph")

    assert response.status_code == 404
    assert "Graph project 'missing-graph' was not found." in response.json()["message"]


def test_delete_graph_cancels_active_build_before_removing_project(
    graph_client: tuple[
        TestClient, Path, Path, AppConfigService, GraphRegistryService
    ],
):
    client, projects_root, _, _, graph_registry_service = graph_client
    fake_wrapper_service = FakeGraphDeleteWrapperService(cancelled=True)
    app.dependency_overrides[get_graphrag_wrapper_service] = (
        lambda: fake_wrapper_service
    )

    create_response = client.post(
        "/api/graph",
        json={
            "name": "Delete While Building",
            "description": "delete route cancels build",
        },
    )
    assert create_response.status_code == 201
    graph_id = create_response.json()["data"]["id"]
    root_dir = projects_root / graph_id
    graph_registry_service.mark_build_started(graph_id)

    delete_response = client.delete(f"/api/graph/{graph_id}")

    assert delete_response.status_code == 200
    assert delete_response.json() == {
        "success": True,
        "message": "Graph project deleted.",
        "data": {
            "graph_id": graph_id,
            "status": "deleted",
            "deleted_root_dir": str(root_dir),
            "cancelled_build": True,
        },
    }
    assert fake_wrapper_service.cancel_calls == [graph_id]
    assert not root_dir.exists()


def test_graph_registry_service_delete_graph_removes_entry(tmp_path: Path):
    project_root = tmp_path / "repo"
    registry_path = project_root / "config" / "graph_registry.json"
    registry_service = GraphRegistryService(registry_path, project_root=project_root)

    project_root.mkdir(parents=True, exist_ok=True)
    registry_service.create_graph(
        graph_id="delete-root-graph",
        name="Delete Root Graph",
        description=None,
        root_dir="data/projects/delete-root-graph",
        model_profile_id=None,
    )

    deleted = registry_service.delete_graph("delete-root-graph")

    assert deleted.id == "delete-root-graph"
    assert registry_service.list_graph_projects() == []
    with pytest.raises(Exception):
        registry_service.get_graph("delete-root-graph")
