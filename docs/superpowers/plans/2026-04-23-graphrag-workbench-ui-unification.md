# GraphRAG Workbench UI Unification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify the graph, model, and query pages into one balanced professional workbench with corrected Chinese copy, shared status semantics, and clearer task-oriented layouts.

**Architecture:** Keep the existing React routes, API client, and Ant Design building blocks, then layer the redesign through one shared copy/status module, revised global CSS tokens, and targeted JSX restructuring in the three page routes plus their directly related shared components. Use the existing frontend source-assertion test style in `tests/unit/web/test_frontend_scaffold.py` to drive the refactor red-green, then finish with a production Vite build and only stage task-relevant files.

**Tech Stack:** React 18, TypeScript, Ant Design 5, ECharts, CSS, pytest, Vite

---

## Execution Constraints

- The user explicitly does **not** want code commits during execution.
- If a checkpoint is needed, use `git add` only on the files listed in the active
  task.
- Do not stage or revert unrelated dirty files already present in the repo.
- Verify any rewritten Chinese UI strings are saved and read as UTF-8.

## File Structure

- Create: `web/src/content/workbench.ts`
  Purpose: centralize navigation labels, graph status labels, progress-stage
  labels, query-mode metadata, and query-context section labels.
- Modify: `web/src/App.tsx`
  Purpose: consume centralized navigation copy and expose stable shell classes.
- Modify: `web/src/styles.css`
  Purpose: define the balanced blue/slate token system, shared page-frame
  classes, responsive rules, reduced-motion behavior, and updated component
  layout styles.
- Modify: `web/src/pages/GraphManagePage.tsx`
  Purpose: restructure the graph page into overview, input, build, and results
  sections while keeping the same data flow.
- Modify: `web/src/components/BuildStatusCard.tsx`
  Purpose: replace duplicated status/stage label logic with centralized labels
  and restyle the build surface as a clearer control panel.
- Modify: `web/src/components/GraphTable.tsx`
  Purpose: keep the table behavior but present it as project navigation with the
  new status semantics.
- Modify: `web/src/components/UploadPanel.tsx`
  Purpose: turn the upload card into an explicit "data input" surface with
  better helper copy.
- Modify: `web/src/components/GraphPreview.tsx`
  Purpose: align graph colors and result composition with the new blue-gray data
  palette.
- Modify: `web/src/components/TextUnitList.tsx`
  Purpose: keep the current table behavior while aligning labels and result
  hierarchy with the new copy system.
- Modify: `web/src/pages/ModelConfigPage.tsx`
  Purpose: split the page into "system defaults" and "model registry" sections
  with clearer action hierarchy.
- Modify: `web/src/components/ModelProfileForm.tsx`
  Purpose: group fields into preset, connection, capability, and default-state
  sections.
- Modify: `web/src/pages/QueryPage.tsx`
  Purpose: move to a split workbench layout and translate result context keys
  into clearer section labels.
- Modify: `web/src/components/QueryPanel.tsx`
  Purpose: use centralized query mode metadata and add short guidance for the
  selected mode.
- Modify: `tests/unit/web/test_frontend_scaffold.py`
  Purpose: drive the redesign with source assertions for the new copy module,
  page layout hooks, grouped form sections, and final responsive guards.

## Task 1: Centralize copy and status semantics

**Files:**
- Create: `web/src/content/workbench.ts`
- Modify: `web/src/App.tsx`
- Modify: `web/src/components/BuildStatusCard.tsx`
- Modify: `web/src/components/GraphTable.tsx`
- Modify: `web/src/components/QueryPanel.tsx`
- Modify: `web/src/pages/QueryPage.tsx`
- Test: `tests/unit/web/test_frontend_scaffold.py`

- [ ] **Step 1: Write the failing source assertions for the new copy module**

Add this test near the other frontend copy assertions in
`tests/unit/web/test_frontend_scaffold.py`:

```python
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
    assert "GRAPH_STATUS_META" in build_source
    assert "GRAPH_STATUS_META" in table_source
    assert "QUERY_MODE_OPTIONS" in query_panel_source
    assert "QUERY_CONTEXT_LABELS" in query_page_source
```

- [ ] **Step 2: Run the focused scaffold test and verify it fails**

