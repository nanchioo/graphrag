# Copyright (c) 2024 Microsoft Corporation.
# Licensed under the MIT License

import asyncio
import os
from pathlib import Path
from types import SimpleNamespace

import httpx
import pandas as pd
import pytest
import yaml
from fastapi import HTTPException
from openai import AuthenticationError

from api.schemas.config import ModelProfileCreateRequest, SystemConfigPayload
from api.services.app_config_service import AppConfigService
from api.services.graph_build_manifest_service import GraphBuildManifestService
from api.services.graph_registry_service import GraphRegistryService
from api.services.graphrag_wrapper_service import GraphRagWrapperService
from api.services.model_profile_validation_service import (
    ModelProfileValidationService,
)
from api.services.project_workspace_service import ProjectWorkspaceService


@pytest.mark.asyncio
async def test_run_build_syncs_model_profile_and_marks_graph_ready(
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
            provider="azure",
            name="Azure Build",
            base_url="https://example.openai.azure.com/",
            api_key="azure-secret-key",
            model_name="gpt-4.1",
            embedding_model_name="text-embedding-3-large",
            api_version="2024-10-21",
            is_default=True,
        )
    )
    graph_registry_service = GraphRegistryService(registry_path)

    graph_id = graph_registry_service.generate_graph_id("Build Service Graph")
    root_dir = projects_root / graph_id
    ProjectWorkspaceService().initialize_workspace(
        root_dir=root_dir,
        model="gpt-4.1",
        embedding_model="text-embedding-3-large",
    )
    graph_registry_service.create_graph(
        graph_id=graph_id,
        name="Build Service Graph",
        description="wrapper service test",
        root_dir=str(root_dir),
        model_profile_id=profile.id,
    )
    graph_registry_service.mark_build_started(graph_id)

    (root_dir / "input" / "article.txt").write_text(
        "service build body",
        encoding="utf-8",
    )
    monkeypatch.setenv("GRAPHRAG_API_KEY", "stale-process-secret")

    captured: dict[str, pd.DataFrame | str] = {}

    class FakeConfig:
        def __init__(self) -> None:
            self.name = "fake-config"
            self.vector_store = SimpleNamespace(
                vector_size=3072,
                index_schema={
                    "entity_description": SimpleNamespace(vector_size=3072),
                    "community_full_content": SimpleNamespace(vector_size=3072),
                    "text_unit_text": SimpleNamespace(vector_size=3072),
                },
            )
            self.embed_text = SimpleNamespace(embedding_model_id="default_embedding_model")
            self.embedding_models = {
                "default_embedding_model": SimpleNamespace(model="text-embedding-3-large")
            }

        def get_embedding_model_config(self, model_id: str):
            return self.embedding_models[model_id]

    class FakeEmbeddingModel:
        async def embedding_async(self, *, input: list[str]):
            assert input == ["This is an LLM Embedding Test String"]
            return SimpleNamespace(first_embedding=[0.0] * 3072)

    def fake_load_config(root_dir: Path):
        captured["loaded_root"] = str(root_dir)
        captured["load_config_api_key"] = os.environ["GRAPHRAG_API_KEY"]
        return FakeConfig()

    async def fake_build_index(**kwargs):
        await asyncio.sleep(0)
        captured["documents"] = kwargs["input_documents"]
        captured["build_api_key"] = os.environ["GRAPHRAG_API_KEY"]
        return [SimpleNamespace(workflow="done", result=None, state={}, error=None)]

    monkeypatch.setattr(
        "api.services.graphrag_wrapper_service.load_config",
        fake_load_config,
    )
    monkeypatch.setattr(
        "api.services.graphrag_wrapper_service.build_index",
        fake_build_index,
    )
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

    graph = graph_registry_service.get_graph(graph_id)
    assert graph.status == "ready"
    assert graph.last_build_at is not None
    assert graph.last_error is None
    assert captured["loaded_root"] == str(root_dir)
    assert captured["load_config_api_key"] == "azure-secret-key"
    assert captured["build_api_key"] == "azure-secret-key"
    assert os.environ["GRAPHRAG_API_KEY"] == "stale-process-secret"

    documents = captured["documents"]
    assert isinstance(documents, pd.DataFrame)
    assert list(documents["text"]) == ["service build body"]
    assert list(documents["human_readable_id"]) == [0]

    settings_data = yaml.safe_load(
        (root_dir / "settings.yaml").read_text(encoding="utf-8")
    )
    completion = settings_data["completion_models"]["default_completion_model"]
    embedding = settings_data["embedding_models"]["default_embedding_model"]
    assert completion["model_provider"] == "azure"
    assert completion["model"] == "gpt-4.1"
    assert completion["api_base"] == "https://example.openai.azure.com/"
    assert completion["api_version"] == "2024-10-21"
    assert completion["azure_deployment_name"] == "gpt-4.1"
    assert embedding["model"] == "text-embedding-3-large"
    assert embedding["azure_deployment_name"] == "text-embedding-3-large"
    assert (
        (root_dir / ".env").read_text(encoding="utf-8")
        == "GRAPHRAG_API_KEY=azure-secret-key\n"
    )


