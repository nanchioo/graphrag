# Copyright (c) 2024 Microsoft Corporation.
# Licensed under the MIT License

from pathlib import Path

import pandas as pd
import pytest

from api.services.graph_registry_service import GraphRegistryService
from api.services.graph_view_service import GraphViewService
from api.services.project_workspace_service import ProjectWorkspaceService


@pytest.mark.asyncio
async def test_graph_view_service_reads_preview_and_reports(tmp_path: Path):
    registry_path = tmp_path / "graph_registry.json"
    projects_root = tmp_path / "projects"
    graph_registry_service = GraphRegistryService(registry_path)

    graph_id = graph_registry_service.generate_graph_id("View Service Graph")
    root_dir = projects_root / graph_id
    ProjectWorkspaceService().initialize_workspace(
        root_dir=root_dir,
        model="gpt-4.1",
        embedding_model="text-embedding-3-large",
    )
    output_dir = root_dir / "output"
    output_dir.mkdir(parents=True, exist_ok=True)

    pd.DataFrame(
        [
            {
                "id": "entity-1",
                "human_readable_id": 1,
                "title": "Refund",
                "type": "event",
                "description": "Refund event",
                "text_unit_ids": ["text-1"],
                "frequency": 2,
                "degree": 3,
            },
            {
                "id": "entity-2",
                "human_readable_id": 2,
                "title": "Customer",
                "type": "person",
                "description": "Customer entity",
                "text_unit_ids": ["text-1"],
                "frequency": 1,
                "degree": 1,
            },
        ]
    ).to_parquet(output_dir / "entities.parquet")

    pd.DataFrame(
        [
            {
                "id": "rel-1",
                "human_readable_id": 1,
                "source": "Refund",
                "target": "Customer",
                "description": "handles",
                "weight": 2.0,
                "combined_degree": 5,
                "text_unit_ids": ["text-1"],
            }
        ]
    ).to_parquet(output_dir / "relationships.parquet")

    pd.DataFrame(
        [
            {
                "id": "community-1",
                "human_readable_id": 1,
                "community": 1,
                "level": 1,
                "parent": "-1",
                "children": [],
                "title": "Refund Community",
                "entity_ids": ["entity-1", "entity-2"],
                "relationship_ids": ["rel-1"],
                "text_unit_ids": ["text-1"],
                "period": "all",
                "size": 2,
            }
        ]
    ).to_parquet(output_dir / "communities.parquet")

    pd.DataFrame(
        [
            {
                "id": "report-1",
                "human_readable_id": 1,
                "community": 1,
                "level": 1,
                "parent": "-1",
                "children": [],
                "title": "Refund Community",
                "summary": "Refund flow summary",
                "full_content": "Refund flow full content",
                "rank": 8.5,
                "rating_explanation": "High value",
                "findings": ["Refund start", "Refund finish"],
                "full_content_json": "{}",
                "period": "all",
                "size": 2,
            }
        ]
    ).to_parquet(output_dir / "community_reports.parquet")

    graph_registry_service.create_graph(
        graph_id=graph_id,
        name="View Service Graph",
        description="graph view service test",
        root_dir=str(root_dir),
        model_profile_id=None,
    )

    service = GraphViewService()
    preview_payload = await service.get_graph_preview(
        graph_id=graph_id,
        graph_registry_service=graph_registry_service,
    )
    reports_payload = await service.get_graph_reports(
        graph_id=graph_id,
        graph_registry_service=graph_registry_service,
    )

    assert preview_payload.summary.total_nodes == 2
    assert preview_payload.summary.total_edges == 1
    assert preview_payload.summary.total_communities == 1
    assert preview_payload.summary.total_reports == 1
    assert preview_payload.summary.preview_nodes == 2
    assert preview_payload.summary.preview_edges == 1
    assert preview_payload.nodes[0].id == "Refund"
    assert preview_payload.nodes[0].entity_id == "entity-1"
    assert preview_payload.nodes[0].community_ids == ["1"]
    assert preview_payload.edges == [
        {
            "id": "rel-1",
            "source": "Refund",
            "target": "Customer",
            "label": "handles",
            "weight": 2.0,
        }
    ]

    assert reports_payload == {
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
    }


@pytest.mark.asyncio
async def test_graph_view_service_reads_and_deletes_text_units(tmp_path: Path):
    registry_path = tmp_path / "graph_registry.json"
    projects_root = tmp_path / "projects"
    graph_registry_service = GraphRegistryService(registry_path)

    graph_id = graph_registry_service.generate_graph_id("Text Unit Service Graph")
    root_dir = projects_root / graph_id
    ProjectWorkspaceService().initialize_workspace(
        root_dir=root_dir,
        model="gpt-4.1",
        embedding_model="text-embedding-3-large",
    )
    output_dir = root_dir / "output"
    output_dir.mkdir(parents=True, exist_ok=True)

    pd.DataFrame(
        [
            {
                "id": "text-1",
                "human_readable_id": 1,
                "text": "Refund source text",
                "n_tokens": 3,
                "document_id": "doc-1",
                "entity_ids": ["entity-1"],
                "relationship_ids": ["rel-1"],
                "covariate_ids": [],
            },
            {
                "id": "text-2",
                "human_readable_id": 2,
                "text": "Customer support text",
                "n_tokens": 4,
                "document_id": "doc-2",
                "entity_ids": [],
                "relationship_ids": [],
                "covariate_ids": [],
            },
        ]
    ).to_parquet(output_dir / "text_units.parquet")

    graph_registry_service.create_graph(
        graph_id=graph_id,
        name="Text Unit Service Graph",
        description="graph text unit service test",
        root_dir=str(root_dir),
        model_profile_id=None,
    )
    graph_registry_service.mark_build_succeeded(graph_id)

    service = GraphViewService()
    text_units_payload = await service.get_graph_text_units(
        graph_id=graph_id,
        graph_registry_service=graph_registry_service,
    )

    assert text_units_payload == {
        "items": [
            {
                "id": "text-1",
                "human_readable_id": 1,
                "text": "Refund source text",
                "n_tokens": 3,
                "document_id": "doc-1",
            },
            {
                "id": "text-2",
                "human_readable_id": 2,
                "text": "Customer support text",
                "n_tokens": 4,
                "document_id": "doc-2",
            },
        ],
        "total": 2,
    }

    delete_payload = await service.delete_graph_text_unit(
        graph_id=graph_id,
        text_unit_id="text-1",
        graph_registry_service=graph_registry_service,
    )

    assert delete_payload == {
        "graph_id": graph_id,
        "text_unit_id": "text-1",
        "status": "artifacts_deleted",
        "remaining_total": 1,
    }

    remaining = pd.read_parquet(output_dir / "text_units.parquet")
    assert remaining["id"].tolist() == ["text-2"]
    assert graph_registry_service.get_graph(graph_id).status == "artifacts_deleted"
