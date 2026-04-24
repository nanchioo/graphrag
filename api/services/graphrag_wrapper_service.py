# Copyright (c) 2024 Microsoft Corporation.
# Licensed under the MIT License

"""Wrapper service for GraphRAG build execution and artifact management."""

from __future__ import annotations

import asyncio
import os
import shutil
from contextlib import contextmanager
from dataclasses import asdict
from pathlib import Path
from typing import TYPE_CHECKING, Any, ClassVar, Never, TypeVar

import pandas as pd
import yaml
from fastapi import HTTPException, status
from graphrag.api.index import build_index
from graphrag.config.defaults import (
    DEFAULT_COMPLETION_MODEL_ID,
    DEFAULT_EMBEDDING_MODEL_ID,
)
from graphrag.config.enums import IndexingMethod
from graphrag.config.load_config import load_config
from graphrag.data_model.data_reader import DataReader
from graphrag_llm.embedding import create_embedding
from graphrag_storage import create_storage
from graphrag_storage.tables.table_provider_factory import create_table_provider

from api.schemas.graph import (
    DeleteArtifactsPayload,
    GraphBuildPayload,
    GraphStatusPayload,
    SourceFileItem,
)
from api.services.graph_build_manifest_service import GraphBuildManifestService
from api.services.model_profile_validation_service import (
    ModelProfileValidationService,
)
from api.services.prompt_localization_service import PromptLocalizationService
from api.services.source_ingest_service import SourceIngestService

if TYPE_CHECKING:
    from collections.abc import Awaitable, Callable, Iterator

    from api.services.app_config_service import AppConfigService, StoredModelProfile
    from api.services.graph_registry_service import GraphRegistryService

T = TypeVar("T")