Run:

```powershell
uv run pytest tests/unit/web/test_frontend_scaffold.py -q
```

Expected: FAIL because `web/src/content/workbench.ts` does not exist yet and the
pages/components still define copy inline.

- [ ] **Step 3: Create `web/src/content/workbench.ts` and wire it into the shell and shared components**

Create `web/src/content/workbench.ts` with this content:

```ts
import type { QueryMode } from "../types";

export const navigationItems = [
  { key: "/graphs", label: "图谱工作台" },
  { key: "/models", label: "模型配置" },
  { key: "/query", label: "查询工作台" },
] as const;

export const GRAPH_STATUS_META: Record<
  string,
  { color: "default" | "processing" | "success" | "warning" | "error"; label: string }
> = {
  awaiting_upload: { color: "default", label: "待上传" },
  awaiting_build: { color: "warning", label: "待构建" },
  ready: { color: "success", label: "可查询" },
  building: { color: "processing", label: "构建中" },
  failed: { color: "error", label: "构建失败" },
  artifacts_deleted: { color: "warning", label: "需重建" },
  initialized: { color: "default", label: "待上传" },
};

export const GRAPH_STAGE_LABELS: Record<string, string> = {
  awaiting_upload: "等待上传",
  awaiting_build: "等待构建",
  build_started: "启动构建",
  documents_indexed: "整理文档",
  text_units_created: "生成切片",
  reports_generation: "生成报告",
  embedding_generation: "生成向量",
  completed: "构建完成",
};

export const QUERY_MODE_OPTIONS: Array<{
  value: QueryMode;
  label: string;
  description: string;
}> = [
  { value: "local", label: "Local Search", description: "面向局部实体关系，适合精确问题。" },
  { value: "global", label: "Global Search", description: "聚合社区级摘要，适合全局问题。" },
  { value: "basic", label: "Basic Search", description: "使用更直接的检索路径，适合快速验证。" },
  { value: "drift", label: "Drift Search", description: "扩大搜索发散范围，适合探索性问题。" },
];

export const QUERY_CONTEXT_LABELS: Record<string, string> = {
  reports: "社区报告",
  entities: "实体依据",
  relationships: "关系依据",
  sources: "来源文档",
  claims: "证据条目",
};

export function getGraphStatusMeta(status: string) {
  return GRAPH_STATUS_META[status] ?? { color: "default" as const, label: status };
}

export function getGraphStageLabel(stage: string) {
  return GRAPH_STAGE_LABELS[stage] ?? stage;
}

export function getQueryContextLabel(key: string) {
  return QUERY_CONTEXT_LABELS[key] ?? key;
}
```

Update `web/src/App.tsx` imports and remove the inline `navigationItems`:

```tsx
import { navigationItems } from "./content/workbench";
```

Update `web/src/components/BuildStatusCard.tsx`:

```tsx
import {
  getGraphStageLabel,
  getGraphStatusMeta,
} from "../content/workbench";

const currentStatus = status ? getGraphStatusMeta(status.status) : null;
```

Update `web/src/components/GraphTable.tsx`:

```tsx
import { getGraphStatusMeta } from "../content/workbench";

const meta = getGraphStatusMeta(status);
```

Update `web/src/components/QueryPanel.tsx`:

```tsx
import { QUERY_MODE_OPTIONS } from "../content/workbench";
```

Update `web/src/pages/QueryPage.tsx`:

```tsx
import { getQueryContextLabel } from "../content/workbench";
```

- [ ] **Step 4: Run the scaffold test again**

Run:

```powershell
uv run pytest tests/unit/web/test_frontend_scaffold.py -q
```

Expected: PASS for the new copy-module test, while older tests may still fail
until later tasks rewrite the remaining mojibake assertions.

- [ ] **Step 5: Stage only the task-relevant files if a checkpoint is needed**

Run:

```bash
git add web/src/content/workbench.ts web/src/App.tsx web/src/components/BuildStatusCard.tsx web/src/components/GraphTable.tsx web/src/components/QueryPanel.tsx web/src/pages/QueryPage.tsx tests/unit/web/test_frontend_scaffold.py
```

Expected: only these task files are staged; unrelated dirty files remain
unstaged.

