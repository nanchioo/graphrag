# Copyright (c) 2024 Microsoft Corporation.
# Licensed under the MIT License

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from api.deps import get_app_config_service, get_graph_registry_service
from api.schemas.config import ModelProfileCreateRequest, SystemConfigPayload
from api.services.app_config_service import AppConfigService
from api.services.graph_registry_service import GraphRegistryService
from main import app


@pytest.fixture
def unbuilt_graph_client(
    tmp_path: Path,
) -> tuple[TestClient, Path, AppConfigService, GraphRegistryService]:
    """Create a test client backed by isolated config and graph storage."""

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

    with TestClient(app) as client:
        yield client, projects_root, app_config_service, graph_registry_service

    app.dependency_overrides.clear()


def test_unbuilt_graph_status_and_preview_routes_are_handled_gracefully(
    unbuilt_graph_client: tuple[TestClient, Path, AppConfigService, GraphRegistryService],
):
    client, _, _, _ = unbuilt_graph_client

    create_response = client.post(
        "/api/graph",
        json={
            "name": "Unbuilt Graph",
            "description": "unbuilt graph route test",
        },
    )
    assert create_response.status_code == 201
    graph_id = create_response.json()["data"]["id"]

    status_response = client.get(f"/api/graph/{graph_id}/status")
    preview_response = client.get(f"/api/graph/{graph_id}/graph")
    reports_response = client.get(f"/api/graph/{graph_id}/reports")

    assert status_response.status_code == 200
    assert status_response.json() == {
        "success": True,
        "message": "Graph build status loaded.",
        "data": {
            "graph_id": graph_id,
            "status": "awaiting_upload",
            "last_build_at": None,
            "last_error": None,
            "has_source_files": False,
            "source_file_count": 0,
            "document_count": 0,
            "text_unit_count": 0,
            "has_artifacts": False,
            "artifact_paths": [],
            "progress_percent": 0,
            "progress_stage": "awaiting_upload",
            "progress_message": "等待上传源文件。",
        },
    }

    assert preview_response.status_code == 400
    assert preview_response.json()["success"] is False
    assert "has no built outputs yet" in preview_response.json()["message"]

    assert reports_response.status_code == 400
    assert reports_response.json()["success"] is False
    assert "has no built outputs yet" in reports_response.json()["message"]


def test_unbuilt_graph_routes_work_with_openai_compatible_default_profile(
    unbuilt_graph_client: tuple[TestClient, Path, AppConfigService, GraphRegistryService],
):
    client, _, app_config_service, _ = unbuilt_graph_client

    profile = app_config_service.create_model_profile(
        ModelProfileCreateRequest(
            provider="openai",
            name="Kimi Default",
            base_url="https://api.moonshot.cn/v1",
            api_key="sk-kimi-test",
            model_name="kimi-k2.5",
            embedding_model_name=None,
            api_version=None,
            is_default=True,
        )
    )
    current_config = app_config_service.get_system_config()
    app_config_service.update_system_config(
        SystemConfigPayload(
            projects_root=current_config.projects_root,
            upload_root=current_config.upload_root,
            default_model_profile_id=profile.id,
        )
    )

    create_response = client.post(
        "/api/graph",
        json={
            "name": "Kimi Unbuilt Graph",
            "description": "openai compatible unbuilt graph route test",
        },
    )
    assert create_response.status_code == 201
    graph_id = create_response.json()["data"]["id"]

    status_response = client.get(f"/api/graph/{graph_id}/status")
    preview_response = client.get(f"/api/graph/{graph_id}/graph")
    reports_response = client.get(f"/api/graph/{graph_id}/reports")

    assert status_response.status_code == 200
    assert status_response.json()["data"] == {
        "graph_id": graph_id,
        "status": "awaiting_upload",
        "last_build_at": None,
        "last_error": None,
        "has_source_files": False,
        "source_file_count": 0,
        "document_count": 0,
        "text_unit_count": 0,
        "has_artifacts": False,
        "artifact_paths": [],
        "progress_percent": 0,
        "progress_stage": "awaiting_upload",
        "progress_message": "等待上传源文件。",
    }

    assert preview_response.status_code == 400
    assert preview_response.json()["success"] is False
    assert "has no built outputs yet" in preview_response.json()["message"]

    assert reports_response.status_code == 400
    assert reports_response.json()["success"] is False
    assert "has no built outputs yet" in reports_response.json()["message"]


def test_unbuilt_graph_routes_work_with_relative_projects_root(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
):
    monkeypatch.chdir(tmp_path)

    settings_path = tmp_path / "app_settings.json"
    registry_path = tmp_path / "graph_registry.json"
    app_config_service = AppConfigService(settings_path)
    app_config_service.update_system_config(
        SystemConfigPayload(
            projects_root="data/projects",
            upload_root="data/projects",
            default_model_profile_id=None,
        )
    )
    graph_registry_service = GraphRegistryService(registry_path)

    app.dependency_overrides[get_app_config_service] = lambda: app_config_service
    app.dependency_overrides[get_graph_registry_service] = (
        lambda: graph_registry_service
    )

    with TestClient(app) as client:
        create_response = client.post(
            "/api/graph",
            json={
                "name": "Relative Root Graph",
                "description": "relative projects root route test",
            },
        )
        assert create_response.status_code == 201
        graph_id = create_response.json()["data"]["id"]

        status_response = client.get(f"/api/graph/{graph_id}/status")
        preview_response = client.get(f"/api/graph/{graph_id}/graph")
        reports_response = client.get(f"/api/graph/{graph_id}/reports")

    app.dependency_overrides.clear()

    assert status_response.status_code == 200
    assert status_response.json()["data"] == {
        "graph_id": graph_id,
        "status": "awaiting_upload",
        "last_build_at": None,
        "last_error": None,
        "has_source_files": False,
        "source_file_count": 0,
        "document_count": 0,
        "text_unit_count": 0,
        "has_artifacts": False,
        "artifact_paths": [],
        "progress_percent": 0,
        "progress_stage": "awaiting_upload",
        "progress_message": "等待上传源文件。",
    }

    assert preview_response.status_code == 400
    assert preview_response.json()["success"] is False
    assert "has no built outputs yet" in preview_response.json()["message"]

    assert reports_response.status_code == 400
    assert reports_response.json()["success"] is False
    assert "has no built outputs yet" in reports_response.json()["message"]
