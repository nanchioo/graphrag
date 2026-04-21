# Copyright (c) 2024 Microsoft Corporation.
# Licensed under the MIT License

import json
from pathlib import Path


def test_web_next_package_declares_scripts_and_dependencies():
    web_root = Path("web-next")
    package_json = json.loads((web_root / "package.json").read_text(encoding="utf-8"))

    assert package_json["name"] == "graphrag-web-next"
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
    assert "echarts" in dependencies
    assert "vite" in dev_dependencies
    assert "typescript" in dev_dependencies
    assert "@vitejs/plugin-react" in dev_dependencies


def test_web_next_scaffold_contains_expected_entry_files():
    web_root = Path("web-next")

    expected_paths = [
        web_root / "index.html",
        web_root / "package.json",
        web_root / "tsconfig.json",
        web_root / "tsconfig.app.json",
        web_root / "tsconfig.node.json",
        web_root / "vite.config.ts",
        web_root / "src" / "main.tsx",
        web_root / "src" / "vite-env.d.ts",
        web_root / "src" / "App.tsx",
    ]

    missing_paths = [str(path) for path in expected_paths if not path.exists()]
    assert missing_paths == []


def test_web_next_shell_wires_routes_and_tokens():
    app_source = Path("web-next/src/App.tsx").read_text(encoding="utf-8")
    route_source = Path("web-next/src/app/router/routes.tsx").read_text(
        encoding="utf-8"
    )
    shell_source = Path("web-next/src/app/layout/AppShell.tsx").read_text(
        encoding="utf-8"
    )
    nav_source = Path("web-next/src/app/layout/nav.ts").read_text(encoding="utf-8")
    tokens_source = Path("web-next/src/styles/tokens.css").read_text(
        encoding="utf-8"
    )

    assert "RouterProvider" in app_source
    assert 'path: "/dashboard"' in route_source
    assert 'path: "/graphs"' in route_source
    assert 'path: "/settings"' in route_source
    assert "AppShell" in shell_source
    assert "GraphRAG" in shell_source
    assert "Admin Console" in shell_source
    assert "工作区" in shell_source
    assert "搜索图谱、实体、任务..." in shell_source
    assert "新建图谱" in shell_source
    assert "概览" in nav_source
    assert "知识图谱" in nav_source
    assert "图谱可视化" in nav_source
    assert "运维" in nav_source
    assert "集成" in nav_source
    assert "--brand-600: #155EEF;" in tokens_source
    assert "--sidebar-w: 240px;" in tokens_source


def test_web_next_vite_dev_server_listens_on_lan_host():
    vite_source = Path("web-next/vite.config.ts").read_text(encoding="utf-8")

    assert 'host: "0.0.0.0"' in vite_source


def test_web_next_data_layer_uses_repository_contracts():
    api_types_source = Path("web-next/src/shared/types/api.ts").read_text(
        encoding="utf-8"
    )
    repository_types_source = Path(
        "web-next/src/services/repositories/types.ts"
    ).read_text(encoding="utf-8")
    repository_provider_source = Path(
        "web-next/src/app/providers/RepositoryProvider.tsx"
    ).read_text(encoding="utf-8")
    http_repositories_source = Path(
        "web-next/src/services/repositories/httpRepositories.ts"
    ).read_text(encoding="utf-8")

    assert "export interface GraphDetailPayload" in api_types_source
    assert "export interface GraphStatusPayload" in api_types_source
    assert "export interface GraphRepository" in repository_types_source
    assert "export interface QueryRepository" in repository_types_source
    assert "createGraph" in repository_types_source
    assert "listGraphFiles" in repository_types_source
    assert "uploadGraphFiles" in repository_types_source
    assert "startGraphBuild" in repository_types_source
    assert "runQuery" in repository_types_source
    assert "updateSystemConfig" in repository_types_source
    assert "createContext" in repository_provider_source
    assert "useRepositories" in repository_provider_source
    assert "createHttpRepositories" in http_repositories_source
    assert "fetch(" in http_repositories_source
    assert "createHttpRepositories" in repository_provider_source
    assert "createMockRepositories" not in repository_provider_source
    assert not Path("web-next/src/services/repositories/mockRepositories.ts").exists()
    assert not Path("web-next/src/mocks/fixtures/graphs.ts").exists()
    assert not Path("web-next/src/mocks/fixtures/query.ts").exists()
    assert not Path("web-next/src/mocks/fixtures/settings.ts").exists()