## Task 2: Rebuild the shared shell and global workbench frame

**Files:**
- Modify: `web/src/App.tsx`
- Modify: `web/src/styles.css`
- Test: `tests/unit/web/test_frontend_scaffold.py`

- [ ] **Step 1: Write the failing shell/token assertions**

Add this test to `tests/unit/web/test_frontend_scaffold.py`:

```python
def test_workbench_shell_uses_balanced_console_tokens_and_frame_classes():
    app_source = Path("web/src/App.tsx").read_text(encoding="utf-8")
    styles_source = Path("web/src/styles.css").read_text(encoding="utf-8")

    assert 'className="app-shell analysis-shell"' in app_source
    assert 'className="app-header analysis-header"' in app_source
    assert 'className="brand-block analysis-brand"' in app_source
    assert 'className="nav-menu analysis-nav-menu"' in app_source
    assert "--analysis-accent: #1e40af;" in styles_source
    assert "--analysis-warning: #f59e0b;" in styles_source
    assert ".analysis-page {" in styles_source
    assert ".page-hero {" in styles_source
    assert ".page-section {" in styles_source
    assert ".section-heading {" in styles_source
    assert "@media (prefers-reduced-motion: reduce)" in styles_source
```

- [ ] **Step 2: Run the scaffold test and verify it fails**

Run:

```powershell
uv run pytest tests/unit/web/test_frontend_scaffold.py -q
```

Expected: FAIL because the current shell still uses the older indigo token set
and does not expose the `analysis-*` shell classes.

- [ ] **Step 3: Update `App.tsx` and `styles.css` to the new shell and page-frame language**

Replace the `Layout` wrapper and header class names in `web/src/App.tsx`:

```tsx
return (
  <Layout className="app-shell analysis-shell">
    <header className="app-header analysis-header">
      <div className="brand-block analysis-brand">
        <span className="brand-kicker">GraphRAG Workbench</span>
        <Typography.Title level={2} className="brand-title">
          知识图谱工作台
        </Typography.Title>
      </div>
      <Menu
        mode="horizontal"
        selectedKeys={[selectedKey]}
        items={navigationItems}
        className="nav-menu analysis-nav-menu"
        onClick={({ key }) => navigate(key)}
      />
    </header>
```

Replace the token block and add shared frame classes in `web/src/styles.css`:

```css
:root {
  --analysis-bg: #f8fafc;
  --analysis-bg-top: #ffffff;
  --analysis-panel: rgba(255, 255, 255, 0.9);
  --analysis-panel-strong: #ffffff;
  --analysis-line: rgba(15, 23, 42, 0.08);
  --analysis-line-strong: rgba(15, 23, 42, 0.12);
  --analysis-text: #0f172a;
  --analysis-text-soft: #475569;
  --analysis-text-faint: #94a3b8;
  --analysis-accent: #1e40af;
  --analysis-accent-bright: #3b82f6;
  --analysis-accent-soft: rgba(30, 64, 175, 0.08);
  --analysis-accent-mid: rgba(30, 64, 175, 0.16);
  --analysis-warning: #f59e0b;
  --analysis-success: #16a34a;
  --analysis-danger: #dc2626;
  --analysis-shadow:
    0 1px 2px rgb(15 23 42 / 0.06),
    0 18px 40px rgb(15 23 42 / 0.08);
  --analysis-shadow-lg:
    0 12px 24px rgb(15 23 42 / 0.08),
    0 20px 48px rgb(15 23 42 / 0.12);
  font-family: "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
}

.analysis-shell {
  min-height: 100vh;
  background:
    radial-gradient(circle at top left, rgba(59, 130, 246, 0.08), transparent 22%),
    linear-gradient(180deg, var(--analysis-bg-top) 0%, var(--analysis-bg) 100%);
}

.analysis-header {
  background: rgba(255, 255, 255, 0.78);
  backdrop-filter: blur(16px);
}

.analysis-brand {
  gap: 4px;
}

.analysis-nav-menu.ant-menu {
  background: transparent !important;
}

.analysis-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.page-hero {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
  padding: 28px 32px;
  border: 1px solid var(--analysis-line);
  border-radius: 16px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(248, 250, 252, 0.92));
  box-shadow: var(--analysis-shadow);
}

.page-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-heading {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 12px;
}

.section-kicker {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--analysis-accent);
}

@media (prefers-reduced-motion: reduce) {
  * {
    transition: none !important;
    scroll-behavior: auto !important;
  }
}
```

