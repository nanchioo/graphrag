# Copyright (c) 2024 Microsoft Corporation.
# Licensed under the MIT License

import pytest
import pandas as pd
from pathlib import Path

from api.schemas.dify import DifyRetrievalRequest, DifyRetrievalSetting
from api.schemas.query import QueryResponsePayload
from api.services.dify_retrieval_service import DifyRetrievalService
from api.services.graph_registry_service import GraphRegistryService


class FakeQueryService:
    """Fake query service used to isolate Dify adapter behavior."""

    def __init__(self, payload: QueryResponsePayload):
        self.payload = payload
        self.calls = []

    async def query(self, request, **kwargs) -> QueryResponsePayload:
        self.calls.append((request, kwargs))
        return self.payload


class FailingQueryService:
    """Query service that fails if the Dify adapter triggers full answer generation."""

    async def query(self, *_, **__):
        raise AssertionError("Dify retrieval must not call QueryService.")


@pytest.mark.asyncio
async def test_retrieve_maps_dify_request_to_graph_query_and_returns_source_records():
    query_payload = QueryResponsePayload(
        graph_id="refund-graph",
        mode="local",
        answer="GraphRAG generated answer should not be returned as a record.",
        context={
            "reports": [],
            "entities": [],
            "relationships": [],
            "claims": [],
            "sources": [
                {
                    "id": "source-1",
                    "document_id": "doc-1",
                    "title": "Refund Policy",
                    "text": "Refunds are processed after approval.",
                    "score": 0.95,
                },
                {
                    "id": "source-2",
                    "document_id": "doc-2",
                    "title": "Shipping Policy",
                    "text": "Shipping rules are unrelated.",
                    "score": 0.4,
                },
                {
                    "id": "source-3",
                    "document_id": "doc-3",
                    "title": "Refund Timeline",
                    "text": "Refund settlement takes three business days.",
                    "score": 0.75,
                },
            ],
        },
    )
    fake_query_service = FakeQueryService(query_payload)
    service = DifyRetrievalService(query_service=fake_query_service)
    app_config_service = object()
    graph_registry_service = object()

    response = await service.retrieve(
        request=DifyRetrievalRequest(
            knowledge_id="refund-graph",
            query="How long do refunds take?",
            retrieval_setting=DifyRetrievalSetting(
                top_k=2,
                score_threshold=0.7,
            ),
        ),
        app_config_service=app_config_service,
        graph_registry_service=graph_registry_service,
    )

    assert response.model_dump() == {
        "records": [
            {
                "content": "Refunds are processed after approval.",
                "score": 0.95,
                "title": "Refund Policy",
                "metadata": {
                    "document_id": "doc-1",
                    "graph_id": "refund-graph",
                    "id": "source-1",
                    "record_type": "source",
                },
            },
            {
                "content": "Refund settlement takes three business days.",
                "score": 0.75,
                "title": "Refund Timeline",
                "metadata": {
                    "document_id": "doc-3",
                    "graph_id": "refund-graph",
                    "id": "source-3",
                    "record_type": "source",
                },
            },
        ]
    }
    assert len(fake_query_service.calls) == 1
    query_request, kwargs = fake_query_service.calls[0]
    assert query_request.graph_id == "refund-graph"
    assert query_request.question == "How long do refunds take?"
    assert query_request.mode == "local"
    assert kwargs["app_config_service"] is app_config_service
    assert kwargs["graph_registry_service"] is graph_registry_service


@pytest.mark.asyncio
async def test_retrieve_reads_text_units_without_calling_query_service(tmp_path: Path):
    registry_path = tmp_path / "graph_registry.json"
    root_dir = tmp_path / "projects" / "refund-graph"
    output_dir = root_dir / "output"
    output_dir.mkdir(parents=True)
    pd.DataFrame(
        [
            {
                "id": "text-1",
                "human_readable_id": 1,
                "text": "FZ059-2023 废止的是终止、解除劳动关系管理流程，废止原因是已融入劳动合同管理流程。",
                "document_id": "doc-1",
            },
            {
                "id": "text-2",
                "human_readable_id": 2,
                "text": "本段只说明发放单位，与废止原因无关。",
                "document_id": "doc-2",
            },
        ]
    ).to_parquet(output_dir / "text_units.parquet")

    graph_registry_service = GraphRegistryService(registry_path, project_root=tmp_path)
    graph_registry_service.create_graph(
        graph_id="refund-graph",
        name="Refund Graph",
        description=None,
        root_dir=str(root_dir),
        model_profile_id=None,
    )
    graph_registry_service.mark_build_succeeded("refund-graph")
    service = DifyRetrievalService(query_service=FailingQueryService())

    response = await service.retrieve(
        request=DifyRetrievalRequest(
            knowledge_id="refund-graph",
            query="FZ059-2023 废止原因是什么？",
            retrieval_setting=DifyRetrievalSetting(top_k=1, score_threshold=0.5),
        ),
        app_config_service=object(),
        graph_registry_service=graph_registry_service,
    )

    assert response.model_dump() == {
        "records": [
            {
                "content": "FZ059-2023 废止的是终止、解除劳动关系管理流程，废止原因是已融入劳动合同管理流程。",
                "score": 1.0,
                "title": "Text unit 1",
                "metadata": {
                    "document_id": "doc-1",
                    "graph_id": "refund-graph",
                    "id": "text-1",
                    "record_type": "source",
                },
            }
        ]
    }


@pytest.mark.asyncio
async def test_retrieve_falls_back_to_report_records_when_sources_are_empty():
    query_payload = QueryResponsePayload(
        graph_id="ops-graph",
        mode="local",
        answer="GraphRAG generated answer",
        context={
            "reports": [
                {
                    "id": "report-1",
                    "community_id": "community-1",
                    "title": "Operations Community",
                    "summary": "Refund operations depend on approval and settlement.",
                    "rank": 8.0,
                }
            ],
            "entities": [],
            "relationships": [],
            "claims": [],
            "sources": [],
        },
    )
    service = DifyRetrievalService(query_service=FakeQueryService(query_payload))

    response = await service.retrieve(
        request=DifyRetrievalRequest(
            knowledge_id="ops-graph",
            query="What does refund operations depend on?",
            retrieval_setting=DifyRetrievalSetting(top_k=4, score_threshold=0.5),
        ),
        app_config_service=object(),
        graph_registry_service=object(),
    )

    assert response.model_dump() == {
        "records": [
            {
                "content": "Refund operations depend on approval and settlement.",
                "score": 0.8,
                "title": "Operations Community",
                "metadata": {
                    "community_id": "community-1",
                    "graph_id": "ops-graph",
                    "id": "report-1",
                    "record_type": "report",
                },
            }
        ]
    }
