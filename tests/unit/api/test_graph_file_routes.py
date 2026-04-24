# Copyright (c) 2024 Microsoft Corporation.
# Licensed under the MIT License

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from api.deps import get_app_config_service, get_graph_registry_service
from api.schemas.config import SystemConfigPayload
from api.services.app_config_service import AppConfigService
from api.services.graph_build_manifest_service import GraphBuildManifestService
from api.services.graph_registry_service import GraphRegistryService
from api.services.source_ingest_service import SourceIngestService
from main import app


@pytest.fixture
def graph_file_client(
    tmp_path: Path,
) -> tuple[TestClient, Path, AppConfigService, GraphRegistryService]:
    """Create a test client backed by isolated config and graph storage."""

    settings_path = tmp_path / "app_settings.json"
    registry_path = tmp_path / "graph_registry.json"
    projects_root = tmp_path / "projects"

    app_config_service = AppConfigService(settings_path)
    app_config_service.update_system_config(
        SystemConfigPayload(
            projects_root=str(projects_root),
            upload_root=str(projects_root),
            default_model_profile_id=None,
        )
    )
    graph_registry_service = GraphRegistryService(registry_path)

    app.dependency_overrides[get_app_config_service] = lambda: app_config_service
    app.dependency_overrides[get_graph_registry_service] = (
        lambda: graph_registry_service
    )

    with TestClient(app) as client:
        yield client, projects_root, app_config_service, graph_registry_service

    app.dependency_overrides.clear()


def test_upload_graph_files_persists_files_and_lists_sources(
    graph_file_client: tuple[
        TestClient, Path, AppConfigService, GraphRegistryService
    ],
):
    client, projects_root, _, _ = graph_file_client

    create_response = client.post(
        "/api/graph",
        json={
            "name": "Upload Graph",
            "description": "source upload test",
        },
    )
    assert create_response.status_code == 201
    graph_id = create_response.json()["data"]["id"]
    input_dir = projects_root / graph_id / "input"

    upload_response = client.post(
        f"/api/graph/{graph_id}/files",
        files=[
            ("files", ("notes.txt", b"hello graph", "text/plain")),
            (
                "files",
                (
                    "records.json",
                    b'{"id":"1","title":"JSON Doc","text":"json body"}',
                    "application/json",
                ),
            ),
        ],
    )

    assert upload_response.status_code == 201
    payload = upload_response.json()
    assert payload["success"] is True
    assert payload["message"] == "Source files uploaded."
    assert payload["data"]["total"] == 2
    assert [item["name"] for item in payload["data"]["items"]] == [
        "notes.txt",
        "records.json",
    ]
    assert payload["data"]["items"][0]["relative_path"] == "notes.txt"
    assert payload["data"]["items"][0]["extension"] == ".txt"
    assert payload["data"]["items"][0]["size_bytes"] == 11
    assert payload["data"]["items"][0]["created_at"]
    assert payload["data"]["items"][1]["relative_path"] == "records.json"
    assert payload["data"]["items"][1]["extension"] == ".json"
    assert payload["data"]["items"][1]["size_bytes"] == 48
    assert payload["data"]["items"][1]["created_at"]

    assert (input_dir / "notes.txt").read_bytes() == b"hello graph"
    assert (
        (input_dir / "records.json").read_text(encoding="utf-8")
        == '{"id":"1","title":"JSON Doc","text":"json body"}'
    )

    list_response = client.get(f"/api/graph/{graph_id}/files")
    assert list_response.status_code == 200
    assert list_response.json() == {
        "success": True,
        "message": "Source files loaded.",
        "data": payload["data"],
    }

    status_response = client.get(f"/api/graph/{graph_id}/status")
    assert status_response.status_code == 200
    assert status_response.json()["data"] == {
        "graph_id": graph_id,
        "status": "awaiting_build",
        "last_build_at": None,
        "last_error": None,
        "has_source_files": True,
        "source_file_count": 2,
        "document_count": 0,
        "text_unit_count": 0,
        "has_artifacts": False,
        "artifact_paths": [],
        "progress_percent": 10,
        "progress_stage": "awaiting_build",
        "progress_message": "已上传源文件, 等待开始构建。",
        "resumable": False,
        "current_file": None,
        "completed_file_count": 0,
        "failed_file_count": 0,
        "pending_file_count": 0,
    }

    graph_list_response = client.get("/api/graph")
    assert graph_list_response.status_code == 200
    assert graph_list_response.json()["data"]["items"] == [
        {
            "id": graph_id,
            "name": "Upload Graph",
            "status": "awaiting_build",
            "model_profile_id": None,
        }
    ]


def test_upload_graph_files_rejects_duplicate_source_names(
    graph_file_client: tuple[
        TestClient, Path, AppConfigService, GraphRegistryService
    ],
):
    client, projects_root, _, _ = graph_file_client

    create_response = client.post(
        "/api/graph",
        json={"name": "Duplicate Graph"},
    )
    assert create_response.status_code == 201
    graph_id = create_response.json()["data"]["id"]
    input_dir = projects_root / graph_id / "input"

    first_upload = client.post(
        f"/api/graph/{graph_id}/files",
        files=[("files", ("notes.txt", b"hello graph", "text/plain"))],
    )
    assert first_upload.status_code == 201

    duplicate_upload = client.post(
        f"/api/graph/{graph_id}/files",
        files=[("files", ("notes.txt", b"duplicate", "text/plain"))],
    )

    assert duplicate_upload.status_code == 409
    assert "already exists" in duplicate_upload.json()["message"]
    assert (input_dir / "notes.txt").read_bytes() == b"hello graph"
    assert not (input_dir / "notes-1.txt").exists()