- [ ] **Step 4: Run the scaffold test again**

Run:

```powershell
uv run pytest tests/unit/web/test_frontend_scaffold.py -q
```

Expected: PASS for the shell/frame assertions, with remaining failures limited to
page/component behavior that later tasks will update.

- [ ] **Step 5: Stage only the shell task files if a checkpoint is needed**

Run:

```bash
git add web/src/App.tsx web/src/styles.css tests/unit/web/test_frontend_scaffold.py
```

Expected: only the shell and test files are staged.

## Task 3: Restructure the graph page into overview, input, build, and results zones

**Files:**
- Modify: `web/src/pages/GraphManagePage.tsx`
- Modify: `web/src/components/BuildStatusCard.tsx`
- Modify: `web/src/components/GraphTable.tsx`
- Modify: `web/src/components/UploadPanel.tsx`
- Modify: `web/src/components/GraphPreview.tsx`
- Modify: `web/src/components/TextUnitList.tsx`
- Modify: `web/src/styles.css`
- Test: `tests/unit/web/test_frontend_scaffold.py`

- [ ] **Step 1: Write the failing graph workbench layout assertions**

Add this test to `tests/unit/web/test_frontend_scaffold.py`:

```python
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
```

- [ ] **Step 2: Run the scaffold test and verify it fails**

Run:

```powershell
uv run pytest tests/unit/web/test_frontend_scaffold.py -q
```

Expected: FAIL because the graph page still uses the older flat stack and the
shared graph-operation components do not expose the new layout hooks.

- [ ] **Step 3: Rewrite the graph page structure and the shared graph-operation surfaces**

In `web/src/pages/GraphManagePage.tsx`, replace the old sidebar/workspace block
with a sectioned workbench layout:

```tsx
<div className="page-grid analysis-layout analysis-layout--graphs">
  <aside className="analysis-sidebar">
    <div className="page-section">
      <div className="section-heading">
        <div>
          <Typography.Text className="section-kicker">Projects</Typography.Text>
          <Typography.Title level={5} style={{ margin: 0 }}>
            图谱导航
          </Typography.Title>
        </div>
        <Button type="primary" onClick={openCreateModal}>
          新建图谱
        </Button>
      </div>
      <GraphTable
        graphs={graphs}
        loading={listLoading}
        selectedGraphId={selectedGraphId}
        onRefresh={() => void loadGraphs()}
        onSelect={(graph) => setSelectedGraphId(graph.id)}
        onDelete={(graph) => void handleDeleteGraph(graph)}
      />
    </div>
  </aside>

  <main className="analysis-main">
    {graphDetail ? (
      <div className="page-stack">
        <section className="page-section">
          <div className="section-heading">
            <div>
              <Typography.Text className="section-kicker">Overview</Typography.Text>
              <Typography.Title level={5} style={{ margin: 0 }}>
                图谱概览
              </Typography.Title>
            </div>
          </div>
          <Card className="analysis-card analysis-card--overview" title={graphDetail.name}>
            {/* existing Descriptions block stays here */}
          </Card>
        </section>

        <section className="page-section">
          <div className="section-heading">
            <div>
              <Typography.Text className="section-kicker">Input</Typography.Text>
              <Typography.Title level={5} style={{ margin: 0 }}>
                数据输入
              </Typography.Title>
            </div>
          </div>
          <UploadPanel ... />
          {/* existing source file card stays in this section */}
        </section>

        <section className="page-section">
          <div className="section-heading">
            <div>
              <Typography.Text className="section-kicker">Build</Typography.Text>
              <Typography.Title level={5} style={{ margin: 0 }}>
                构建控制
              </Typography.Title>
            </div>
          </div>
          <BuildStatusCard ... />
        </section>

        <section className="page-section">
          <div className="section-heading">
            <div>
              <Typography.Text className="section-kicker">Results</Typography.Text>
              <Typography.Title level={5} style={{ margin: 0 }}>
                构建结果
              </Typography.Title>
            </div>
          </div>
          <div className="analysis-result-stack">
            <GraphPreview preview={graphPreview} reports={graphReports} loading={detailLoading} />
            <TextUnitList
              items={graphTextUnits?.items ?? []}
              loading={detailLoading}
              busy={actionLoading}
              onDelete={(textUnit) => void handleDeleteTextUnit(textUnit)}
            />
          </div>
        </section>
      </div>
    ) : (
      <Card className="analysis-card analysis-card--empty">
        <Empty description="请选择左侧图谱，或先创建一个新图谱。" />
      </Card>
    )}
  </main>
</div>
```

