# Copyright (c) 2024 Microsoft Corporation.
# Licensed under the MIT License

"""Configuration router skeleton."""

from fastapi import APIRouter, Depends, status

from api.deps import (
    get_app_config_service,
    get_model_profile_validation_service,
)
from api.schemas.common import ApiResponse
from api.schemas.config import (
    DeleteModelProfilePayload,
    ModelProfileCreateRequest,
    ModelProfileConnectionPayload,
    ModelProfileListPayload,
    ModelProfileResponse,
    ModelProfileUpdateRequest,
    SystemConfigPayload,
)
from api.services.app_config_service import AppConfigService
from api.services.model_profile_validation_service import (
    ModelProfileValidationService,
)

router = APIRouter(prefix="/api/config", tags=["config"])


@router.get("/system", response_model=ApiResponse[SystemConfigPayload])
async def get_system_config(
    app_config_service: AppConfigService = Depends(get_app_config_service),
) -> ApiResponse[SystemConfigPayload]:
    """Return the persisted system configuration."""
    return ApiResponse(
        message="Config router is mounted.",
        data=app_config_service.get_system_config(),
    )


@router.put("/system", response_model=ApiResponse[SystemConfigPayload])
async def update_system_config(
    payload: SystemConfigPayload,
    app_config_service: AppConfigService = Depends(get_app_config_service),
) -> ApiResponse[SystemConfigPayload]:
    """Update the persisted system configuration."""
    return ApiResponse(
        message="System configuration updated.",
        data=app_config_service.update_system_config(payload),
    )


@router.get("/models", response_model=ApiResponse[ModelProfileListPayload])
async def list_model_profiles(
    app_config_service: AppConfigService = Depends(get_app_config_service),
) -> ApiResponse[ModelProfileListPayload]:
    """List model profiles with masked secrets."""
    items = app_config_service.list_model_profiles()
    return ApiResponse(
        message="Model profiles loaded.",
        data=ModelProfileListPayload(items=items, total=len(items)),
    )


@router.post(
    "/models",
    response_model=ApiResponse[ModelProfileResponse],
    status_code=status.HTTP_201_CREATED,
)
async def create_model_profile(
    payload: ModelProfileCreateRequest,
    app_config_service: AppConfigService = Depends(get_app_config_service),
    model_profile_validation_service: ModelProfileValidationService = Depends(
        get_model_profile_validation_service
    ),
) -> ApiResponse[ModelProfileResponse]:
    """Create a model profile and return its masked view."""
    model_profile_validation_service.validate_create_request(payload)
    return ApiResponse(
        message="Model profile created.",
        data=app_config_service.create_model_profile(payload),
    )


@router.put("/models/{profile_id}", response_model=ApiResponse[ModelProfileResponse])
async def update_model_profile(
    profile_id: str,
    payload: ModelProfileUpdateRequest,
    app_config_service: AppConfigService = Depends(get_app_config_service),
    model_profile_validation_service: ModelProfileValidationService = Depends(
        get_model_profile_validation_service
    ),
) -> ApiResponse[ModelProfileResponse]:
    """Update a model profile and return its masked view."""
    existing_profile = app_config_service.get_model_profile(profile_id)
    model_profile_validation_service.validate_update_request(
        existing_profile,
        payload,
    )
    return ApiResponse(
        message="Model profile updated.",
        data=app_config_service.update_model_profile(profile_id, payload),
    )


@router.delete(
    "/models/{profile_id}",
    response_model=ApiResponse[DeleteModelProfilePayload],
)
async def delete_model_profile(
    profile_id: str,
    app_config_service: AppConfigService = Depends(get_app_config_service),
) -> ApiResponse[DeleteModelProfilePayload]:
    """Delete a model profile."""
    return ApiResponse(
        message="Model profile deleted.",
        data=app_config_service.delete_model_profile(profile_id),
    )


@router.post(
    "/models/{profile_id}/connect",
    response_model=ApiResponse[ModelProfileConnectionPayload],
)
async def connect_model_profile(
    profile_id: str,
    app_config_service: AppConfigService = Depends(get_app_config_service),
    model_profile_validation_service: ModelProfileValidationService = Depends(
        get_model_profile_validation_service
    ),
) -> ApiResponse[ModelProfileConnectionPayload]:
    """Run an explicit connection test for a saved model profile."""
    profile = app_config_service.get_model_profile(profile_id)
    model_profile_validation_service.validate_connection(profile)
    return ApiResponse(
        message="Model profile connection succeeded.",
        data=ModelProfileConnectionPayload(profile_id=profile_id, connected=True),
    )
