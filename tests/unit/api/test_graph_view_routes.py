# Copyright (c) 2024 Microsoft Corporation.
# Licensed under the MIT License

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from api.deps import (
    get_app_config_service,
    get_graph_registry_service,
    get_graph_view_service,
)
from api.schemas.config import SystemConfigPayload
from api.schemas.graph import (
    DeleteTextUnitPayload,
    GraphPreviewPayload,
    GraphReportsPayload,
    GraphTextUnitListPayload,
)
from api.services.app_config_service import AppConfigService
from api.services.graph_registry_service import GraphRegistryService
from main import app


class FakeGraphViewService:
    """Fake graph view service used to isolate route behavior."""

    async def get_graph_text_units(
        self,
        graph_id: str,
        **_,
    ) -> GraphTextUnitListPayload:
        return GraphTextUnitListPayload(
            items=[
                {
                    "id": "text-1",
                    "human_readable_id": 1,
                    "text": "Refund source text",
                    "n_tokens": 3,
                    "document_id": "doc-1",
                }
            ],
            total=1,
        )

    async def delete_graph_text_unit(
        self,
        graph_id: str,
        text_unit_id: str,
        **_,
    ) -> DeleteTextUnitPayload:
        return DeleteTextUnitPayload(
            graph_id=graph_id,
            text_unit_id=text_unit_id,
            status="artifacts_deleted",
            remaining_total=0,
        )

    async def get_graph_preview(
        self,
        graph_id: str,
        **_,
    ) -> GraphPreviewPayload:
        return GraphPreviewPayload(
            nodes=[
                {
                    "id": "Refund",
                    "entity_id": "entity-1",
                    "label": "Refund",
                    "type": "event",
                    "rank": 3,
                    "community_ids": ["1"],
                }
            ],
            edges=[
                {
                    "id": "rel-1",
                    "source": "Refund",
                    "target": "Customer",
                    "label": "handles",
                    "weight": 2.0,
                }
            ],
            summary={
                "total_nodes": 1,
                "total_edges": 1,
                "total_communities": 1,
                "total_reports": 1,
                "preview_nodes": 1,
                "preview_edges": 1,
            },
        )

    async def get_graph_reports(
        self,
        graph_id: str,
        **_,
    ) -> GraphReportsPayload:
        return GraphReportsPayload(
            items=[
                {
                    "id": "report-1",
                    "title": "Refund Community",
                    "community_id": "1",
                    "summary": "Refund flow summary",
                    "rank": 8.5,
                }
            ],
            total=1,
        )


@pytest.fixture
def graph_view_client(
    tmp_path: Path,
) -> tuple[TestClient, AppConfigService, GraphRegistryService]:
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
    fake_graph_view_service = FakeGraphViewService()

    app.dependency_overrides[get_app_config_service] = lambda: app_config_service
    app.dependency_overrides[get_graph_registry_service] = (
        lambda: graph_registry_service
    )
    app.dependency_overrides[get_graph_view_service] = (
        lambda: fake_graph_view_service
    )

    with TestClient(app) as client:
        yield client, app_config_service, graph_registry_service

    app.dependency_overrides.clear()


def test_get_graph_preview_returns_nodes_and_edges(
    graph_view_client: tuple[TestClient, AppConfigService, GraphRegistryService],
):
    client, _, _ = graph_view_client

    create_response = client.post(
        "/api/graph",
        json={
            "name": "Preview Graph",
            "description": "preview route test",
        },
    )
    assert create_response.status_code == 201
    graph_id = create_response.json()["data"]["id"]

    preview_response = client.get(f"/api/graph/{graph_id}/graph")

    assert preview_response.status_code == 200
    assert preview_response.json() == {
        "success": True,
        "message": "Graph preview loaded.",
        "data": {
            "nodes": [
                {
                    "id": "Refund",
                    "entity_id": "entity-1",
                    "label": "Refund",
                    "type": "event",
                    "rank": 3,
                    "community_ids": ["1"],
                }
            ],
            "edges": [
                {
                    "id": "rel-1",
                    "source": "Refund",
                    "target": "Customer",
                    "label": "handles",
                    "weight": 2.0,
                }
            ],
            "summary": {
                "total_nodes": 1,
                "total_edges": 1,
                "total_communities": 1,
                "total_reports": 1,
                "preview_nodes": 1,
                "preview_edges": 1,
            },
        },
    }


def test_get_graph_text_units_returns_chunk_rows(
    graph_view_client: tuple[TestClient, AppConfigService, GraphRegistryService],
):
    client, _, _ = graph_view_client

    create_response = client.post(
        "/api/graph",
        json={
            "name": "Text Units Graph",
            "description": "text unit route test",
        },
    )
    assert create_response.status_code == 201
    graph_id = create_response.json()["data"]["id"]

    text_units_response = client.get(f"/api/graph/{graph_id}/text-units")

    assert text_units_response.status_code == 200
    assert text_units_response.json() == {
        "success": True,
        "message": "Graph text units loaded.",
        "data": {
            "items": [
                {
                    "id": "text-1",
                    "human_readable_id": 1,
                    "text": "Refund source text",
                    "n_tokens": 3,
                    "document_id": "doc-1",
                }
            ],
            "total": 1,
        },
    }


def test_delete_graph_text_unit_returns_remaining_count(
    graph_view_client: tuple[TestClient, AppConfigService, GraphRegistryService],
):
    client, _, _ = graph_view_client

    create_response = client.post(
        "/api/graph",
        json={
            "name": "Delete Text Unit Graph",
            "description": "delete text unit route test",
        },
    )
    assert create_response.status_code == 201
    graph_id = create_response.json()["data"]["id"]

    delete_response = client.delete(f"/api/graph/{graph_id}/text-units/text-1")

    assert delete_response.status_code == 200
    assert delete_response.json() == {
        "success": True,
        "message": "Graph text unit deleted. Rebuild required.",
        "data": {
            "graph_id": graph_id,
            "text_unit_id": "text-1",
            "status": "artifacts_deleted",
            "remaining_total": 0,
        },
    }


def test_get_graph_reports_returns_report_summaries(
    graph_view_client: tuple[TestClient, AppConfigService, GraphRegistryService],
):
    client, _, _ = graph_view_client

    create_response = client.post(
        "/api/graph",
        json={
            "name": "Reports Graph",
            "description": "reports route test",
        },
    )
    assert create_response.status_code == 201
    graph_id = create_response.json()["data"]["id"]

    reports_response = client.get(f"/api/graph/{graph_id}/reports")

    assert reports_response.status_code == 200
    assert reports_response.json() == {
        "success": True,
        "message": "Graph reports loaded.",
        "data": {
            "items": [
                {
                    "id": "report-1",
                    "title": "Refund Community",
                    "community_id": "1",
                    "summary": "Refund flow summary",
                    "rank": 8.5,
                }
            ],
            "total": 1,
        },
    }
