# Copyright (c) 2024 Microsoft Corporation.
# Licensed under the MIT License

"""Graph-backed query service built as a thin wrapper over GraphRAG search APIs."""

from __future__ import annotations

from pathlib import Path
from typing import TYPE_CHECKING, Any

from fastapi import HTTPException, status
from graphrag.api.query import (
    basic_search,
    drift_search,
    global_search,
    local_search,
)
from graphrag.config.load_config import load_config
from graphrag.utils.api import reformat_context_data

from api.schemas.query import QueryRequest, QueryResponsePayload
from api.services.graphrag_wrapper_service import GraphRagWrapperService

if TYPE_CHECKING:
    import pandas as pd

    from api.services.app_config_service import AppConfigService
    from api.services.graph_registry_service import GraphRegistryService


class QueryService:
    """Execute GraphRAG queries with minimal project-aware orchestration."""

    def __init__(
        self,
        graphrag_wrapper_service: GraphRagWrapperService | None = None,
    ) -> None:
        self._graphrag_wrapper_service = (
            graphrag_wrapper_service or GraphRagWrapperService()
        )

    async def query(
        self,
        request: QueryRequest,
        app_config_service: AppConfigService,
        graph_registry_service: GraphRegistryService,
    ) -> QueryResponsePayload:
        """Run the requested search mode and normalize the query response."""
        graph = graph_registry_service.get_graph(request.graph_id)
        root_dir = Path(graph.root_dir)
        env_overrides: dict[str, str | None] | None = None

        if graph.model_profile_id:
            profile = app_config_service.get_model_profile(graph.model_profile_id)
            self._graphrag_wrapper_service.sync_model_profile(root_dir, profile)
            env_overrides = self._graphrag_wrapper_service.build_model_env_overrides(
                profile
            )

        async def operation() -> QueryResponsePayload:
            config = load_config(root_dir=root_dir)
            self._ensure_output_exists(
                request.graph_id, Path(config.output_storage.base_dir)
            )
            answer, context_data = await self._run_query(
                request=request,
                config=config,
            )
            context = (
                reformat_context_data(context_data)
                if isinstance(context_data, dict)
                else self._empty_context()
            )
            return QueryResponsePayload(
                graph_id=request.graph_id,
                mode=request.mode,
                answer=answer,
                context=context,
            )

        try:
            return await self._graphrag_wrapper_service.run_in_project_context(
                root_dir=root_dir,
                operation=operation,
                env_overrides=env_overrides,
            )
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Graph project '{request.graph_id}' is missing required query outputs. "
                    f"Build the graph first. Details: {exc}"
                ),
            ) from exc

    async def _run_query(
        self,
        request: QueryRequest,
        config: Any,
    ) -> tuple[str | dict[str, Any] | list[dict[str, Any]], Any]:
        if request.mode == "local":
            tables = await self._graphrag_wrapper_service.load_output_tables(
                config=config,
                required_tables=[
                    "entities",
                    "communities",
                    "community_reports",
                    "text_units",
                    "relationships",
                ],
                optional_tables=["covariates"],
            )
            return await local_search(
                config=config,
                entities=self._require_table(tables, "entities"),
                communities=self._require_table(tables, "communities"),
                community_reports=self._require_table(tables, "community_reports"),
                text_units=self._require_table(tables, "text_units"),
                relationships=self._require_table(tables, "relationships"),
                covariates=tables["covariates"],
                community_level=request.community_level or 2,
                response_type=request.response_type,
                query=request.question,
            )

        if request.mode == "global":
            tables = await self._graphrag_wrapper_service.load_output_tables(
                config=config,
                required_tables=["entities", "communities", "community_reports"],
            )
            return await global_search(
                config=config,
                entities=self._require_table(tables, "entities"),
                communities=self._require_table(tables, "communities"),
                community_reports=self._require_table(tables, "community_reports"),
                community_level=request.community_level,
                dynamic_community_selection=request.dynamic_community_selection,
                response_type=request.response_type,
                query=request.question,
            )

        if request.mode == "drift":
            tables = await self._graphrag_wrapper_service.load_output_tables(
                config=config,
                required_tables=[
                    "entities",
                    "communities",
                    "community_reports",
                    "text_units",
                    "relationships",
                ],
            )
            return await drift_search(
                config=config,
                entities=self._require_table(tables, "entities"),
                communities=self._require_table(tables, "communities"),
                community_reports=self._require_table(tables, "community_reports"),
                text_units=self._require_table(tables, "text_units"),
                relationships=self._require_table(tables, "relationships"),
                community_level=request.community_level or 2,
                response_type=request.response_type,
                query=request.question,
            )

        tables = await self._graphrag_wrapper_service.load_output_tables(
            config=config,
            required_tables=["text_units"],
        )
        return await basic_search(
            config=config,
            text_units=self._require_table(tables, "text_units"),
            response_type=request.response_type,
            query=request.question,
        )

    def _require_table(
        self,
        tables: dict[str, pd.DataFrame | None],
        table_name: str,
    ) -> pd.DataFrame:
        dataframe = tables.get(table_name)
        if dataframe is not None:
            return dataframe

        message = f"Required output table '{table_name}' was not found."
        raise ValueError(message)

    def _ensure_output_exists(self, graph_id: str, output_dir: Path) -> None:
        if output_dir.exists():
            return
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Graph project '{graph_id}' has no built outputs yet. "
                "Run a build before querying it."
            ),
        )

    def _empty_context(self) -> dict[str, list[Any]]:
        return {
            "reports": [],
            "entities": [],
            "relationships": [],
            "claims": [],
            "sources": [],
        }
