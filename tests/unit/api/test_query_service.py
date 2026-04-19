# Copyright (c) 2024 Microsoft Corporation.
# Licensed under the MIT License

import asyncio
import os
from pathlib import Path

import pandas as pd
import pytest
import yaml

from api.schemas.config import ModelProfileCreateRequest, SystemConfigPayload
from api.schemas.query import QueryRequest
from api.services.app_config_service import AppConfigService
from api.services.graph_registry_service import GraphRegistryService
from api.services.project_workspace_service import ProjectWorkspaceService
from api.services.query_service import QueryService


def _write_query_output_tables(output_dir: Path) -> None:
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
            }
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
                "entity_ids": ["entity-1"],
                "relationship_ids": ["rel-1"],
                "text_unit_ids": ["text-1"],
                "period": "all",
                "size": 1,
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
                "findings": ["Refund start"],
                "full_content_json": "{}",
                "period": "all",
                "size": 1,
            }
        ]
    ).to_parquet(output_dir / "community_reports.parquet")

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
            }
        ]
    ).to_parquet(output_dir / "text_units.parquet")


@pytest.mark.asyncio
async def test_query_service_runs_local_search_and_normalizes_context(
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
    profile = app_config_service.create_model_profile(
        ModelProfileCreateRequest(
            provider="openai",
            name="OpenAI Query",
            base_url="https://api.openai.com/v1",
            api_key="openai-query-secret",
            model_name="gpt-4.1-mini",
            embedding_model_name="text-embedding-3-small",
            is_default=True,
        )
    )
    graph_registry_service = GraphRegistryService(registry_path)

    graph_id = graph_registry_service.generate_graph_id("Query Service Graph")
    root_dir = projects_root / graph_id
    ProjectWorkspaceService().initialize_workspace(
        root_dir=root_dir,
        model="gpt-4.1-mini",
        embedding_model="text-embedding-3-small",
    )
    _write_query_output_tables(root_dir / "output")
    graph_registry_service.create_graph(
        graph_id=graph_id,
        name="Query Service Graph",
        description="query service test",
        root_dir=str(root_dir),
        model_profile_id=profile.id,
    )
    graph_registry_service.mark_build_succeeded(graph_id)
    monkeypatch.setenv("GRAPHRAG_API_KEY", "stale-process-secret")

    captured: dict[str, object] = {}

    async def fake_local_search(**kwargs):
        await asyncio.sleep(0)
        captured["local_search_kwargs"] = kwargs
        captured["query_api_key"] = os.environ["GRAPHRAG_API_KEY"]
        return (
            "Refund answer",
            {
                "entities": pd.DataFrame([{"id": "entity-1", "title": "Refund"}]),
                "sources": pd.DataFrame([{"id": "text-1", "text": "Refund source text"}]),
            },
        )

    monkeypatch.setattr("api.services.query_service.local_search", fake_local_search)

    service = QueryService()
    payload = await service.query(
        request=QueryRequest(
            graph_id=graph_id,
            question="退款流程有哪些关键节点?",
            mode="local",
            community_level=2,
            response_type="Multiple Paragraphs",
        ),
        app_config_service=app_config_service,
        graph_registry_service=graph_registry_service,
    )

    assert payload.graph_id == graph_id
    assert payload.mode == "local"
    assert payload.answer == "Refund answer"
    assert payload.context == {
        "reports": [],
        "entities": [{"id": "entity-1", "title": "Refund"}],
        "relationships": [],
        "claims": [],
        "sources": [{"id": "text-1", "text": "Refund source text"}],
    }

    local_search_kwargs = captured["local_search_kwargs"]
    assert isinstance(local_search_kwargs, dict)
    assert captured["query_api_key"] == "openai-query-secret"
    assert os.environ["GRAPHRAG_API_KEY"] == "stale-process-secret"
    assert local_search_kwargs["query"] == "退款流程有哪些关键节点?"
    assert local_search_kwargs["response_type"] == "Multiple Paragraphs"
    settings_data = yaml.safe_load((root_dir / "settings.yaml").read_text(encoding="utf-8"))
    assert (
        settings_data["completion_models"]["default_completion_model"]["model"]
        == "gpt-4.1-mini"
    )
    assert (root_dir / ".env").read_text(encoding="utf-8") == (
        "GRAPHRAG_API_KEY=openai-query-secret\n"
    )


@pytest.mark.asyncio
async def test_query_service_dispatches_basic_mode(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
):
    registry_path = tmp_path / "graph_registry.json"
    projects_root = tmp_path / "projects"
    graph_registry_service = GraphRegistryService(registry_path)

    graph_id = graph_registry_service.generate_graph_id("Basic Query Graph")
    root_dir = projects_root / graph_id
    ProjectWorkspaceService().initialize_workspace(
        root_dir=root_dir,
        model="gpt-4.1-mini",
        embedding_model="text-embedding-3-small",
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
                "entity_ids": [],
                "relationship_ids": [],
                "covariate_ids": [],
            }
        ]
    ).to_parquet(output_dir / "text_units.parquet")

    graph_registry_service.create_graph(
        graph_id=graph_id,
        name="Basic Query Graph",
        description="basic query service test",
        root_dir=str(root_dir),
        model_profile_id=None,
    )
    graph_registry_service.mark_build_succeeded(graph_id)

    async def fake_basic_search(**kwargs):
        await asyncio.sleep(0)
        return ("Basic answer", {"sources": pd.DataFrame([{"id": "text-1"}])})

    monkeypatch.setattr("api.services.query_service.basic_search", fake_basic_search)

    service = QueryService()
    payload = await service.query(
        request=QueryRequest(
            graph_id=graph_id,
            question="退款流程是什么?",
            mode="basic",
            response_type="Single Sentence",
        ),
        app_config_service=AppConfigService(tmp_path / "app_settings.json"),
        graph_registry_service=graph_registry_service,
    )

    assert payload.mode == "basic"
    assert payload.answer == "Basic answer"
    assert payload.context["sources"] == [{"id": "text-1"}]
