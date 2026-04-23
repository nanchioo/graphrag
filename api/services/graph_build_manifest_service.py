# Copyright (c) 2024 Microsoft Corporation.
# Licensed under the MIT License

"""Persisted file-level build manifest helpers for graph builds."""

from __future__ import annotations

import hashlib
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal
from uuid import uuid4

from pydantic import BaseModel, Field

from api.schemas.graph import GraphBuildAction, GraphFileBuildStatus, SourceFileItem

GraphManifestProjectStatus = Literal["pending", "building", "failed", "completed"]


class BuildManifestFileEntry(BaseModel):
    """Per-source-file build state persisted across runs."""

    relative_path: str
    name: str
    extension: str
    size_bytes: int
    modified_at: str
    content_hash: str
    status: GraphFileBuildStatus = "pending"
    attempt_count: int = 0
    last_error: str | None = None
    started_at: str | None = None
    finished_at: str | None = None
    document_count: int = 0
    text_unit_count: int = 0


class BuildManifestInputDiff(BaseModel):
    """Classification of source input changes since the previous manifest scan."""

    added: list[str] = Field(default_factory=list)
    changed: list[str] = Field(default_factory=list)
    deleted: list[str] = Field(default_factory=list)


class BuildManifest(BaseModel):
    """Project-level manifest state persisted in logs/build_manifest.json."""

    build_id: str
    graph_id: str
    status: GraphManifestProjectStatus = "pending"
    action: GraphBuildAction = "start"
    current_file: str | None = None
    started_at: str | None = None
    updated_at: str | None = None
    completed_file_count: int = 0
    failed_file_count: int = 0
    pending_file_count: int = 0
    last_error: str | None = None
    resumable: bool = False
    input_diff: BuildManifestInputDiff = Field(default_factory=BuildManifestInputDiff)
    files: list[BuildManifestFileEntry] = Field(default_factory=list)


