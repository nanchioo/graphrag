# Copyright (c) 2024 Microsoft Corporation.
# Licensed under the MIT License

import json
from pathlib import Path


def test_web_package_declares_required_scripts_and_dependencies():
    web_root = Path("web")
    package_json_path = web_root / "package.json"

    assert package_json_path.exists()

    package_json = json.loads(package_json_path.read_text(encoding="utf-8"))

    assert package_json["name"] == "graphrag-web"
    assert package_json["private"] is True
    assert package_json["scripts"] == {
        "dev": "vite",
        "build": "tsc -b && vite build",
        "preview": "vite preview",
    }

    dependencies = package_json["dependencies"]
    dev_dependencies = package_json["devDependencies"]

    assert "react" in dependencies
    assert "react-dom" in dependencies
    assert "react-router-dom" in dependencies
    assert "antd" in dependencies
    assert "echarts" in dependencies
    assert "vite" in dev_dependencies
    assert "typescript" in dev_dependencies
    assert "@vitejs/plugin-react" in dev_dependencies


def test_web_scaffold_contains_expected_entry_pages_and_components():
    web_root = Path("web")

    expected_paths = [
        web_root / "index.html",
        web_root / "tsconfig.json",
        web_root / "tsconfig.app.json",
        web_root / "tsconfig.node.json",
        web_root / "vite.config.ts",
        web_root / "src" / "main.tsx",
        web_root / "src" / "vite-env.d.ts",
        web_root / "src" / "App.tsx",
        web_root / "src" / "styles.css",
        web_root / "src" / "api" / "client.ts",
        web_root / "src" / "types" / "index.ts",
        web_root / "src" / "pages" / "GraphManagePage.tsx",
        web_root / "src" / "pages" / "ModelConfigPage.tsx",
        web_root / "src" / "pages" / "QueryPage.tsx",
        web_root / "src" / "components" / "GraphTable.tsx",
        web_root / "src" / "components" / "UploadPanel.tsx",
        web_root / "src" / "components" / "BuildStatusCard.tsx",
        web_root / "src" / "components" / "GraphPreview.tsx",
        web_root / "src" / "components" / "TextUnitList.tsx",
        web_root / "src" / "components" / "ModelProfileForm.tsx",
        web_root / "src" / "components" / "QueryPanel.tsx",
    ]

    missing_paths = [str(path) for path in expected_paths if not path.exists()]
    assert missing_paths == []


def test_web_app_wires_pages_and_api_routes():
    app_source = Path("web/src/App.tsx").read_text(encoding="utf-8")
    api_client_source = Path("web/src/api/client.ts").read_text(encoding="utf-8")
    vite_config_source = Path("web/vite.config.ts").read_text(encoding="utf-8")
    graph_table_source = Path("web/src/components/GraphTable.tsx").read_text(
        encoding="utf-8"
    )
    text_unit_list_source = Path("web/src/components/TextUnitList.tsx").read_text(
        encoding="utf-8"
    )
    build_status_source = Path("web/src/components/BuildStatusCard.tsx").read_text(
        encoding="utf-8"
    )
    graph_preview_source = Path("web/src/components/GraphPreview.tsx").read_text(
        encoding="utf-8"
    )
    styles_source = Path("web/src/styles.css").read_text(encoding="utf-8")

    assert "GraphManagePage" in app_source
    assert "ModelConfigPage" in app_source
    assert "QueryPage" in app_source
    assert "/api/graph" in api_client_source
    assert "deleteGraph(graphId: string)" in api_client_source
    assert "text-units" in api_client_source
    assert "/api/config/models" in api_client_source
    assert "/api/query" in api_client_source
    assert 'base: "/console/"' in vite_config_source
    assert "await response.text()" in api_client_source
    assert "JSON.parse(responseText)" in api_client_source
    assert "awaiting_upload" in graph_table_source
    assert "awaiting_build" in graph_table_source
    assert "Popconfirm" in graph_table_source
    assert "onDelete" in graph_table_source
    assert "TextUnitList" in text_unit_list_source
    assert "确认删除这个切片?" in text_unit_list_source
    assert "align-items: start;" in styles_source
    assert "构建状态" in build_status_source
    assert "图谱预览" in graph_preview_source


