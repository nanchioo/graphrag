# Copyright (c) 2024 Microsoft Corporation.
# Licensed under the MIT License

"""FastAPI entrypoint for the GraphRAG admin API."""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from api.routers.config import router as config_router
from api.routers.graph import router as graph_router
from api.routers.query import router as query_router
from api.schemas.common import ApiResponse, AppInfoPayload, HealthPayload

APP_NAME = "GraphRAG Admin API"
APP_VERSION = "0.1.0"
SERVICE_NAME = "graphrag-admin-api"
WEB_DIST_DIR = Path("web/dist")
CONSOLE_PREFIX = "/console"

logger = logging.getLogger(__name__)


def _normalize_error_data(data: Any) -> Any:
    if isinstance(data, BaseException):
        return str(data)
    if isinstance(data, dict):
        return {key: _normalize_error_data(value) for key, value in data.items()}
    if isinstance(data, list):
        return [_normalize_error_data(item) for item in data]
    if isinstance(data, tuple):
        return [_normalize_error_data(item) for item in data]
    return data


def _error_response(status_code: int, message: str, data: Any = None) -> JSONResponse:
    payload = ApiResponse[Any](success=False, message=message, data=data)
    return JSONResponse(status_code=status_code, content=payload.model_dump())


def http_exception_handler(_, exc: HTTPException) -> JSONResponse:
    """Normalize HTTP exceptions into the shared API response format."""
    return _error_response(exc.status_code, str(exc.detail))


def validation_exception_handler(_, exc: RequestValidationError) -> JSONResponse:
    """Return request validation errors in the shared API response format."""
    return _error_response(
        422,
        "Request validation failed.",
        _normalize_error_data(exc.errors()),
    )


def unhandled_exception_handler(_, exc: Exception) -> JSONResponse:
    """Return unexpected server errors in the shared API response format."""
    logger.exception("Unhandled server error.", exc_info=exc)
    message = str(exc) or "Internal server error."
    return _error_response(500, message)


def _resolve_console_target(web_dist_dir: Path, relative_path: str) -> Path | None:
    candidate = (web_dist_dir / relative_path).resolve()
    try:
        candidate.relative_to(web_dist_dir.resolve())
    except ValueError:
        return None
    return candidate


def _configure_console_routes(app: FastAPI, web_dist_dir: Path) -> None:
    index_file = web_dist_dir / "index.html"
    if not index_file.exists():
        return

    assets_dir = web_dist_dir / "assets"
    if assets_dir.exists():
        app.mount(
            f"{CONSOLE_PREFIX}/assets",
            StaticFiles(directory=assets_dir),
            name="graphrag-web-assets",
        )

    @app.get(CONSOLE_PREFIX, include_in_schema=False)
    @app.get(f"{CONSOLE_PREFIX}/", include_in_schema=False)
    async def serve_console_index() -> FileResponse:
        """Serve the built web application shell."""
        return FileResponse(index_file)

    @app.get(f"{CONSOLE_PREFIX}/{{relative_path:path}}", include_in_schema=False)
    async def serve_console_app(relative_path: str) -> FileResponse:
        """Serve static files and fall back to the SPA shell for client routes."""
        target = _resolve_console_target(web_dist_dir, relative_path)
        if target and target.is_file():
            return FileResponse(target)

        if Path(relative_path).suffix:
            raise HTTPException(status_code=404, detail="Frontend asset not found.")

        return FileResponse(index_file)


def create_app(web_dist_dir: Path | None = None) -> FastAPI:
    """Create the FastAPI application and optionally attach static web hosting."""
    app = FastAPI(
        title=APP_NAME,
        version=APP_VERSION,
        description="FastAPI wrapper layer for GraphRAG management and query APIs.",
    )
    app.add_exception_handler(HTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(Exception, unhandled_exception_handler)

    @app.get("/", response_model=ApiResponse[AppInfoPayload])
    async def root() -> ApiResponse[AppInfoPayload]:
        """Expose basic API metadata."""
        return ApiResponse(
            message="GraphRAG admin API is running.",
            data=AppInfoPayload(
                name=APP_NAME,
                version=APP_VERSION,
                docs_url=app.docs_url or "/docs",
            ),
        )

    @app.get("/api/health", response_model=ApiResponse[HealthPayload])
    async def health() -> ApiResponse[HealthPayload]:
        """Expose a minimal health check endpoint."""
        return ApiResponse(
            message="Service health check passed.",
            data=HealthPayload(status="ok", service=SERVICE_NAME),
        )

    for router in (graph_router, config_router, query_router):
        app.include_router(router)

    _configure_console_routes(app, (web_dist_dir or WEB_DIST_DIR).resolve())
    return app


app = create_app()