class GraphBuildManifestService:
    """Create, refresh, and merge persisted file-level build manifests."""

    def manifest_path(self, root_dir: Path) -> Path:
        return root_dir / "logs" / "build_manifest.json"

    def load_manifest(self, root_dir: Path) -> BuildManifest:
        return BuildManifest.model_validate_json(
            self.manifest_path(root_dir).read_text(encoding="utf-8")
        )

    def delete_manifest(self, root_dir: Path) -> None:
        path = self.manifest_path(root_dir)
        if path.exists():
            path.unlink()

    def initialize_manifest(self, root_dir: Path, graph_id: str) -> BuildManifest:
        now = self._utcnow()
        manifest = BuildManifest(
            build_id=uuid4().hex,
            graph_id=graph_id,
            status="pending",
            action="start",
            started_at=now,
            updated_at=now,
            files=self._scan_input_files(root_dir),
        )
        return self._save_manifest(root_dir, self._recount(manifest))

    def prepare_manifest(
        self,
        root_dir: Path,
        graph_id: str,
        action: GraphBuildAction,
    ) -> BuildManifest:
        if not self.manifest_path(root_dir).exists():
            return self.initialize_manifest(root_dir=root_dir, graph_id=graph_id)
        if action == "start":
            manifest = self.load_manifest(root_dir)
            if manifest.status != "completed":
                return self.initialize_manifest(root_dir=root_dir, graph_id=graph_id)
        return self.refresh_manifest(root_dir=root_dir, action=action)

    def refresh_manifest(self, root_dir: Path, action: GraphBuildAction) -> BuildManifest:
        manifest = self.load_manifest(root_dir)
        previous_by_path = {item.relative_path: item for item in manifest.files}
        current_files = self._scan_input_files(root_dir)
        current_by_path = {item.relative_path: item for item in current_files}
        refreshed_files: list[BuildManifestFileEntry] = []
        added: list[str] = []
        changed: list[str] = []

        for current_item in current_files:
            previous_item = previous_by_path.get(current_item.relative_path)
            if previous_item is None:
                added.append(current_item.relative_path)
                refreshed_files.append(current_item)
                continue

            if not self._is_unchanged(previous_item=previous_item, current_item=current_item):
                changed.append(current_item.relative_path)
                refreshed_files.append(current_item.model_copy(update={"status": "pending"}))
                continue

            if action == "start" and previous_item.status == "succeeded":
                refreshed_files.append(previous_item.model_copy(update={"status": "skipped"}))
                continue

            refreshed_files.append(previous_item)

        deleted = sorted(set(previous_by_path) - set(current_by_path))
        refreshed = manifest.model_copy(
            update={
                "action": action,
                "updated_at": self._utcnow(),
                "input_diff": BuildManifestInputDiff(
                    added=added,
                    changed=changed,
                    deleted=deleted,
                ),
                "files": refreshed_files,
            }
        )
        return self._save_manifest(root_dir, self._recount(refreshed))

    def select_files_for_action(
        self,
        root_dir: Path,
        action: GraphBuildAction,
    ) -> list[BuildManifestFileEntry]:
        manifest = self.refresh_manifest(root_dir=root_dir, action=action)
        if action == "start":
            return [item for item in manifest.files if item.status != "skipped"]
        return [
            item
            for item in manifest.files
            if item.status in {"pending", "failed", "building"}
        ]

    def is_resumable(self, root_dir: Path) -> bool:
        path = self.manifest_path(root_dir)
        if not path.exists():
            return False

        manifest = self.load_manifest(root_dir)
        return manifest.resumable or any(
            item.status in {"pending", "failed", "building"} for item in manifest.files
        )

    def compare_inputs_to_manifest(self, root_dir: Path) -> BuildManifestInputDiff:
        path = self.manifest_path(root_dir)
        if not path.exists():
            return BuildManifestInputDiff()

        manifest = self.load_manifest(root_dir)
        if manifest.status != "completed":
            return BuildManifestInputDiff()

        previous_by_path = {item.relative_path: item for item in manifest.files}
        current_files = self._scan_input_files(root_dir)
        current_by_path = {item.relative_path: item for item in current_files}

        added = sorted(set(current_by_path) - set(previous_by_path))
        deleted = sorted(set(previous_by_path) - set(current_by_path))
        changed = sorted(
            path
            for path, current_item in current_by_path.items()
            if path in previous_by_path
            and not self._is_unchanged(
                previous_item=previous_by_path[path],
                current_item=current_item,
            )
        )

        return BuildManifestInputDiff(
            added=added,
            changed=changed,
            deleted=deleted,
        )

    def mark_file_started(self, root_dir: Path, relative_path: str) -> BuildManifest:
        manifest = self.load_manifest(root_dir)
        now = self._utcnow()
        updated_files = [
            item.model_copy(
                update={
                    "status": "building" if item.relative_path == relative_path else item.status,
                    "attempt_count": (
                        item.attempt_count + 1
                        if item.relative_path == relative_path
                        else item.attempt_count
                    ),
                    "started_at": now if item.relative_path == relative_path else item.started_at,
                    "last_error": None if item.relative_path == relative_path else item.last_error,
                }
            )
            for item in manifest.files
        ]
        updated = manifest.model_copy(
            update={
                "status": "building",
                "current_file": relative_path,
                "updated_at": now,
                "resumable": False,
                "files": updated_files,
            }
        )
        return self._save_manifest(root_dir, self._recount(updated))

    def mark_file_succeeded(
        self,
        root_dir: Path,
        relative_path: str,
        document_count: int,
        text_unit_count: int,
    ) -> BuildManifest:
        manifest = self.load_manifest(root_dir)
        now = self._utcnow()
        updated_files = [
            item.model_copy(
                update={
                    "status": "succeeded" if item.relative_path == relative_path else item.status,
                    "finished_at": now if item.relative_path == relative_path else item.finished_at,
                    "document_count": (
                        document_count
                        if item.relative_path == relative_path
                        else item.document_count
                    ),
                    "text_unit_count": (
                        text_unit_count
                        if item.relative_path == relative_path
                        else item.text_unit_count
                    ),
                    "last_error": None if item.relative_path == relative_path else item.last_error,
                }
            )
            for item in manifest.files
        ]
        updated = manifest.model_copy(
            update={
                "current_file": None,
                "updated_at": now,
                "files": updated_files,
            }
        )
        return self._save_manifest(root_dir, self._recount(updated))

    def mark_file_failed(
        self,
        root_dir: Path,
        relative_path: str,
        error_message: str,
    ) -> BuildManifest:
        manifest = self.load_manifest(root_dir)
        now = self._utcnow()
        updated_files = [
            item.model_copy(
                update={
                    "status": "failed" if item.relative_path == relative_path else item.status,
                    "finished_at": now if item.relative_path == relative_path else item.finished_at,
                    "last_error": (
                        error_message if item.relative_path == relative_path else item.last_error
                    ),
                }
            )
            for item in manifest.files
        ]
        updated = manifest.model_copy(
            update={
                "status": "failed",
                "current_file": None,
                "updated_at": now,
                "last_error": error_message,
                "resumable": True,
                "files": updated_files,
            }
        )
        return self._save_manifest(root_dir, self._recount(updated))

    def mark_project_completed(self, root_dir: Path) -> BuildManifest:
        manifest = self.load_manifest(root_dir)
        updated = manifest.model_copy(
            update={
                "status": "completed",
                "current_file": None,
                "updated_at": self._utcnow(),
                "last_error": None,
                "resumable": False,
            }
        )
        return self._save_manifest(root_dir, self._recount(updated))

    def mark_interrupted(self, root_dir: Path, error_message: str) -> BuildManifest:
        manifest = self.load_manifest(root_dir)
        now = self._utcnow()
        current_file = manifest.current_file
        updated_files = [
            item.model_copy(
                update={
                    "status": (
                        "failed"
                        if item.status == "building"
                        or item.relative_path == current_file
                        else item.status
                    ),
                    "finished_at": (
                        now
                        if item.status == "building"
                        or item.relative_path == current_file
                        else item.finished_at
                    ),
                    "last_error": (
                        error_message
                        if item.status == "building"
                        or item.relative_path == current_file
                        else item.last_error
                    ),
                }
            )
            for item in manifest.files
        ]
        updated = manifest.model_copy(
            update={
                "status": "failed",
                "current_file": None,
                "updated_at": now,
                "last_error": error_message,
                "resumable": True,
                "files": updated_files,
            }
        )
        return self._save_manifest(root_dir, self._recount(updated))

    def update_progress(
        self,
        root_dir: Path,
        relative_path: str,
        stage: str,
        message: str,
    ) -> BuildManifest:
        del stage, message
        manifest = self.load_manifest(root_dir)
        updated = manifest.model_copy(
            update={
                "status": "building",
                "current_file": relative_path,
                "updated_at": self._utcnow(),
            }
        )
        return self._save_manifest(root_dir, self._recount(updated))

    def merge_source_items(
        self,
        root_dir: Path,
        items: list[SourceFileItem],
    ) -> list[SourceFileItem]:
        manifest_by_path: dict[str, BuildManifestFileEntry] = {}
        current_file: str | None = None
        if self.manifest_path(root_dir).exists():
            manifest = self.load_manifest(root_dir)
            current_file = manifest.current_file
            manifest_by_path = {
                item.relative_path: item for item in manifest.files
            }

        merged: list[SourceFileItem] = []
        for item in items:
            manifest_item = manifest_by_path.get(item.relative_path)
            merged.append(
                item.model_copy(
                    update={
                        "build_status": None if manifest_item is None else manifest_item.status,
                        "is_current": item.relative_path == current_file,
                        "attempt_count": (
                            0 if manifest_item is None else manifest_item.attempt_count
                        ),
                        "last_build_error": (
                            None if manifest_item is None else manifest_item.last_error
                        ),
                        "last_built_at": (
                            None if manifest_item is None else manifest_item.finished_at
                        ),
                        "document_count": (
                            0 if manifest_item is None else manifest_item.document_count
                        ),
                        "text_unit_count": (
                            0 if manifest_item is None else manifest_item.text_unit_count
                        ),
                    }
                )
            )
        return merged

    def _scan_input_files(self, root_dir: Path) -> list[BuildManifestFileEntry]:
        input_dir = root_dir / "input"
        if not input_dir.exists():
            return []

        entries: list[BuildManifestFileEntry] = []
        for file_path in sorted(path for path in input_dir.rglob("*") if path.is_file()):
            relative_path = str(file_path.relative_to(input_dir)).replace("\\", "/")
            stat = file_path.stat()
            entries.append(
                BuildManifestFileEntry(
                    relative_path=relative_path,
                    name=file_path.name,
                    extension=file_path.suffix.lower(),
                    size_bytes=stat.st_size,
                    modified_at=datetime.fromtimestamp(
                        stat.st_mtime,
                        tz=timezone.utc,
                    ).isoformat(),
                    content_hash=hashlib.sha256(file_path.read_bytes()).hexdigest(),
                )
            )
        return entries

    def _save_manifest(self, root_dir: Path, manifest: BuildManifest) -> BuildManifest:
        path = self.manifest_path(root_dir)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(manifest.model_dump_json(indent=2), encoding="utf-8")
        return manifest

    def _is_unchanged(
        self,
        previous_item: BuildManifestFileEntry,
        current_item: BuildManifestFileEntry,
    ) -> bool:
        return (
            previous_item.size_bytes == current_item.size_bytes
            and previous_item.modified_at == current_item.modified_at
            and previous_item.content_hash == current_item.content_hash
        )

    def _recount(self, manifest: BuildManifest) -> BuildManifest:
        return manifest.model_copy(
            update={
                "completed_file_count": sum(
                    1 for item in manifest.files if item.status == "succeeded"
                ),
                "failed_file_count": sum(
                    1 for item in manifest.files if item.status == "failed"
                ),
                "pending_file_count": sum(
                    1 for item in manifest.files if item.status == "pending"
                ),
            }
        )

    def _utcnow(self) -> str:
        return datetime.now(timezone.utc).isoformat()
