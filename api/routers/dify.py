# Copyright (c) 2024 Microsoft Corporation.
# Licensed under the MIT License

"""Dify external knowledge compatibility router."""

from __future__ import annotations

import hmac
import os

from fastapi import APIRouter, Body, Depends, Header, HTTPException, status

from api.deps import (
    get_app_config_service,
    get_dify_retrieval_service,
    get_graph_registry_service,
)
from api.schemas.dify import DifyRetrievalRequest, DifyRetrievalResponse
from api.services.app_config_service import AppConfigService
from api.services.dify_retrieval_service import DifyRetrievalService
from api.services.graph_registry_service import GraphRegistryService

DEFAULT_DIFY_EXTERNAL_KNOWLEDGE_API_KEY = "dify-graphrag-local"

router = APIRouter(prefix="/api/dify", tags=["dify"])


def _configured_api_key() -> str:
    return os.getenv(
        "DIFY_EXTERNAL_KNOWLEDGE_API_KEY",
        DEFAULT_DIFY_EXTERNAL_KNOWLEDGE_API_KEY,
    )


def _extract_bearer_token(authorization: str | None) -> str:
    if not authorization:
        return ""

    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        return ""
    return token.strip()


def _validate_dify_api_key(authorization: str | None) -> None:
    token = _extract_bearer_token(authorization)
    expected = _configured_api_key()
    if not token or not hmac.compare_digest(token, expected):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid Dify external knowledge API key.",
        )


@router.post("/retrieval", response_model=DifyRetrievalResponse)
async def retrieve_for_dify(
    request: DifyRetrievalRequest | None = Body(default=None),
    authorization: str | None = Header(default=None),
    app_config_service: AppConfigService = Depends(get_app_config_service),
    graph_registry_service: GraphRegistryService = Depends(get_graph_registry_service),
    dify_retrieval_service: DifyRetrievalService = Depends(
        get_dify_retrieval_service
    ),
) -> DifyRetrievalResponse:
    """Return GraphRAG context records in Dify external knowledge format."""
    _validate_dify_api_key(authorization)
    if request is None:
        return DifyRetrievalResponse(records=[])

    return await dify_retrieval_service.retrieve(
        request=request,
        app_config_service=app_config_service,
        graph_registry_service=graph_registry_service,
    )
