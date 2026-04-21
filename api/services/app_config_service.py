# Copyright (c) 2024 Microsoft Corporation.
# Licensed under the MIT License

"""File-backed application configuration service."""

from __future__ import annotations

import json
from typing import TYPE_CHECKING
from uuid import uuid4

from fastapi import HTTPException, status
from pydantic import BaseModel, Field

from api.schemas.config import (
    DeleteModelProfilePayload,
    ModelProfileCreateRequest,
    ModelProfileResponse,
    ModelProfileUpdateRequest,
    SystemConfigPayload,
)

if TYPE_CHECKING:
    from pathlib import Path


class StoredModelProfile(BaseModel):
    """Model profile representation persisted to disk."""

    id: str
    provider: str
    name: str
    base_url: str
    api_key: str | None = None
    model_name: str
    embedding_model_name: str | None = None
    deployment: str | None = None
    api_version: str | None = None


class AppSettingsStore(BaseModel):
    """Top-level JSON document persisted by the app config service."""

    system: SystemConfigPayload = Field(default_factory=SystemConfigPayload)
    model_profiles: list[StoredModelProfile] = Field(default_factory=list)


class AppConfigService:
    """Manage persisted application settings in a JSON file."""

    def __init__(self, store_path: Path):
        self._store_path = store_path

    @property
    def store_path(self) -> Path:
        """Return the JSON storage path used by the service."""
        return self._store_path

    def get_system_config(self) -> SystemConfigPayload:
        """Return the current system configuration."""
        return self._load_store().system

    def update_system_config(
        self, payload: SystemConfigPayload
    ) -> SystemConfigPayload:
        """Persist a new system configuration."""
        store = self._load_store()
        store.system = payload
        self._save_store(store)
        return store.system

    def list_model_profiles(self) -> list[ModelProfileResponse]:
        """Return all model profiles with masked secrets."""
        store = self._load_store()
        return [
            self._to_response(profile, store.system.default_model_profile_id)
            for profile in store.model_profiles
        ]

    def get_model_profile(self, profile_id: str) -> StoredModelProfile:
        """Return a stored model profile with its secret fields intact."""
        store = self._load_store()
        return self._find_profile(store, profile_id)

    def create_model_profile(
        self, payload: ModelProfileCreateRequest
    ) -> ModelProfileResponse:
        """Create and persist a new model profile."""
        store = self._load_store()
        profile = StoredModelProfile(
            id=str(uuid4()),
            provider=payload.provider,
            name=payload.name,
            base_url=payload.base_url,
            api_key=payload.api_key,
            model_name=payload.model_name,
            embedding_model_name=payload.embedding_model_name,
            deployment=payload.deployment,
            api_version=payload.api_version,
        )
        store.model_profiles.append(profile)

        if payload.is_default:
            store.system.default_model_profile_id = profile.id

        self._save_store(store)
        return self._to_response(profile, store.system.default_model_profile_id)

    def update_model_profile(
        self, profile_id: str, payload: ModelProfileUpdateRequest
    ) -> ModelProfileResponse:
        """Update and persist an existing model profile."""
        store = self._load_store()
        profile = self._find_profile(store, profile_id)

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
        if "deployment" in updates:
            profile.deployment = updates["deployment"]
        if "api_version" in updates:
            profile.api_version = updates["api_version"]
        if "api_key" in updates:
            profile.api_key = updates["api_key"]
        if payload.clear_api_key:
            profile.api_key = None

        if payload.is_default is True:
            store.system.default_model_profile_id = profile.id
        elif payload.is_default is False and (
            store.system.default_model_profile_id == profile.id
        ):
            store.system.default_model_profile_id = None

        self._save_store(store)
        return self._to_response(profile, store.system.default_model_profile_id)

    def delete_model_profile(self, profile_id: str) -> DeleteModelProfilePayload:
        """Delete a model profile."""
        store = self._load_store()
        profile = self._find_profile(store, profile_id)
        store.model_profiles = [
            current for current in store.model_profiles if current.id != profile.id
        ]

        if store.system.default_model_profile_id == profile.id:
            store.system.default_model_profile_id = None

        self._save_store(store)
        return DeleteModelProfilePayload(deleted_id=profile.id)

    def _find_profile(
        self, store: AppSettingsStore, profile_id: str
    ) -> StoredModelProfile:
        for profile in store.model_profiles:
            if profile.id == profile_id:
                return profile

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Model profile '{profile_id}' was not found.",
        )

    def _to_response(
        self, profile: StoredModelProfile, default_profile_id: str | None
    ) -> ModelProfileResponse:
        masked_api_key = self._mask_secret(profile.api_key)
        return ModelProfileResponse(
            id=profile.id,
            provider=profile.provider,  # type: ignore[arg-type]
            name=profile.name,
            base_url=profile.base_url,
            model_name=profile.model_name,
            embedding_model_name=profile.embedding_model_name,
            deployment=profile.deployment,
            api_version=profile.api_version,
            is_default=default_profile_id == profile.id,
            has_api_key=profile.api_key is not None,
            api_key_masked=masked_api_key,
        )

    def _mask_secret(self, value: str | None) -> str | None:
        if value is None:
            return None
        if len(value) <= 4:
            return "****"
        return f"****{value[-4:]}"

    def _load_store(self) -> AppSettingsStore:
        if not self._store_path.exists():
            store = AppSettingsStore()
            self._save_store(store)
            return store

        data = json.loads(self._store_path.read_text(encoding="utf-8"))
        return AppSettingsStore(**data)

    def _save_store(self, store: AppSettingsStore) -> None:
        self._store_path.parent.mkdir(parents=True, exist_ok=True)
        self._store_path.write_text(
            store.model_dump_json(indent=2),
            encoding="utf-8",
        )
