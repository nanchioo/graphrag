# Copyright (c) 2024 Microsoft Corporation.
# Licensed under the MIT License

"""Workspace prompt localization helpers."""

from __future__ import annotations

import re
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from pathlib import Path


class PromptLocalizationService:
    """Apply a small set of Chinese-localized prompt overrides to a workspace."""

    def localize_workspace_prompts(self, root_dir: Path) -> None:
        """Update GraphRAG default prompt files so outputs stay in Chinese."""
        prompts_dir = root_dir / "prompts"
        if not prompts_dir.exists():
            return

        self._localize_extract_graph(prompts_dir / "extract_graph.txt")
        self._localize_summarize_descriptions(
            prompts_dir / "summarize_descriptions.txt"
        )
        self._localize_report_prompt(prompts_dir / "community_report_graph.txt")
        self._localize_report_prompt(prompts_dir / "community_report_text.txt")

    def _localize_extract_graph(self, prompt_path: Path) -> None:
        if not prompt_path.exists():
            return

        text = prompt_path.read_text(encoding="utf-8")
        updated = text.replace(
            "- entity_name: Name of the entity, capitalized",
            "- entity_name: Name of the entity. Preserve the original language and common spelling from the source text when possible; do not force English translation or all-caps conversion",
        ).replace(
            "3. Return output in English as a single list of all the entities and relationships identified in steps 1 and 2. Use **##** as the list delimiter.",
            "3. Return entity descriptions and relationship descriptions in Simplified Chinese as a single list of all the entities and relationships identified in steps 1 and 2. Keep entity_name, source_entity, and target_entity in the original language from the source text when possible. Use **##** as the list delimiter.",
        )

        updated = self._replace_once(
            updated,
            r"- entity_description: Comprehensive description of the entity's attributes and activities(?:, written in Simplified Chinese)*",
            "- entity_description: Comprehensive description of the entity's attributes and activities, written in Simplified Chinese",
        )
        updated = self._replace_once(
            updated,
            r"- relationship_description: explanation as to why you think the source_entity and the target_entity are related to each other(?:, written in Simplified Chinese)*",
            "- relationship_description: explanation as to why you think the source_entity and the target_entity are related to each other, written in Simplified Chinese",
        )
        updated = self._replace_once(
            updated,
            r"- relationship_description: explanation as to why you think the source entity and the target entity are related to each other(?:, written in Simplified Chinese)*",
            "- relationship_description: explanation as to why you think the source entity and the target entity are related to each other, written in Simplified Chinese",
        )

        if updated != text:
            prompt_path.write_text(updated, encoding="utf-8")

    def _localize_summarize_descriptions(self, prompt_path: Path) -> None:
        if not prompt_path.exists():
            return

        text = prompt_path.read_text(encoding="utf-8")
        instruction = (
            "Write the final description in Simplified Chinese. "
            "Preserve proper names in their original language when possible."
        )
        if instruction not in text:
            updated = text.replace(
                "Please concatenate all of these into a single, comprehensive description. Make sure to include information collected from all the descriptions.",
                "Please concatenate all of these into a single, comprehensive description. Make sure to include information collected from all the descriptions.\n"
                + instruction,
            )
            prompt_path.write_text(updated, encoding="utf-8")

    def _localize_report_prompt(self, prompt_path: Path) -> None:
        if not prompt_path.exists():
            return

        text = prompt_path.read_text(encoding="utf-8")
        instruction = (
            "# Language Requirement\n"
            "Write all report fields in Simplified Chinese. Preserve named entities in their original language when possible.\n\n"
        )
        if instruction not in text:
            prompt_path.write_text(instruction + text, encoding="utf-8")

    def _replace_once(self, text: str, pattern: str, replacement: str) -> str:
        return re.sub(pattern, replacement, text, count=1)
