# GraphRAG Admin Console Guide

## Overview

This repository now includes a minimal-intrusion admin console built on top of GraphRAG:

- backend: FastAPI
- frontend: React + TypeScript
- static hosting: FastAPI serves `web/dist` under `/console/`
- data layer: original GraphRAG project layout is preserved per graph project

The goal of this guide is to help a developer or operator start the system, run the basic workflow, and perform a simple pre-launch check.

## Start The System

### Backend

```powershell
uvicorn main:app --reload
```

Available URLs after startup:

- API root: `http://127.0.0.1:8000/`
- Swagger docs: `http://127.0.0.1:8000/docs`
- Admin console: `http://127.0.0.1:8000/console/`

### Frontend Development Mode

```powershell
cd web
npm.cmd install
npm.cmd run dev
```

Development URL:

- `http://127.0.0.1:5173/console/`

The Vite dev server proxies `/api/*` to the local FastAPI process.

### Frontend Production Build

```powershell
cd web
npm.cmd run build
```

When `web/dist` exists, `main.py` automatically exposes the built frontend under `/console/`.

## Core Workflow

### 1. Configure A Model Profile

Open the model configuration page and create one of:

- OpenAI
- Azure OpenAI
- Ollama

Recommended fields:

- `provider`
- `name`
- `base_url`
- `api_key`
- `model_name`
- `embedding_model_name`
- `api_version` for Azure when needed

If you plan to create multiple graph projects, it is recommended to set one profile as the default model profile.

### 2. Create A Graph Project

Open the graph management page and create a new graph project.

Each graph project gets its own GraphRAG workspace under:

```text
data/projects/<graph_id>/
```

That workspace keeps:

- `settings.yaml`
- `.env`
- `prompts/`
- `input/`
- `output/`
- `cache/`
- other GraphRAG runtime artifacts

### 3. Upload Source Files

Upload one or more source files to the selected graph.

Supported input types:

- `.txt`
- `.md`
- `.markdown`
- `.json`
- `.jsonl`
- `.csv`
- `.pdf`

Uploaded files are stored in the graph workspace `input/` directory.

### 4. Trigger A Build

From the graph management page, trigger a build for the current graph project.

The backend will:

1. load the selected model profile
2. sync model settings into the graph workspace
3. normalize uploaded files into GraphRAG input documents
4. call GraphRAG indexing
5. persist build state into the graph registry

### 5. Inspect The Graph

After a successful build, you can inspect:

- graph preview
- nodes and relationships
- community reports
- build status
- generated artifact paths

### 6. Ask Questions

Open the query page and choose:

- graph project
- query mode
- question text

Supported modes:

- `local`
- `global`
- `basic`
- `drift`

The response includes:

- answer text
- normalized context payload

## API Summary

### Graph

- `GET /api/graph`
- `POST /api/graph`
- `GET /api/graph/{graph_id}`
- `POST /api/graph/{graph_id}/files`
- `GET /api/graph/{graph_id}/files`
- `POST /api/graph/{graph_id}/build`
- `GET /api/graph/{graph_id}/status`
- `DELETE /api/graph/{graph_id}/artifacts`
- `GET /api/graph/{graph_id}/graph`
- `GET /api/graph/{graph_id}/reports`

### Config

- `GET /api/config/system`
- `PUT /api/config/system`
- `GET /api/config/models`
- `POST /api/config/models`
- `PUT /api/config/models/{profile_id}`
- `DELETE /api/config/models/{profile_id}`

### Query

- `POST /api/query`
- `POST /api/chat`

## Minimal Acceptance Checklist

Use this checklist before considering a local environment ready:

- Backend starts with `uvicorn main:app --reload`
- `/docs` is accessible
- `/console/` is accessible after frontend build
- At least one model profile can be created
- A graph project can be created
- Source files can be uploaded
- A graph build can be triggered
- Graph status changes can be observed
- Graph preview loads after build
- A query returns an answer and context payload

## Pre-Launch Checklist

### Runtime

- Confirm Python dependencies are installed
- Confirm frontend dependencies are installed
- Confirm `web/dist` has been built for production hosting
- Confirm the intended model provider credentials are valid

### Storage

- Confirm `config/app_settings.json` is writable
- Confirm `config/graph_registry.json` is writable
- Confirm `data/projects/` is writable
- Confirm there is enough disk space for GraphRAG outputs and vector store data

### Model Settings

- Confirm `base_url` matches the actual provider endpoint
- Confirm `model_name` is valid for completion
- Confirm `embedding_model_name` is valid for embedding workloads
- Confirm Azure profiles include the expected `api_version`

### Functional Smoke Test

Run this sequence in a fresh environment:

1. create a model profile
2. create a graph project
3. upload a small text or markdown file
4. trigger a build
5. verify graph preview loads
6. submit one query in `basic` mode
7. submit one query in `local` mode

### Known Current Tradeoffs

- Build execution is in-process inside the FastAPI application
- A running build is not resumed automatically if the service restarts
- Frontend bundle size is currently large because it includes `antd` and `echarts`
- API keys are still persisted locally in JSON as part of the minimal-dependency design

## Verification Commands

### Backend Tests

```powershell
$env:PATH = "$HOME\.local\bin;$env:PATH"
$env:UV_CACHE_DIR = (Resolve-Path '.').Path + '\.uv-cache'
& "$HOME\.local\bin\uv.exe" run --python 3.11 pytest tests/unit/api tests/unit/web -v
```

### Lint

```powershell
$env:PATH = "$HOME\.local\bin;$env:PATH"
$env:UV_CACHE_DIR = (Resolve-Path '.').Path + '\.uv-cache'
& "$HOME\.local\bin\uv.exe" run --python 3.11 ruff check main.py api tests/unit/api tests/unit/web
```

### Frontend Build

```powershell
cd web
npm.cmd run build
```
