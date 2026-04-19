# Copyright (c) 2024 Microsoft Corporation.
# Licensed under the MIT License

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from api import deps
from api.deps import get_app_config_service, get_graph_registry_service
from api.paths import APP_SETTINGS_PATH, GRAPH_REGISTRY_PATH, PROJECT_ROOT
from api.schemas.config import SystemConfigPayload
from api.services.app_config_service import AppConfigService
from api.services.graph_registry_service import GraphRegistryService
from main import app, create_app


@pytest.fixture
def isolated_client(
    tmp_path: Path,
) -> tuple[TestClient, SystemConfigPayload]:
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
    expected_config = app_config_service.get_system_config()
    graph_registry_service = GraphRegistryService(registry_path)

    app.dependency_overrides[get_app_config_service] = lambda: app_config_service
    app.dependency_overrides[get_graph_registry_service] = (
        lambda: graph_registry_service
    )

    with TestClient(app) as client:
        yield client, expected_config

    app.dependency_overrides.clear()


def test_root_endpoint_returns_api_metadata(
    isolated_client: tuple[TestClient, SystemConfigPayload]
):
    client, _ = isolated_client
    response = client.get("/")

    assert response.status_code == 200
    assert response.json() == {
        "success": True,
        "message": "GraphRAG admin API is running.",
        "data": {
            "name": "GraphRAG Admin API",
            "version": "0.1.0",
            "docs_url": "/docs",
        },
    }


def test_health_endpoint_returns_ok_status(
    isolated_client: tuple[TestClient, SystemConfigPayload]
):
    client, _ = isolated_client
    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {
        "success": True,
        "message": "Service health check passed.",
        "data": {
            "status": "ok",
            "service": "graphrag-admin-api",
        },
    }


def test_placeholder_routers_are_mounted(
    isolated_client: tuple[TestClient, SystemConfigPayload]
):
    client, expected_config = isolated_client
    graph_response = client.get("/api/graph")
    config_response = client.get("/api/config/system")
    query_response = client.post(
        "/api/query",
        json={
            "graph_id": "demo-graph",
            "question": "What is GraphRAG?",
        },
    )

    assert graph_response.status_code == 200
    assert graph_response.json() == {
        "success": True,
        "message": "Graph projects loaded.",
        "data": {
            "items": [],
            "total": 0,
        },
    }

    assert config_response.status_code == 200
    assert config_response.json() == {
        "success": True,
        "message": "Config router is mounted.",
        "data": {
            "projects_root": expected_config.projects_root,
            "upload_root": expected_config.upload_root,
            "default_model_profile_id": None,
        },
    }

    assert query_response.status_code == 422
    assert query_response.json() == {
        "success": False,
        "message": "Request validation failed.",
        "data": [
            {
                "input": {
                    "graph_id": "demo-graph",
                    "question": "What is GraphRAG?",
                },
                "loc": ["body", "mode"],
                "msg": "Field required",
                "type": "missing",
            }
        ],
    }


def test_unhandled_exceptions_are_normalized_as_json(tmp_path: Path):
    isolated_app = create_app(web_dist_dir=tmp_path / "missing-dist")

    @isolated_app.get("/boom")
    def boom() -> None:
        message = "boom failure"
        raise RuntimeError(message)

    with TestClient(isolated_app, raise_server_exceptions=False) as client:
        response = client.get("/boom")

    assert response.status_code == 500
    assert response.json() == {
        "success": False,
        "message": "boom failure",
        "data": None,
    }


def test_default_dependency_services_anchor_storage_to_project_root(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
):
    monkeypatch.chdir(tmp_path)

    app_config_service = deps.get_app_config_service()
    graph_registry_service = deps.get_graph_registry_service()

    assert app_config_service.store_path == APP_SETTINGS_PATH
    assert graph_registry_service.store_path == GRAPH_REGISTRY_PATH
    assert graph_registry_service.project_root == PROJECT_ROOT