def test_graph_management_ui_uses_readable_chinese_copy():
    graph_table_source = Path("web/src/components/GraphTable.tsx").read_text(
        encoding="utf-8"
    )
    page_source = Path("web/src/pages/GraphManagePage.tsx").read_text(
        encoding="utf-8"
    )
    build_status_source = Path("web/src/components/BuildStatusCard.tsx").read_text(
        encoding="utf-8"
    )
    graph_preview_source = Path("web/src/components/GraphPreview.tsx").read_text(
        encoding="utf-8"
    )
    text_unit_list_source = Path("web/src/components/TextUnitList.tsx").read_text(
        encoding="utf-8"
    )

    assert "图谱项目" in graph_table_source
    assert "刷新" in graph_table_source
    assert "确认删除这个图谱项目?" in graph_table_source
    assert "删除后将同时移除工作目录和构建产物。" in graph_table_source
    assert "图谱管理" in page_source
    assert "图谱项目已删除" in page_source
    assert "图谱删除失败" in page_source
    assert "文本切片" in page_source
    assert "切片已删除，请重新构建以刷新图谱结果" in page_source
    assert "暂无描述" in page_source
    assert "未绑定" in page_source
    assert "构建状态" in build_status_source
    assert "当前状态" in build_status_source
    assert "当前阶段" in build_status_source
    assert "最近构建" in build_status_source
    assert "切片数量" in build_status_source
    assert "本次预检查" in build_status_source
    assert "最近构建错误" in build_status_source
    assert "图谱预览" in graph_preview_source
    assert "预览节点" in graph_preview_source
    assert "预览关系" in graph_preview_source
    assert "社区数量" in graph_preview_source
    assert "报告数量" in graph_preview_source
    assert "关系图" in graph_preview_source
    assert "社区报告" in graph_preview_source
    assert "暂无社区报告" in graph_preview_source
    assert "确认删除这个切片?" in text_unit_list_source


def test_web_app_uses_console_router_basename():
    app_source = Path("web/src/App.tsx").read_text(encoding="utf-8")

    assert "basename={import.meta.env.BASE_URL}" in app_source


def test_app_shell_uses_graph_analysis_console_visual_language():
    app_source = Path("web/src/App.tsx").read_text(encoding="utf-8")
    styles_source = Path("web/src/styles.css").read_text(encoding="utf-8")

    assert 'className="app-shell analysis-shell"' in app_source
    assert 'className="app-header analysis-header"' in app_source
    assert 'className="brand-block analysis-brand"' in app_source
    assert 'className="brand-kicker analysis-kicker"' in app_source
    assert 'className="nav-menu analysis-nav-menu"' in app_source
    assert "--analysis-bg: #eff4fb;" in styles_source
    assert "--analysis-accent: #1e40af;" in styles_source
    assert ".analysis-shell {" in styles_source
    assert ".analysis-header {" in styles_source
    assert ".analysis-brand {" in styles_source
    assert ".analysis-kicker {" in styles_source
    assert ".analysis-chip {" in styles_source
    assert "rgba(202, 120, 73, 0.18)" not in styles_source


def test_workbench_shell_uses_balanced_console_tokens_and_frame_classes():
    app_source = Path("web/src/App.tsx").read_text(encoding="utf-8")
    styles_source = Path("web/src/styles.css").read_text(encoding="utf-8")

    assert 'className="app-shell analysis-shell"' in app_source
    assert 'className="app-header analysis-header"' in app_source
    assert 'className="brand-block analysis-brand"' in app_source
    assert 'className="brand-kicker analysis-kicker"' in app_source
    assert 'className="nav-menu analysis-nav-menu"' in app_source
    assert "--analysis-accent: #1e40af;" in styles_source
    assert "--analysis-warning: #f59e0b;" in styles_source
    assert ".analysis-page {" in styles_source
    assert ".page-hero {" in styles_source
    assert ".page-section {" in styles_source
    assert ".section-heading {" in styles_source
    assert "@media (prefers-reduced-motion: reduce)" in styles_source


def test_model_profile_form_contains_platform_presets():
    form_source = Path("web/src/components/ModelProfileForm.tsx").read_text(
        encoding="utf-8"
    )

    assert "https://dashscope.aliyuncs.com/compatible-mode/v1" in form_source
    assert "DeepSeek" in form_source
    assert "https://api.deepseek.com/v1" in form_source
    assert "https://api.moonshot.cn/v1" in form_source
    assert "https://open.bigmodel.cn/api/paas/v4/" in form_source
    assert "SiliconFlow" in form_source
    assert "https://api.siliconflow.cn/v1" in form_source
    assert 'embedding_model_name: "text-embedding-3-small"' in form_source
    assert "preset.values.embedding_model_name ||" in form_source


def test_web_scaffold_includes_vite_client_types():
    vite_env_source = Path("web/src/vite-env.d.ts").read_text(encoding="utf-8")

    assert '/// <reference types="vite/client" />' in vite_env_source


