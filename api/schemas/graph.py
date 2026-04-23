# Copyright (c) 2024 Microsoft Corporation.
# Licensed under the MIT License

"""Schemas for graph management endpoints."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator


class GraphChunkingCreateRequest(BaseModel):
    """Chunking configuration accepted during graph creation."""

    type: Literal["tokens"] = "tokens"
    size: int = 1200
    overlap: int = 100
    encoding_model: str = "o200k_base"

    @field_validator("size")
    @classmethod
    def validate_size(cls, value: int) -> int:
        if value <= 0:
            raise ValueError("Chunk size must be greater than 0.")
        return value

    @field_validator("overlap")
    @classmethod
    def validate_overlap(cls, value: int) -> int:
        if value < 0:
            raise ValueError("Chunk overlap must be greater than or equal to 0.")
        return value

    @field_validator("encoding_model")
    @classmethod
    def validate_encoding_model(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("Encoding model is required.")
        return normalized

    @model_validator(mode="after")
    def validate_overlap_smaller_than_size(self) -> "GraphChunkingCreateRequest":
        if self.overlap >= self.size:
            raise ValueError("Chunk overlap must be smaller than chunk size.")
        return self


class GraphCreateRequest(BaseModel):
    """Request payload for creating a graph project."""

    name: str
    description: str | None = None
    model_profile_id: str | None = None
    projects_root: str | None = None
    chunking: GraphChunkingCreateRequest | None = None
    embed_batch_size: int | None = None

    @field_validator("projects_root")
    @classmethod
    def validate_projects_root(cls, value: str | None) -> str | None:
        if value is None:
            return None

        normalized = value.strip()
        return normalized or None

    @field_validator("embed_batch_size")
    @classmethod
    def validate_embed_batch_size(cls, value: int | None) -> int | None:
        if value is None:
            return None
        if value <= 0:
            raise ValueError("Embed batch size must be greater than 0.")
        return value


class GraphSummary(BaseModel):
    """Summary of a graph project."""

    id: str
    name: str
    status: str
    model_profile_id: str | None = None


class GraphDetailPayload(BaseModel):
    """Detailed graph project payload."""

    id: str
    name: str
    description: str | None = None
    root_dir: str
    status: str
    model_profile_id: str | None = None
    created_at: str
    last_build_at: str | None = None


class GraphListPayload(BaseModel):
    """Graph list payload."""

    items: list[GraphSummary] = Field(default_factory=list)
    total: int = 0


GraphFileBuildStatus = Literal[
    "pending", "building", "succeeded", "failed", "skipped"
]


class SourceFileItem(BaseModel):
    """Metadata for a source file uploaded to a graph project."""

    name: str
    relative_path: str
    extension: str
    size_bytes: int
    created_at: str
    build_status: GraphFileBuildStatus | None = None
    is_current: bool = False
    attempt_count: int = 0
    last_build_error: str | None = None
    last_built_at: str | None = None
    document_count: int = 0
    text_unit_count: int = 0


class SourceFileListPayload(BaseModel):
    """Source file list payload."""

    items: list[SourceFileItem] = Field(default_factory=list)
    total: int = 0


GraphBuildMethod = Literal["standard", "fast"]
GraphBuildAction = Literal["start", "resume"]


class GraphBuildRequest(BaseModel):
    """Request payload for graph build execution."""

    action: GraphBuildAction = "start"
    method: GraphBuildMethod = "standard"
    force_rebuild: bool = False

    @model_validator(mode="after")
    def validate_action_force_rebuild_combo(self) -> "GraphBuildRequest":
        if self.action == "resume" and self.force_rebuild:
            raise ValueError("Resume build cannot be combined with force rebuild.")
        return self


class GraphBuildPayload(BaseModel):
    """Build trigger response payload."""

    graph_id: str
    status: str
    last_build_at: str | None = None
    last_error: str | None = None
    resumable: bool = False


class GraphStatusPayload(BaseModel):
    """Graph build status payload."""

    graph_id: str
    status: str
    last_build_at: str | None = None
    last_error: str | None = None
    has_source_files: bool = False
    source_file_count: int = 0
    document_count: int = 0
    text_unit_count: int = 0
    has_artifacts: bool = False
    artifact_paths: list[str] = Field(default_factory=list)
    progress_percent: int = 0
    progress_stage: str = "awaiting_upload"
    progress_message: str = "Waiting for source files."
    resumable: bool = False
    current_file: str | None = None
    completed_file_count: int = 0
    failed_file_count: int = 0
    pending_file_count: int = 0


class DeleteArtifactsPayload(BaseModel):
    """Artifact deletion response payload."""

    graph_id: str
    status: str
    deleted_paths: list[str] = Field(default_factory=list)


class DeleteGraphPayload(BaseModel):
    """Graph project deletion response payload."""

    graph_id: str
    status: str
    deleted_root_dir: str
    cancelled_build: bool = False


class GraphViewBaseModel(BaseModel):
    """Base model that compares cleanly against plain dictionaries in tests."""

    def __eq__(self, other: object) -> bool:
        """Compare model instances with dictionaries using dumped payloads."""
        if isinstance(other, dict):
            return self.model_dump() == other
        return super().__eq__(other)


class GraphTextUnitItem(GraphViewBaseModel):
    """Single text unit row for frontend inspection."""

    id: str
    human_readable_id: int | None = None
    text: str
    n_tokens: int | None = None
    document_id: str | None = None


class GraphTextUnitListPayload(GraphViewBaseModel):
    """Text unit list payload for a graph project."""

    items: list[GraphTextUnitItem] = Field(default_factory=list)
    total: int = 0


class DeleteTextUnitPayload(GraphViewBaseModel):
    """Text unit deletion response payload."""

    graph_id: str
    text_unit_id: str
    status: str
    remaining_total: int


class GraphPreviewNode(GraphViewBaseModel):
    """Frontend-friendly node preview for graph visualization."""

    id: str
    entity_id: str
    label: str
    type: str | None = None
    rank: int | None = None
    community_ids: list[str] = Field(default_factory=list)


class GraphPreviewEdge(GraphViewBaseModel):
    """Frontend-friendly edge preview for graph visualization."""

    id: str
    source: str
    target: str
    label: str | None = None
    weight: float | None = None


class GraphPreviewSummary(GraphViewBaseModel):
    """Preview summary returned with graph nodes and edges."""

    total_nodes: int = 0
    total_edges: int = 0
    total_communities: int = 0
    total_reports: int = 0
    preview_nodes: int = 0
    preview_edges: int = 0


class GraphPreviewPayload(GraphViewBaseModel):
    """Graph preview payload for simple frontend visualization."""

    nodes: list[GraphPreviewNode] = Field(default_factory=list)
    edges: list[GraphPreviewEdge] = Field(default_factory=list)
    summary: GraphPreviewSummary = Field(default_factory=GraphPreviewSummary)


class GraphReportItem(GraphViewBaseModel):
    """Community report summary item."""

    id: str
    title: str
    community_id: str
    summary: str
    rank: float | None = None


class GraphReportsPayload(GraphViewBaseModel):
    """Community report summaries for a graph project."""

    items: list[GraphReportItem] = Field(default_factory=list)
    total: int = 0
