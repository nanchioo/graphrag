# Copyright (c) 2024 Microsoft Corporation.
# Licensed under the MIT License

import pytest
from fastapi.testclient import TestClient

from api.deps import get_dify_retrieval_service
from api.schemas.dify import DifyRetrievalRecord, DifyRetrievalResponse
from main import app


class FakeDifyRetrievalService:
    """Fake Dify adapter service used to isolate route behavior."""

    def __init__(self):
        self.calls = []

    async def retrieve(self, request, **kwargs) -> DifyRetrievalResponse:
        self.calls.append((request, kwargs))
        return DifyRetrievalResponse(
            records=[
                DifyRetrievalRecord(
                    content="Refunds are processed after approval.",
                    score=0.91,
                    title="Refund Policy",
                    metadata={
                        "document_id": "doc-1",
                        "graph_id": request.knowledge_id,
                        "record_type": "source",
                    },
                )
            ]
        )


@pytest.fixture
def dify_client(monkeypatch: pytest.MonkeyPatch) -> tuple[TestClient, FakeDifyRetrievalService]:
    """Create a test client with deterministic Dify adapter auth."""

    monkeypatch.setenv("DIFY_EXTERNAL_KNOWLEDGE_API_KEY", "test-secret")
    fake_service = FakeDifyRetrievalService()
    app.dependency_overrides[get_dify_retrieval_service] = lambda: fake_service

    with TestClient(app) as client:
        yield client, fake_service

    app.dependency_overrides.clear()


def test_dify_retrieval_route_rejects_missing_bearer_token(
    dify_client: tuple[TestClient, FakeDifyRetrievalService],
):
    client, fake_service = dify_client

    response = client.post(
        "/api/dify/retrieval",
        json={"knowledge_id": "refund-graph", "query": "refunds"},
    )

    assert response.status_code == 403
    assert response.json() == {
        "success": False,
        "message": "Invalid Dify external knowledge API key.",
        "data": None,
    }
    assert fake_service.calls == []


def test_dify_retrieval_route_accepts_empty_connection_probe(
    dify_client: tuple[TestClient, FakeDifyRetrievalService],
):
    client, fake_service = dify_client

    response = client.post(
        "/api/dify/retrieval",
        headers={"Authorization": "Bearer test-secret"},
    )

    assert response.status_code == 200
    assert response.json() == {"records": []}
    assert fake_service.calls == []


def test_dify_retrieval_route_returns_adapter_records(
    dify_client: tuple[TestClient, FakeDifyRetrievalService],
):
    client, fake_service = dify_client

    response = client.post(
        "/api/dify/retrieval",
        headers={"Authorization": "Bearer test-secret"},
        json={
            "knowledge_id": "refund-graph",
            "query": "How are refunds processed?",
            "retrieval_setting": {
                "top_k": 4,
                "score_threshold": 0.5,
            },
        },
    )

    assert response.status_code == 200
    assert response.json() == {
        "records": [
            {
                "content": "Refunds are processed after approval.",
                "score": 0.91,
                "title": "Refund Policy",
                "metadata": {
                    "document_id": "doc-1",
                    "graph_id": "refund-graph",
                    "record_type": "source",
                },
            }
        ]
    }
    assert len(fake_service.calls) == 1
    request, kwargs = fake_service.calls[0]
    assert request.knowledge_id == "refund-graph"
    assert request.query == "How are refunds processed?"
    assert request.retrieval_setting.top_k == 4
    assert request.retrieval_setting.score_threshold == 0.5
    assert "app_config_service" in kwargs
    assert "graph_registry_service" in kwargs