def test_upload_panel_preserves_origin_file_objects_for_manual_submit():
    upload_panel_source = Path("web/src/components/UploadPanel.tsx").read_text(
        encoding="utf-8"
    )

    assert "originFileObj: file" in upload_panel_source
    assert "Upload.LIST_IGNORE" in upload_panel_source


def test_upload_panel_rejects_duplicate_source_file_names_before_submit():
    upload_panel_source = Path("web/src/components/UploadPanel.tsx").read_text(
        encoding="utf-8"
    )
    page_source = Path("web/src/pages/GraphManagePage.tsx").read_text(
        encoding="utf-8"
    )

    assert "existingFileNames?: string[]" in upload_panel_source
    assert "existingFileNames = []" in upload_panel_source
    assert "normalizeFileName" in upload_panel_source
    assert "existingFileNameSet" in upload_panel_source
    assert "该文件已存在，请先删除后再重新上传。" in upload_panel_source
    assert "待上传列表中已存在同名文件。" in upload_panel_source
    assert "existingFileNames={graphFiles?.items.map((item) => item.name) ?? []}" in page_source


def test_graph_manage_page_exposes_source_file_delete_action():
    api_client_source = Path("web/src/api/client.ts").read_text(encoding="utf-8")
    page_source = Path("web/src/pages/GraphManagePage.tsx").read_text(
        encoding="utf-8"
    )
    types_source = Path("web/src/types/index.ts").read_text(encoding="utf-8")

    assert "DeleteSourceFilePayload" in types_source
    assert "deleteGraphSourceFile" in api_client_source
    assert "encodeURIComponent(relativePath)" in api_client_source
    assert "deleteGraphSourceFile" in page_source
    assert "handleDeleteSourceFile" in page_source
    assert "确认删除这个源文件?" in page_source
    assert "删除后需要重新构建图谱。" in page_source


def test_graph_manage_page_optimistically_marks_building_before_refresh():
    page_source = Path("web/src/pages/GraphManagePage.tsx").read_text(encoding="utf-8")
    styles_source = Path("web/src/styles.css").read_text(encoding="utf-8")

    assert "const buildPayload = await buildGraph" in page_source
    assert "setGraphStatus((current) =>" in page_source
    assert "status: buildPayload.status" in page_source
    assert "const payload = await deleteGraph(graph.id)" in page_source
    assert "payload.cancelled_build" in page_source
    assert "setGraphs((current) => current.filter((item) => item.id !== graph.id))" in page_source
    assert "getGraphTextUnits" in page_source
    assert "deleteGraphTextUnit" in page_source
    assert "setGraphTextUnits" in page_source
    assert page_source.index("<GraphPreview") < page_source.index("<TextUnitList")
    assert 'className="sidebar-column"' in page_source
    assert 'className="sidebar-shell"' in page_source
    assert 'className="workspace-column"' in page_source
    assert "侧边项目" in page_source
    assert "新建图谱" in page_source
    assert "grid-template-columns: 320px minmax(0, 1fr);" in styles_source
    assert ".sidebar-shell {" in styles_source
    assert "min-height: calc(100vh - 148px);" in styles_source


def test_build_status_card_mentions_chunk_counts():
    card_source = Path("web/src/components/BuildStatusCard.tsx").read_text(
        encoding="utf-8"
    )

    assert "text_unit_count" in card_source
    assert "切片数量" in card_source
    assert "Progress" in card_source
    assert "progress_percent" in card_source
    assert "progress_message" in card_source
    assert "embedding_generation" in card_source
    assert "reports_generation" in card_source


def test_graph_manage_page_tracks_precheck_errors_separately_from_last_build_error():
    page_source = Path("web/src/pages/GraphManagePage.tsx").read_text(encoding="utf-8")
    card_source = Path("web/src/components/BuildStatusCard.tsx").read_text(
        encoding="utf-8"
    )

    assert "buildAttemptError" in page_source
    assert "setBuildAttemptError" in page_source
    assert "actionError={buildAttemptError}" in page_source
    assert "actionError?: string | null" in card_source
    assert "本次预检查" in card_source
    assert "最近构建错误" in card_source


def test_graph_manage_page_exposes_chunking_fields_in_create_modal():
    page_source = Path("web/src/pages/GraphManagePage.tsx").read_text(encoding="utf-8")
    types_source = Path("web/src/types/index.ts").read_text(encoding="utf-8")

    assert "GraphChunkingCreateRequest" in types_source
    assert "chunking?: GraphChunkingCreateRequest" in types_source
    assert "embed_batch_size?: number;" in types_source
    assert 'name={["chunking", "size"]}' in page_source
    assert 'name={["chunking", "overlap"]}' in page_source
    assert 'name={["chunking", "encoding_model"]}' in page_source
    assert 'name={["chunking", "type"]}' in page_source
    assert 'name="embed_batch_size"' in page_source
    assert "hidden" in page_source
    assert "当前仅支持 tokens 切片方式。" in page_source
    assert '<Input value={DEFAULT_CHUNKING_CONFIG.type} disabled />' in page_source
    assert '<Select options={[{ label: "tokens", value: "tokens" }]}' not in page_source
    assert "o200k_base" in page_source
    assert "1200" in page_source
    assert "100" in page_source
    assert "16" in page_source
    assert "切片重叠大小必须小于切片大小。" in page_source