def test_delete_graph_source_file_removes_uploaded_file(
    graph_file_client: tuple[
        TestClient, Path, AppConfigService, GraphRegistryService
    ],
):
    client, projects_root, _, _ = graph_file_client

    create_response = client.post(
        "/api/graph",
        json={"name": "Delete Source Graph"},
    )
    assert create_response.status_code == 201
    graph_id = create_response.json()["data"]["id"]
    input_dir = projects_root / graph_id / "input"

    upload_response = client.post(
        f"/api/graph/{graph_id}/files",
        files=[("files", ("notes.txt", b"hello graph", "text/plain"))],
    )
    assert upload_response.status_code == 201
    assert (input_dir / "notes.txt").exists()

    delete_response = client.delete(f"/api/graph/{graph_id}/files/notes.txt")

    assert delete_response.status_code == 200
    assert delete_response.json() == {
        "success": True,
        "message": "Source file deleted.",
        "data": {
            "graph_id": graph_id,
            "relative_path": "notes.txt",
            "status": "deleted",
        },
    }
    assert not (input_dir / "notes.txt").exists()

    list_response = client.get(f"/api/graph/{graph_id}/files")
    assert list_response.status_code == 200
    assert list_response.json()["data"] == {"items": [], "total": 0}


@pytest.mark.asyncio
async def test_source_ingest_service_loads_mixed_supported_documents(tmp_path: Path):
    input_dir = tmp_path / "input"
    input_dir.mkdir(parents=True, exist_ok=True)
    (input_dir / "article.txt").write_text("plain text body", encoding="utf-8")
    (input_dir / "guide.md").write_text("# Guide\n\nmarkdown body", encoding="utf-8")
    (input_dir / "records.json").write_text(
        '[{"id":"json-1","title":"JSON One","text":"json text"}]',
        encoding="utf-8",
    )
    (input_dir / "records.jsonl").write_text(
        '{"id":"jsonl-1","title":"JSONL One","text":"first row"}\n'
        '{"id":"jsonl-2","title":"JSONL Two","text":"second row"}',
        encoding="utf-8",
    )
    (input_dir / "records.csv").write_text(
        "id,title,text\ncsv-1,CSV One,csv row\n",
        encoding="utf-8",
    )

    service = SourceIngestService()

    documents = await service.load_source_documents(input_dir)

    assert len(documents) == 6
    titles = {document.title for document in documents}
    assert "article.txt" in titles
    assert "guide.md" in titles
    assert "JSON One" in titles
    assert "JSONL One" in titles
    assert "JSONL Two" in titles
    assert "CSV One" in titles
    text_by_title = {document.title: document.text for document in documents}
    assert text_by_title["article.txt"] == "plain text body"
    assert text_by_title["guide.md"] == "# Guide\n\nmarkdown body"
    assert text_by_title["JSON One"] == "json text"
    assert text_by_title["JSONL One"] == "first row"
    assert text_by_title["JSONL Two"] == "second row"
    assert text_by_title["CSV One"] == "csv row"


@pytest.mark.asyncio
async def test_source_ingest_service_can_load_only_selected_relative_paths(
    tmp_path: Path,
):
    input_dir = tmp_path / "input"
    input_dir.mkdir(parents=True, exist_ok=True)
    (input_dir / "keep.txt").write_text("keep me", encoding="utf-8")
    (input_dir / "skip.txt").write_text("skip me", encoding="utf-8")

    service = SourceIngestService()
    documents = await service.load_source_documents(
        input_dir,
        relative_paths=["keep.txt"],
    )

    assert [document.title for document in documents] == ["keep.txt"]


def test_list_graph_files_includes_manifest_build_metadata(
    graph_file_client: tuple[
        TestClient, Path, AppConfigService, GraphRegistryService
    ],
):
    client, projects_root, _, _ = graph_file_client

    create_response = client.post(
        "/api/graph",
        json={
            "name": "Metadata Graph",
            "description": "file metadata route test",
        },
    )
    assert create_response.status_code == 201
    graph_id = create_response.json()["data"]["id"]

    upload_response = client.post(
        f"/api/graph/{graph_id}/files",
        files=[("files", ("notes.txt", b"hello graph", "text/plain"))],
    )
    assert upload_response.status_code == 201

    root_dir = projects_root / graph_id
    manifest_service = GraphBuildManifestService()
    manifest_service.initialize_manifest(root_dir, graph_id=graph_id)
    manifest_service.mark_file_started(root_dir, "notes.txt")
    manifest_service.mark_file_failed(root_dir, "notes.txt", "provider timeout")

    list_response = client.get(f"/api/graph/{graph_id}/files")

    assert list_response.status_code == 200
    item = list_response.json()["data"]["items"][0]
    assert item["build_status"] == "failed"
    assert item["is_current"] is False
    assert item["attempt_count"] == 1
    assert item["last_build_error"] == "provider timeout"
    assert item["last_built_at"]
