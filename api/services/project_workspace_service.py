# Copyright (c) 2024 Microsoft Corporation.
# Licensed under the MIT License

"""GraphRAG project workspace initialization service."""

from pathlib import Path

from fastapi import HTTPException, status
import yaml
from graphrag.cli.initialize import initialize_project_at

from api.schemas.graph import GraphChunkingCreateRequest
from api.services.prompt_localization_service import PromptLocalizationService

DEFAULT_CHUNKING_CONFIG = GraphChunkingCreateRequest()


class ProjectWorkspaceService:
    """Initialize GraphRAG project folders for graph workspaces."""

    def __init__(
        self,
        prompt_localization_service: PromptLocalizationService | None = None,
    ) -> None:
        self._prompt_localization_service = (
            prompt_localization_service or PromptLocalizationService()
        )

    def initialize_workspace(
        self,
        root_dir: Path,
        model: str,
        embedding_model: str,
        chunking: GraphChunkingCreateRequest | None = None,
    ) -> None:
        """Create a standard GraphRAG project workspace."""
        self._validate_workspace_target(root_dir)
        initialize_project_at(
            path=root_dir,
            force=False,
            model=model,
            embedding_model=embedding_model,
        )
        self._prompt_localization_service.localize_workspace_prompts(root_dir)
        self._write_chunking_settings(root_dir, chunking or DEFAULT_CHUNKING_CONFIG)

    def _validate_workspace_target(self, root_dir: Path) -> None:
        parent_dir = root_dir.parent

        if parent_dir.exists() and not parent_dir.is_dir():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Graph projects root path '{parent_dir}' must be a directory.",
            )

        if root_dir.exists():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Graph workspace '{root_dir}' already exists.",
            )

    def _write_chunking_settings(
        self,
        root_dir: Path,
        chunking: GraphChunkingCreateRequest,
    ) -> None:
        settings_path = root_dir / "settings.yaml"
        settings_data = yaml.safe_load(settings_path.read_text(encoding="utf-8"))
        settings_data["chunking"] = chunking.model_dump()
        settings_path.write_text(
            yaml.safe_dump(settings_data, sort_keys=False, allow_unicode=True),
            encoding="utf-8",
        )