@pytest.mark.asyncio
async def test_run_build_syncs_vector_size_before_build_index(
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
            name="DashScope Build",
            base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
            api_key="dashscope-secret",
            model_name="qwen3.6-plus",
            embedding_model_name="text-embedding-v3",
            api_version=None,
            is_default=True,
        )
    )
    graph_registry_service = GraphRegistryService(registry_path)

    graph_id = graph_registry_service.generate_graph_id("DashScope Vector Graph")
    root_dir = projects_root / graph_id
    ProjectWorkspaceService().initialize_workspace(
        root_dir=root_dir,
        model="qwen3.6-plus",
        embedding_model="text-embedding-v3",
    )
    graph_registry_service.create_graph(
        graph_id=graph_id,
        name="DashScope Vector Graph",
        description="vector size sync test",
        root_dir=str(root_dir),
        model_profile_id=profile.id,
    )
    graph_registry_service.mark_build_started(graph_id)
    (root_dir / "input" / "article.txt").write_text(
        "vector dimension sync",
        encoding="utf-8",
    )

    class FakeConfig:
        def __init__(self) -> None:
            self.vector_store = SimpleNamespace(
                vector_size=3072,
                index_schema={
                    "entity_description": SimpleNamespace(vector_size=3072),
                    "community_full_content": SimpleNamespace(vector_size=3072),
                    "text_unit_text": SimpleNamespace(vector_size=3072),
                },
            )
            self.embed_text = SimpleNamespace(embedding_model_id="default_embedding_model")
            self.embedding_models = {
                "default_embedding_model": SimpleNamespace(model="text-embedding-v3")
            }

        def get_embedding_model_config(self, model_id: str):
            return self.embedding_models[model_id]

    class FakeEmbeddingModel:
        async def embedding_async(self, *, input: list[str]):
            assert input == ["This is an LLM Embedding Test String"]
            return SimpleNamespace(first_embedding=[0.0] * 1024)

    fake_config = FakeConfig()
    captured: dict[str, object] = {}

    def fake_load_config(root_dir: Path):
        return fake_config

    async def fake_build_index(**kwargs):
        config = kwargs["config"]
        captured["vector_size"] = config.vector_store.vector_size
        captured["schema_sizes"] = {
            name: schema.vector_size
            for name, schema in config.vector_store.index_schema.items()
        }
        return [SimpleNamespace(workflow="done", result=None, state={}, error=None)]

    monkeypatch.setattr(
        "api.services.graphrag_wrapper_service.load_config",
        fake_load_config,
    )
    monkeypatch.setattr(
        "api.services.graphrag_wrapper_service.build_index",
        fake_build_index,
    )
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

    assert captured["vector_size"] == 1024
    assert captured["schema_sizes"] == {
        "entity_description": 1024,
        "community_full_content": 1024,
        "text_unit_text": 1024,
    }


@pytest.mark.asyncio
async def test_delete_artifacts_removes_generated_directories_and_marks_graph_deleted(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
):
    registry_path = tmp_path / "graph_registry.json"
    projects_root = tmp_path / "projects"
    graph_registry_service = GraphRegistryService(registry_path)

    graph_id = graph_registry_service.generate_graph_id("Cleanup Service Graph")
    root_dir = projects_root / graph_id
    root_dir.mkdir(parents=True, exist_ok=True)
    for relative_path in ("output", "cache", "update_output", "logs"):
        target = root_dir / relative_path
        target.mkdir(parents=True, exist_ok=True)
        (target / "marker.txt").write_text(relative_path, encoding="utf-8")

    graph_registry_service.create_graph(
        graph_id=graph_id,
        name="Cleanup Service Graph",
        description="cleanup service test",
        root_dir=str(root_dir),
        model_profile_id=None,
    )

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
    payload = await service.delete_artifacts(
        graph_id=graph_id,
        graph_registry_service=graph_registry_service,
    )

    assert payload.graph_id == graph_id
    assert payload.status == "artifacts_deleted"
    assert payload.deleted_paths == ["cache", "logs", "output", "update_output"]
    assert not (root_dir / "output").exists()
    assert not (root_dir / "cache").exists()
    assert not (root_dir / "update_output").exists()
    assert not (root_dir / "logs").exists()

    graph = graph_registry_service.get_graph(graph_id)
    assert graph.status == "artifacts_deleted"


