# Copyright (c) 2024 Microsoft Corporation.
# Licensed under the MIT License

"""Adapter service for Dify external knowledge retrieval requests."""

from __future__ import annotations

import math
import re
from pathlib import Path
from typing import TYPE_CHECKING, Any

from fastapi import HTTPException, status

from api.schemas.dify import (
    DifyRetrievalRecord,
    DifyRetrievalRequest,
    DifyRetrievalResponse,
)
from api.schemas.query import QueryRequest
from api.services.query_service import QueryService

if TYPE_CHECKING:
    from api.services.app_config_service import AppConfigService
    from api.services.graph_registry_service import GraphRegistryService


class DifyRetrievalService:
    """Translate Dify external knowledge calls into GraphRAG context retrieval."""

    def __init__(self, query_service: QueryService | None = None) -> None:
        self._query_service = query_service or QueryService()

    async def retrieve(
        self,
        request: DifyRetrievalRequest,
        app_config_service: AppConfigService,
        graph_registry_service: GraphRegistryService,
    ) -> DifyRetrievalResponse:
        """Retrieve GraphRAG context records for Dify external knowledge."""
        graph_id = (request.knowledge_id or "").strip()
        query = (request.query or "").strip()

        if not graph_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="knowledge_id is required.",
            )
        if not query:
            return DifyRetrievalResponse(records=[])

        text_unit_records = self._retrieve_text_unit_records(
            graph_id=graph_id,
            query=query,
            top_k=request.retrieval_setting.top_k,
            score_threshold=request.retrieval_setting.score_threshold,
            graph_registry_service=graph_registry_service,
        )
        if text_unit_records is not None:
            return DifyRetrievalResponse(records=text_unit_records)

        payload = await self._query_service.query(
            request=QueryRequest(
                graph_id=graph_id,
                question=query,
                mode="local",
                community_level=2,
                response_type="Multiple Paragraphs",
            ),
            app_config_service=app_config_service,
            graph_registry_service=graph_registry_service,
        )

        records = self._context_to_records(
            graph_id=graph_id,
            context=payload.context,
            top_k=request.retrieval_setting.top_k,
            score_threshold=request.retrieval_setting.score_threshold,
        )
        return DifyRetrievalResponse(records=records)

    def _retrieve_text_unit_records(
        self,
        graph_id: str,
        query: str,
        top_k: int,
        score_threshold: float,
        graph_registry_service: GraphRegistryService,
    ) -> list[DifyRetrievalRecord] | None:
        if not hasattr(graph_registry_service, "get_graph"):
            return None

        graph = graph_registry_service.get_graph(graph_id)
        text_units_path = Path(graph.root_dir) / "output" / "text_units.parquet"
        if not text_units_path.exists():
            return None

        import pandas as pd

        rows = pd.read_parquet(text_units_path).to_dict(orient="records")
        ranked_records: list[tuple[float, int, DifyRetrievalRecord]] = []
        for index, row in enumerate(rows):
            content = self._first_text(row, ("text", "content", "source"))
            if not content:
                continue

            relevance = self._text_relevance(query, content)
            if relevance < score_threshold:
                continue

            title = self._text_unit_title(row)
            metadata = self._metadata(
                row,
                {
                    "text",
                    "content",
                    "source",
                    "title",
                    "score",
                    "rank",
                    "metadata",
                    "human_readable_id",
                },
            )
            metadata.setdefault("document_id", row.get("document_id") or row.get("id") or title)
            metadata["graph_id"] = graph_id
            metadata["record_type"] = "source"
            ranked_records.append(
                (
                    relevance,
                    index,
                    DifyRetrievalRecord(
                        content=content,
                        score=1.0,
                        title=title,
                        metadata=metadata,
                    ),
                )
            )

        ranked_records.sort(key=lambda item: (-item[0], item[1]))
        return [record for _, _, record in ranked_records[:top_k]]

    def _text_unit_title(self, row: dict[str, Any]) -> str:
        explicit_title = self._first_text(row, ("title",))
        if explicit_title:
            return explicit_title

        human_readable_id = row.get("human_readable_id")
        if human_readable_id is not None and self._json_safe(human_readable_id) != "":
            return f"Text unit {self._json_safe(human_readable_id)}"

        return self._first_text(row, ("id",)) or "Text unit"

    def _text_relevance(self, query: str, content: str) -> float:
        query_terms = self._query_terms(query)
        if not query_terms:
            return 1.0

        content_normalized = content.lower()
        matches = sum(1 for term in query_terms if term in content_normalized)
        relevance = matches / len(query_terms)

        query_normalized = query.strip().lower()
        if query_normalized and query_normalized in content_normalized:
            relevance += 0.5

        if math.isclose(relevance, 0.0):
            return 0.0
        return max(0.0, min(relevance, 1.0))

    def _query_terms(self, query: str) -> set[str]:
        normalized = query.lower()
        alnum_terms = re.findall(r"[a-z0-9]+", normalized)
        cjk_terms = re.findall(r"[\u4e00-\u9fff]", normalized)
        return {term for term in (*alnum_terms, *cjk_terms) if term}

    def _context_to_records(
        self,
        graph_id: str,
        context: dict[str, Any],
        top_k: int,
        score_threshold: float,
    ) -> list[DifyRetrievalRecord]:
        records = self._build_source_records(graph_id, context.get("sources") or [])
        if not records:
            records = self._build_report_records(graph_id, context.get("reports") or [])
        if not records:
            records = self._build_entity_records(graph_id, context.get("entities") or [])

        indexed_records = [
            (index, record)
            for index, record in enumerate(records)
            if record.score >= score_threshold
        ]
        indexed_records.sort(key=lambda item: (-item[1].score, item[0]))
        return [record for _, record in indexed_records[:top_k]]

    def _build_source_records(
        self,
        graph_id: str,
        rows: list[dict[str, Any]],
    ) -> list[DifyRetrievalRecord]:
        return [
            self._row_to_record(
                graph_id=graph_id,
                row=row,
                record_type="source",
                content_keys=("text", "content", "source"),
                title_keys=("title", "document_id", "id"),
                score_default=1.0,
            )
            for row in rows
            if self._first_text(row, ("text", "content", "source"))
        ]

    def _build_report_records(
        self,
        graph_id: str,
        rows: list[dict[str, Any]],
    ) -> list[DifyRetrievalRecord]:
        return [
            self._row_to_record(
                graph_id=graph_id,
                row=row,
                record_type="report",
                content_keys=("summary", "full_content", "content"),
                title_keys=("title", "community_id", "id"),
                score_default=0.8,
            )
            for row in rows
            if self._first_text(row, ("summary", "full_content", "content"))
        ]

    def _build_entity_records(
        self,
        graph_id: str,
        rows: list[dict[str, Any]],
    ) -> list[DifyRetrievalRecord]:
        return [
            self._row_to_record(
                graph_id=graph_id,
                row=row,
                record_type="entity",
                content_keys=("description", "text", "title"),
                title_keys=("title", "id"),
                score_default=0.7,
            )
            for row in rows
            if self._first_text(row, ("description", "text", "title"))
        ]

    def _row_to_record(
        self,
        graph_id: str,
        row: dict[str, Any],
        record_type: str,
        content_keys: tuple[str, ...],
        title_keys: tuple[str, ...],
        score_default: float,
    ) -> DifyRetrievalRecord:
        content = self._first_text(row, content_keys)
        title = self._first_text(row, title_keys) or record_type
        score = self._score(row, score_default)
        excluded = {*content_keys, "title", "score", "rank", "metadata"}
        metadata = self._metadata(row, excluded)
        if record_type == "source":
            metadata.setdefault("document_id", row.get("document_id") or row.get("id") or title)
        metadata["graph_id"] = graph_id
        metadata["record_type"] = record_type
        return DifyRetrievalRecord(
            content=content,
            score=score,
            title=title,
            metadata=metadata,
        )

    def _metadata(self, row: dict[str, Any], excluded: set[str]) -> dict[str, Any]:
        metadata: dict[str, Any] = {}
        nested_metadata = row.get("metadata")
        if isinstance(nested_metadata, dict):
            metadata.update(nested_metadata)

        for key, value in row.items():
            if key in excluded:
                continue
            metadata[key] = self._json_safe(value)
        return metadata

    def _score(self, row: dict[str, Any], default: float) -> float:
        raw_score = row.get("score", row.get("rank", default))
        try:
            score = float(raw_score)
        except (TypeError, ValueError):
            score = default

        if score > 1:
            score = score / 10
        return max(0.0, min(score, 1.0))

    def _first_text(self, row: dict[str, Any], keys: tuple[str, ...]) -> str:
        for key in keys:
            value = row.get(key)
            if value is None:
                continue
            text = str(value).strip()
            if text:
                return text
        return ""

    def _json_safe(self, value: Any) -> Any:
        if value is None or isinstance(value, str | int | float | bool):
            return value
        if isinstance(value, list):
            return [self._json_safe(item) for item in value]
        if isinstance(value, dict):
            return {str(key): self._json_safe(item) for key, item in value.items()}
        return str(value)