class GraphRagWrapperService:
    """Provide a minimal wrapper over GraphRAG indexing and artifact lifecycle."""

    _INTERRUPTED_BUILD_MESSAGE = "Previous build was interrupted. Please retry."
    _INTERRUPTED_RESUME_MESSAGE = "Previous build was interrupted. Please resume."
    _INCREMENTAL_REBUILD_REQUIRED_MESSAGE = (
        "Detected modified or deleted source files since the last successful build. "
        "Run full rebuild to keep the graph consistent."
    )
    _EMBEDDING_DIMENSION_PROBE_TEXT = "This is an LLM Embedding Test String"
    _cwd_lock: ClassVar[asyncio.Lock] = asyncio.Lock()
    _tasks: ClassVar[dict[str, asyncio.Task[None]]] = {}

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

    async def run_in_project_context(
        self,
        root_dir: Path,
        operation: Callable[[], Awaitable[T]],
        env_overrides: dict[str, str | None] | None = None,
    ) -> T:
        """Run an async operation while holding the GraphRAG cwd lock."""
        async with self._cwd_lock:
            with self._project_context(root_dir, env_overrides):
                return await operation()

    def sync_model_profile(self, root_dir: Path, profile: StoredModelProfile) -> None:
        """Apply the selected model profile to a GraphRAG workspace."""
        self._sync_model_profile(root_dir, profile)

    def get_active_build_task(self, graph_id: str) -> asyncio.Task[None] | None:
        """Return the active in-process build task for a graph, if one exists."""
        return self._get_active_task(graph_id)

    async def cancel_active_build(self, graph_id: str) -> bool:
        """Cancel an active in-process build task for a graph, if one exists."""
        task = self._get_active_task(graph_id)
        if task is None:
            return False

        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass
        return True

    def build_model_env_overrides(
        self, profile: StoredModelProfile
    ) -> dict[str, str | None]:
        """Return deterministic environment variables for a model-bound project run."""
        return self._build_model_env_overrides(profile)

    async def load_output_tables(
        self,
        config: Any,
        required_tables: list[str],
        optional_tables: list[str] | None = None,
    ) -> dict[str, pd.DataFrame | None]:
        """Load GraphRAG parquet outputs with the same typed reader used by the CLI."""
        dataframe_dict: dict[str, pd.DataFrame | None] = {}
        storage_obj = create_storage(config.output_storage)
        table_provider = create_table_provider(config.table_provider, storage=storage_obj)
        reader = DataReader(table_provider)

        for table_name in required_tables:
            dataframe_dict[table_name] = await getattr(reader, table_name)()

        if optional_tables:
            for table_name in optional_tables:
                if await table_provider.has(table_name):
                    dataframe_dict[table_name] = await getattr(reader, table_name)()
                else:
                    dataframe_dict[table_name] = None

        return dataframe_dict

    def start_build(
        self,
        graph_id: str,
        action: str,
        method: str,
        force_rebuild: bool,
        app_config_service: AppConfigService,
        graph_registry_service: GraphRegistryService,
    ) -> GraphBuildPayload:
        """Mark the graph as building and schedule an asynchronous build task."""
        graph = self._reconcile_stale_build_state(graph_id, graph_registry_service)
        root_dir = Path(graph.root_dir)

        if graph.model_profile_id:
            profile = app_config_service.get_model_profile(graph.model_profile_id)
            self._model_profile_validation_service.validate_stored_profile(profile)

        if action == "resume" and not self._manifest_service.is_resumable(root_dir):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Graph project '{graph_id}' has no resumable build state.",
            )

        if graph.status == "building":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Graph project '{graph_id}' is already building.",
            )
        self._validate_start_build_inputs(
            root_dir=root_dir,
            action=action,
            force_rebuild=force_rebuild,
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
        """Execute a GraphRAG build and persist the final build state."""
        graph = graph_registry_service.get_graph(graph_id)
        root_dir = Path(graph.root_dir)
        env_overrides: dict[str, str | None] | None = None
        current_relative_path: str | None = None

        try:
            async with self._cwd_lock:
                self._prompt_localization_service.localize_workspace_prompts(root_dir)

                if force_rebuild:
                    await self._delete_artifact_paths(root_dir)
                    self._manifest_service.delete_manifest(root_dir)

                if graph.model_profile_id:
                    profile = app_config_service.get_model_profile(graph.model_profile_id)
                    self._sync_model_profile(root_dir, profile)
                    env_overrides = self._build_model_env_overrides(profile)

                manifest = self._manifest_service.prepare_manifest(
                    root_dir=root_dir,
                    graph_id=graph_id,
                    action=action,
                )
                if len(manifest.files) == 0:
                    self._ensure_documents_available([])

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

                    is_update_run = (
                        action == "resume"
                        or manifest.completed_file_count > 0
                        or any(item.status == "skipped" for item in manifest.files)
                    )
                    for file_entry in files_to_run:
                        current_relative_path = file_entry.relative_path
                        self._manifest_service.mark_file_started(
                            root_dir=root_dir,
                            relative_path=current_relative_path,
                        )
                        documents = await self._source_ingest_service.load_source_documents(
                            root_dir / "input",
                            relative_paths=[current_relative_path],
                        )
                        self._ensure_documents_available(documents)
                        before_document_count, before_text_unit_count = (
                            self._read_output_counts(root_dir)
                        )
                        input_documents = self._to_documents_dataframe(documents)
                        outputs = await build_index(
                            config=config,
                            method=IndexingMethod(method),
                            is_update_run=is_update_run,
                            input_documents=input_documents,
                        )

                        errors = [str(output.error) for output in outputs if output.error]
                        if errors:
                            self._raise_pipeline_error(errors[0])

                        after_document_count, after_text_unit_count = (
                            self._read_output_counts(root_dir)
                        )
                        self._manifest_service.mark_file_succeeded(
                            root_dir=root_dir,
                            relative_path=current_relative_path,
                            document_count=max(
                                len(documents),
                                after_document_count - before_document_count,
                            ),
                            text_unit_count=max(
                                after_text_unit_count - before_text_unit_count,
                                0,
                            ),
                        )
                        current_relative_path = None
                        is_update_run = True

                self._manifest_service.mark_project_completed(root_dir)
            graph_registry_service.mark_build_succeeded(graph_id)
        except Exception as exc:  # noqa: BLE001
            if (
                current_relative_path is not None
                and self._manifest_service.manifest_path(root_dir).exists()
            ):
                self._manifest_service.mark_file_failed(
                    root_dir=root_dir,
                    relative_path=current_relative_path,
                    error_message=str(exc),
                )
            graph_registry_service.mark_build_failed(graph_id, str(exc))

    async def get_status(
        self,
        graph_id: str,
        graph_registry_service: GraphRegistryService,
    ) -> GraphStatusPayload:
        """Return build status together with source and artifact summaries."""
        graph = self._reconcile_stale_build_state(graph_id, graph_registry_service)
        root_dir = Path(graph.root_dir)
        source_files = await self.list_source_files(graph_id, graph_registry_service)
        artifact_paths = await self._existing_artifact_paths(root_dir)
        has_pending_input_changes = self._has_pending_input_changes(root_dir)
        document_count, text_unit_count = self._read_output_counts(root_dir)
        last_error = self._diagnose_failure_message(root_dir, graph.last_error)
        progress_percent, progress_stage, progress_message = self._build_progress(
            root_dir=root_dir,
            raw_status=self._resolve_graph_status(
                raw_status=graph.status,
                has_artifacts=len(artifact_paths) > 0,
                has_pending_input_changes=has_pending_input_changes,
            ),
            has_source_files=len(source_files) > 0,
            document_count=document_count,
            text_unit_count=text_unit_count,
        )
        resumable = False
        current_file: str | None = None
        completed_file_count = 0
        failed_file_count = 0
        pending_file_count = 0
        if self._manifest_service.manifest_path(root_dir).exists():
            manifest = self._manifest_service.load_manifest(root_dir)
            resumable = self._manifest_service.is_resumable(root_dir)
            current_file = manifest.current_file
            completed_file_count = manifest.completed_file_count
            failed_file_count = manifest.failed_file_count
            pending_file_count = manifest.pending_file_count

        return GraphStatusPayload(
            graph_id=graph.id,
            status=self._resolve_graph_status(
                raw_status=graph.status,
                has_artifacts=len(artifact_paths) > 0,
                has_pending_input_changes=has_pending_input_changes,
            ),
            last_build_at=graph.last_build_at,
            last_error=last_error,
            has_source_files=len(source_files) > 0,
            source_file_count=len(source_files),
            document_count=document_count,
            text_unit_count=text_unit_count,
            has_artifacts=len(artifact_paths) > 0,
            artifact_paths=artifact_paths,
            progress_percent=progress_percent,
            progress_stage=progress_stage,
            progress_message=progress_message,
            resumable=resumable,
            current_file=current_file,
            completed_file_count=completed_file_count,
            failed_file_count=failed_file_count,
            pending_file_count=pending_file_count,
        )

    async def list_source_files(
        self,
        graph_id: str,
        graph_registry_service: GraphRegistryService,
    ) -> list[SourceFileItem]:
        """List graph source files merged with persisted manifest metadata."""
        graph = graph_registry_service.get_graph(graph_id)
        root_dir = Path(graph.root_dir)
        items = await self._source_ingest_service.list_files(root_dir / "input")
        return self._manifest_service.merge_source_items(root_dir=root_dir, items=items)

    async def delete_artifacts(
        self,
        graph_id: str,
        graph_registry_service: GraphRegistryService,
    ) -> DeleteArtifactsPayload:
        """Delete generated artifacts for a graph project and persist its status."""
        graph = graph_registry_service.get_graph(graph_id)
        root_dir = Path(graph.root_dir)

        async with self._cwd_lock:
            deleted_paths = await self._delete_artifact_paths(root_dir)

        updated = graph_registry_service.mark_artifacts_deleted(graph_id)
        return DeleteArtifactsPayload(
            graph_id=updated.id,
            status=updated.status,
            deleted_paths=deleted_paths,
        )

    def _sync_model_profile(self, root_dir: Path, profile: StoredModelProfile) -> None:
        self._prompt_localization_service.localize_workspace_prompts(root_dir)
        settings_path = root_dir / "settings.yaml"
        settings_data = yaml.safe_load(settings_path.read_text(encoding="utf-8"))
        completion_block = settings_data["completion_models"][DEFAULT_COMPLETION_MODEL_ID]
        embedding_block = settings_data["embedding_models"][DEFAULT_EMBEDDING_MODEL_ID]
        embedding_model = profile.embedding_model_name or profile.model_name
        embed_text_block = settings_data.setdefault("embed_text", {})

        for block, model_name in (
            (completion_block, profile.model_name),
            (embedding_block, embedding_model),
        ):
            block["model_provider"] = profile.provider
            block["model"] = model_name
            block["api_key"] = "${GRAPHRAG_API_KEY}"

            if profile.base_url:
                block["api_base"] = profile.base_url
            else:
                block.pop("api_base", None)

            if profile.api_version:
                block["api_version"] = profile.api_version
            else:
                block.pop("api_version", None)

            if profile.provider == "azure":
                block["azure_deployment_name"] = model_name
            else:
                block.pop("azure_deployment_name", None)

        self._apply_embedding_provider_compatibility(embedding_block, profile)
        self._apply_embed_text_provider_compatibility(embed_text_block, profile)

        settings_path.write_text(
            yaml.safe_dump(settings_data, sort_keys=False, allow_unicode=True),
            encoding="utf-8",
        )

        api_key = self._resolve_api_key(profile)
        (root_dir / ".env").write_text(
            f"GRAPHRAG_API_KEY={api_key}\n",
            encoding="utf-8",
        )

    def _build_model_env_overrides(
        self, profile: StoredModelProfile
    ) -> dict[str, str | None]:
        return {"GRAPHRAG_API_KEY": self._resolve_api_key(profile)}

    @contextmanager
    def _project_context(
        self,
        root_dir: Path,
        env_overrides: dict[str, str | None] | None = None,
    ) -> Iterator[None]:
        original_cwd = Path.cwd()
        original_env: dict[str, str | None] = {}

        try:
            if env_overrides:
                for key, value in env_overrides.items():
                    original_env[key] = os.environ.get(key)
                    if value is None:
                        os.environ.pop(key, None)
                    else:
                        os.environ[key] = value

            os.chdir(root_dir)
            yield
        finally:
            os.chdir(original_cwd)
            if env_overrides:
                for key, original_value in original_env.items():
                    if original_value is None:
                        os.environ.pop(key, None)
                    else:
                        os.environ[key] = original_value

    def _resolve_api_key(self, profile: StoredModelProfile) -> str:
        if profile.api_key:
            return profile.api_key

        if profile.provider == "ollama":
            return "ollama"

        self._raise_missing_api_key(profile.id)
        message = "Unreachable code path after missing api_key validation."
        raise AssertionError(message)

    def _reconcile_stale_build_state(
        self,
        graph_id: str,
        graph_registry_service: GraphRegistryService,
    ):
        graph = graph_registry_service.get_graph(graph_id)
        active_task = self._get_active_task(graph_id)

        if graph.status != "building" or active_task is not None:
            return graph

        root_dir = Path(graph.root_dir)
        if self._manifest_service.manifest_path(root_dir).exists():
            self._manifest_service.mark_interrupted(
                root_dir=root_dir,
                error_message=self._INTERRUPTED_RESUME_MESSAGE,
            )
            return graph_registry_service.mark_build_failed(
                graph_id,
                self._INTERRUPTED_RESUME_MESSAGE,
            )

        return graph_registry_service.mark_build_failed(
            graph_id,
            self._INTERRUPTED_BUILD_MESSAGE,
        )

    def _validate_start_build_inputs(
        self,
        root_dir: Path,
        action: str,
        force_rebuild: bool,
    ) -> None:
        if action != "start" or force_rebuild:
            return

        diff = self._manifest_service.compare_inputs_to_manifest(root_dir)
        if diff.changed or diff.deleted:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=self._INCREMENTAL_REBUILD_REQUIRED_MESSAGE,
            )

    def _has_pending_input_changes(self, root_dir: Path) -> bool:
        diff = self._manifest_service.compare_inputs_to_manifest(root_dir)
        return bool(diff.added or diff.changed or diff.deleted)

    def _resolve_graph_status(
        self,
        raw_status: str,
        has_artifacts: bool,
        has_pending_input_changes: bool,
    ) -> str:
        if raw_status == "ready" and has_artifacts and has_pending_input_changes:
            return "awaiting_build"
        return raw_status

    def _get_active_task(self, graph_id: str) -> asyncio.Task[None] | None:
        task = self._tasks.get(graph_id)
        if task is None:
            return None
        if task.done():
            self._tasks.pop(graph_id, None)
            return None
        return task

    def _to_documents_dataframe(self, documents: list[Any]) -> pd.DataFrame:
        rows = [asdict(document) for document in documents]
        input_documents = pd.DataFrame(rows)
        input_documents["human_readable_id"] = input_documents.index
        if "raw_data" not in input_documents.columns:
            input_documents["raw_data"] = pd.Series(dtype="object")
        return input_documents

    async def _sync_vector_store_dimensions(self, config: Any) -> None:
        model_config = config.get_embedding_model_config(
            config.embed_text.embedding_model_id
        )
        embedding_model = create_embedding(model_config)
        response = await embedding_model.embedding_async(
            input=[self._EMBEDDING_DIMENSION_PROBE_TEXT]
        )
        detected_size = len(response.first_embedding)

        if detected_size == 0:
            return

        config.vector_store.vector_size = detected_size
        for schema in config.vector_store.index_schema.values():
            schema.vector_size = detected_size

    def _read_output_counts(self, root_dir: Path) -> tuple[int, int]:
        output_dir = root_dir / "output"
        documents_path = output_dir / "documents.parquet"
        text_units_path = output_dir / "text_units.parquet"

        document_count = 0
        text_unit_count = 0

        if documents_path.exists():
            document_count = len(pd.read_parquet(documents_path))
        if text_units_path.exists():
            text_unit_count = len(pd.read_parquet(text_units_path))

        return document_count, text_unit_count

    def _build_progress(
        self,
        root_dir: Path,
        raw_status: str,
        has_source_files: bool,
        document_count: int,
        text_unit_count: int,
    ) -> tuple[int, str, str]:
        output_dir = root_dir / "output"
        has_documents = document_count > 0 or (output_dir / "documents.parquet").exists()
        has_text_units = text_unit_count > 0 or (output_dir / "text_units.parquet").exists()
        has_entities = (output_dir / "entities.parquet").exists()
        has_relationships = (output_dir / "relationships.parquet").exists()
        has_communities = (output_dir / "communities.parquet").exists()
        has_reports = (output_dir / "community_reports.parquet").exists()
        has_graph_structure = has_entities or has_relationships
        has_report_outputs = has_communities or has_reports

        if raw_status == "ready":
            return (100, "completed", "已完成知识图谱构建。")

        if raw_status == "building":
            if has_report_outputs:
                return (90, "embedding_generation", "已生成社区报告, 正在生成向量索引。")
            if has_graph_structure:
                return (75, "reports_generation", "已抽取实体关系, 正在生成社区报告。")
            if has_text_units:
                return (55, "text_units_created", "已完成切片, 正在抽取实体关系。")
            if has_documents:
                return (35, "documents_indexed", "已生成文档, 正在进行文本切片。")
            return (20, "build_started", "已启动构建, 正在读取源文件。")

        if raw_status == "failed":
            if has_report_outputs:
                return (90, "embedding_generation", "构建在向量生成阶段失败。")
            if has_graph_structure:
                return (75, "reports_generation", "构建在社区报告阶段失败。")
            if has_text_units:
                return (55, "text_units_created", "已完成切片, 正在抽取实体关系。")
            if has_documents:
                return (35, "documents_indexed", "构建在文本切片阶段失败。")
            return (20, "build_started", "构建在启动阶段失败。")

        if has_source_files:
            return (10, "awaiting_build", "已上传源文件, 等待开始构建。")

        return (0, "awaiting_upload", "等待上传源文件。")

    def _diagnose_failure_message(
        self, root_dir: Path, default_message: str | None
    ) -> str | None:
        if default_message is None:
            return None

        log_path = root_dir / "logs" / "indexing-engine.log"
        if not log_path.exists():
            return default_message

        log_text = self._tail_log_text(log_path)
        if "encoding_format" in log_text and "float, base64" in log_text:
            return (
                "向量生成失败: 当前模型服务拒绝了 encoding_format 参数, "
                "请将 embedding 编码格式设置为 float 或 base64。"
            )
        if (
            "AllocationQuota.FreeTierOnly" in log_text
            or "The free tier of the model has been exhausted" in log_text
        ):
            return (
                "Model API quota exhausted for the current free-tier setting. "
                "Disable free-tier-only mode or use a paid-capable model profile."
            )
        if "Incorrect API key provided" in log_text or "invalid_api_key" in log_text:
            return "Model API authentication failed (invalid_api_key)."
        if "Invalid Authentication" in log_text or "AuthenticationError" in log_text:
            return "Model API authentication failed (401 Invalid Authentication)."

        return default_message

    def _tail_log_text(self, log_path: Path, line_count: int = 160) -> str:
        lines = log_path.read_text(encoding="utf-8", errors="ignore").splitlines()
        return "\n".join(lines[-line_count:])

    def _apply_embedding_provider_compatibility(
        self,
        embedding_block: dict[str, Any],
        profile: StoredModelProfile,
    ) -> None:
        call_args = dict(embedding_block.get("call_args") or {})

        if self._uses_dashscope_compatible_api(profile):
            call_args["encoding_format"] = "float"
        else:
            call_args.pop("encoding_format", None)

        if call_args:
            embedding_block["call_args"] = call_args
        else:
            embedding_block.pop("call_args", None)

    def _uses_dashscope_compatible_api(self, profile: StoredModelProfile) -> bool:
        base_url = (profile.base_url or "").lower()
        return profile.provider == "openai" and "dashscope.aliyuncs.com" in base_url

    def _apply_embed_text_provider_compatibility(
        self,
        embed_text_block: dict[str, Any],
        profile: StoredModelProfile,
    ) -> None:
        if self._uses_dashscope_compatible_api(profile):
            current_batch_size = int(embed_text_block.get("batch_size", 16))
            embed_text_block["batch_size"] = min(current_batch_size, 10)

    async def _existing_artifact_paths(self, root_dir: Path) -> list[str]:
        artifact_roots = await self._resolve_artifact_roots(root_dir)
        return [
            str(path.relative_to(root_dir)).replace("\\", "/")
            for path in artifact_roots
            if path.exists()
        ]

    async def _delete_artifact_paths(self, root_dir: Path) -> list[str]:
        artifact_roots = await self._resolve_artifact_roots(root_dir)
        deleted: list[str] = []
        for path in sorted(artifact_roots, key=lambda item: item.as_posix()):
            if not path.exists():
                continue
            shutil.rmtree(path)
            deleted.append(str(path.relative_to(root_dir)).replace("\\", "/"))
        return deleted

    async def _resolve_artifact_roots(self, root_dir: Path) -> list[Path]:
        original_cwd = Path.cwd()
        try:
            os.chdir(root_dir)
            config = load_config(root_dir=root_dir)
        finally:
            os.chdir(original_cwd)

        paths = [
            Path(config.output_storage.base_dir),
            Path(config.update_output_storage.base_dir),
            Path(config.cache.storage.base_dir),
            Path(config.reporting.base_dir),
        ]
        vector_store_path = Path(config.vector_store.db_uri)
        if not any(self._is_within(vector_store_path, path) for path in paths):
            paths.append(vector_store_path)

        unique_paths: list[Path] = []
        for path in paths:
            resolved = path.resolve()
            if not self._is_within(resolved, root_dir.resolve()):
                continue
            if resolved not in unique_paths:
                unique_paths.append(resolved)
        return unique_paths

    def _is_within(self, candidate: Path, root_dir: Path) -> bool:
        try:
            candidate.relative_to(root_dir)
        except ValueError:
            return False
        else:
            return True

    def _ensure_documents_available(self, documents: list[Any]) -> None:
        if len(documents) > 0:
            return

        message = "No source files were found for this graph project."
        raise ValueError(message)

    def _raise_pipeline_error(self, message: str) -> None:
        raise RuntimeError(message)

    def _raise_missing_api_key(self, profile_id: str) -> Never:
        message = f"Model profile '{profile_id}' is missing an api_key required for build."
        raise ValueError(message)
