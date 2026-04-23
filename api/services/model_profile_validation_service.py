# Copyright (c) 2024 Microsoft Corporation.
# Licensed under the MIT License

"""Validation helpers for model profile persistence and build prechecks."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

from fastapi import HTTPException, status
from openai import (
    APIConnectionError,
    AuthenticationError,
    BadRequestError,
    NotFoundError,
    OpenAI,
    PermissionDeniedError,
)

from api.services.app_config_service import StoredModelProfile

if TYPE_CHECKING:
    from api.schemas.config import ModelProfileCreateRequest, ModelProfileUpdateRequest


class ModelProfileValidationService:
    """Validate model profiles before save and before GraphRAG build execution."""

    def validate_connection(self, profile: StoredModelProfile) -> None:
        """Validate that an already-saved model profile can be used."""
        self.validate_stored_profile(profile)
        provider = self._normalize_config_value(profile.provider)
        base_url = self._normalize_config_value(profile.base_url)
        api_key = self._normalize_config_value(profile.api_key)
        model_name = self._normalize_config_value(profile.model_name)
        embedding_model_name = self._normalize_config_value(profile.embedding_model_name)

        if (
            provider == "openai"
            and base_url
            and api_key
            and model_name
            and embedding_model_name
        ):
            self._probe_openai_runtime_profile(
                profile_name=profile.name or profile.id,
                base_url=base_url,
                api_key=api_key,
                model_name=model_name,
                embedding_model_name=embedding_model_name,
            )

    def validate_create_request(self, payload: ModelProfileCreateRequest) -> None:
        """Validate a create payload before it is persisted."""
        profile = StoredModelProfile(
            id="unsaved-model-profile",
            provider=payload.provider,
            name=payload.name,
            base_url=payload.base_url,
            api_key=payload.api_key,
            model_name=payload.model_name,
            embedding_model_name=payload.embedding_model_name,
            api_version=payload.api_version,
        )
        self.validate_stored_profile(profile)

    def validate_update_request(
        self,
        existing_profile: StoredModelProfile,
        payload: ModelProfileUpdateRequest,
    ) -> None:
        """Validate an update payload against the merged profile state."""
        profile = existing_profile.model_copy(deep=True)
        updates = payload.model_dump(exclude_unset=True)

        if "provider" in updates:
            profile.provider = updates["provider"]
        if "name" in updates:
            profile.name = updates["name"]
        if "base_url" in updates:
            profile.base_url = updates["base_url"]
        if "model_name" in updates:
            profile.model_name = updates["model_name"]
        if "embedding_model_name" in updates:
            profile.embedding_model_name = updates["embedding_model_name"]
        if "api_version" in updates:
            profile.api_version = updates["api_version"]
        if "api_key" in updates:
            profile.api_key = updates["api_key"]
        if payload.clear_api_key:
            profile.api_key = None

        self.validate_stored_profile(profile)

    def validate_stored_profile(self, profile: StoredModelProfile) -> None:
        """Validate a fully materialized model profile."""
        profile_name = profile.name or profile.id
        provider = profile.provider
        base_url = self._normalize_config_value(profile.base_url)
        model_name = self._normalize_config_value(profile.model_name)
        embedding_model_name = self._normalize_config_value(profile.embedding_model_name)
        api_key = self._normalize_config_value(profile.api_key)
        api_version = self._normalize_config_value(profile.api_version)

        if not base_url:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f'模型配置 "{profile_name}" 缺少 base_url, 请先补全模型地址。',
            )
        if not model_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f'模型配置 "{profile_name}" 缺少 model_name, 请先补全主模型。',
            )
        if not embedding_model_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f'模型配置 "{profile_name}" 缺少 embedding_model_name。'
                    "GraphRAG 构建前必须显式配置向量模型。"
                ),
            )
        if provider != "ollama" and not api_key:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f'模型配置 "{profile_name}" 缺少 api_key, 请先补全鉴权信息。',
            )
        if provider == "azure" and not api_version:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f'模型配置 "{profile_name}" 缺少 api_version, '
                    "Azure 构建前必须显式配置 API 版本。"
                ),
            )
        if provider == "openai" and api_key:
            self._preflight_openai_profile(
                profile_name=profile_name,
                base_url=base_url,
                api_key=api_key,
            )

    def _normalize_config_value(self, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None

    def _preflight_openai_profile(
        self,
        profile_name: str,
        base_url: str,
        api_key: str,
    ) -> None:
        try:
            self._probe_openai_profile(base_url=base_url, api_key=api_key)
        except AuthenticationError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f'模型配置 "{profile_name}" 鉴权失败, 请检查 api_key 或 base_url。',
            ) from exc
        except APIConnectionError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f'模型配置 "{profile_name}" 连接失败, 请检查 base_url 是否可访问。',
            ) from exc

    def _probe_openai_profile(self, base_url: str, api_key: str) -> None:
        client = self._create_openai_client(base_url=base_url, api_key=api_key)
        client.models.list()

    def _probe_openai_runtime_profile(
        self,
        profile_name: str,
        base_url: str,
        api_key: str,
        model_name: str,
        embedding_model_name: str,
    ) -> None:
        self._run_openai_probe(
            profile_name=profile_name,
            target_name="completion model",
            probe=lambda: self._probe_openai_completion(
                base_url=base_url,
                api_key=api_key,
                model_name=model_name,
            ),
        )
        self._run_openai_probe(
            profile_name=profile_name,
            target_name="embedding model",
            probe=lambda: self._probe_openai_embedding(
                base_url=base_url,
                api_key=api_key,
                model_name=embedding_model_name,
            ),
        )

    def _run_openai_probe(
        self,
        profile_name: str,
        target_name: str,
        probe: Any,
    ) -> None:
        try:
            probe()
        except (
            AuthenticationError,
            APIConnectionError,
            PermissionDeniedError,
            BadRequestError,
            NotFoundError,
        ) as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f'Model profile "{profile_name}" {target_name} probe failed: '
                    f"{self._extract_openai_error_message(exc)}"
                ),
            ) from exc

    def _probe_openai_completion(
        self,
        base_url: str,
        api_key: str,
        model_name: str,
    ) -> None:
        client = self._create_openai_client(base_url=base_url, api_key=api_key)
        client.chat.completions.create(
            model=model_name,
            messages=[{"role": "user", "content": "ping"}],
            max_tokens=1,
        )

    def _probe_openai_embedding(
        self,
        base_url: str,
        api_key: str,
        model_name: str,
    ) -> None:
        client = self._create_openai_client(base_url=base_url, api_key=api_key)
        request_kwargs: dict[str, object] = {
            "model": model_name,
            "input": "ping",
        }
        if self._uses_dashscope_compatible_api(base_url):
            request_kwargs["encoding_format"] = "float"
        client.embeddings.create(**request_kwargs)

    def _create_openai_client(self, base_url: str, api_key: str) -> OpenAI:
        client = OpenAI(
            api_key=api_key,
            base_url=base_url,
            max_retries=0,
            timeout=10.0,
        )
        return client

    def _uses_dashscope_compatible_api(self, base_url: str) -> bool:
        return "dashscope.aliyuncs.com" in base_url.lower()

    def _extract_openai_error_message(self, exc: Exception) -> str:
        body = getattr(exc, "body", None)
        if isinstance(body, dict):
            error = body.get("error")
            if isinstance(error, dict):
                message = error.get("message")
                code = error.get("code")
                if message and code:
                    return f"{message} ({code})"
                if message:
                    return str(message)

        message = getattr(exc, "message", None) or str(exc)
        return message.strip() if isinstance(message, str) and message.strip() else exc.__class__.__name__