def test_web_next_core_pages_are_repository_driven():
    graph_page_source = Path(
        "web-next/src/pages/graphs/GraphManagementPage.tsx"
    ).read_text(encoding="utf-8")
    graph_detail_panel_source = Path(
        "web-next/src/features/graph-management/GraphDetailPanel.tsx"
    ).read_text(encoding="utf-8")
    query_page_source = Path(
        "web-next/src/pages/query/QueryWorkbenchPage.tsx"
    ).read_text(encoding="utf-8")
    settings_page_source = Path(
        "web-next/src/pages/settings/SettingsPage.tsx"
    ).read_text(encoding="utf-8")
    graph_list_panel_source = Path(
        "web-next/src/features/graph-management/GraphListPanel.tsx"
    ).read_text(encoding="utf-8")

    assert "useRepositories" in graph_page_source
    assert "GraphListPanel" in graph_page_source
    assert "GraphDetailPanel" in graph_page_source
    assert "BuildStatusPanel" in graph_detail_panel_source
    assert "知识图谱" in graph_list_panel_source
    assert "按名称或描述筛选..." in graph_list_panel_source
    assert "图谱管理" in graph_page_source

    assert "QueryComposer" in query_page_source
    assert "QueryResultPanel" in query_page_source
    assert "graphRepository" in query_page_source
    assert "runQuery" in query_page_source
    assert "demo-001" not in query_page_source
    assert "fallbackRecentQueries" not in query_page_source
    assert "查询测试台" in query_page_source
    assert "global" in query_page_source
    assert "drift" in query_page_source

    assert "useRepositories" in settings_page_source
    assert "updateSystemConfig" in settings_page_source
    assert "fallbackConfig" not in settings_page_source
    assert "系统设置" in settings_page_source
    assert "默认 LLM" in settings_page_source


def test_web_next_supporting_pages_cover_all_phase_one_routes():
    dashboard_source = Path(
        "web-next/src/pages/dashboard/DashboardPage.tsx"
    ).read_text(encoding="utf-8")
    viz_source = Path(
        "web-next/src/pages/graph-viz/GraphVisualizationPage.tsx"
    ).read_text(encoding="utf-8")
    sources_source = Path(
        "web-next/src/pages/data-sources/DataSourcesPage.tsx"
    ).read_text(encoding="utf-8")
    browse_source = Path(
        "web-next/src/pages/browse/EntityBrowserPage.tsx"
    ).read_text(encoding="utf-8")
    jobs_source = Path("web-next/src/pages/jobs/JobMonitorPage.tsx").read_text(
        encoding="utf-8"
    )
    dify_source = Path(
        "web-next/src/pages/dify/DifyIntegrationPage.tsx"
    ).read_text(encoding="utf-8")

    assert "Dify 对接状态" in dashboard_source
    assert "最近任务" in dashboard_source
    assert "力导向图" in viz_source
    assert "社区块状视图" in viz_source
    assert "数据源" in sources_source
    assert "分片配置" in sources_source
    assert "实体 / 关系" in browse_source
    assert "社区" in browse_source
    assert "任务监控" in jobs_source
    assert "Token" in jobs_source
    assert "Dify 对接" in dify_source
    assert "Endpoint" in dify_source


def test_web_next_router_uses_vite_base_as_basename():
    routes_source = Path("web-next/src/app/router/routes.tsx").read_text(
        encoding="utf-8"
    )

    assert "basename: import.meta.env.BASE_URL" in routes_source


