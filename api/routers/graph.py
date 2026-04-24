# Copyright (c) 2024 Microsoft Corporation.
# Licensed under the MIT License

"""Graph management router."""

import shutil
from pathlib import Path

from fastapi import APIRouter, Depends, File, UploadFile, status
from graphrag.config.defaults import DEFAULT_COMPLETION_MODEL, DEFAULT_EMBEDDING_MODEL

from api.deps import (
    get_app_config_service,
    get_graph_registry_service,
    get_graph_status_service,
    get_graph_view_service,
    get_graphrag_wrapper_service,
    get_project_workspace_service,
    get_source_ingest_service,
)
from api.schemas.common import ApiResponse
from api.schemas.graph import (
    DeleteArtifactsPayload,
    DeleteGraphPayload,
    DeleteSourceFilePayload,
    DeleteTextUnitPayload,
    GraphBuildPayload,
    GraphBuildRequest,
    GraphCreateRequest,
    GraphDetailPayload,
    GraphListPayload,
    GraphPreviewPayload,
    GraphReportsPayload,
    GraphStatusPayload,
    GraphTextUnitListPayload,
    SourceFileListPayload,
)
from api.services.app_config_service import AppConfigService
from api.services.graph_registry_service import GraphRegistryService
from api.services.graph_status_service import GraphStatusService
from api.services.graph_view_service import GraphViewService
from api.services.graphrag_wrapper_service import GraphRagWrapperService
from api.services.project_workspace_service import ProjectWorkspaceService
from api.services.source_ingest_service import SourceIngestService

router = APIRouter(prefix="/api/graph", tags=["graph"])


@router.get("", response_model=ApiResponse[GraphListPayload])
async def list_graphs(
    graph_registry_service: GraphRegistryService = Depends(get_graph_registry_service),
    graph_status_service: GraphStatusService = Depends(get_graph_status_service),
) -> ApiResponse[GraphListPayload]:
    """Return registered graph projects."""
    graph_projects = graph_registry_service.list_graph_projects()
    items = [await graph_status_service.build_summary(graph) for graph in graph_projects]
    return ApiResponse(
        message="Graph projects loaded.",
        data=GraphListPayload(
            items=items,
            total=len(items),
        ),
    )


@router.post(
    "",
    response_model=ApiResponse[GraphDetailPayload],
    status_code=status.HTTP_201_CREATED,
)
async def create_graph(
    payload: GraphCreateRequest,
    app_config_service: AppConfigService = Depends(get_app_config_service),
    graph_registry_service: GraphRegistryService = Depends(get_graph_registry_service),
    project_workspace_service: ProjectWorkspaceService = Depends(
        get_project_workspace_service
    ),
) -> ApiResponse[GraphDetailPayload]:
    """Create a GraphRAG project workspace and register it."""
    system_config = app_config_service.get_system_config()
    effective_projects_root = payload.projects_root or system_config.projects_root
    projects_root = graph_registry_service.resolve_root_dir(effective_projects_root)
    model_profile_id = payload.model_profile_id or system_config.default_model_profile_id

    completion_model = DEFAULT_COMPLETION_MODEL
    embedding_model = DEFAULT_EMBEDDING_MODEL
    if model_profile_id:
        profile = app_config_service.get_model_profile(model_profile_id)
        completion_model = profile.model_name
        embedding_model = profile.embedding_model_name or DEFAULT_EMBEDDING_MODEL

    graph_id = graph_registry_service.generate_graph_id(payload.name)
    root_dir = projects_root / graph_id

    project_workspace_service.initialize_workspace(
        root_dir=root_dir,
        model=completion_model,
        embedding_model=embedding_model,
        chunking=payload.chunking,
        embed_batch_size=payload.embed_batch_size,
    )

    graph = graph_registry_service.create_graph(
        graph_id=graph_id,
        name=payload.name,
        description=payload.description,
        root_dir=str(root_dir),
        model_profile_id=model_profile_id,
    )

    return ApiResponse(
        message="Graph project created.",
        data=GraphDetailPayload.model_validate(graph.model_dump()),
    )


@router.get("/{graph_id}", response_model=ApiResponse[GraphDetailPayload])
async def get_graph(
    graph_id: str,
    graph_registry_service: GraphRegistryService = Depends(get_graph_registry_service),
) -> ApiResponse[GraphDetailPayload]:
    """Return graph project details."""
    graph = graph_registry_service.get_graph(graph_id)
    return ApiResponse(
        message="Graph project loaded.",
        data=GraphDetailPayload.model_validate(graph.model_dump()),
    )


