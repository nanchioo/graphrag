# Copyright (c) 2024 Microsoft Corporation.
# Licensed under the MIT License

"""Schemas for configuration endpoints."""

from typing import Literal

from pydantic import BaseModel, Field


class SystemConfigPayload(BaseModel):
    """Minimal system configuration placeholder."""

    projects_root: str = "data/projects"
    upload_root: str = "data/projects"
    default_model_profile_id: str | None = None


ModelProvider = Literal["openai", "azure", "ollama"]


class ModelProfileCreateRequest(BaseModel):
    """Request payload for creating a model profile."""

    provider: ModelProvider
    name: str
    base_url: str
    api_key: str | None = None
    model_name: str
    embedding_model_name: str | None = None
    api_version: str | None = None
    is_default: bool = False


class ModelProfileUpdateRequest(BaseModel):
    """Request payload for updating a model profile."""

    provider: ModelProvider | None = None
    name: str | None = None
    base_url: str | None = None
    api_key: str | None = None
    model_name: str | None = None
    embedding_model_name: str | None = None
    api_version: str | None = None
    is_default: bool | None = None
    clear_api_key: bool = False


class ModelProfileResponse(BaseModel):
    """Masked model profile returned to API clients."""

    id: str
    provider: ModelProvider
    name: str
    base_url: str
    model_name: str
    embedding_model_name: str | None = None
    api_version: str | None = None
    is_default: bool = False
    has_api_key: bool = False
    api_key_masked: str | None = None


class ModelProfileListPayload(BaseModel):
    """List payload for model profiles."""

    items: list[ModelProfileResponse] = Field(default_factory=list)
    total: int = 0


class DeleteModelProfilePayload(BaseModel):
    """Delete payload for model profiles."""

    deleted_id: str


class ModelProfileConnectionPayload(BaseModel):
    """Connection test payload for a saved model profile."""

    profile_id: str
    connected: bool = True
