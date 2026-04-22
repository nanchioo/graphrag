# Copyright (c) 2024 Microsoft Corporation.
# Licensed under the MIT License

from pathlib import Path

from api.services.graph_build_manifest_service import GraphBuildManifestService


def test_initialize_manifest_creates_pending_entries_for_each_source_file(
    tmp_path: Path,
):
    root_dir = tmp_path / "graph"
    input_dir = root_dir / "input"
    input_dir.mkdir(parents=True, exist_ok=True)
    (input_dir / "a.txt").write_text("alpha", encoding="utf-8")
    (input_dir / "b.txt").write_text("beta", encoding="utf-8")

    service = GraphBuildManifestService()
    manifest = service.initialize_manifest(root_dir=root_dir, graph_id="graph-1")

    assert manifest.graph_id == "graph-1"
    assert [item.relative_path for item in manifest.files] == ["a.txt", "b.txt"]
    assert {item.status for item in manifest.files} == {"pending"}
    assert service.manifest_path(root_dir).exists()


def test_refresh_manifest_marks_changed_files_pending_and_drops_deleted_files(
    tmp_path: Path,
):
    root_dir = tmp_path / "graph"
    input_dir = root_dir / "input"
    input_dir.mkdir(parents=True, exist_ok=True)
    (input_dir / "a.txt").write_text("alpha", encoding="utf-8")
    (input_dir / "b.txt").write_text("beta", encoding="utf-8")

    service = GraphBuildManifestService()
    service.initialize_manifest(root_dir=root_dir, graph_id="graph-1")
    service.mark_file_succeeded(
        root_dir=root_dir,
        relative_path="a.txt",
        document_count=1,
        text_unit_count=3,
    )
    service.mark_file_succeeded(
        root_dir=root_dir,
        relative_path="b.txt",
        document_count=1,
        text_unit_count=2,
    )

    (input_dir / "a.txt").write_text("alpha changed", encoding="utf-8")
    (input_dir / "b.txt").unlink()
    (input_dir / "c.txt").write_text("gamma", encoding="utf-8")

    refreshed = service.refresh_manifest(root_dir=root_dir, action="resume")

    statuses = {item.relative_path: item.status for item in refreshed.files}
    assert statuses == {
        "a.txt": "pending",
        "c.txt": "pending",
    }


def test_select_files_for_resume_only_returns_pending_and_failed(tmp_path: Path):
    root_dir = tmp_path / "graph"
    input_dir = root_dir / "input"
    input_dir.mkdir(parents=True, exist_ok=True)
    for name in ("a.txt", "b.txt", "c.txt"):
        (input_dir / name).write_text(name, encoding="utf-8")

    service = GraphBuildManifestService()
    service.initialize_manifest(root_dir=root_dir, graph_id="graph-1")
    service.mark_file_succeeded(
        root_dir=root_dir,
        relative_path="a.txt",
        document_count=1,
        text_unit_count=1,
    )
    service.mark_file_failed(
        root_dir=root_dir,
        relative_path="b.txt",
        error_message="provider timeout",
    )

    selected = service.select_files_for_action(root_dir=root_dir, action="resume")

    assert [item.relative_path for item in selected] == ["b.txt", "c.txt"]
