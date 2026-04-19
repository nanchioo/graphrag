# Copyright (c) 2024 Microsoft Corporation.
# Licensed under the MIT License

import asyncio
from contextlib import suppress
from pathlib import Path
from types import SimpleNamespace

import pandas as pd
import pytest

from api.services.app_config_service import AppConfigService
from api.services.graph_registry_service import GraphRegistryService
from api.services.graphrag_wrapper_service import GraphRagWrapperService


@pytest.mark.asyncio
async def test_start_build_recovers_stale_building_state_and_restarts_pipeline(
    tmp_path: Path,
):
    settings_path = tmp_path / "app_settings.json"
    registry_path = tmp_path / "graph_registry.json"
    root_dir = tmp_path / "projects" / "stale-building"
    root_dir.mkdir(parents=True, exist_ok=True)

    app_config_service = AppConfigService(settings_path)
    graph_registry_service = GraphRegistryService(registry_path)
    graph_registry_service.create_graph(
        graph_id="graph-stale-building",
        name="Stale Building",
        description=None,
        root_dir=str(root_dir),
        model_profile_id=None,
    )
    graph_registry_service.mark_build_started("graph-stale-building")

    service = GraphRagWrapperService()
    payload = service.start_build(
        graph_id="graph-stale-building",
        method="standard",
        force_rebuild=False,
        app_config_service=app_config_service,
        graph_registry_service=graph_registry_service,
    )

    assert payload.graph_id == "graph-stale-building"
    assert payload.status == "building"
    assert payload.last_error is None

    graph = graph_registry_service.get_graph("graph-stale-building")
    assert graph.status == "building"
    assert graph.last_error is None

    task = service.get_active_build_task("graph-stale-building")
    assert task is not None
    task.cancel()
    with suppress(asyncio.CancelledError):
        await task


@pytest.mark.asyncio
async def test_get_status_marks_stale_building_as_failed(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
):
    registry_path = tmp_path / "graph_registry.json"
    projects_root = tmp_path / "projects"
    graph_registry_service = GraphRegistryService(registry_path)

    graph_id = graph_registry_service.generate_graph_id("Stale Status Graph")
    root_dir = projects_root / graph_id
    root_dir.mkdir(parents=True, exist_ok=True)
    (root_dir / "input").mkdir(parents=True, exist_ok=True)
    (root_dir / "output").mkdir(parents=True, exist_ok=True)

    pd.DataFrame(
        [
            {
                "id": "doc-1",
                "human_readable_id": 0,
                "title": "Doc 1",
                "text": "demo text",
                "text_unit_ids": ["tu-1"],
                "creation_date": "2026-04-18",
                "raw_data": None,
            }
        ]
    ).to_parquet(root_dir / "output" / "documents.parquet")
    pd.DataFrame(
        [{"id": "tu-1", "document_id": "doc-1", "text": "demo text", "n_tokens": 42}]
    ).to_parquet(root_dir / "output" / "text_units.parquet")

    graph_registry_service.create_graph(
        graph_id=graph_id,
        name="Stale Status Graph",
        description="status service test",
        root_dir=str(root_dir),
        model_profile_id=None,
    )
    graph_registry_service.mark_build_started(graph_id)

    def fake_load_config(root_dir: Path):
        return SimpleNamespace(
            output_storage=SimpleNamespace(base_dir=str(root_dir / "output")),
            update_output_storage=SimpleNamespace(
                base_dir=str(root_dir / "update_output")
            ),
            cache=SimpleNamespace(
                storage=SimpleNamespace(base_dir=str(root_dir / "cache"))
            ),
            reporting=SimpleNamespace(base_dir=str(root_dir / "logs")),
            vector_store=SimpleNamespace(db_uri=str(root_dir / "output" / "lancedb")),
        )

    monkeypatch.setattr(
        "api.services.graphrag_wrapper_service.load_config",
        fake_load_config,
    )

    service = GraphRagWrapperService()
    payload = await service.get_status(
        graph_id=graph_id,
        graph_registry_service=graph_registry_service,
    )

    assert payload.graph_id == graph_id
    assert payload.status == "failed"
    assert payload.last_error == "Previous build was interrupted. Please retry."

    graph = graph_registry_service.get_graph(graph_id)
    assert graph.status == "failed"
    assert graph.last_error == "Previous build was interrupted. Please retry."


@pytest.mark.asyncio
async def test_cancel_active_build_cancels_running_task_and_clears_tracking():
    service = GraphRagWrapperService()

    async def wait_forever() -> None:
        await asyncio.sleep(60)

    task = asyncio.create_task(wait_forever())
    GraphRagWrapperService._tasks["graph-cancel-build"] = task

    cancelled = await service.cancel_active_build("graph-cancel-build")

    assert cancelled is True
    assert task.cancelled()
    assert service.get_active_build_task("graph-cancel-build") is None