In `web/src/components/BuildStatusCard.tsx`, replace the top of the card body
with a clearer build summary:

```tsx
<div className="analysis-status-header">
  <div>
    <Typography.Text className="section-kicker">Build Status</Typography.Text>
    <Typography.Title level={5} style={{ margin: 0 }}>
      构建控制台
    </Typography.Title>
  </div>
  <Space direction="vertical" size={8} style={{ alignItems: "flex-end" }}>
    {/* existing Radio.Group and action buttons */}
  </Space>
</div>
```

Use the centralized stage label:

```tsx
<Descriptions.Item label="当前阶段">
  {getGraphStageLabel(status.progress_stage)}
</Descriptions.Item>
```

In `web/src/components/UploadPanel.tsx`, replace the dragger copy:

```tsx
<Typography.Text strong>上传源文件以构建图谱</Typography.Text>
<div className="analysis-upload-hint">
  支持 TXT、Markdown、JSON、JSONL、CSV、PDF。上传后可立即发起构建。
</div>
```

In `web/src/components/GraphPreview.tsx`, update the chart palette and summary
wrapper:

```tsx
itemStyle: {
  color: node.type === "person" ? "#3b82f6" : "#1e40af",
},
lineStyle: {
  color: "rgba(30, 64, 175, 0.28)",
  curveness: 0.08,
},
```

```tsx
<div className="analysis-preview-summary">
  <Row gutter={[12, 12]}>
```

Add the new layout/style rules to `web/src/styles.css`:

```css
.analysis-layout--graphs {
  grid-template-columns: 320px minmax(0, 1fr);
  gap: 24px;
}

.analysis-sidebar {
  position: sticky;
  top: 104px;
  align-self: start;
}

.analysis-main {
  min-width: 0;
}

.analysis-card--overview,
.analysis-card--empty {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(248, 250, 252, 0.92));
}

.analysis-status-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 16px;
}

.analysis-upload-hint {
  margin-top: 8px;
  color: var(--analysis-text-soft);
  font-size: 13px;
}

.analysis-preview-summary .ant-statistic {
  padding: 12px 14px;
  border: 1px solid var(--analysis-line);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.86);
}

.analysis-result-stack {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
```

- [ ] **Step 4: Run the scaffold test again**

Run:

```powershell
uv run pytest tests/unit/web/test_frontend_scaffold.py -q
```

Expected: PASS for the new graph-layout assertions, while model/query-specific
assertions may still fail until later tasks land.

- [ ] **Step 5: Stage only the graph workbench files if a checkpoint is needed**

Run:

```bash
git add web/src/pages/GraphManagePage.tsx web/src/components/BuildStatusCard.tsx web/src/components/GraphTable.tsx web/src/components/UploadPanel.tsx web/src/components/GraphPreview.tsx web/src/components/TextUnitList.tsx web/src/styles.css tests/unit/web/test_frontend_scaffold.py
```

Expected: only graph-page task files are staged.

## Task 4: Unify the model page and grouped profile form

**Files:**
- Modify: `web/src/pages/ModelConfigPage.tsx`
- Modify: `web/src/components/ModelProfileForm.tsx`
- Modify: `web/src/styles.css`
- Test: `tests/unit/web/test_frontend_scaffold.py`

- [ ] **Step 1: Write the failing model-page and grouped-form assertions**

Add this test to `tests/unit/web/test_frontend_scaffold.py`:

```python
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
```

- [ ] **Step 2: Run the scaffold test and verify it fails**

Run:

```powershell
uv run pytest tests/unit/web/test_frontend_scaffold.py -q
```

Expected: FAIL because the model page still renders as two plain cards and the
profile modal is still one uninterrupted form.

