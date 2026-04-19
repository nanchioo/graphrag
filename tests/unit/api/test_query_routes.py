# Copyright (c) 2024 Microsoft Corporation.
# Licensed under the MIT License

import pytest
from fastapi.testclient import TestClient

from api.deps import get_query_service
from api.schemas.query import QueryResponsePayload
from main import app


class FakeQueryService:
    """Fake query service used to isolate route behavior."""

    def __init__(self):
        self.calls: list[tuple[str, str, str]] = []

    async def query(self, request, **_) -> QueryResponsePayload:
        self.calls.append((request.graph_id, request.mode, request.question))
        return QueryResponsePayload(
            graph_id=request.graph_id,
            mode=request.mode,
            answer="Refund answer",
            context={
                "reports": [],
                "entities": [{"id": "entity-1", "title": "Refund"}],
                "relationships": [],
                "claims": [],
                "sources": [{"id": "source-1", "text": "Refund source"}],
            },
        )


@pytest.fixture
def query_client() -> tuple[TestClient, FakeQueryService]:
    """Create a test client backed by a fake query service."""

    fake_query_service = FakeQueryService()
    app.dependency_overrides[get_query_service] = lambda: fake_query_service

    with TestClient(app) as client:
        yield client, fake_query_service

    app.dependency_overrides.clear()


def test_query_route_returns_answer_and_context(
    query_client: tuple[TestClient, FakeQueryService],
):
    client, fake_query_service = query_client

    response = client.post(
        "/api/query",
        json={
            "graph_id": "refund-graph",
            "question": "退款流程有哪些关键节点?",
            "mode": "local",
            "community_level": 2,
            "response_type": "Multiple Paragraphs",
        },
    )

    assert response.status_code == 200
    assert response.json() == {
        "success": True,
        "message": "Query completed.",
        "data": {
            "graph_id": "refund-graph",
            "mode": "local",
            "answer": "Refund answer",
            "context": {
                "reports": [],
                "entities": [{"id": "entity-1", "title": "Refund"}],
                "relationships": [],
                "claims": [],
                "sources": [{"id": "source-1", "text": "Refund source"}],
            },
        },
    }
    assert fake_query_service.calls == [
        ("refund-graph", "local", "退款流程有哪些关键节点?")
    ]


def test_chat_route_reuses_query_service(
    query_client: tuple[TestClient, FakeQueryService],
):
    client, fake_query_service = query_client

    response = client.post(
        "/api/chat",
        json={
            "graph_id": "refund-graph",
            "question": "退款流程有哪些关键节点?",
            "mode": "basic",
            "response_type": "Bulleted List",
        },
    )

    assert response.status_code == 200
    assert response.json()["data"]["mode"] == "basic"
    assert fake_query_service.calls == [
        ("refund-graph", "basic", "退款流程有哪些关键节点?")
    ]
