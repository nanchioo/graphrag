# Copyright (c) 2024 Microsoft Corporation.
# Licensed under the MIT License

"""Graph preview and report services built on top of GraphRAG outputs."""

from __future__ import annotations

from collections import defaultdict
from pathlib import Path
from typing import TYPE_CHECKING, Any

import pandas as pd
from fastapi import HTTPException, status
from graphrag.config.load_config import load_config

from api.schemas.graph import (
    DeleteTextUnitPayload,
    GraphPreviewEdge,
    GraphPreviewNode,
    GraphPreviewPayload,
    GraphPreviewSummary,
    GraphReportItem,
    GraphReportsPayload,
    GraphTextUnitItem,
    GraphTextUnitListPayload,
)
from api.services.graphrag_wrapper_service import GraphRagWrapperService

if TYPE_CHECKING:
    from api.services.graph_registry_service import GraphRegistryService


class GraphViewService:
    """Read GraphRAG output tables and shape them for simple frontend visualization."""

    def __init__(
        self,
        graphrag_wrapper_service: GraphRagWrapperService | None = None,
    ) -> None:
        self._graphrag_wrapper_service = (
            graphrag_wrapper_service or GraphRagWrapperService()
        )

    async def get_graph_preview(
        self,
        graph_id: str,
        graph_registry_service: GraphRegistryService,
    ) -> GraphPreviewPayload:
        """Return a lightweight node-edge preview for a graph project."""
        graph = graph_registry_service.get_graph(graph_id)
        root_dir = Path(graph.root_dir)

        async def operation() -> GraphPreviewPayload:
            config = load_config(root_dir=root_dir)
            self._ensure_output_exists(graph_id, Path(config.output_storage.base_dir))
            tables = await self._graphrag_wrapper_service.load_output_tables(
                config=config,
                required_tables=["entities", "relationships"],
                optional_tables=["communities", "community_reports"],
            )
            return self._build_preview_payload(tables)

        try:
            return await self._graphrag_wrapper_service.run_in_project_context(
                root_dir=root_dir,
                operation=operation,
            )
        except ValueError as exc:
            self._raise_output_error(graph_id, exc)

    async def get_graph_text_units(
        self,
        graph_id: str,
        graph_registry_service: GraphRegistryService,
    ) -> GraphTextUnitListPayload:
        """Return text unit rows for a graph project build output."""
        graph = graph_registry_service.get_graph(graph_id)
        root_dir = Path(graph.root_dir)

        async def operation() -> GraphTextUnitListPayload:
            config = load_config(root_dir=root_dir)
            text_units_path = Path(config.output_storage.base_dir) / "text_units.parquet"
            if not text_units_path.exists():
                return GraphTextUnitListPayload(items=[], total=0)

            text_units = self._read_parquet(text_units_path)
            return self._build_text_units_payload(text_units)

        try:
            return await self._graphrag_wrapper_service.run_in_project_context(
                root_dir=root_dir,
                operation=operation,
            )
        except ValueError as exc:
            self._raise_text_unit_output_error(graph_id, exc)

    async def delete_graph_text_unit(
        self,
        graph_id: str,
        text_unit_id: str,
        graph_registry_service: GraphRegistryService,
    ) -> DeleteTextUnitPayload:
        """Delete a single text unit row and mark the graph as requiring rebuild."""
        graph = graph_registry_service.get_graph(graph_id)
        root_dir = Path(graph.root_dir)

        async def operation() -> DeleteTextUnitPayload:
            config = load_config(root_dir=root_dir)
            text_units_path = Path(config.output_storage.base_dir) / "text_units.parquet"
            if not text_units_path.exists():
                self._raise_missing_text_units(graph_id)

            text_units = self._read_parquet(text_units_path)
            ids = text_units["id"].astype(str)
            if text_unit_id not in ids.values:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=(
                        f"Text unit '{text_unit_id}' was not found in graph project "
                        f"'{graph_id}'."
                    ),
                )

            remaining = text_units.loc[ids != text_unit_id].copy()
            remaining.to_parquet(text_units_path, index=False)
            updated = graph_registry_service.mark_artifacts_deleted(graph_id)
            return DeleteTextUnitPayload(
                graph_id=updated.id,
                text_unit_id=text_unit_id,
                status=updated.status,
                remaining_total=len(remaining),
            )

        try:
            return await self._graphrag_wrapper_service.run_in_project_context(
                root_dir=root_dir,
                operation=operation,
            )
        except ValueError as exc:
            self._raise_text_unit_output_error(graph_id, exc)

    async def get_graph_reports(
        self,
        graph_id: str,
        graph_registry_service: GraphRegistryService,
    ) -> GraphReportsPayload:
        """Return community report summaries for a graph project."""
        graph = graph_registry_service.get_graph(graph_id)
        root_dir = Path(graph.root_dir)

        async def operation() -> GraphReportsPayload:
            config = load_config(root_dir=root_dir)
            self._ensure_output_exists(graph_id, Path(config.output_storage.base_dir))
            tables = await self._graphrag_wrapper_service.load_output_tables(
                config=config,
                required_tables=[],
                optional_tables=["community_reports"],
            )
            return self._build_reports_payload(tables["community_reports"])

        try:
            return await self._graphrag_wrapper_service.run_in_project_context(
                root_dir=root_dir,
                operation=operation,
            )
        except ValueError as exc:
            self._raise_output_error(graph_id, exc)

    def _build_preview_payload(
        self,
        tables: dict[str, pd.DataFrame | None],
    ) -> GraphPreviewPayload:
        entities = self._require_preview_dataframe(tables, "entities")
        relationships = self._require_preview_dataframe(tables, "relationships")
        communities = tables.get("communities")
        reports = tables.get("community_reports")

        entity_community_ids = self._map_entity_communities(communities)
        preview_entities = entities.sort_values(
            by=["degree", "title"],
            ascending=[False, True],
        ).head(100)
        preview_relationships = relationships.sort_values(
            by=["combined_degree", "weight", "id"],
            ascending=[False, False, True],
        ).head(200)

        nodes = [
            GraphPreviewNode(
                id=str(row.title),
                entity_id=str(row.id),
                label=str(row.title),
                type=self._optional_str(row.type),
                rank=self._optional_int(row.degree),
                community_ids=entity_community_ids.get(str(row.id), []),
            )
            for row in preview_entities.itertuples(index=False)
        ]
        edges = [
            GraphPreviewEdge(
                id=str(row.id),
                source=str(row.source),
                target=str(row.target),
                label=self._optional_str(row.description),
                weight=self._optional_float(row.weight),
            )
            for row in preview_relationships.itertuples(index=False)
        ]

        return GraphPreviewPayload(
            nodes=nodes,
            edges=edges,
            summary=GraphPreviewSummary(
                total_nodes=len(entities),
                total_edges=len(relationships),
                total_communities=0 if communities is None else len(communities),
                total_reports=0 if reports is None else len(reports),
                preview_nodes=len(nodes),
                preview_edges=len(edges),
            ),
        )

    def _build_reports_payload(
        self,
        reports: pd.DataFrame | None,
    ) -> GraphReportsPayload:
        if reports is None or reports.empty:
            return GraphReportsPayload(items=[], total=0)

        sorted_reports = reports.sort_values(
            by=["rank", "title"],
            ascending=[False, True],
        )
        items = [
            GraphReportItem(
                id=str(row.id),
                title=str(row.title),
                community_id=str(row.community),
                summary=str(row.summary),
                rank=self._optional_float(row.rank),
            )
            for row in sorted_reports.itertuples(index=False)
        ]
        return GraphReportsPayload(items=items, total=len(items))

    def _build_text_units_payload(
        self,
        text_units: pd.DataFrame,
    ) -> GraphTextUnitListPayload:
        if text_units.empty:
            return GraphTextUnitListPayload(items=[], total=0)

        sort_columns = [
            column
            for column in ("human_readable_id", "document_id", "id")
            if column in text_units.columns
        ]
        sorted_units = (
            text_units.sort_values(by=sort_columns, ascending=True)
            if len(sort_columns) > 0
            else text_units
        )

        items = [
            GraphTextUnitItem(
                id=str(row.id),
                human_readable_id=self._optional_int(
                    getattr(row, "human_readable_id", None)
                ),
                text=str(row.text),
                n_tokens=self._optional_int(getattr(row, "n_tokens", None)),
                document_id=self._optional_str(getattr(row, "document_id", None)),
            )
            for row in sorted_units.itertuples(index=False)
        ]
        return GraphTextUnitListPayload(items=items, total=len(items))

    def _map_entity_communities(
        self,
        communities: pd.DataFrame | None,
    ) -> dict[str, list[str]]:
        if communities is None or communities.empty:
            return {}

        entity_community_ids: defaultdict[str, list[str]] = defaultdict(list)
        for row in communities.itertuples(index=False):
            community_id = str(row.community)
            entity_ids = self._normalize_sequence(row.entity_ids)
            for entity_id in entity_ids:
                entity_community_ids[str(entity_id)].append(community_id)

        return {
            entity_id: sorted(set(community_ids))
            for entity_id, community_ids in entity_community_ids.items()
        }

    def _ensure_output_exists(self, graph_id: str, output_dir: Path) -> None:
        if output_dir.exists():
            return
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Graph project '{graph_id}' has no built outputs yet. "
                "Run a build before requesting graph preview data."
            ),
        )

    def _raise_output_error(self, graph_id: str, exc: ValueError) -> None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Graph project '{graph_id}' is missing required preview outputs. "
                f"Build the graph first. Details: {exc}"
            ),
        ) from exc

    def _raise_text_unit_output_error(self, graph_id: str, exc: ValueError) -> None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Graph project '{graph_id}' is missing required text unit outputs. "
                f"Build the graph first. Details: {exc}"
            ),
        ) from exc

    def _raise_missing_text_units(self, graph_id: str) -> None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Graph project '{graph_id}' has no built text units yet. "
                "Run a build before deleting text units."
            ),
        )

    def _optional_float(self, value: Any) -> float | None:
        if value is None:
            return None
        return float(value)

    def _optional_int(self, value: Any) -> int | None:
        if value is None:
            return None
        return int(value)

    def _optional_str(self, value: Any) -> str | None:
        if value is None:
            return None
        return str(value)

    def _read_parquet(self, path: Path) -> pd.DataFrame:
        return pd.read_parquet(path)

    def _normalize_sequence(self, value: Any) -> list[Any]:
        if value is None:
            return []
        if hasattr(value, "tolist"):
            value = value.tolist()
        if isinstance(value, list):
            return value
        if isinstance(value, tuple):
            return list(value)
        return [value]

    def _require_preview_dataframe(
        self,
        tables: dict[str, pd.DataFrame | None],
        table_name: str,
    ) -> pd.DataFrame:
        dataframe = tables.get(table_name)
        if dataframe is not None:
            return dataframe

        message = f"Required preview table '{table_name}' was not found."
        raise ValueError(message)