@router.delete("/{graph_id}", response_model=ApiResponse[DeleteGraphPayload])
async def delete_graph(
    graph_id: str,
    graph_registry_service: GraphRegistryService = Depends(get_graph_registry_service),
    graphrag_wrapper_service: GraphRagWrapperService = Depends(
        get_graphrag_wrapper_service
    ),
) -> ApiResponse[DeleteGraphPayload]:
    """Delete a graph project workspace and remove it from the registry."""
    graph = graph_registry_service.get_graph(graph_id)
    root_dir = Path(graph.root_dir)
    cancelled_build = await graphrag_wrapper_service.cancel_active_build(graph_id)

    if root_dir.exists():
        graphrag_wrapper_service.close_project_log_handlers(root_dir)
        shutil.rmtree(root_dir)

    deleted = graph_registry_service.delete_graph(graph_id)
    return ApiResponse(
        message="Graph project deleted.",
        data=DeleteGraphPayload(
            graph_id=deleted.id,
            status="deleted",
            deleted_root_dir=str(root_dir),
            cancelled_build=cancelled_build,
        ),
    )


@router.get("/{graph_id}/graph", response_model=ApiResponse[GraphPreviewPayload])
async def get_graph_preview(
    graph_id: str,
    graph_registry_service: GraphRegistryService = Depends(get_graph_registry_service),
    graph_view_service: GraphViewService = Depends(get_graph_view_service),
) -> ApiResponse[GraphPreviewPayload]:
    """Return a simplified node-edge preview for the graph project."""
    payload = await graph_view_service.get_graph_preview(
        graph_id=graph_id,
        graph_registry_service=graph_registry_service,
    )
    return ApiResponse(
        message="Graph preview loaded.",
        data=payload,
    )


@router.get("/{graph_id}/reports", response_model=ApiResponse[GraphReportsPayload])
async def get_graph_reports(
    graph_id: str,
    graph_registry_service: GraphRegistryService = Depends(get_graph_registry_service),
    graph_view_service: GraphViewService = Depends(get_graph_view_service),
) -> ApiResponse[GraphReportsPayload]:
    """Return community report summaries for the graph project."""
    payload = await graph_view_service.get_graph_reports(
        graph_id=graph_id,
        graph_registry_service=graph_registry_service,
    )
    return ApiResponse(
        message="Graph reports loaded.",
        data=payload,
    )


@router.get(
    "/{graph_id}/text-units",
    response_model=ApiResponse[GraphTextUnitListPayload],
)
async def get_graph_text_units(
    graph_id: str,
    graph_registry_service: GraphRegistryService = Depends(get_graph_registry_service),
    graph_view_service: GraphViewService = Depends(get_graph_view_service),
) -> ApiResponse[GraphTextUnitListPayload]:
    """Return built text unit rows for the graph project."""
    payload = await graph_view_service.get_graph_text_units(
        graph_id=graph_id,
        graph_registry_service=graph_registry_service,
    )
    return ApiResponse(
        message="Graph text units loaded.",
        data=payload,
    )


@router.delete(
    "/{graph_id}/text-units/{text_unit_id}",
    response_model=ApiResponse[DeleteTextUnitPayload],
)
async def delete_graph_text_unit(
    graph_id: str,
    text_unit_id: str,
    graph_registry_service: GraphRegistryService = Depends(get_graph_registry_service),
    graph_view_service: GraphViewService = Depends(get_graph_view_service),
) -> ApiResponse[DeleteTextUnitPayload]:
    """Delete a built text unit row and mark the graph as requiring rebuild."""
    payload = await graph_view_service.delete_graph_text_unit(
        graph_id=graph_id,
        text_unit_id=text_unit_id,
        graph_registry_service=graph_registry_service,
    )
    return ApiResponse(
        message="Graph text unit deleted. Rebuild required.",
        data=payload,
    )


@router.post(
    "/{graph_id}/files",
    response_model=ApiResponse[SourceFileListPayload],
    status_code=status.HTTP_201_CREATED,
)
async def upload_graph_files(
    graph_id: str,
    files: list[UploadFile] = File(...),
    graph_registry_service: GraphRegistryService = Depends(get_graph_registry_service),
    source_ingest_service: SourceIngestService = Depends(get_source_ingest_service),
) -> ApiResponse[SourceFileListPayload]:
    """Upload source files into the graph project's input directory."""
    graph = graph_registry_service.get_graph(graph_id)
    items = await source_ingest_service.upload_files(Path(graph.root_dir) / "input", files)
    return ApiResponse(
        message="Source files uploaded.",
        data=SourceFileListPayload(items=items, total=len(items)),
    )


