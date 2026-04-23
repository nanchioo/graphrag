# Copyright (c) 2024 Microsoft Corporation.
# Licensed under the MIT License

import httpx
import pytest
from fastapi import HTTPException
from openai import PermissionDeniedError

from api.services.app_config_service import StoredModelProfile
from api.services.model_profile_validation_service import ModelProfileValidationService


def _make_openai_profile() -> StoredModelProfile:
    return StoredModelProfile(
        id="profile-1",
        provider="openai",
        name="DashScope",
        base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
        api_key="sk-test",
        model_name="qwen3.6-plus",
        embedding_model_name="text-embedding-v3",
        api_version=None,
    )


def test_validate_connection_probes_completion_and_embedding(monkeypatch: pytest.MonkeyPatch):
    service = ModelProfileValidationService()
    calls: list[tuple[str, str]] = []

    monkeypatch.setattr(service, "validate_stored_profile", lambda _profile: None)
    monkeypatch.setattr(
        service,
        "_probe_openai_completion",
        lambda **kwargs: calls.append(("completion", kwargs["model_name"])),
    )
    monkeypatch.setattr(
        service,
        "_probe_openai_embedding",
        lambda **kwargs: calls.append(("embedding", kwargs["model_name"])),
    )

    service.validate_connection(_make_openai_profile())

    assert calls == [
        ("completion", "qwen3.6-plus"),
        ("embedding", "text-embedding-v3"),
    ]


def test_validate_connection_surfaces_free_tier_denial(monkeypatch: pytest.MonkeyPatch):
    service = ModelProfileValidationService()

    monkeypatch.setattr(service, "validate_stored_profile", lambda _profile: None)

    def fake_completion_probe(**_kwargs):
        response = httpx.Response(
            403,
            request=httpx.Request("POST", "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions"),
        )
        raise PermissionDeniedError(
            "The free tier of the model has been exhausted.",
            response=response,
            body={
                "error": {
                    "message": "The free tier of the model has been exhausted.",
                    "code": "AllocationQuota.FreeTierOnly",
                }
            },
        )

    monkeypatch.setattr(service, "_probe_openai_completion", fake_completion_probe)
    monkeypatch.setattr(service, "_probe_openai_embedding", lambda **_kwargs: None)

    with pytest.raises(HTTPException) as exc_info:
        service.validate_connection(_make_openai_profile())

    assert exc_info.value.status_code == 400
    assert 'Model profile "DashScope" completion model probe failed:' in str(
        exc_info.value.detail
    )
    assert "AllocationQuota.FreeTierOnly" in str(exc_info.value.detail)


def test_probe_openai_embedding_uses_float_encoding_for_dashscope(
    monkeypatch: pytest.MonkeyPatch,
):
    service = ModelProfileValidationService()
    captured: dict[str, object] = {}

    class FakeEmbeddings:
        def create(self, **kwargs):
            captured.update(kwargs)
            return object()

    class FakeClient:
        def __init__(self):
            self.embeddings = FakeEmbeddings()

    monkeypatch.setattr(service, "_create_openai_client", lambda **_kwargs: FakeClient())

    service._probe_openai_embedding(
        base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
        api_key="sk-test",
        model_name="text-embedding-v3",
    )

    assert captured == {
        "model": "text-embedding-v3",
        "input": "ping",
        "encoding_format": "float",
    }