def test_web_next_shell_uses_html_aligned_surface_styles():
    globals_source = Path("web-next/src/styles/globals.css").read_text(
        encoding="utf-8"
    )
    utilities_source = Path("web-next/src/styles/utilities.css").read_text(
        encoding="utf-8"
    )
    shell_source = Path("web-next/src/app/layout/AppShell.tsx").read_text(
        encoding="utf-8"
    )
    dashboard_source = Path("web-next/src/pages/dashboard/DashboardPage.tsx").read_text(
        encoding="utf-8"
    )

    assert "backdrop-filter" in globals_source
    assert ".workspace-switch" in globals_source
    assert ".top-search" in globals_source
    assert ".toolbar-primary-button" in globals_source
    assert ".toolbar-primary-button:hover" in globals_source
    assert "background: var(--brand-700);" not in globals_source
    assert ".searchbar" in globals_source
    assert ".kbd" in globals_source
    assert ".brand-graph-icon" in globals_source
    assert ".dashboard-kpi-grid" in utilities_source
    assert ".dashboard-insights-grid" in utilities_source
    assert ".dashboard-bottom-grid" in utilities_source
    assert ".dashboard-footer-grid" in utilities_source
    assert ".recent-task-card" in utilities_source
    assert 'className="searchbar"' in shell_source
    assert 'className="kbd"' in shell_source
    assert 'className="brand-graph-icon"' in shell_source
    assert "dashboard-kpi-grid" in dashboard_source
    assert "dashboard-footer-grid" in dashboard_source


def test_web_next_pages_reflect_dashboard_html_information_architecture():
    dashboard_source = Path(
        "web-next/src/pages/dashboard/DashboardPage.tsx"
    ).read_text(encoding="utf-8")
    dashboard_fixture_source = Path(
        "web-next/src/mocks/fixtures/dashboard.ts"
    ).read_text(encoding="utf-8")
    graph_feature_source = Path(
        "web-next/src/features/graph-management/GraphListPanel.tsx"
    ).read_text(encoding="utf-8")
    viz_source = Path(
        "web-next/src/pages/graph-viz/GraphVisualizationPage.tsx"
    ).read_text(encoding="utf-8")
    query_source = Path(
        "web-next/src/features/graph-query/QueryComposer.tsx"
    ).read_text(encoding="utf-8")
    result_source = Path(
        "web-next/src/features/graph-query/QueryResultPanel.tsx"
    ).read_text(encoding="utf-8")
    jobs_source = Path("web-next/src/pages/jobs/JobMonitorPage.tsx").read_text(
        encoding="utf-8"
    )
    dify_source = Path(
        "web-next/src/pages/dify/DifyIntegrationPage.tsx"
    ).read_text(encoding="utf-8")
    settings_source = Path(
        "web-next/src/pages/settings/SettingsPage.tsx"
    ).read_text(encoding="utf-8")

    assert "快捷操作" in dashboard_source
    assert "Dify 对接状态" in dashboard_source
    assert "查看图谱总体状态、最近索引任务和资源消耗。" in dashboard_source
    assert "过去 14 天" in dashboard_source
    assert "7天" in dashboard_fixture_source
    assert "14天" in dashboard_fixture_source
    assert "30天" in dashboard_fixture_source
    assert "查看全部" in dashboard_source
    assert "重新同步" in dashboard_source
    assert "上传数据源" in dashboard_fixture_source
    assert "最近查询" in dashboard_source
    assert "最近 Dify 调用" in dashboard_source
    assert "任务概况" in dashboard_source
    assert "负责人" in graph_feature_source
    assert "索引方法" in graph_feature_source
    assert "隐藏跨社区桥边" in viz_source
    assert "Global Search" in query_source
    assert "最近查询" in query_source
    assert "检索上下文" in result_source
    assert "执行链路" in result_source
    assert "平均耗时" in jobs_source
    assert "知识库映射" in dify_source
    assert "连接成功" in dify_source
    assert "最近 Dify 调用" in dify_source
    assert "LLM 配置" in settings_source
    assert "向量库" in settings_source