def test_graph_manage_page_prefills_per_graph_projects_root_from_system_config():
    page_source = Path("web/src/pages/GraphManagePage.tsx").read_text(encoding="utf-8")
    types_source = Path("web/src/types/index.ts").read_text(encoding="utf-8")

    assert "projects_root?: string;" in types_source
    assert "getSystemConfig" in page_source
    assert 'const DEFAULT_PROJECTS_ROOT = "data/projects";' in page_source
    assert "const [systemConfig, setSystemConfig]" in page_source
    assert "projects_root: systemConfig?.projects_root ?? DEFAULT_PROJECTS_ROOT" in page_source
    assert 'label="保存位置"' in page_source
    assert 'name="projects_root"' in page_source
    assert "最终目录将自动生成为 <保存位置>/<图谱ID>" in page_source


def test_model_config_page_describes_projects_root_as_default_graph_save_location():
    page_source = Path("web/src/pages/ModelConfigPage.tsx").read_text(encoding="utf-8")

    assert "默认图谱保存位置" in page_source
    assert "新建图谱时会默认使用这里，也可以按图谱单独修改。" in page_source


def test_graph_manage_page_uses_responsive_sectioned_create_modal_layout():
    page_source = Path("web/src/pages/GraphManagePage.tsx").read_text(encoding="utf-8")
    styles_source = Path("web/src/styles.css").read_text(encoding="utf-8")

    assert 'width={920}' in page_source
    assert 'className="graph-create-modal analysis-modal"' in page_source
    assert 'className="graph-create-form"' in page_source
    assert 'className="graph-create-layout analysis-form-grid"' in page_source
    assert 'className="graph-create-section"' in page_source
    assert 'className="graph-create-grid"' in page_source
    assert "基础信息" in page_source
    assert "切片配置" in page_source
    assert ".graph-create-modal .ant-modal-body {" in styles_source
    assert ".graph-create-layout {" in styles_source
    assert ".graph-create-grid {" in styles_source
    assert ".graph-create-section {" in styles_source
    assert "@media (max-width: 720px) {" in styles_source
    assert "graph-create-layout" in styles_source


def test_model_page_and_profile_form_use_grouped_workbench_sections():
    page_source = Path("web/src/pages/ModelConfigPage.tsx").read_text(
        encoding="utf-8"
    )
    form_source = Path("web/src/components/ModelProfileForm.tsx").read_text(
        encoding="utf-8"
    )
    styles_source = Path("web/src/styles.css").read_text(encoding="utf-8")

    assert 'className="page-stack analysis-page analysis-page--models"' in page_source
    assert 'className="page-hero analysis-hero"' in page_source
    assert 'className="page-section"' in page_source
    assert 'className="analysis-card analysis-settings-card"' in page_source
    assert 'className="analysis-modal analysis-modal--profile"' in form_source
    assert 'className="profile-form-section"' in form_source
    assert 'className="profile-form-grid"' in form_source
    assert ".analysis-page--models {" in styles_source
    assert ".analysis-settings-card {" in styles_source
    assert ".profile-form-section {" in styles_source
    assert ".profile-form-grid {" in styles_source


def test_model_profile_form_omits_blank_api_key_from_edit_submit_payload():
    page_source = Path("web/src/pages/ModelConfigPage.tsx").read_text(
        encoding="utf-8"
    )
    form_source = Path("web/src/components/ModelProfileForm.tsx").read_text(
        encoding="utf-8"
    )

    assert "clear_api_key" in form_source
    assert "delete submittedValues.api_key" in page_source
    assert "delete submittedValues.clear_api_key" in page_source
    assert "submittedValues.api_key?.trim()" in page_source


def test_model_registry_table_uses_scrollable_fixed_layout_hooks():
    page_source = Path("web/src/pages/ModelConfigPage.tsx").read_text(
        encoding="utf-8"
    )
    styles_source = Path("web/src/styles.css").read_text(encoding="utf-8")

    assert 'className="analysis-model-table"' in page_source
    assert 'tableLayout="fixed"' in page_source
    assert "scroll={{ x:" in page_source
    assert ".analysis-model-table {" in styles_source
    assert ".analysis-model-table.ant-table-wrapper {" in styles_source
    assert ".analysis-model-table .ant-table-content {" in styles_source
    assert ".analysis-model-table .ant-table-cell-ellipsis {" in styles_source


