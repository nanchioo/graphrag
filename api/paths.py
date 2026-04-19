# Copyright (c) 2024 Microsoft Corporation.
# Licensed under the MIT License

"""Shared filesystem path helpers for the GraphRAG admin layer."""

from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
CONFIG_DIR = PROJECT_ROOT / "config"
APP_SETTINGS_PATH = CONFIG_DIR / "app_settings.json"
GRAPH_REGISTRY_PATH = CONFIG_DIR / "graph_registry.json"