@pytest.mark.asyncio
async def test_get_status_reports_chunk_counts_and_auth_failure_hint(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
):
    registry_path = tmp_path / "graph_registry.json"
    projects_root = tmp_path / "projects"
    graph_registry_service = GraphRegistryService(registry_path)

    graph_id = graph_registry_service.generate_graph_id("Status Service Graph")
    root_dir = projects_root / graph_id
    root_dir.mkdir(parents=True, exist_ok=True)
    (root_dir / "input").mkdir(parents=True, exist_ok=True)
    (root_dir / "output").mkdir(parents=True, exist_ok=True)
    (root_dir / "logs").mkdir(parents=True, exist_ok=True)

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
    (root_dir / "logs" / "indexing-engine.log").write_text(
        "AuthenticationError: Invalid Authentication\n",
        encoding="utf-8",
    )

    graph_registry_service.create_graph(
        graph_id=graph_id,
        name="Status Service Graph",
        description="status service test",
        root_dir=str(root_dir),
        model_profile_id=None,
    )
    graph_registry_service.mark_build_failed(
        graph_id,
        "Graph Extraction failed. No entities detected during extraction.",
    )

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
    assert payload.document_count == 1
    assert payload.text_unit_count == 1
    assert payload.has_artifacts is True
    assert payload.artifact_paths == ["output", "logs"]
    assert payload.progress_percent == 55
    assert payload.progress_stage == "text_units_created"
    assert payload.progress_message == "已完成切片, 正在抽取实体关系。"
    assert payload.last_error == "Model API authentication failed (401 Invalid Authentication)."


@pytest.mark.asyncio
async def test_get_status_prefers_recent_embedding_failure_and_reports_embedding_stage(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
):
    registry_path = tmp_path / "graph_registry.json"
    projects_root = tmp_path / "projects"
    graph_registry_service = GraphRegistryService(registry_path)

    graph_id = graph_registry_service.generate_graph_id("DashScope Failure Graph")
    root_dir = projects_root / graph_id
    root_dir.mkdir(parents=True, exist_ok=True)
    (root_dir / "input").mkdir(parents=True, exist_ok=True)
    (root_dir / "output").mkdir(parents=True, exist_ok=True)
    (root_dir / "logs").mkdir(parents=True, exist_ok=True)

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
    pd.DataFrame(
        [{"id": "entity-1", "title": "XINGHE TECHNOLOGY", "type": "ORGANIZATION"}]
    ).to_parquet(root_dir / "output" / "entities.parquet")
    pd.DataFrame(
        [
            {
                "id": "rel-1",
                "source": "XINGHE TECHNOLOGY",
                "target": "HANGZHOU",
                "description": "headquartered in",
            }
        ]
    ).to_parquet(root_dir / "output" / "relationships.parquet")
    pd.DataFrame([{"community": "community-1", "entity_ids": ["entity-1"]}]).to_parquet(
        root_dir / "output" / "communities.parquet"
    )
    pd.DataFrame(
        [
            {
                "id": "report-1",
                "community": "community-1",
                "title": "Community Report",
                "summary": "summary",
                "rank": 8.5,
            }
        ]
    ).to_parquet(root_dir / "output" / "community_reports.parquet")
    log_text = (
        "openai.AuthenticationError: Invalid Authentication\n"
        "2026-04-19 11:03:43.0168 - ERROR - graphrag.index.run.run_pipeline - "
        "error running workflow generate_text_embeddings\n"
        "litellm.exceptions.BadRequestError: litellm.BadRequestError: "
        "OpenAIException - Error code: 400 - {'error': {'message': "
        "\"'encoding_format' only support with [float, base64]\"}}"
    )
    (root_dir / "logs" / "indexing-engine.log").write_text(
        log_text,
        encoding="utf-8",
    )

    graph_registry_service.create_graph(
        graph_id=graph_id,
        name="DashScope Failure Graph",
        description="status service test",
        root_dir=str(root_dir),
        model_profile_id=None,
    )
    graph_registry_service.mark_build_failed(
        graph_id,
        "Workflow generate_text_embeddings completed with errors",
    )

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

    assert payload.progress_percent == 90
    assert payload.progress_stage == "embedding_generation"
    assert payload.progress_message == "构建在向量生成阶段失败。"
    assert (
        payload.last_error
        == "向量生成失败: 当前模型服务拒绝了 encoding_format 参数, 请将 embedding 编码格式设置为 float 或 base64。"
    )


