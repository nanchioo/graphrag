# Copyright (c) 2024 Microsoft Corporation.
# Licensed under the MIT License

from pathlib import Path

import pytest
from fastapi import HTTPException, status
from fastapi.testclient import TestClient

from api.deps import get_app_config_service, get_model_profile_validation_service
from api.services.app_config_service import AppConfigService
from main import app


class NoOpModelProfileValidationService:
    """Test validator that allows all model profile saves."""

    def validate_create_request(self, *_args, **_kwargs) -> None:
        return None

    def validate_update_request(self, *_args, **_kwargs) -> None:
        return None


class RejectingModelProfileValidationService:
    """Test validator that rejects model profile saves with a fixed error."""

    def __init__(self, message: str):
        self._message = message

    def validate_create_request(self, *_args, **_kwargs) -> None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=self._message,
        )

    def validate_update_request(self, *_args, **_kwargs) -> None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=self._message,
        )


@pytest.fixture
def client_and_store_path(tmp_path: Path) -> tuple[TestClient, Path]:
    """Create a test client backed by an isolated app settings file."""

    store_path = tmp_path / "app_settings.json"
    app.dependency_overrides[get_app_config_service] = lambda: AppConfigService(
        store_path
    )
    app.dependency_overrides[get_model_profile_validation_service] = (
        lambda: NoOpModelProfileValidationService()
    )

    with TestClient(app) as client:
        yield client, store_path

    app.dependency_overrides.clear()


def test_get_system_config_returns_defaults_and_initializes_store(
    client_and_store_path: tuple[TestClient, Path],
):
    client, store_path = client_and_store_path

    response = client.get("/api/config/system")

    assert response.status_code == 200
    assert response.json() == {
        "success": True,
        "message": "Config router is mounted.",
        "data": {
            "projects_root": "data/projects",
            "upload_root": "data/projects",
            "default_model_profile_id": None,
            "llm_provider": None,
            "llm_model": None,
            "api_base": None,
            "deployment": None,
            "api_version": None,
            "concurrency": None,
            "rate_limit_per_minute": None,
            "max_retries": None,
            "enable_llm_cache": None,
        },
    }
    assert store_path.exists()


def test_update_system_config_persists_values(
    client_and_store_path: tuple[TestClient, Path],
):
    client, _ = client_and_store_path

    update_response = client.put(
        "/api/config/system",
        json={
            "projects_root": "data/custom-projects",
            "upload_root": "data/custom-uploads",
            "default_model_profile_id": "model-default",
            "llm_provider": "Azure OpenAI",
            "llm_model": "gpt-4.1",
            "api_base": "https://example.openai.azure.com",
            "deployment": "gpt-4-1106",
            "api_version": "2024-02-15-preview",
            "concurrency": 16,
            "rate_limit_per_minute": 500,
            "max_retries": 5,
            "enable_llm_cache": True,
        },
    )

    assert update_response.status_code == 200
    assert update_response.json() == {
        "success": True,
        "message": "System configuration updated.",
        "data": {
            "projects_root": "data/custom-projects",
            "upload_root": "data/custom-uploads",
            "default_model_profile_id": "model-default",
            "llm_provider": "Azure OpenAI",
            "llm_model": "gpt-4.1",
            "api_base": "https://example.openai.azure.com",
            "deployment": "gpt-4-1106",
            "api_version": "2024-02-15-preview",
            "concurrency": 16,
            "rate_limit_per_minute": 500,
            "max_retries": 5,
            "enable_llm_cache": True,
        },
    }

    get_response = client.get("/api/config/system")
    assert get_response.status_code == 200
    assert get_response.json()["data"] == {
        "projects_root": "data/custom-projects",
        "upload_root": "data/custom-uploads",
        "default_model_profile_id": "model-default",
        "llm_provider": "Azure OpenAI",
        "llm_model": "gpt-4.1",
        "api_base": "https://example.openai.azure.com",
        "deployment": "gpt-4-1106",
        "api_version": "2024-02-15-preview",
        "concurrency": 16,
        "rate_limit_per_minute": 500,
        "max_retries": 5,
        "enable_llm_cache": True,
    }


