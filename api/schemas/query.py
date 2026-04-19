# Copyright (c) 2024 Microsoft Corporation.
# Licensed under the MIT License

"""Schemas for query endpoints."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field

QueryMode = Literal["local", "global", "basic", "drift"]


class QueryRequest(BaseModel):
    """Request payload for graph-backed question answering."""

    graph_id: str
    question: str
    mode: QueryMode
    community_level: int | None = 2
    response_type: str = "Multiple Paragraphs"
    dynamic_community_selection: bool = False


class QueryResponsePayload(BaseModel):
    """Normalized query response payload returned to API clients."""

    graph_id: str
    mode: QueryMode
    answer: str | dict[str, Any] | list[dict[str, Any]]
    context: dict[str, Any] = Field(default_factory=dict)
