# Copyright (c) 2024 Microsoft Corporation.
# Licensed under the MIT License

"""Schemas for Dify external knowledge retrieval compatibility."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field, field_validator


class DifyRetrievalSetting(BaseModel):
    """Retrieval controls sent by Dify external knowledge requests."""

    top_k: int = 4
    score_threshold: float = 0.0

    @field_validator("top_k")
    @classmethod
    def validate_top_k(cls, value: int) -> int:
        if value <= 0:
            raise ValueError("top_k must be greater than 0.")
        return value

    @field_validator("score_threshold")
    @classmethod
    def validate_score_threshold(cls, value: float) -> float:
        if value < 0:
            raise ValueError("score_threshold must be greater than or equal to 0.")
        return value


class DifyRetrievalRequest(BaseModel):
    """Request payload expected by Dify's external knowledge API."""

    retrieval_setting: DifyRetrievalSetting = Field(default_factory=DifyRetrievalSetting)
    query: str | None = None
    knowledge_id: str | None = None
    metadata_condition: dict[str, Any] | None = None


class DifyRetrievalRecord(BaseModel):
    """Single record returned to Dify for answer generation."""

    content: str
    score: float
    title: str
    metadata: dict[str, Any] = Field(default_factory=dict)


class DifyRetrievalResponse(BaseModel):
    """Top-level Dify retrieval response."""

    records: list[DifyRetrievalRecord] = Field(default_factory=list)
