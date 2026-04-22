# Copyright (c) 2024 Microsoft Corporation.
# Licensed under the MIT License

from pathlib import Path

import yaml

from api.schemas.graph import GraphChunkingCreateRequest
from api.services.project_workspace_service import ProjectWorkspaceService
from api.services.prompt_localization_service import PromptLocalizationService


def test_initialize_workspace_localizes_default_indexing_prompts(tmp_path: Path):
    root_dir = tmp_path / "localized-workspace"

    ProjectWorkspaceService().initialize_workspace(
        root_dir=root_dir,
        model="qwen3.6-plus",
        embedding_model="text-embedding-v3",
    )

    extract_graph_prompt = (root_dir / "prompts" / "extract_graph.txt").read_text(
        encoding="utf-8"
    )
    summarize_prompt = (
        root_dir / "prompts" / "summarize_descriptions.txt"
    ).read_text(encoding="utf-8")
    community_graph_prompt = (
        root_dir / "prompts" / "community_report_graph.txt"
    ).read_text(encoding="utf-8")
    community_text_prompt = (
        root_dir / "prompts" / "community_report_text.txt"
    ).read_text(encoding="utf-8")

    assert "Simplified Chinese" in extract_graph_prompt
    assert "original language from the source text" in extract_graph_prompt
    assert "Write the final description in Simplified Chinese." in summarize_prompt
    assert "Write all report fields in Simplified Chinese." in community_graph_prompt
    assert "Write all report fields in Simplified Chinese." in community_text_prompt


def test_prompt_localization_is_idempotent(tmp_path: Path):
    root_dir = tmp_path / "localized-workspace"

    ProjectWorkspaceService().initialize_workspace(
        root_dir=root_dir,
        model="qwen3.6-plus",
        embedding_model="text-embedding-v3",
    )

    service = PromptLocalizationService()
    service.localize_workspace_prompts(root_dir)
    service.localize_workspace_prompts(root_dir)

    extract_graph_prompt = (root_dir / "prompts" / "extract_graph.txt").read_text(
        encoding="utf-8"
    )

    assert (
        extract_graph_prompt.count(
            "Comprehensive description of the entity's attributes and activities, written in Simplified Chinese"
        )
        == 1
    )
    assert (
        extract_graph_prompt.count(
            "explanation as to why you think the source entity and the target entity are related to each other, written in Simplified Chinese"
        )
        == 1
    )


def test_initialize_workspace_writes_custom_chunking_settings(tmp_path: Path):
    root_dir = tmp_path / "chunked-workspace"

    ProjectWorkspaceService().initialize_workspace(
        root_dir=root_dir,
        model="qwen3.6-plus",
        embedding_model="text-embedding-v3",
        chunking=GraphChunkingCreateRequest(
            type="tokens",
            size=256,
            overlap=32,
            encoding_model="cl100k_base",
        ),
    )

    settings_data = yaml.safe_load((root_dir / "settings.yaml").read_text(encoding="utf-8"))

    assert settings_data["chunking"] == {
        "type": "tokens",
        "size": 256,
        "overlap": 32,
        "encoding_model": "cl100k_base",
    }


def test_initialize_workspace_keeps_default_chunking_when_not_overridden(
    tmp_path: Path,
):
    root_dir = tmp_path / "default-chunking-workspace"

    ProjectWorkspaceService().initialize_workspace(
        root_dir=root_dir,
        model="qwen3.6-plus",
        embedding_model="text-embedding-v3",
    )

    settings_data = yaml.safe_load((root_dir / "settings.yaml").read_text(encoding="utf-8"))

    assert settings_data["chunking"] == {
        "type": "tokens",
        "size": 1200,
        "overlap": 100,
        "encoding_model": "o200k_base",
    }