@router.get("/{graph_id}/files", response_model=ApiResponse[SourceFileListPayload])
async def list_graph_files(
    graph_id: str,
    graph_registry_service: GraphRegistryService = Depends(get_graph_registry_service),
    graphrag_wrapper_service: GraphRagWrapperService = Depends(
        get_graphrag_wrapper_service
    ),
) -> ApiResponse[SourceFileListPayload]:
    """List source files in the graph project's input directory."""
    items = await graphrag_wrapper_service.list_source_files(
        graph_id=graph_id,
        graph_registry_service=graph_registry_service,
    )
    return ApiResponse(
        message="Source files loaded.",
        data=SourceFileListPayload(items=items, total=len(items)),
    )


@router.delete(
    "/{graph_id}/files/{relative_path:path}",
    response_model=ApiResponse[DeleteSourceFilePayload],
)
async def delete_graph_source_file(
    graph_id: str,
    relative_path: str,
    graph_registry_service: GraphRegistryService = Depends(get_graph_registry_service),
    source_ingest_service: SourceIngestService = Depends(get_source_ingest_service),
) -> ApiResponse[DeleteSourceFilePayload]:
    """Delete a source file from the graph project's input directory."""
    graph = graph_registry_service.get_graph(graph_id)
    deleted_file = await source_ingest_service.delete_file(
        Path(graph.root_dir) / "input",
        relative_path,
    )
    return ApiResponse(
        message="Source file deleted.",
        data=DeleteSourceFilePayload(
            graph_id=graph.id,
            relative_path=deleted_file.relative_path,
            status="deleted",
        ),
    )


@router.post(
    "/{graph_id}/build",
    response_model=ApiResponse[GraphBuildPayload],
    status_code=status.HTTP_202_ACCEPTED,
)
async def start_graph_build(
    graph_id: str,
    payload: GraphBuildRequest,
    app_config_service: AppConfigService = Depends(get_app_config_service),
    graph_registry_service: GraphRegistryService = Depends(get_graph_registry_service),
    graphrag_wrapper_service: GraphRagWrapperService = Depends(
        get_graphrag_wrapper_service
    ),
) -> ApiResponse[GraphBuildPayload]:
    """Trigger an asynchronous GraphRAG build for a graph project."""
    build_payload = graphrag_wrapper_service.start_build(
        graph_id=graph_id,
        action=payload.action,
        method=payload.method,
        force_rebuild=payload.force_rebuild,
        app_config_service=app_config_service,
        graph_registry_service=graph_registry_service,
    )
    return ApiResponse(
        message="Graph build started.",
        data=build_payload,
    )


@router.get("/{graph_id}/status", response_model=ApiResponse[GraphStatusPayload])
async def get_graph_status(
    graph_id: str,
    graph_registry_service: GraphRegistryService = Depends(get_graph_registry_service),
    graph_status_service: GraphStatusService = Depends(get_graph_status_service),
    graphrag_wrapper_service: GraphRagWrapperService = Depends(
        get_graphrag_wrapper_service
    ),
) -> ApiResponse[GraphStatusPayload]:
    """Return build status and artifact summary for a graph project."""
    payload = await graphrag_wrapper_service.get_status(
        graph_id=graph_id,
        graph_registry_service=graph_registry_service,
    )
    payload = graph_status_service.build_status_payload(payload)
    return ApiResponse(
        message="Graph build status loaded.",
        data=payload,
    )


@router.delete(
    "/{graph_id}/artifacts",
    response_model=ApiResponse[DeleteArtifactsPayload],
)
async def delete_graph_artifacts(
    graph_id: str,
    graph_registry_service: GraphRegistryService = Depends(get_graph_registry_service),
    graphrag_wrapper_service: GraphRagWrapperService = Depends(
        get_graphrag_wrapper_service
    ),
) -> ApiResponse[DeleteArtifactsPayload]:
    """Delete generated GraphRAG artifacts while preserving uploaded sources."""
    payload = await graphrag_wrapper_service.delete_artifacts(
        graph_id=graph_id,
        graph_registry_service=graph_registry_service,
    )
    return ApiResponse(
        message="Graph artifacts deleted.",
        data=payload,
    )