def test_graph_manage_page_uses_analysis_console_page_and_modal_classes():
    page_source = Path("web/src/pages/GraphManagePage.tsx").read_text(encoding="utf-8")
    styles_source = Path("web/src/styles.css").read_text(encoding="utf-8")

    assert 'className="page-stack analysis-page analysis-page--graphs"' in page_source
    assert 'className="page-hero analysis-hero"' in page_source
    assert 'className="analysis-hero-meta"' in page_source
    assert 'className="surface-card analysis-card analysis-card--spotlight"' in page_source
    assert 'className="graph-create-modal analysis-modal"' in page_source
    assert 'className="graph-create-layout analysis-form-grid"' in page_source
    assert ".analysis-page--graphs {" in styles_source
    assert ".analysis-hero {" in styles_source
    assert ".analysis-hero-meta {" in styles_source
    assert ".analysis-card {" in styles_source
    assert ".analysis-card--spotlight {" in styles_source
    assert ".analysis-modal .ant-modal-content {" in styles_source
    assert ".analysis-form-grid {" in styles_source


def test_graph_management_page_uses_sectioned_workbench_layout():
    page_source = Path("web/src/pages/GraphManagePage.tsx").read_text(
        encoding="utf-8"
    )
    build_source = Path("web/src/components/BuildStatusCard.tsx").read_text(
        encoding="utf-8"
    )
    upload_source = Path("web/src/components/UploadPanel.tsx").read_text(
        encoding="utf-8"
    )
    preview_source = Path("web/src/components/GraphPreview.tsx").read_text(
        encoding="utf-8"
    )
    styles_source = Path("web/src/styles.css").read_text(encoding="utf-8")

    assert 'className="page-grid analysis-layout analysis-layout--graphs"' in page_source
    assert 'className="analysis-sidebar"' in page_source
    assert 'className="analysis-main"' in page_source
    assert 'className="page-section"' in page_source
    assert 'className="analysis-result-stack"' in page_source
    assert 'className="analysis-status-header"' in build_source
    assert 'className="analysis-upload-hint"' in upload_source
    assert 'className="analysis-preview-summary"' in preview_source
    assert ".analysis-layout--graphs {" in styles_source
    assert ".analysis-sidebar {" in styles_source
    assert ".analysis-main {" in styles_source
    assert ".analysis-result-stack {" in styles_source


def test_graph_operation_components_use_analysis_console_surface_classes():
    build_source = Path("web/src/components/BuildStatusCard.tsx").read_text(
        encoding="utf-8"
    )
    preview_source = Path("web/src/components/GraphPreview.tsx").read_text(
        encoding="utf-8"
    )
    table_source = Path("web/src/components/GraphTable.tsx").read_text(
        encoding="utf-8"
    )
    upload_source = Path("web/src/components/UploadPanel.tsx").read_text(
        encoding="utf-8"
    )
    text_unit_source = Path("web/src/components/TextUnitList.tsx").read_text(
        encoding="utf-8"
    )
    styles_source = Path("web/src/styles.css").read_text(encoding="utf-8")

    assert 'className="surface-card analysis-card analysis-status-card"' in build_source
    assert "progressStatus" in build_source
    assert "progressStrokeColor" in build_source
    assert 'className="surface-card analysis-card analysis-graph-preview"' in preview_source
    assert "KNOWLEDGE_GRAPH_NODE_STYLES" in preview_source
    assert "getKnowledgeGraphNodeStyle" in preview_source
    assert 'className="surface-card analysis-card analysis-sidebar-table"' in table_source
    assert 'className="surface-card analysis-card analysis-upload-panel"' in upload_source
    assert 'className="surface-card analysis-card analysis-text-unit-list"' in text_unit_source
    assert ".analysis-status-card {" in styles_source
    assert ".analysis-graph-preview {" in styles_source
    assert ".analysis-sidebar-table {" in styles_source
    assert ".analysis-upload-panel .ant-upload-wrapper {" in styles_source
    assert ".analysis-text-unit-list .ant-table-wrapper {" in styles_source