- [ ] **Step 3: Group the model page and profile form into clearer sections**

In `web/src/pages/ModelConfigPage.tsx`, wrap the content in section headings and
rewrite the hero/action copy:

```tsx
<div className="page-stack analysis-page analysis-page--models">
  {contextHolder}
  <div className="page-hero analysis-hero">
    <div>
      <Typography.Title level={3}>模型配置</Typography.Title>
      <Typography.Paragraph className="muted-text">
        统一管理模型接入、默认配置与图谱构建所需的系统路径设置。
      </Typography.Paragraph>
    </div>
    <Button
      type="primary"
      onClick={() => {
        setModalMode("create");
        setEditingProfile(null);
        setModalOpen(true);
      }}
    >
      新增模型
    </Button>
  </div>

  <section className="page-section">
    <div className="section-heading">
      <div>
        <Typography.Text className="section-kicker">System Defaults</Typography.Text>
        <Typography.Title level={5} style={{ margin: 0 }}>
          系统默认设置
        </Typography.Title>
      </div>
    </div>
    <Card className="analysis-card analysis-settings-card" loading={loading}>
      {/* existing system form */}
    </Card>
  </section>

  <section className="page-section">
    <div className="section-heading">
      <div>
        <Typography.Text className="section-kicker">Registry</Typography.Text>
        <Typography.Title level={5} style={{ margin: 0 }}>
          模型目录
        </Typography.Title>
      </div>
    </div>
    <Card className="analysis-card analysis-settings-card" loading={loading}>
      {/* existing Table */}
    </Card>
  </section>
</div>
```

In the model table actions, rename the connect button:

```tsx
<Button
  size="small"
  loading={connectLoadingId === record.id}
  onClick={() => void handleConnectProfile(record)}
>
  测试连接
</Button>
```

In `web/src/components/ModelProfileForm.tsx`, split the form body:

```tsx
<Modal
  className="analysis-modal analysis-modal--profile"
  open={open}
  title={mode === "create" ? "新增模型配置" : "编辑模型配置"}
  okText={mode === "create" ? "创建" : "保存"}
  cancelText="取消"
  confirmLoading={loading}
  onCancel={onCancel}
  onOk={() => void form.submit()}
  destroyOnClose
>
  <Form form={form} layout="vertical" onFinish={(values) => void onSubmit(values)}>
    <section className="profile-form-section">
      <Typography.Text className="section-kicker">Preset</Typography.Text>
      <Form.Item label="快速预设">
        {/* existing preset Select */}
      </Form.Item>
    </section>

    <section className="profile-form-section">
      <Typography.Text className="section-kicker">Connection</Typography.Text>
      <div className="profile-form-grid">
        {/* provider / name / base_url / api_key */}
      </div>
    </section>

    <section className="profile-form-section">
      <Typography.Text className="section-kicker">Capabilities</Typography.Text>
      <div className="profile-form-grid">
        {/* model_name / embedding_model_name / api_version */}
      </div>
    </section>

    <section className="profile-form-section">
      <Typography.Text className="section-kicker">Defaults</Typography.Text>
      {/* is_default and clear_api_key */}
    </section>
  </Form>
</Modal>
```

Add these rules to `web/src/styles.css`:

```css
.analysis-page--models {
  gap: 24px;
}

.analysis-settings-card {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.94), rgba(248, 250, 252, 0.9));
}

.profile-form-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 8px;
}

.profile-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}
```

- [ ] **Step 4: Run the scaffold test again**

Run:

```powershell
uv run pytest tests/unit/web/test_frontend_scaffold.py -q
```

Expected: PASS for the model-page/grouped-form assertions.

- [ ] **Step 5: Stage only the model task files if a checkpoint is needed**

Run:

```bash
git add web/src/pages/ModelConfigPage.tsx web/src/components/ModelProfileForm.tsx web/src/styles.css tests/unit/web/test_frontend_scaffold.py
```

Expected: only the model task files are staged.

## Task 5: Split the query workbench and translate result context labels

**Files:**
- Modify: `web/src/pages/QueryPage.tsx`
- Modify: `web/src/components/QueryPanel.tsx`
- Modify: `web/src/styles.css`
- Test: `tests/unit/web/test_frontend_scaffold.py`

