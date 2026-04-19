# Copyright (c) 2024 Microsoft Corporation.
# Licensed under the MIT License

"""Query router."""

from fastapi import APIRouter, Depends

from api.deps import (
    get_app_config_service,
    get_graph_registry_service,
    get_query_service,
)
from api.schemas.common import ApiResponse
from api.schemas.query import QueryRequest, QueryResponsePayload
from api.services.app_config_service import AppConfigService
from api.services.graph_registry_service import GraphRegistryService
from api.services.query_service import QueryService

router = APIRouter(tags=["query"])


@router.post("/api/query", response_model=ApiResponse[QueryResponsePayload])
async def query_graph(
    request: QueryRequest,
    app_config_service: AppConfigService = Depends(get_app_config_service),
    graph_registry_service: GraphRegistryService = Depends(get_graph_registry_service),
    query_service: QueryService = Depends(get_query_service),
) -> ApiResponse[QueryResponsePayload]:
    """Execute a graph-backed query and return the normalized response."""
    payload = await query_service.query(
        request=request,
        app_config_service=app_config_service,
        graph_registry_service=graph_registry_service,
    )
    return ApiResponse(
        message="Query completed.",
        data=payload,
    )


@router.post("/api/chat", response_model=ApiResponse[QueryResponsePayload])
async def chat_graph(
    request: QueryRequest,
    app_config_service: AppConfigService = Depends(get_app_config_service),
    graph_registry_service: GraphRegistryService = Depends(get_graph_registry_service),
    query_service: QueryService = Depends(get_query_service),
) -> ApiResponse[QueryResponsePayload]:
    """Expose the query API under a chat alias for frontend convenience."""
    return await query_graph(
        request=request,
        app_config_service=app_config_service,
        graph_registry_service=graph_registry_service,
        query_service=query_service,
    )