def test_secondary_pages_and_forms_inherit_analysis_console_visual_language():
    model_page_source = Path("web/src/pages/ModelConfigPage.tsx").read_text(
        encoding="utf-8"
    )
    query_page_source = Path("web/src/pages/QueryPage.tsx").read_text(
        encoding="utf-8"
    )
    query_panel_source = Path("web/src/components/QueryPanel.tsx").read_text(
        encoding="utf-8"
    )
    profile_form_source = Path("web/src/components/ModelProfileForm.tsx").read_text(
        encoding="utf-8"
    )
    styles_source = Path("web/src/styles.css").read_text(encoding="utf-8")

    assert 'className="page-stack analysis-page analysis-page--models"' in model_page_source
    assert 'className="analysis-card analysis-settings-card"' in model_page_source
    assert 'className="page-stack analysis-page analysis-page--query"' in query_page_source
    assert 'className="surface-card analysis-card analysis-query-panel"' in query_panel_source
    assert 'className="surface-card answer-card analysis-card analysis-query-result"' in query_page_source
    assert 'className="analysis-modal analysis-modal--profile"' in profile_form_source
    assert ".analysis-page--models {" in styles_source
    assert ".analysis-page--query {" in styles_source
    assert ".analysis-settings-card {" in styles_source
    assert ".analysis-query-panel {" in styles_source
    assert ".analysis-query-result {" in styles_source
    assert ".analysis-modal--profile .ant-modal-content {" in styles_source


def test_query_page_uses_split_workbench_layout_and_context_labels():
    page_source = Path("web/src/pages/QueryPage.tsx").read_text(encoding="utf-8")
    panel_source = Path("web/src/components/QueryPanel.tsx").read_text(
        encoding="utf-8"
    )
    styles_source = Path("web/src/styles.css").read_text(encoding="utf-8")

    assert 'className="page-stack analysis-page analysis-page--query"' in page_source
    assert 'className="analysis-layout analysis-layout--query"' in page_source
    assert 'className="analysis-query-results"' in page_source
    assert "问答工作台" in page_source
    assert "回答" in page_source
    assert "上下文" in page_source
    assert "请先在左侧输入问题并发起查询" in page_source
    assert "查询完成后，这里会显示检索上下文" in page_source
    assert "发起问答" in panel_source
    assert "图谱项目" in panel_source
    assert "查询模式" in panel_source
    assert "社区层级" in panel_source
    assert "响应格式" in panel_source
    assert "问题" in panel_source
    assert "请选择图谱" in panel_source
    assert "开始查询" in panel_source
    assert "QUERY_MODE_OPTIONS.find" in panel_source
    assert "当前模式：" in panel_source
    assert "优先使用本地社区与相关节点" in panel_source
    assert "getQueryContextLabel(key)" in page_source
    assert "setResult(null)" in page_source
    assert 'JSON.stringify(value, null, 2)' in page_source
    assert 'className="surface-card analysis-card analysis-query-panel"' in panel_source
    assert "QUERY_MODE_OPTIONS" in panel_source
    assert 'className="field-help"' in panel_source
    assert ".analysis-layout--query {" in styles_source
    assert ".analysis-query-results {" in styles_source
    assert ".field-help {" in styles_source
    assert ".analysis-query-context .ant-collapse" in styles_source


def test_workbench_copy_module_centralizes_navigation_and_status_labels():
    copy_source = Path("web/src/content/workbench.ts").read_text(encoding="utf-8")
    app_source = Path("web/src/App.tsx").read_text(encoding="utf-8")
    build_source = Path("web/src/components/BuildStatusCard.tsx").read_text(
        encoding="utf-8"
    )
    table_source = Path("web/src/components/GraphTable.tsx").read_text(
        encoding="utf-8"
    )
    query_panel_source = Path("web/src/components/QueryPanel.tsx").read_text(
        encoding="utf-8"
    )
    query_page_source = Path("web/src/pages/QueryPage.tsx").read_text(
        encoding="utf-8"
    )

    assert "export const navigationItems" in copy_source
    assert "export const GRAPH_STATUS_META" in copy_source
    assert "export const GRAPH_STAGE_LABELS" in copy_source
    assert "export const QUERY_MODE_OPTIONS" in copy_source
    assert "export const QUERY_CONTEXT_LABELS" in copy_source
    assert 'from "./content/workbench"' in app_source
    assert "getGraphStatusMeta" in build_source
    assert "getGraphStageLabel" in build_source
    assert "GRAPH_STATUS_META" not in build_source
    assert "getGraphStatusMeta" in table_source
    assert "GRAPH_STATUS_META" not in table_source
    assert "QUERY_MODE_OPTIONS" in query_panel_source
    assert "getQueryContextLabel" in query_page_source
    assert "QUERY_CONTEXT_LABELS" not in query_page_source