def test_sync_model_profile_adds_dashscope_embedding_call_args(tmp_path: Path):
    settings_path = tmp_path / "app_settings.json"
    app_config_service = AppConfigService(settings_path)
    profile_response = app_config_service.create_model_profile(
        ModelProfileCreateRequest(
            provider="openai",
            name="DashScope",
            base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
            api_key="dashscope-secret",
            model_name="qwen3.6-plus",
            embedding_model_name="text-embedding-v3",
            api_version=None,
            is_default=False,
        )
    )
    profile = app_config_service.get_model_profile(profile_response.id)

    root_dir = tmp_path / "workspace"
    ProjectWorkspaceService().initialize_workspace(
        root_dir=root_dir,
        model="qwen3.6-plus",
        embedding_model="text-embedding-v3",
    )

    service = GraphRagWrapperService()
    service.sync_model_profile(root_dir, profile)

    settings_data = yaml.safe_load(
        (root_dir / "settings.yaml").read_text(encoding="utf-8")
    )
    completion = settings_data["completion_models"]["default_completion_model"]
    embedding = settings_data["embedding_models"]["default_embedding_model"]

    assert completion["model"] == "qwen3.6-plus"
    assert "call_args" not in completion or "encoding_format" not in completion.get(
        "call_args", {}
    )
    assert embedding["model"] == "text-embedding-v3"
    assert embedding["call_args"] == {"encoding_format": "float"}
    assert settings_data["embed_text"]["batch_size"] == 10


def test_start_build_rejects_missing_embedding_model_before_pipeline(
    tmp_path: Path,
):
    settings_path = tmp_path / "app_settings.json"
    registry_path = tmp_path / "graph_registry.json"
    root_dir = tmp_path / "projects" / "missing-embedding"
    root_dir.mkdir(parents=True, exist_ok=True)

    app_config_service = AppConfigService(settings_path)
    profile = app_config_service.create_model_profile(
        ModelProfileCreateRequest(
            provider="openai",
            name="Kimi Missing Embedding",
            base_url="https://api.moonshot.cn/v1",
            api_key="sk-kimi-test",
            model_name="kimi-k2.5",
            embedding_model_name="",
            api_version=None,
            is_default=False,
        )
    )
    graph_registry_service = GraphRegistryService(registry_path)
    graph_registry_service.create_graph(
        graph_id="graph-missing-embedding",
        name="Missing Embedding",
        description=None,
        root_dir=str(root_dir),
        model_profile_id=profile.id,
    )

    service = GraphRagWrapperService()

    with pytest.raises(HTTPException) as exc_info:
        service.start_build(
            graph_id="graph-missing-embedding",
            action="start",
            method="standard",
            force_rebuild=False,
            app_config_service=app_config_service,
            graph_registry_service=graph_registry_service,
        )

    assert exc_info.value.status_code == 400
    assert "embedding_model_name" in str(exc_info.value.detail)
    assert (
        graph_registry_service.get_graph("graph-missing-embedding").status
        == "initialized"
    )