def test_model_profile_crud_masks_api_key_and_tracks_default(
    client_and_store_path: tuple[TestClient, Path],
):
    client, _ = client_and_store_path

    create_response = client.post(
        "/api/config/models",
        json={
            "provider": "openai",
            "name": "OpenAI Default",
            "base_url": "https://api.openai.com/v1",
            "api_key": "sk-test-secret",
            "model_name": "gpt-4.1",
            "embedding_model_name": "text-embedding-3-large",
            "deployment": "gpt-4.1-prod",
            "is_default": True,
        },
    )

    assert create_response.status_code == 201
    created_payload = create_response.json()
    created_id = created_payload["data"]["id"]

    assert created_payload == {
        "success": True,
        "message": "Model profile created.",
        "data": {
            "id": created_id,
            "provider": "openai",
            "name": "OpenAI Default",
            "base_url": "https://api.openai.com/v1",
            "model_name": "gpt-4.1",
            "embedding_model_name": "text-embedding-3-large",
            "deployment": "gpt-4.1-prod",
            "api_version": None,
            "is_default": True,
            "has_api_key": True,
            "api_key_masked": "****cret",
        },
    }

    list_response = client.get("/api/config/models")
    assert list_response.status_code == 200
    assert list_response.json() == {
        "success": True,
        "message": "Model profiles loaded.",
        "data": {
            "items": [
                {
                    "id": created_id,
                    "provider": "openai",
                    "name": "OpenAI Default",
                    "base_url": "https://api.openai.com/v1",
                    "model_name": "gpt-4.1",
                    "embedding_model_name": "text-embedding-3-large",
                    "deployment": "gpt-4.1-prod",
                    "api_version": None,
                    "is_default": True,
                    "has_api_key": True,
                    "api_key_masked": "****cret",
                }
            ],
            "total": 1,
        },
    }

    update_response = client.put(
        f"/api/config/models/{created_id}",
        json={
            "name": "OpenAI Updated",
            "base_url": "https://example-proxy.local/v1",
            "model_name": "gpt-4.1-mini",
            "deployment": "gpt-4.1-mini-staging",
        },
    )

    assert update_response.status_code == 200
    assert update_response.json() == {
        "success": True,
        "message": "Model profile updated.",
        "data": {
            "id": created_id,
            "provider": "openai",
            "name": "OpenAI Updated",
            "base_url": "https://example-proxy.local/v1",
            "model_name": "gpt-4.1-mini",
            "embedding_model_name": "text-embedding-3-large",
            "deployment": "gpt-4.1-mini-staging",
            "api_version": None,
            "is_default": True,
            "has_api_key": True,
            "api_key_masked": "****cret",
        },
    }

    system_response = client.get("/api/config/system")
    assert system_response.status_code == 200
    assert system_response.json()["data"]["default_model_profile_id"] == created_id

    delete_response = client.delete(f"/api/config/models/{created_id}")
    assert delete_response.status_code == 200
    assert delete_response.json() == {
        "success": True,
        "message": "Model profile deleted.",
        "data": {
            "deleted_id": created_id,
        },
    }

    final_list_response = client.get("/api/config/models")
    assert final_list_response.status_code == 200
    assert final_list_response.json() == {
        "success": True,
        "message": "Model profiles loaded.",
        "data": {
            "items": [],
            "total": 0,
        },
    }

    final_system_response = client.get("/api/config/system")
    assert final_system_response.status_code == 200
    assert final_system_response.json()["data"]["default_model_profile_id"] is None


def test_create_model_profile_rejects_invalid_precheck(
    client_and_store_path: tuple[TestClient, Path],
):
    client, _ = client_and_store_path
    app.dependency_overrides[get_model_profile_validation_service] = (
        lambda: RejectingModelProfileValidationService(
            '模型配置 "Kimi" 缺少 embedding_model_name.'
        )
    )

    response = client.post(
        "/api/config/models",
        json={
            "provider": "openai",
            "name": "Kimi",
            "base_url": "https://api.moonshot.cn/v1",
            "api_key": "sk-kimi-test",
            "model_name": "kimi-k2.5",
            "embedding_model_name": "",
            "deployment": "kimi-prod",
            "is_default": False,
        },
    )

    assert response.status_code == 400
    assert response.json() == {
        "success": False,
        "message": '模型配置 "Kimi" 缺少 embedding_model_name.',
        "data": None,
    }

    list_response = client.get("/api/config/models")
    assert list_response.status_code == 200
    assert list_response.json()["data"] == {
        "items": [],
        "total": 0,
    }


def test_update_model_profile_rejects_invalid_precheck_without_persisting(
    client_and_store_path: tuple[TestClient, Path],
):
    client, _ = client_and_store_path

    create_response = client.post(
        "/api/config/models",
        json={
            "provider": "openai",
            "name": "Kimi",
            "base_url": "https://api.moonshot.cn/v1",
            "api_key": "sk-kimi-test",
            "model_name": "kimi-k2.5",
            "embedding_model_name": "text-embedding-v3",
            "deployment": "kimi-prod",
            "is_default": False,
        },
    )
    assert create_response.status_code == 201
    profile_id = create_response.json()["data"]["id"]

    app.dependency_overrides[get_model_profile_validation_service] = (
        lambda: RejectingModelProfileValidationService(
            '模型配置 "Kimi" 鉴权失败, 请检查 api_key 或 base_url.'
        )
    )

    update_response = client.put(
        f"/api/config/models/{profile_id}",
        json={
            "api_key": "sk-invalid",
        },
    )

    assert update_response.status_code == 400
    assert update_response.json() == {
        "success": False,
        "message": '模型配置 "Kimi" 鉴权失败, 请检查 api_key 或 base_url.',
        "data": None,
    }

    list_response = client.get("/api/config/models")
    assert list_response.status_code == 200
    assert list_response.json()["data"] == {
        "items": [
            {
                "id": profile_id,
                "provider": "openai",
                "name": "Kimi",
                "base_url": "https://api.moonshot.cn/v1",
                "model_name": "kimi-k2.5",
                "embedding_model_name": "text-embedding-v3",
                "deployment": "kimi-prod",
                "api_version": None,
                "is_default": False,
                "has_api_key": True,
                "api_key_masked": "****test",
            }
        ],
        "total": 1,
    }