def test_analysis_console_styles_include_responsive_guards():
    styles_source = Path("web/src/styles.css").read_text(encoding="utf-8")

    assert "@media (max-width: 1100px) {" in styles_source
    assert "  .analysis-hero-meta {" in styles_source
    assert "    width: 100%;" in styles_source
    assert "    flex-wrap: wrap;" in styles_source
    assert "  .graph-create-layout.analysis-form-grid {" in styles_source
    assert "@media (max-width: 720px) {" in styles_source
    assert "  .analysis-header," in styles_source
    assert "  .analysis-card," in styles_source
    assert "  .analysis-modal .ant-modal-content {" in styles_source
    assert "  .app-content {" in styles_source
    assert "padding-top: 160px;" in styles_source


def test_graph_manage_page_keeps_build_polling_non_blocking():
    page_source = Path("web/src/pages/GraphManagePage.tsx").read_text(encoding="utf-8")
    primary_start = page_source.index("const [detailResult, statusResult, filesResult] =")
    primary_end = page_source.index("const firstRejected =", primary_start)
    primary_block = page_source[primary_start:primary_end]
    clear_start = page_source.index("function clearPrimaryGraphState()")
    clear_end = page_source.index("function switchGraph(graphId?: string)", clear_start)
    clear_block = page_source[clear_start:clear_end]
    switch_graph_start = page_source.index("function switchGraph(graphId?: string)")
    switch_graph_end = page_source.index(
        "function buildFileStatusTagColor", switch_graph_start
    )
    switch_graph_block = page_source[switch_graph_start:switch_graph_end]
    switch_start = page_source.index("const isGraphSwitch = graphDetail?.id !== graphId;")
    switch_end = page_source.index(
        "const [detailResult, statusResult, filesResult] =", switch_start
    )
    switch_block = page_source[switch_start:switch_end]

    assert "type HydrateGraphOptions = {" in page_source
    assert "showSpinner?: boolean;" in page_source
    assert "const [detailResult, statusResult, filesResult] =" in page_source
    assert "getGraphTextUnits(graphId)" in page_source
    assert 'if (statusPayload?.status !== "building")' in page_source
    assert "void hydrateGraph(selectedGraphId, { showSpinner: false });" in page_source
    assert "getGraphTextUnits(graphId)" not in primary_block
    assert "clearPrimaryGraphState();" in switch_block
    assert "setGraphDetail(null);" in clear_block
    assert "setGraphStatus(null);" in clear_block
    assert "setGraphFiles(null);" in clear_block
    assert "clearGraphArtifactsView();" in clear_block
    assert "hydrateRequestRef.current += 1;" in switch_graph_block


def test_graph_manage_page_supports_resume_and_full_rebuild_actions():
    page_source = Path("web/src/pages/GraphManagePage.tsx").read_text(encoding="utf-8")
    card_source = Path("web/src/components/BuildStatusCard.tsx").read_text(encoding="utf-8")
    types_source = Path("web/src/types/index.ts").read_text(encoding="utf-8")

    assert 'export type GraphBuildAction = "start" | "resume"' in types_source
    assert 'export type GraphBuildMethod = "standard" | "fast"' in types_source
    assert "resumable: boolean;" in types_source
    assert "current_file?: string | null;" in types_source
    assert "completed_file_count: number;" in types_source
    assert "failed_file_count: number;" in types_source
    assert "pending_file_count: number;" in types_source
    assert "build_status?:" in types_source
    assert "const [buildMethod, setBuildMethod]" in page_source
    assert "method: buildMethod" in page_source
    assert "buildMethod={buildMethod}" in page_source
    assert "onBuildMethodChange={setBuildMethod}" in page_source
    assert "GraphBuildMethod" in card_source
    assert "buildMethod: GraphBuildMethod" in card_source
    assert "onBuildMethodChange: (method: GraphBuildMethod) => void;" in card_source
    assert 'value="standard"' in card_source
    assert 'value="fast"' in card_source
    assert "继续构建" in card_source
    assert "全量重建" in card_source
    assert "current_file" in card_source
    assert "handleBuildAction" in page_source
    assert 'handleBuildAction("resume", false)' in page_source
    assert 'handleBuildAction("start", true)' in page_source


def test_build_status_card_uses_state_specific_progress_tones():
    card_source = Path("web/src/components/BuildStatusCard.tsx").read_text(
        encoding="utf-8"
    )

    assert "const progressStatus =" in card_source
    assert "const progressStrokeColor =" in card_source
    assert 'status.status === "building"' in card_source
    assert 'status.status === "ready"' in card_source
    assert ': "normal"' in card_source
    assert '#16a34a' in card_source


def test_graph_manage_page_renders_file_level_build_tags():
    page_source = Path("web/src/pages/GraphManagePage.tsx").read_text(encoding="utf-8")

    assert "build_status" in page_source
    assert "is_current" in page_source
    assert "attempt_count" in page_source
    assert "last_build_error" in page_source
    assert "text_unit_count" in page_source