def test_graph_management_page_matches_html_list_console_layout():
    graphs_page_source = Path(
        "web-next/src/pages/graphs/GraphManagementPage.tsx"
    ).read_text(encoding="utf-8")
    graph_feature_source = Path(
        "web-next/src/features/graph-management/GraphListPanel.tsx"
    ).read_text(encoding="utf-8")
    utilities_source = Path("web-next/src/styles/utilities.css").read_text(
        encoding="utf-8"
    )

    assert "GraphDetailPanel" in graphs_page_source
    assert "two-column-layout" in graphs_page_source
    assert "graph-page-shell" in graph_feature_source
    assert "onSelectGraph" in graph_feature_source
    assert "selectedGraphId" in graph_feature_source
    assert "按名称或描述筛选..." in graph_feature_source
    assert "全部状态" in graph_feature_source
    assert "所有索引方法" in graph_feature_source
    assert "显示 " in graph_feature_source
    assert "上一页" in graph_feature_source
    assert "下一页" in graph_feature_source
    assert "graph-toolbar" in utilities_source
    assert "graph-table-shell" in utilities_source
    assert "graph-row-actions" in utilities_source


def test_graph_management_create_wizard_matches_reference_steps():
    graph_feature_source = Path(
        "web-next/src/features/graph-management/GraphListPanel.tsx"
    ).read_text(encoding="utf-8")
    wizard_source = Path(
        "web-next/src/features/graph-management/CreateGraphWizard.tsx"
    ).read_text(encoding="utf-8")
    utilities_source = Path("web-next/src/styles/utilities.css").read_text(
        encoding="utf-8"
    )

    assert "CreateGraphWizard" in graph_feature_source
    assert "新建知识图谱" in wizard_source
    assert "基础信息" in wizard_source
    assert "数据源" in wizard_source
    assert "索引参数" in wizard_source
    assert "模型 & 确认" in wizard_source
    assert "图谱名称" in wizard_source
    assert "数据源类型" in wizard_source
    assert "Chunk Size" in wizard_source
    assert "LLM 模型" in wizard_source
    assert "创建并启动索引" in wizard_source
    assert "create-graph-modal" in utilities_source
    assert "wizard-stepper" in utilities_source
    assert "method-choice-card" in utilities_source


def test_graph_visualization_page_matches_reference_workspace_layout():
    viz_source = Path(
        "web-next/src/pages/graph-viz/GraphVisualizationPage.tsx"
    ).read_text(encoding="utf-8")
    utilities_source = Path("web-next/src/styles/utilities.css").read_text(
        encoding="utf-8"
    )

    assert "useParams" in viz_source
    assert "useRepositories" in viz_source
    assert "力导向图" in viz_source
    assert "社区块状视图" in viz_source
    assert "Level 1" in viz_source
    assert "按社区着色" in viz_source
    assert "39 节点 · 54 边" in viz_source
    assert "图谱统计" in viz_source
    assert "最小度数" in viz_source
    assert "显示节点标签" in viz_source
    assert "viz-workspace" in utilities_source
    assert "viz-inspector" in utilities_source
    assert "viz-legend" in utilities_source


