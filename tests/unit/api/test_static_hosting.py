# Copyright (c) 2024 Microsoft Corporation.
# Licensed under the MIT License

from pathlib import Path

from fastapi.testclient import TestClient

from main import create_app


def test_create_app_serves_console_spa_when_dist_exists(tmp_path: Path):
    dist_dir = tmp_path / "dist"
    assets_dir = dist_dir / "assets"
    assets_dir.mkdir(parents=True, exist_ok=True)

    index_html = (
        "<!doctype html><html><body>"
        '<div id="root"></div>'
        '<script type="module" src="/console/assets/app.js"></script>'
        "</body></html>"
    )
    (dist_dir / "index.html").write_text(index_html, encoding="utf-8")
    (assets_dir / "app.js").write_text("console.log('console');", encoding="utf-8")

    client = TestClient(create_app(web_dist_dir=dist_dir))

    index_response = client.get("/console")
    asset_response = client.get("/console/assets/app.js")
    route_response = client.get("/console/query")

    assert index_response.status_code == 200
    assert "text/html" in index_response.headers["content-type"]
    assert index_response.text == index_html

    assert asset_response.status_code == 200
    assert "javascript" in asset_response.headers["content-type"]
    assert asset_response.text == "console.log('console');"

    assert route_response.status_code == 200
    assert route_response.text == index_html


def test_create_app_skips_console_routes_when_dist_is_missing(tmp_path: Path):
    client = TestClient(create_app(web_dist_dir=tmp_path / "missing-dist"))

    response = client.get("/console")

    assert response.status_code == 404