- [ ] **Step 1: Write the failing query workbench assertions**

Add this test to `tests/unit/web/test_frontend_scaffold.py`:

```python
def test_query_page_uses_split_workbench_layout_and_context_labels():
    page_source = Path("web/src/pages/QueryPage.tsx").read_text(encoding="utf-8")
    panel_source = Path("web/src/components/QueryPanel.tsx").read_text(
        encoding="utf-8"
    )
    styles_source = Path("web/src/styles.css").read_text(encoding="utf-8")

    assert 'className="page-stack analysis-page analysis-page--query"' in page_source
    assert 'className="analysis-layout analysis-layout--query"' in page_source
    assert 'className="analysis-query-results"' in page_source
    assert "getQueryContextLabel(key)" in page_source
    assert 'className="analysis-card analysis-query-panel"' in panel_source
    assert "QUERY_MODE_OPTIONS" in panel_source
    assert 'className="field-help"' in panel_source
    assert ".analysis-layout--query {" in styles_source
    assert ".analysis-query-results {" in styles_source
    assert ".field-help {" in styles_source
```

- [ ] **Step 2: Run the scaffold test and verify it fails**

Run:

```powershell
uv run pytest tests/unit/web/test_frontend_scaffold.py -q
```

Expected: FAIL because the query page still stacks form and result cards, and
the panel/result views do not yet use the new layout hooks.

- [ ] **Step 3: Convert the query page into a split workbench layout and use labeled mode/context metadata**

In `web/src/components/QueryPanel.tsx`, replace the mode options and add helper
copy:

```tsx
import { QUERY_MODE_OPTIONS } from "../content/workbench";

const selectedMode = QUERY_MODE_OPTIONS.find((item) => item.value === mode);
```

Use the centralized options:

```tsx
<Card className="analysis-card analysis-query-panel" title="发起查询">
  <Form ...>
    <Space direction="vertical" size="middle" style={{ width: "100%" }}>
      {/* graph_id item */}
      <Form.Item<QueryRequest> label="查询模式" name="mode" rules={[{ required: true }]}>
        <Select
          options={QUERY_MODE_OPTIONS.map((item) => ({
            label: item.label,
            value: item.value,
          }))}
        />
      </Form.Item>
      <Typography.Paragraph className="field-help">
        {selectedMode?.description}
      </Typography.Paragraph>
      {/* rest of the form */}
    </Space>
  </Form>
</Card>
```

In `web/src/pages/QueryPage.tsx`, split the layout:

```tsx
<div className="page-stack analysis-page analysis-page--query">
  {contextHolder}
  <div className="page-hero analysis-hero">
    <div>
      <Typography.Title level={3}>查询工作台</Typography.Title>
      <Typography.Paragraph className="muted-text">
        选择目标图谱与查询模式，查看回答结果及其上下文依据。
      </Typography.Paragraph>
    </div>
  </div>

  <div className="analysis-layout analysis-layout--query">
    <div>
      <QueryPanel graphs={graphs} loading={queryLoading || loading} onSubmit={handleSubmit} />
    </div>

    <div className="analysis-query-results">
      <Card className="analysis-card analysis-query-result" title="回答">
        {result ? (
          <Typography.Paragraph className="answer-text">
            {renderAnswer(result.answer)}
          </Typography.Paragraph>
        ) : (
          <Empty description="先填写问题并发起查询。" />
        )}
      </Card>

      <Card className="analysis-card analysis-query-result" title="上下文依据">
        {result ? (
          <Collapse
            items={contextEntries.map(([key, value]) => ({
              key,
              label: getQueryContextLabel(key),
              children: renderContextValue(value),
            }))}
          />
        ) : (
          <Empty description="查询完成后将在这里显示上下文依据。" />
        )}
      </Card>
    </div>
  </div>
</div>
```

Add the query layout rules to `web/src/styles.css`:

```css
.analysis-layout--query {
  display: grid;
  grid-template-columns: 360px minmax(0, 1fr);
  gap: 24px;
  align-items: start;
}

.analysis-query-panel,
.analysis-query-result {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.94), rgba(248, 250, 252, 0.9));
}

.analysis-query-results {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}

.field-help {
  margin: -6px 0 0;
  color: var(--analysis-text-soft);
  font-size: 13px;
}
```

