# Copyright (c) 2024 Microsoft Corporation.
# Licensed under the MIT License

"""Source file ingestion and normalization helpers for graph projects."""

from __future__ import annotations

import re
from pathlib import Path
from typing import TYPE_CHECKING

from fastapi import HTTPException, UploadFile, status
from graphrag_input.csv import CSVFileReader
from graphrag_input.json import JSONFileReader
from graphrag_input.jsonl import JSONLinesFileReader
from graphrag_input.markitdown import MarkItDownFileReader
from graphrag_input.text import TextFileReader
from graphrag_storage.file_storage import FileStorage

from api.schemas.graph import SourceFileItem

if TYPE_CHECKING:
    from graphrag_input.text_document import TextDocument

SUPPORTED_SOURCE_EXTENSIONS = frozenset(
    {".csv", ".json", ".jsonl", ".markdown", ".md", ".pdf", ".txt"}
)


class SourceIngestService:
    """Persist source uploads and normalize them with GraphRAG readers."""

    async def upload_files(
        self, input_dir: Path, files: list[UploadFile]
    ) -> list[SourceFileItem]:
        """Save uploaded files into the graph project's input directory."""
        storage = FileStorage(str(input_dir))
        saved_items: list[SourceFileItem] = []

        for upload in files:
            filename = self._normalize_filename(upload.filename)
            self._validate_extension(filename)

            stored_name = await self._allocate_name(storage, filename)
            contents = await upload.read()
            await storage.set(stored_name, contents)
            created_at = await storage.get_creation_date(stored_name)
            saved_items.append(
                SourceFileItem(
                    name=stored_name,
                    relative_path=stored_name,
                    extension=Path(stored_name).suffix.lower(),
                    size_bytes=len(contents),
                    created_at=created_at,
                )
            )
            await upload.close()

        return sorted(saved_items, key=lambda item: item.relative_path.lower())

    async def list_files(self, input_dir: Path) -> list[SourceFileItem]:
        """List uploaded files from the graph project's input directory."""
        if not input_dir.exists():
            return []

        storage = FileStorage(str(input_dir))
        items: list[SourceFileItem] = []
        for relative_path in sorted(storage.find(re.compile(r".+"))):
            file_path = storage.get_path(relative_path)
            if not file_path.is_file():
                continue

            items.append(
                SourceFileItem(
                    name=Path(relative_path).name,
                    relative_path=relative_path,
                    extension=file_path.suffix.lower(),
                    size_bytes=file_path.stat().st_size,
                    created_at=await storage.get_creation_date(relative_path),
                )
            )

        return items

    async def load_source_documents(
        self,
        input_dir: Path,
        relative_paths: list[str] | None = None,
    ) -> list[TextDocument]:
        """Load all supported source files as GraphRAG text documents."""
        storage = FileStorage(str(input_dir))
        documents: list[TextDocument] = []
        allowed_paths = set(relative_paths or [])

        for relative_path in sorted(storage.find(re.compile(r".+"))):
            if allowed_paths and relative_path not in allowed_paths:
                continue

            file_path = storage.get_path(relative_path)
            if not file_path.is_file():
                continue

            reader = self._build_reader(storage, relative_path)
            if reader is None:
                continue

            documents.extend(await reader.read_files())

        return documents

    async def _allocate_name(self, storage: FileStorage, filename: str) -> str:
        candidate = filename
        stem = Path(filename).stem
        suffix = Path(filename).suffix
        index = 1

        while await storage.has(candidate):
            candidate = f"{stem}-{index}{suffix}"
            index += 1

        return candidate

    def _build_reader(
        self, storage: FileStorage, relative_path: str
    ) -> TextFileReader | JSONFileReader | JSONLinesFileReader | CSVFileReader | MarkItDownFileReader | None:
        pattern = rf"{re.escape(relative_path)}$"
        suffix = Path(relative_path).suffix.lower()

        if suffix in {".txt", ".md", ".markdown"}:
            return TextFileReader(storage=storage, file_pattern=pattern)
        if suffix == ".json":
            return JSONFileReader(
                storage=storage,
                file_pattern=pattern,
                id_column="id",
                title_column="title",
                text_column="text",
            )
        if suffix == ".jsonl":
            return JSONLinesFileReader(
                storage=storage,
                file_pattern=pattern,
                id_column="id",
                title_column="title",
                text_column="text",
            )
        if suffix == ".csv":
            return CSVFileReader(
                storage=storage,
                file_pattern=pattern,
                id_column="id",
                title_column="title",
                text_column="text",
            )
        if suffix == ".pdf":
            return MarkItDownFileReader(storage=storage, file_pattern=pattern)
        return None

    def _normalize_filename(self, filename: str | None) -> str:
        if filename is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded file must include a filename.",
            )

        normalized = Path(filename).name.strip()
        if not normalized:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded file must include a valid filename.",
            )

        return normalized

    def _validate_extension(self, filename: str) -> None:
        suffix = Path(filename).suffix.lower()
        if suffix in SUPPORTED_SOURCE_EXTENSIONS:
            return

        supported = ", ".join(sorted(SUPPORTED_SOURCE_EXTENSIONS))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Unsupported source file extension '{suffix or '<none>'}'. "
                f"Supported extensions: {supported}."
            ),
        )
