# Copyright (c) 2024 Microsoft Corporation.
# Licensed under the MIT License

"""File-backed graph registry service."""

from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException, status
from pydantic import BaseModel, Field

from api.schemas.graph import GraphSummary


class StoredGraphProject(BaseModel):
    """Persisted graph project metadata."""

    id: str
    name: str
    description: str | None = None
    root_dir: str
    status: str
    model_profile_id: str | None = None
    created_at: str
    last_build_at: str | None = None
    last_error: str | None = None


class GraphRegistryStore(BaseModel):
    """Top-level JSON document persisted by the graph registry service."""

    items: list[StoredGraphProject] = Field(default_factory=list)


class GraphRegistryService:
    """Manage graph project metadata in a JSON file."""

    def __init__(self, store_path: Path, project_root: Path | None = None):
        self._store_path = store_path
        self._project_root = (
            project_root.resolve() if project_root is not None else Path.cwd().resolve()
        )

    @property
    def store_path(self) -> Path:
        """Return the JSON storage path used by the service."""
        return self._store_path

    @property
    def project_root(self) -> Path:
        """Return the base directory used to resolve relative graph workspaces."""
        return self._project_root

    def list_graphs(self) -> list[GraphSummary]:
        """Return graph summaries."""
        store = self._load_store()
        return [
            GraphSummary(
                id=item.id,
                name=item.name,
                status=item.status,
                model_profile_id=item.model_profile_id,
            )
            for item in store.items
        ]

    def list_graph_projects(self) -> list[StoredGraphProject]:
        """Return full stored graph project records with resolved root paths."""
        store = self._load_store()
        return [
            item.model_copy(update={"root_dir": str(self.resolve_root_dir(item.root_dir))})
            for item in store.items
        ]

    def count_graphs(self) -> int:
        """Return the number of registered graphs."""
        return len(self._load_store().items)

    def get_graph(self, graph_id: str) -> StoredGraphProject:
        """Return graph details for a single project."""
        store = self._load_store()
        for item in store.items:
            if item.id == graph_id:
                return item.model_copy(
                    update={"root_dir": str(self.resolve_root_dir(item.root_dir))}
                )

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Graph project '{graph_id}' was not found.",
        )

    def generate_graph_id(self, name: str) -> str:
        """Generate a stable-looking graph identifier from the name."""
        slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
        slug = slug or "graph"
        return f"{slug}-{uuid4().hex[:8]}"

    def create_graph(
        self,
        graph_id: str,
        name: str,
        description: str | None,
        root_dir: str,
        model_profile_id: str | None,
    ) -> StoredGraphProject:
        """Persist a new graph project record."""
        store = self._load_store()
        graph = StoredGraphProject(
            id=graph_id,
            name=name,
            description=description,
            root_dir=str(self.resolve_root_dir(root_dir)),
            status="initialized",
            model_profile_id=model_profile_id,
            created_at=datetime.now(timezone.utc).isoformat(),
            last_build_at=None,
            last_error=None,
        )
        store.items.append(graph)
        self._save_store(store)
        return graph

    def resolve_root_dir(self, root_dir: str | Path) -> Path:
        """Resolve a stored graph workspace path to an absolute filesystem path."""
        path = Path(root_dir)
        if path.is_absolute():
            return path.resolve()
        return (self._project_root / path).resolve()

    def mark_build_started(self, graph_id: str) -> StoredGraphProject:
        """Mark a graph project as currently building."""
        graph = self.get_graph(graph_id)
        graph.status = "building"
        graph.last_error = None
        return self._update_graph(graph)

    def mark_build_succeeded(self, graph_id: str) -> StoredGraphProject:
        """Mark a graph project as successfully built."""
        graph = self.get_graph(graph_id)
        graph.status = "ready"
        graph.last_build_at = datetime.now(timezone.utc).isoformat()
        graph.last_error = None
        return self._update_graph(graph)

    def mark_build_failed(
        self, graph_id: str, error_message: str
    ) -> StoredGraphProject:
        """Mark a graph project build as failed."""
        graph = self.get_graph(graph_id)
        graph.status = "failed"
        graph.last_error = error_message
        return self._update_graph(graph)

    def mark_artifacts_deleted(self, graph_id: str) -> StoredGraphProject:
        """Mark a graph project as having its generated artifacts removed."""
        graph = self.get_graph(graph_id)
        graph.status = "artifacts_deleted"
        graph.last_error = None
        return self._update_graph(graph)

    def delete_graph(self, graph_id: str) -> StoredGraphProject:
        """Delete a graph project record from the registry."""
        graph = self.get_graph(graph_id)
        store = self._load_store()
        store.items = [item for item in store.items if item.id != graph_id]
        self._save_store(store)
        return graph

    def _load_store(self) -> GraphRegistryStore:
        if not self._store_path.exists():
            store = GraphRegistryStore()
            self._save_store(store)
            return store

        data = json.loads(self._store_path.read_text(encoding="utf-8"))
        return GraphRegistryStore(**data)

    def _save_store(self, store: GraphRegistryStore) -> None:
        self._store_path.parent.mkdir(parents=True, exist_ok=True)
        self._store_path.write_text(
            store.model_dump_json(indent=2),
            encoding="utf-8",
        )

    def _update_graph(self, updated_graph: StoredGraphProject) -> StoredGraphProject:
        store = self._load_store()
        store.items = [
            updated_graph if item.id == updated_graph.id else item for item in store.items
        ]
        self._save_store(store)
        return updated_graph
