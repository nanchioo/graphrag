# Copyright (c) 2024 Microsoft Corporation.
# Licensed under the MIT License

"""Shared dependencies for API routers."""

from api.paths import APP_SETTINGS_PATH, GRAPH_REGISTRY_PATH, PROJECT_ROOT
from api.schemas.config import SystemConfigPayload
from api.services.app_config_service import AppConfigService
from api.services.dify_retrieval_service import DifyRetrievalService
from api.services.graph_registry_service import GraphRegistryService
from api.services.graph_status_service import GraphStatusService
from api.services.graph_view_service import GraphViewService
from api.services.graphrag_wrapper_service import GraphRagWrapperService
from api.services.model_profile_validation_service import ModelProfileValidationService
from api.services.project_workspace_service import ProjectWorkspaceService
from api.services.query_service import QueryService
from api.services.source_ingest_service import SourceIngestService


def get_default_system_config() -> SystemConfigPayload:
    """Return the default system configuration used by the API skeleton."""
    return SystemConfigPayload()


def get_app_config_service() -> AppConfigService:
    """Return the file-backed app configuration service."""
    return AppConfigService(APP_SETTINGS_PATH)


def get_graph_registry_service() -> GraphRegistryService:
    """Return the file-backed graph registry service."""
    return GraphRegistryService(GRAPH_REGISTRY_PATH, project_root=PROJECT_ROOT)


def get_project_workspace_service() -> ProjectWorkspaceService:
    """Return the GraphRAG project workspace initializer service."""
    return ProjectWorkspaceService()


def get_source_ingest_service() -> SourceIngestService:
    """Return the source ingestion service."""
    return SourceIngestService()


def get_graphrag_wrapper_service() -> GraphRagWrapperService:
    """Return the GraphRAG wrapper service."""
    return GraphRagWrapperService()


def get_model_profile_validation_service() -> ModelProfileValidationService:
    """Return the shared model profile validation service."""
    return ModelProfileValidationService()


def get_graph_status_service() -> GraphStatusService:
    """Return the graph status normalization service."""
    return GraphStatusService()


def get_graph_view_service() -> GraphViewService:
    """Return the graph preview and report service."""
    return GraphViewService()


def get_query_service() -> QueryService:
    """Return the graph-backed query service."""
    return QueryService()


def get_dify_retrieval_service() -> DifyRetrievalService:
    """Return the Dify external knowledge adapter service."""
    return DifyRetrievalService()
