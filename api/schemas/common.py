# Copyright (c) 2024 Microsoft Corporation.
# Licensed under the MIT License

"""Shared API response schemas."""

from __future__ import annotations

from typing import Generic, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class ApiResponse(BaseModel, Generic[T]):
    """Standard response envelope for all API endpoints."""

    success: bool = True
    message: str
    data: T | None = None


class AppInfoPayload(BaseModel):
    """Metadata for the API root endpoint."""

    name: str
    version: str
    docs_url: str


class HealthPayload(BaseModel):
    """Health check payload."""

    status: str
    service: str