def test_data_sources_workspace_matches_reference_tabs_and_forms():
    sources_source = Path(
        "web-next/src/pages/data-sources/DataSourcesPage.tsx"
    ).read_text(encoding="utf-8")
    utilities_source = Path("web-next/src/styles/utilities.css").read_text(
        encoding="utf-8"
    )

    assert "Input Reader" in sources_source
    assert "分片配置" in sources_source
    assert "向量化" in sources_source
    assert "重新索引" in sources_source
    assert "Input 类型" in sources_source
    assert "File Type" in sources_source
    assert "Base Directory" in sources_source
    assert "File Pattern" in sources_source
    assert "chunk_size" in sources_source
    assert "chunk_overlap" in sources_source
    assert "Encoding Model" in sources_source
    assert "预览" in sources_source
    assert "向量模型" in sources_source
    assert "向量库" in sources_source
    assert "Embedding Batch Size" in sources_source
    assert "测试连接" in sources_source
    assert "data-source-workspace" in utilities_source
    assert "source-tab-nav" in utilities_source
    assert "source-upload-panel" in utilities_source
    assert "source-reader-grid" in utilities_source
    assert "source-chunk-grid" in utilities_source
    assert "source-vector-grid" in utilities_source


def test_query_workbench_matches_reference_console_layout():
    query_page_source = Path(
        "web-next/src/pages/query/QueryWorkbenchPage.tsx"
    ).read_text(encoding="utf-8")
    composer_source = Path(
        "web-next/src/features/graph-query/QueryComposer.tsx"
    ).read_text(encoding="utf-8")
    result_source = Path(
        "web-next/src/features/graph-query/QueryResultPanel.tsx"
    ).read_text(encoding="utf-8")
    utilities_source = Path("web-next/src/styles/utilities.css").read_text(
        encoding="utf-8"
    )

    assert "Global Search" in composer_source
    assert "Local Search" in composer_source
    assert "Drift Search" in composer_source
    assert "Community Level" in query_page_source
    assert "Response Type" in query_page_source
    assert "Max Context Tokens" in query_page_source
    assert "Temperature" in query_page_source
    assert "启用引用" in query_page_source
    assert "流式响应" in query_page_source
    assert "估算" in composer_source
    assert "高级参数" in composer_source
    assert "运行查询" in composer_source
    assert "回答" in result_source
    assert "检索上下文" in result_source
    assert "命中社区" in result_source
    assert "执行链路" in result_source
    assert "query-workbench-grid" in utilities_source
    assert "query-main-stack" in utilities_source
    assert "query-composer-card" in utilities_source
    assert "query-settings-card" in utilities_source
    assert "query-result-card" in utilities_source
    assert "query-result-tabs" in utilities_source
    assert "graphOptions" in query_page_source
    assert "selectedGraphId" in query_page_source


def test_entity_browser_matches_reference_three_tab_workspace():
    browse_source = Path(
        "web-next/src/pages/browse/EntityBrowserPage.tsx"
    ).read_text(encoding="utf-8")
    utilities_source = Path("web-next/src/styles/utilities.css").read_text(
        encoding="utf-8"
    )

    assert "实体" in browse_source
    assert "关系" in browse_source
    assert "社区" in browse_source
    assert "按名称搜索实体..." in browse_source
    assert "搜索..." in browse_source
    assert "全部类型" in browse_source
    assert "全部社区" in browse_source
    assert "导出 CSV" in browse_source
    assert "Subject" in browse_source
    assert "Predicate" in browse_source
    assert "Object" in browse_source
    assert "置信度" in browse_source
    assert "查看报告" in browse_source
    assert "可视化" in browse_source
    assert "browse-workspace" in utilities_source
    assert "browse-tab-nav" in utilities_source
    assert "browse-toolbar" in utilities_source
    assert "browse-table-shell" in utilities_source
    assert "browse-community-grid" in utilities_source
    assert "browse-community-card" in utilities_source