def test_build_workbench_asset_cards_use_equal_height_layout():
    styles_source = Path("web/src/styles.css").read_text(encoding="utf-8")

    assets_start = styles_source.index(".build-workbench-assets {")
    assets_end = styles_source.index(".source-file-card .ant-card-body", assets_start)
    assets_block = styles_source[assets_start:assets_end]

    assert "align-items: stretch;" in assets_block
    assert ".build-workbench-assets > .analysis-card {" in styles_source

    card_rule_start = styles_source.index(".build-workbench-assets > .analysis-card {")
    card_rule_end = styles_source.index("}", card_rule_start)
    card_rule = styles_source[card_rule_start:card_rule_end]

    assert "min-width: 0;" in card_rule
    assert "height: 100%;" in card_rule


def test_graph_preview_exposes_zoom_controls_and_limits():
    preview_source = Path("web/src/components/GraphPreview.tsx").read_text(
        encoding="utf-8"
    )
    styles_source = Path("web/src/styles.css").read_text(encoding="utf-8")

    assert "graph-preview-toolbar" in preview_source
    assert "放大" in preview_source
    assert "缩小" in preview_source
    assert "重置视图" in preview_source
    assert 'type: "graphRoam"' in preview_source
    assert "scaleLimit" in preview_source
    assert "GRAPH_MAX_ZOOM" in preview_source
    assert "GRAPH_MIN_ZOOM" in preview_source
    assert "graph-preview-zoom" in preview_source
    assert ".graph-preview-toolbar {" in styles_source
    assert "touch-action: none;" in styles_source


def test_graph_preview_exposes_fullscreen_controls():
    preview_source = Path("web/src/components/GraphPreview.tsx").read_text(
        encoding="utf-8"
    )
    styles_source = Path("web/src/styles.css").read_text(encoding="utf-8")

    assert "graphFullscreenRef" in preview_source
    assert "toggleGraphFullscreen" in preview_source
    assert "requestFullscreen" in preview_source
    assert "exitFullscreen" in preview_source
    assert "fullscreenchange" in preview_source
    assert "全屏" in preview_source
    assert "退出全屏" in preview_source
    assert "graph-preview-interactive" in preview_source
    assert "graph-preview-interactive--fullscreen" in preview_source
    assert "resizeGraphAfterFullscreenChange" in preview_source
    assert "resizeGraphSoon(260)" in preview_source
    assert ".graph-preview-interactive:fullscreen" in styles_source
    assert ".graph-preview-interactive--fullscreen .graph-preview-chart" in styles_source
    assert "height: calc(100vh - 138px);" in styles_source


def test_graph_preview_uses_knowledge_graph_visual_encoding():
    preview_source = Path("web/src/components/GraphPreview.tsx").read_text(
        encoding="utf-8"
    )

    assert "KNOWLEDGE_GRAPH_PALETTE" in preview_source
    assert "KNOWLEDGE_GRAPH_NODE_STYLES" in preview_source
    assert "getKnowledgeGraphNodeStyle" in preview_source
    assert "getKnowledgeGraphNodeSize" in preview_source
    assert "getKnowledgeGraphNodeCategory" in preview_source
    assert "#5b7cfa" in preview_source
    assert "#1aa987" in preview_source
    assert "#e07a5f" in preview_source
    assert "legend:" in preview_source
    assert "categories: getKnowledgeGraphCategories(preview.nodes)" in preview_source
    assert "nodeScaleRatio" in preview_source
    assert "symbol: getKnowledgeGraphNodeSymbol(node.type)" in preview_source
    assert "borderColor: \"#ffffff\"" in preview_source
    assert "shadowBlur" in preview_source
    assert "edgeSymbol" in preview_source
    assert "formatter: formatKnowledgeGraphTooltip" in preview_source
    assert "#be123c" not in preview_source
    assert 'color: node.type === "person" ? "#3b82f6" : "#1e40af"' not in preview_source


def test_model_config_page_exposes_connect_action_for_saved_profiles():
    page_source = Path("web/src/pages/ModelConfigPage.tsx").read_text(encoding="utf-8")
    api_client_source = Path("web/src/api/client.ts").read_text(encoding="utf-8")
    types_source = Path("web/src/types/index.ts").read_text(encoding="utf-8")

    assert "connectModelProfile" in api_client_source
    assert "/api/config/models/${profileId}/connect" in api_client_source
    assert "ModelProfileConnectionPayload" in types_source
    assert "连接" in page_source
    assert "handleConnectProfile" in page_source
    assert "connectLoadingId" in page_source
