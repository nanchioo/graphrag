# Copyright (c) 2024 Microsoft Corporation.
# Licensed under the MIT License

"""GraphRAG project workspace initialization service."""

from pathlib import Path

from graphrag.cli.initialize import initialize_project_at

from api.services.prompt_localization_service import PromptLocalizationService


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
    ) -> None:
        """Create a standard GraphRAG project workspace."""
        initialize_project_at(
            path=root_dir,
            force=False,
            model=model,
            embedding_model=embedding_model,
        )
        self._prompt_localization_service.localize_workspace_prompts(root_dir)
