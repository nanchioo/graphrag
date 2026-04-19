# Copyright (c) 2024 Microsoft Corporation.
# Licensed under the MIT License

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from api.deps import (
    get_app_config_service,
    get_graph_registry_service,
    get_graphrag_wrapper_service,
)
from api.schemas.config import ModelProfileCreateRequest, SystemConfigPayload
from api.schemas.graph import (
    DeleteArtifactsPayload,
    GraphBuildPayload,
    GraphStatusPayload,
)
from api.services.app_config_service import AppConfigService
from api.services.graph_registry_service import GraphRegistryService
from main import app


class FakeGraphRagWrapperService:
    """Fake GraphRAG wrapper service used to isolate router behavior."""

    def __init__(self):
        self.build_calls: list[tuple[str, str, bool]] = []
        self.delete_calls: list[str] = []

    def start_build(
        self,
        graph_id: str,
        method: str,
        force_rebuild: bool,
        graph_registry_service: GraphRegistryService,
        **_,
    ) -> GraphBuildPayload:
        self.build_calls.append((graph_id, method, force_rebuild))
        graph_registry_service.mark_build_started(graph_id)
        graph = graph_registry_service.get_graph(graph_id)
        return GraphBuildPayload(
            graph_id=graph.id,
            status=graph.status,
            last_build_at=graph.last_build_at,
            last_error=None,
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
            source_file_count=2,
            document_count=1,
            text_unit_count=2,
            has_artifacts=True,
            artifact_paths=["output", "cache"],
            progress_percent=55,
            progress_stage="text_units_created",
            progress_message="已完成切片, 正在抽取实体关系。",
        )

    async def delete_artifacts(
        self,
        graph_id: str,
        graph_registry_service: GraphRegistryService,
        **_,
    ) -> DeleteArtifactsPayload:
        self.delete_calls.append(graph_id)
        graph_registry_service.mark_artifacts_deleted(graph_id)
        graph = graph_registry_service.get_graph(graph_id)
        return DeleteArtifactsPayload(
            graph_id=graph.id,
            status=graph.status,
            deleted_paths=["output", "cache", "logs"],
        )


@pytest.fixture
def build_client(
    tmp_path: Path,
) -> tuple[
    TestClient, Path, AppConfigService, GraphRegistryService, FakeGraphRagWrapperService
]:
    """Create a test client backed by isolated config, graph storage, and fake build service."""

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
    fake_wrapper_service = FakeGraphRagWrapperService()

    app.dependency_overrides[get_app_config_service] = lambda: app_config_service
    app.dependency_overrides[get_graph_registry_service] = (
        lambda: graph_registry_service
    )
    app.dependency_overrides[get_graphrag_wrapper_service] = (
        lambda: fake_wrapper_service
    )

    with TestClient(app) as client:
        yield (
            client,
            projects_root,
            app_config_service,
            graph_registry_service,
            fake_wrapper_service,
        )

    app.dependency_overrides.clear()


def test_start_graph_build_returns_accepted_status(
    build_client: tuple[
        TestClient,
        Path,
        AppConfigService,
        GraphRegistryService,
        FakeGraphRagWrapperService,
    ],
):
    client, _, _, _, fake_wrapper_service = build_client

    create_response = client.post(
        "/api/graph",
        json={
            "name": "Build Graph",
            "description": "build route test",
        },
    )
    assert create_response.status_code == 201
    graph_id = create_response.json()["data"]["id"]

    build_response = client.post(
        f"/api/graph/{graph_id}/build",
        json={
            "method": "standard",
            "force_rebuild": True,
        },
    )

    assert build_response.status_code == 202
    assert build_response.json() == {
        "success": True,
        "message": "Graph build started.",
        "data": {
            "graph_id": graph_id,
            "status": "building",
            "last_build_at": None,
            "last_error": None,
        },
    }
    assert fake_wrapper_service.build_calls == [(graph_id, "standard", True)]


def test_get_graph_status_returns_build_snapshot(
    build_client: tuple[
        TestClient,
        Path,
        AppConfigService,
        GraphRegistryService,
        FakeGraphRagWrapperService,
    ],
):
    client, _, _, graph_registry_service, _ = build_client

    create_response = client.post(
        "/api/graph",
        json={
            "name": "Status Graph",
            "description": "status route test",
        },
    )
    assert create_response.status_code == 201
    graph_id = create_response.json()["data"]["id"]
    graph_registry_service.mark_build_started(graph_id)

    status_response = client.get(f"/api/graph/{graph_id}/status")

    assert status_response.status_code == 200
    assert status_response.json() == {
        "success": True,
        "message": "Graph build status loaded.",
        "data": {
            "graph_id": graph_id,
            "status": "building",
            "last_build_at": None,
            "last_error": None,
            "has_source_files": True,
            "source_file_count": 2,
            "document_count": 1,
            "text_unit_count": 2,
            "has_artifacts": True,
            "artifact_paths": ["output", "cache"],
            "progress_percent": 55,
            "progress_stage": "text_units_created",
            "progress_message": "已完成切片, 正在抽取实体关系。",
        },
    }


def test_delete_graph_artifacts_returns_deleted_paths(
    build_client: tuple[
        TestClient,
        Path,
        AppConfigService,
        GraphRegistryService,
        FakeGraphRagWrapperService,
    ],
):
    client, _, _, _, fake_wrapper_service = build_client

    create_response = client.post(
        "/api/graph",
        json={
            "name": "Cleanup Graph",
            "description": "cleanup route test",
        },
    )
    assert create_response.status_code == 201
    graph_id = create_response.json()["data"]["id"]

    delete_response = client.delete(f"/api/graph/{graph_id}/artifacts")

    assert delete_response.status_code == 200
    assert delete_response.json() == {
        "success": True,
        "message": "Graph artifacts deleted.",
        "data": {
            "graph_id": graph_id,
            "status": "artifacts_deleted",
            "deleted_paths": ["output", "cache", "logs"],
        },
    }
    assert fake_wrapper_service.delete_calls == [graph_id]


def test_start_graph_build_rejects_invalid_model_profile_precheck(tmp_path: Path):
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

    profile_response = app_config_service.create_model_profile(
        ModelProfileCreateRequest(
            provider="openai",
            name="Missing Embedding",
            base_url="https://api.moonshot.cn/v1",
            api_key="sk-kimi-test",
            model_name="kimi-k2.5",
            embedding_model_name="",
            api_version=None,
            is_default=False,
        )
    )
    graph_root = projects_root / "graph-precheck"
    graph_root.mkdir(parents=True, exist_ok=True)
    graph_registry_service.create_graph(
        graph_id="graph-precheck",
        name="Precheck Graph",
        description=None,
        root_dir=str(graph_root),
        model_profile_id=profile_response.id,
    )

    app.dependency_overrides[get_app_config_service] = lambda: app_config_service
    app.dependency_overrides[get_graph_registry_service] = (
        lambda: graph_registry_service
    )

    with TestClient(app) as client:
        response = client.post(
            "/api/graph/graph-precheck/build",
            json={
                "method": "standard",
                "force_rebuild": False,
            },
        )

    app.dependency_overrides.clear()

    assert response.status_code == 400
    assert "embedding_model_name" in response.json()["message"]