def test_start_build_rejects_invalid_openai_auth_before_pipeline(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
):
    settings_path = tmp_path / "app_settings.json"
    registry_path = tmp_path / "graph_registry.json"
    root_dir = tmp_path / "projects" / "invalid-auth"
    root_dir.mkdir(parents=True, exist_ok=True)

    app_config_service = AppConfigService(settings_path)
    profile = app_config_service.create_model_profile(
        ModelProfileCreateRequest(
            provider="openai",
            name="Kimi Invalid Auth",
            base_url="https://api.moonshot.cn/v1",
            api_key="sk-invalid",
            model_name="kimi-k2.5",
            embedding_model_name="text-embedding-v1",
            api_version=None,
            is_default=False,
        )
    )
    graph_registry_service = GraphRegistryService(registry_path)
    graph_registry_service.create_graph(
        graph_id="graph-invalid-auth",
        name="Invalid Auth",
        description=None,
        root_dir=str(root_dir),
        model_profile_id=profile.id,
    )

    def fake_probe(*_, **__):
        request = httpx.Request("GET", "https://api.moonshot.cn/v1/models")
        response = httpx.Response(401, request=request)
        message = "Invalid Authentication"
        raise AuthenticationError(
            message,
            response=response,
            body={"error": {"message": "Invalid Authentication"}},
        )

    monkeypatch.setattr(
        ModelProfileValidationService,
        "_probe_openai_profile",
        fake_probe,
    )

    service = GraphRagWrapperService()

    with pytest.raises(HTTPException) as exc_info:
        service.start_build(
            graph_id="graph-invalid-auth",
            action="start",
            method="standard",
            force_rebuild=False,
            app_config_service=app_config_service,
            graph_registry_service=graph_registry_service,
        )

    assert exc_info.value.status_code == 400
    assert "鉴权失败" in str(exc_info.value.detail)
    assert graph_registry_service.get_graph("graph-invalid-auth").status == "initialized"


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

    graph_id = graph_registry_service.generate_graph_id("Sequential Build Graph")
    root_dir = projects_root / graph_id
    ProjectWorkspaceService().initialize_workspace(
        root_dir=root_dir,
        model="gpt-4.1",
        embedding_model="text-embedding-3-large",
    )
    graph_registry_service.create_graph(
        graph_id=graph_id,
        name="Sequential Build Graph",
        description="per-file build test",
        root_dir=str(root_dir),
        model_profile_id=None,
    )
    graph_registry_service.mark_build_started(graph_id)
    (root_dir / "input" / "a.txt").write_text("alpha", encoding="utf-8")
    (root_dir / "input" / "b.txt").write_text("beta", encoding="utf-8")

    build_calls: list[dict[str, object]] = []

    class FakeConfig:
        def __init__(self) -> None:
            self.vector_store = SimpleNamespace(
                vector_size=3072,
                index_schema={
                    "entity_description": SimpleNamespace(vector_size=3072),
                    "community_full_content": SimpleNamespace(vector_size=3072),
                    "text_unit_text": SimpleNamespace(vector_size=3072),
                },
            )
            self.embed_text = SimpleNamespace(embedding_model_id="default_embedding_model")
            self.embedding_models = {
                "default_embedding_model": SimpleNamespace(model="text-embedding-3-large")
            }

        def get_embedding_model_config(self, model_id: str):
            return self.embedding_models[model_id]

    class FakeEmbeddingModel:
        async def embedding_async(self, *, input: list[str]):
            assert input == ["This is an LLM Embedding Test String"]
            return SimpleNamespace(first_embedding=[0.0] * 3072)

    def fake_load_config(root_dir: Path):
        return FakeConfig()

    async def fake_build_index(**kwargs):
        documents = kwargs["input_documents"]
        build_calls.append(
            {
                "is_update_run": kwargs.get("is_update_run", False),
                "titles": list(documents["title"]),
            }
        )
        return [SimpleNamespace(workflow="done", result=None, state={}, error=None)]

    monkeypatch.setattr(
        "api.services.graphrag_wrapper_service.load_config",
        fake_load_config,
    )
    monkeypatch.setattr(
        "api.services.graphrag_wrapper_service.build_index",
        fake_build_index,
    )
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
async def test_get_status_includes_resumable_manifest_counts(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
):
    registry_path = tmp_path / "graph_registry.json"
    projects_root = tmp_path / "projects"
    graph_registry_service = GraphRegistryService(registry_path)

    graph_id = graph_registry_service.generate_graph_id("Manifest Status Graph")
    root_dir = projects_root / graph_id
    root_dir.mkdir(parents=True, exist_ok=True)
    (root_dir / "input").mkdir(parents=True, exist_ok=True)
    (root_dir / "output").mkdir(parents=True, exist_ok=True)
    (root_dir / "input" / "a.txt").write_text("alpha", encoding="utf-8")
    (root_dir / "input" / "b.txt").write_text("beta", encoding="utf-8")
    (root_dir / "input" / "c.txt").write_text("gamma", encoding="utf-8")

    graph_registry_service.create_graph(
        graph_id=graph_id,
        name="Manifest Status Graph",
        description="manifest counts test",
        root_dir=str(root_dir),
        model_profile_id=None,
    )
    graph_registry_service.mark_build_failed(graph_id, "provider timeout")

    manifest_service = GraphBuildManifestService()
    manifest_service.initialize_manifest(root_dir, graph_id=graph_id)
    manifest_service.mark_file_succeeded(
        root_dir=root_dir,
        relative_path="a.txt",
        document_count=1,
        text_unit_count=4,
    )
    manifest_service.mark_file_failed(root_dir, "b.txt", "provider timeout")

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