- [ ] **Step 4: Run the scaffold test again**

Run:

```powershell
uv run pytest tests/unit/web/test_frontend_scaffold.py -q
```

Expected: PASS for the query workbench assertions and the earlier copy/layout
tests.

- [ ] **Step 5: Stage only the query task files if a checkpoint is needed**

Run:

```bash
git add web/src/pages/QueryPage.tsx web/src/components/QueryPanel.tsx web/src/styles.css tests/unit/web/test_frontend_scaffold.py
```

Expected: only the query task files are staged.

## Task 6: Replace outdated mojibake assertions and run full verification

**Files:**
- Modify: `tests/unit/web/test_frontend_scaffold.py`
- Modify: `web/src/styles.css`
- Test: `tests/unit/web/test_frontend_scaffold.py`
- Test: `web/package.json`

- [ ] **Step 1: Rewrite the outdated mojibake-dependent assertions to match the new source of truth**

Replace the current assertions in `test_graph_management_ui_uses_readable_chinese_copy`
with checks that follow the new copy module and new readable labels:

```python
def test_graph_management_ui_uses_readable_workbench_copy():
    graph_table_source = Path("web/src/components/GraphTable.tsx").read_text(
        encoding="utf-8"
    )
    page_source = Path("web/src/pages/GraphManagePage.tsx").read_text(
        encoding="utf-8"
    )
    build_status_source = Path("web/src/components/BuildStatusCard.tsx").read_text(
        encoding="utf-8"
    )
    copy_source = Path("web/src/content/workbench.ts").read_text(encoding="utf-8")

    assert "图谱导航" in page_source
    assert "图谱概览" in page_source
    assert "数据输入" in page_source
    assert "构建控制" in page_source
    assert "构建结果" in page_source
    assert "构建控制台" in build_status_source
    assert "upload" not in copy_source.lower()
    assert "待上传" in copy_source
    assert "待构建" in copy_source
    assert "构建中" in copy_source
    assert "构建失败" in copy_source
    assert "Graph ID" in page_source
    assert "测试连接" in Path("web/src/pages/ModelConfigPage.tsx").read_text(
        encoding="utf-8"
    )
```

- [ ] **Step 2: Run the full frontend scaffold tests**

Run:

```powershell
uv run pytest tests/unit/web/test_frontend_scaffold.py -q
```

Expected: PASS for the entire frontend source-assertion suite.

- [ ] **Step 3: Add the final responsive guards for graph and query layouts**

Append these rules to `web/src/styles.css`:

```css
@media (max-width: 1100px) {
  .analysis-layout--graphs,
  .analysis-layout--query,
  .profile-form-grid {
    grid-template-columns: 1fr;
  }

  .analysis-sidebar {
    position: static;
  }
}

@media (max-width: 720px) {
  .page-hero,
  .analysis-status-header,
  .section-heading {
    flex-direction: column;
    align-items: stretch;
  }

  .app-header,
  .app-content {
    left: 16px;
    right: 16px;
    padding-left: 16px !important;
    padding-right: 16px !important;
  }
}
```

- [ ] **Step 4: Re-run scaffold tests and the production build**

Run:

```powershell
uv run pytest tests/unit/web/test_frontend_scaffold.py -q
cmd /c npm.cmd run build
```

Expected:

- `pytest` passes
- `tsc -b && vite build` exits successfully

- [ ] **Step 5: Stage only the final task files if the user wants a reviewable checkpoint**

Run:

```bash
git add web/src/content/workbench.ts web/src/App.tsx web/src/styles.css web/src/pages/GraphManagePage.tsx web/src/pages/ModelConfigPage.tsx web/src/pages/QueryPage.tsx web/src/components/BuildStatusCard.tsx web/src/components/GraphTable.tsx web/src/components/UploadPanel.tsx web/src/components/GraphPreview.tsx web/src/components/TextUnitList.tsx web/src/components/ModelProfileForm.tsx web/src/components/QueryPanel.tsx tests/unit/web/test_frontend_scaffold.py
```

Expected: all task-relevant UI files are staged and unrelated existing changes
remain untouched.
