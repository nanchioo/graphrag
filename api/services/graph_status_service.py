# Copyright (c) 2024 Microsoft Corporation.
# Licensed under the MIT License

"""User-facing graph status resolution helpers."""

from __future__ import annotations

from pathlib import Path
from typing import TYPE_CHECKING

from api.schemas.graph import GraphStatusPayload, GraphSummary
from api.services.source_ingest_service import SourceIngestService

if TYPE_CHECKING:
    from api.services.graph_registry_service import StoredGraphProject


class GraphStatusService:
    """Resolve internal graph workflow states into user-facing statuses."""

    def __init__(self, source_ingest_service: SourceIngestService | None = None):
        self._source_ingest_service = source_ingest_service or SourceIngestService()

    async def build_summary(self, graph: StoredGraphProject) -> GraphSummary:
        """Return a list-row summary with a user-facing status."""
        source_files = await self._source_ingest_service.list_files(
            Path(graph.root_dir) / "input"
        )
        return GraphSummary(
            id=graph.id,
            name=graph.name,
            status=self.resolve_status(
                raw_status=graph.status,
                has_source_files=len(source_files) > 0,
                has_artifacts=graph.status == "ready",
            ),
            model_profile_id=graph.model_profile_id,
        )

    def build_status_payload(self, payload: GraphStatusPayload) -> GraphStatusPayload:
        """Normalize a detailed status payload for UI consumption."""
        return payload.model_copy(
            update={
                "status": self.resolve_status(
                    raw_status=payload.status,
                    has_source_files=payload.has_source_files,
                    has_artifacts=payload.has_artifacts,
                )
            }
        )

    def resolve_status(
        self,
        raw_status: str,
        has_source_files: bool,
        has_artifacts: bool,
    ) -> str:
        """Convert internal workflow status to a user-facing business status."""
        if raw_status == "building":
            return "building"
        if raw_status == "failed":
            return "failed"
        if raw_status == "ready" and has_artifacts:
            return "ready"
        if has_source_files:
            return "awaiting_build"
        return "awaiting_upload"