def test_job_monitor_matches_reference_console_layout():
    jobs_source = Path("web-next/src/pages/jobs/JobMonitorPage.tsx").read_text(
        encoding="utf-8"
    )
    utilities_source = Path("web-next/src/styles/utilities.css").read_text(
        encoding="utf-8"
    )

    assert "刷新" in jobs_source
    assert "启动新任务" in jobs_source
    assert "运行中" in jobs_source
    assert "今日完成" in jobs_source
    assert "失败" in jobs_source
    assert "平均耗时" in jobs_source
    assert "全部状态" in jobs_source
    assert "所有图谱" in jobs_source
    assert "任务 ID" in jobs_source
    assert "当前阶段" in jobs_source
    assert "进度" in jobs_source
    assert "Token" in jobs_source
    assert "耗时" in jobs_source
    assert "状态" in jobs_source
    assert "GenerateReports" in jobs_source
    assert "Incremental" in jobs_source
    assert "FastGraphRAG" in jobs_source
    assert "jobs-page-shell" in utilities_source
    assert "jobs-kpi-grid" in utilities_source
    assert "jobs-table-shell" in utilities_source
    assert "jobs-progress-cell" in utilities_source
    assert "jobs-status-pill" in utilities_source
    assert "job-action-button" in utilities_source


def test_dify_integration_matches_reference_console_layout():
    dify_source = Path(
        "web-next/src/pages/dify/DifyIntegrationPage.tsx"
    ).read_text(encoding="utf-8")
    utilities_source = Path("web-next/src/styles/utilities.css").read_text(
        encoding="utf-8"
    )

    assert "对接文档" in dify_source
    assert "保存配置" in dify_source
    assert "连接成功" in dify_source
    assert "基础连接" in dify_source
    assert "Dify Endpoint" in dify_source
    assert "API Key" in dify_source
    assert "Workspace ID" in dify_source
    assert "测试连接" in dify_source
    assert "知识库映射" in dify_source
    assert "Dify Self-Hosted" in dify_source
    assert "最近 Dify 调用" in dify_source
    assert "Global Search" in dify_source
    assert "Local Search" in dify_source
    assert "Drift Search" in dify_source
    assert "成功率" in dify_source
    assert "已连接" in dify_source
    assert "在线" in dify_source
    assert "dify-page-shell" in utilities_source
    assert "dify-console-grid" in utilities_source
    assert "dify-connection-banner" in utilities_source
    assert "dify-connection-card" in utilities_source
    assert "dify-mapping-table" in utilities_source
    assert "dify-instance-card" in utilities_source
    assert "dify-call-list" in utilities_source


def test_settings_workspace_matches_reference_console_sections():
    settings_source = Path(
        "web-next/src/pages/settings/SettingsPage.tsx"
    ).read_text(encoding="utf-8")
    utilities_source = Path("web-next/src/styles/utilities.css").read_text(
        encoding="utf-8"
    )

    assert "settings-workspace" in settings_source
    assert "settings-side-nav" in settings_source
    assert "LLM 配置" in settings_source
    assert "向量库" in settings_source
    assert "用户与权限" in settings_source
    assert "API Keys" in settings_source
    assert "Webhook" in settings_source
    assert "日志" in settings_source
    assert "默认 LLM" in settings_source
    assert "速率限制与重试" in settings_source
    assert "向量库实例" in settings_source
    assert "默认 Embedding 模型" in settings_source
    assert "成员 (5)" in settings_source
    assert "角色权限矩阵" in settings_source
    assert "生成新 Key" in settings_source
    assert "Webhook 端点" in settings_source
    assert "可订阅事件" in settings_source
    assert "最近 1 小时" in settings_source
    assert "settings-workspace" in utilities_source
    assert "settings-side-nav" in utilities_source
    assert "settings-nav-item" in utilities_source
    assert "settings-panel-card" in utilities_source
    assert "settings-vector-table" in utilities_source
    assert "settings-user-table" in utilities_source
    assert "settings-api-warning" in utilities_source
    assert "settings-webhook-events" in utilities_source
    assert "settings-log-console" in utilities_source


def test_web_next_sidebar_uses_exact_route_matching():
    shell_source = Path("web-next/src/app/layout/AppShell.tsx").read_text(
        encoding="utf-8"
    )

    assert "<NavLink" in shell_source
    assert "end" in shell_source
