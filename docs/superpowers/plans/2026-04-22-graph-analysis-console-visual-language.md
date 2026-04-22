# Graph Analysis Console Visual Language Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the existing GraphRAG admin console so it reads as a knowledge-graph analysis console with cool surfaces, sharper hierarchy, restrained cold-cyan accents, and graph-aware visual emphasis while preserving the current workflows and information architecture.

**Architecture:** Keep the existing React page/component structure and routing intact, then layer a new visual system on top through global CSS tokens, analysis-console utility classes, and targeted class hooks on the highest-value pages and components. Use lightweight source-assertion tests in `tests/unit/web/test_frontend_scaffold.py` to drive each UI milestone red-green, then finish with a production build verification.

**Tech Stack:** React 18, TypeScript, Ant Design 5, ECharts, CSS, pytest, Vite

---

## File Structure

- `web/src/App.tsx`
  Purpose: attach analysis-console shell classes to the app frame, header, and navigation without changing routes.
- `web/src/styles.css`
  Purpose: define the cool palette, shell tokens, shared analysis-console surfaces, modal styling, table styling, graph-aware panels, and responsive rules.
- `web/src/pages/GraphManagePage.tsx`
  Purpose: add analysis-console page hooks, stronger hero treatment, emphasized graph detail surfaces, and updated create-modal classes.
- `web/src/pages/ModelConfigPage.tsx`
  Purpose: move system-config and model-list surfaces into the same analysis-console visual system.
- `web/src/pages/QueryPage.tsx`
  Purpose: apply the same visual system to the query console shell and result surface.
- `web/src/components/BuildStatusCard.tsx`
  Purpose: restyle the build-status surface as an operations panel and update progress accent handling.
- `web/src/components/GraphPreview.tsx`
  Purpose: align graph preview cards and ECharts color treatment with the graph-analysis visual system.
- `web/src/components/GraphTable.tsx`
  Purpose: make the left-hand graph list feel like a graph-operations table rather than a stock card/table combo.
- `web/src/components/UploadPanel.tsx`
  Purpose: add upload-surface hooks that match the new control-panel language.
- `web/src/components/TextUnitList.tsx`
  Purpose: restyle the text-unit list as a denser analysis table surface.
- `web/src/components/QueryPanel.tsx`
  Purpose: restyle the query controls as an operator console panel.
- `web/src/components/ModelProfileForm.tsx`
  Purpose: apply the same modal language used by the create-graph flow to the model-profile modal.
- `tests/unit/web/test_frontend_scaffold.py`
  Purpose: drive the frontend visual refresh through source assertions for shell classes, page hooks, component hooks, and key token strings.

### Task 1: Establish the global analysis-console shell and token system

**Files:**
- Modify: `tests/unit/web/test_frontend_scaffold.py`
- Modify: `web/src/App.tsx`
- Modify: `web/src/styles.css`
- Test: `tests/unit/web/test_frontend_scaffold.py`

- [ ] **Step 1: Write the failing source assertions for the global shell and token palette**

Add this test to `tests/unit/web/test_frontend_scaffold.py` after the existing app-shell assertions:

```python
def test_app_shell_uses_graph_analysis_console_visual_language():
    app_source = Path("web/src/App.tsx").read_text(encoding="utf-8")
    styles_source = Path("web/src/styles.css").read_text(encoding="utf-8")

    assert 'className="app-shell analysis-shell"' in app_source
    assert 'className="app-header analysis-header"' in app_source
    assert 'className="brand-block analysis-brand"' in app_source
    assert 'className="nav-menu analysis-nav-menu"' in app_source
    assert "--analysis-bg: #eef2f6;" in styles_source
    assert "--analysis-accent: #0f8ea8;" in styles_source
    assert ".analysis-shell {" in styles_source
    assert ".analysis-header {" in styles_source
    assert ".analysis-brand {" in styles_source
    assert ".analysis-kicker {" in styles_source
    assert ".analysis-chip {" in styles_source
    assert "rgba(202, 120, 73, 0.18)" not in styles_source
```

- [ ] **Step 2: Run the focused scaffold test to verify it fails**

Run:

```powershell
uv run pytest tests/unit/web/test_frontend_scaffold.py -q
```

Expected: FAIL because `App.tsx` and `styles.css` do not yet include the analysis shell classes, palette tokens, or the removal of the old warm gradient.

- [ ] **Step 3: Add the global shell classes and cool-token CSS**

Update `web/src/App.tsx` so the layout and header expose stable hooks for the new shell:

```tsx
return (
  <Layout className="app-shell analysis-shell">
    <Layout.Header className="app-header analysis-header">
      <div className="brand-block analysis-brand">
        <Typography.Text className="brand-kicker analysis-kicker">
          GraphRAG Workbench
        </Typography.Text>
        <Typography.Title level={2} className="brand-title">
          知识图谱管理后台
        </Typography.Title>
      </div>
      <Menu
        mode="horizontal"
        selectedKeys={[selectedKey]}
        items={navigationItems}
        className="nav-menu analysis-nav-menu"
        onClick={({ key }) => navigate(key)}
      />
    </Layout.Header>
```

Replace the warm globals at the top of `web/src/styles.css` with cool tokens and shell rules like these:

```css
:root {
  --analysis-bg: #eef2f6;
  --analysis-bg-top: #f5f8fb;
  --analysis-panel: rgba(255, 255, 255, 0.88);
  --analysis-panel-strong: #ffffff;
  --analysis-line: rgba(15, 23, 42, 0.09);
  --analysis-line-strong: rgba(15, 23, 42, 0.16);
  --analysis-text: #111827;
  --analysis-text-soft: #617084;
  --analysis-text-faint: #8a95a5;
  --analysis-accent: #0f8ea8;
  --analysis-accent-bright: #27c2d9;
  --analysis-accent-soft: rgba(15, 142, 168, 0.12);
  --analysis-accent-mid: rgba(15, 142, 168, 0.22);
  --analysis-shadow: 0 1px 2px rgba(15, 23, 42, 0.05), 0 20px 48px rgba(15, 23, 42, 0.08);
  font-family: "IBM Plex Sans", "Segoe UI", sans-serif;
  color: var(--analysis-text);
  background:
    radial-gradient(circle at top left, rgba(39, 194, 217, 0.08), transparent 24%),
    radial-gradient(circle at top right, rgba(15, 142, 168, 0.07), transparent 28%),
    linear-gradient(180deg, var(--analysis-bg-top) 0%, var(--analysis-bg) 100%);
}

.analysis-shell {
  min-height: 100vh;
  background: transparent;
}

.analysis-header {
  border-bottom: 1px solid var(--analysis-line);
  background: rgba(245, 248, 251, 0.88);
  backdrop-filter: blur(20px);
}

.analysis-brand {
  gap: 4px;
}

.analysis-kicker {
  color: var(--analysis-accent);
  letter-spacing: 0.12em;
}

.analysis-nav-menu.ant-menu {
  color: var(--analysis-text-soft);
}

.analysis-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 12px;
  border-radius: 999px;
  border: 1px solid var(--analysis-line);
  background: rgba(255, 255, 255, 0.76);
  color: var(--analysis-text-soft);
  font-size: 12px;
  font-weight: 700;
}
```

- [ ] **Step 4: Run the same scaffold test again**

Run:

```powershell
uv run pytest tests/unit/web/test_frontend_scaffold.py -q
```

Expected: PASS for the new shell test, with all previously existing scaffold checks still green.

- [ ] **Step 5: Commit the shell/token foundation**

Run:

```bash
git add web/src/App.tsx web/src/styles.css tests/unit/web/test_frontend_scaffold.py
git commit -m "feat: add graph analysis console shell styles"
```

### Task 2: Restyle the graph-management page shell and create-graph modal

**Files:**
- Modify: `tests/unit/web/test_frontend_scaffold.py`
- Modify: `web/src/pages/GraphManagePage.tsx`
- Modify: `web/src/styles.css`
- Test: `tests/unit/web/test_frontend_scaffold.py`

- [ ] **Step 1: Write the failing source assertions for graph-management analysis classes**

Add this test to `tests/unit/web/test_frontend_scaffold.py` near the existing graph-management UI tests:

```python
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
```

- [ ] **Step 2: Run the focused scaffold test to verify it fails**

Run:

```powershell
uv run pytest tests/unit/web/test_frontend_scaffold.py -q
```

Expected: FAIL because `GraphManagePage.tsx` still uses the old page hooks and the modal/class names do not expose the analysis-console styling points.

- [ ] **Step 3: Add graph-management page hooks and modal styling hooks**

Update the top-level graph page and hero in `web/src/pages/GraphManagePage.tsx`:

```tsx
return (
  <div className="page-stack analysis-page analysis-page--graphs">
    {contextHolder}
    <div className="page-hero analysis-hero">
      <div>
        <Typography.Title level={3}>图谱管理</Typography.Title>
        <Typography.Paragraph className="muted-text">
          创建图谱项目、上传源文件、触发 GraphRAG 构建，并查看节点关系、社区报告和文本切片。
        </Typography.Paragraph>
      </div>
      <div className="analysis-hero-meta">
        <span className="analysis-chip">Knowledge Graph</span>
        <span className="analysis-chip analysis-chip--accent">Analysis Station</span>
      </div>
    </div>
```

Promote the selected graph detail card and modal class hooks:

```tsx
<Card className="surface-card analysis-card analysis-card--spotlight" title={graphDetail.name}>
```

```tsx
<Modal
  open={createOpen}
  title="新建图谱"
  width={920}
  className="graph-create-modal analysis-modal"
  okText="创建"
  cancelText="取消"
  confirmLoading={createLoading}
  onCancel={closeCreateModal}
  onOk={() => void createForm.submit()}
  destroyOnClose
>
```

```tsx
<Form
  form={createForm}
  layout="vertical"
  className="graph-create-form"
  initialValues={{
    projects_root: DEFAULT_PROJECTS_ROOT,
    chunking: DEFAULT_CHUNKING_CONFIG,
  }}
  onFinish={(values) => void handleCreateGraph(values)}
>
  <div className="graph-create-layout analysis-form-grid">
```

Add the page-level and modal-level styles to `web/src/styles.css`:

```css
.analysis-page--graphs {
  gap: 22px;
}

.analysis-hero {
  border: 1px solid var(--analysis-line);
  border-radius: 28px;
  background:
    radial-gradient(circle at top right, var(--analysis-accent-soft), transparent 34%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(247, 250, 252, 0.84));
  box-shadow: var(--analysis-shadow);
}

.analysis-hero-meta {
  display: flex;
  align-items: center;
  gap: 10px;
}

.analysis-chip--accent {
  border-color: var(--analysis-accent-mid);
  background: var(--analysis-accent-soft);
  color: var(--analysis-accent);
}

.analysis-card {
  border: 1px solid var(--analysis-line);
  border-radius: 24px;
  background: var(--analysis-panel);
  box-shadow: var(--analysis-shadow);
}

.analysis-card--spotlight {
  background:
    radial-gradient(circle at top right, rgba(39, 194, 217, 0.08), transparent 28%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(248, 251, 253, 0.86));
}

.analysis-modal .ant-modal-content {
  border: 1px solid var(--analysis-line-strong);
  background: rgba(248, 251, 253, 0.94);
  box-shadow: 0 24px 80px rgba(11, 16, 24, 0.16);
}

.analysis-form-grid {
  gap: 18px;
}
```

- [ ] **Step 4: Run the scaffold test again**

Run:

```powershell
uv run pytest tests/unit/web/test_frontend_scaffold.py -q
```

Expected: PASS for the new graph-management page styling test and the existing create-modal layout tests.

- [ ] **Step 5: Commit the graph-management visual refresh**

Run:

```bash
git add web/src/pages/GraphManagePage.tsx web/src/styles.css tests/unit/web/test_frontend_scaffold.py
git commit -m "feat: restyle graph management as analysis console"
```

### Task 3: Restyle shared graph-operation components and align graph-preview accents

**Files:**
- Modify: `tests/unit/web/test_frontend_scaffold.py`
- Modify: `web/src/components/BuildStatusCard.tsx`
- Modify: `web/src/components/GraphPreview.tsx`
- Modify: `web/src/components/GraphTable.tsx`
- Modify: `web/src/components/UploadPanel.tsx`
- Modify: `web/src/components/TextUnitList.tsx`
- Modify: `web/src/styles.css`
- Test: `tests/unit/web/test_frontend_scaffold.py`

- [ ] **Step 1: Write the failing source assertions for shared graph-operation surfaces**

Add this test to `tests/unit/web/test_frontend_scaffold.py` after the graph-management visual tests:

```python
def test_graph_operation_components_use_analysis_console_surface_classes():
    build_source = Path("web/src/components/BuildStatusCard.tsx").read_text(encoding="utf-8")
    preview_source = Path("web/src/components/GraphPreview.tsx").read_text(encoding="utf-8")
    table_source = Path("web/src/components/GraphTable.tsx").read_text(encoding="utf-8")
    upload_source = Path("web/src/components/UploadPanel.tsx").read_text(encoding="utf-8")
    text_unit_source = Path("web/src/components/TextUnitList.tsx").read_text(encoding="utf-8")
    styles_source = Path("web/src/styles.css").read_text(encoding="utf-8")

    assert 'className="surface-card analysis-card analysis-status-card"' in build_source
    assert 'strokeColor={status.status === "failed" ? "#ff4d4f" : "#0f8ea8"}' in build_source
    assert 'className="surface-card analysis-card analysis-graph-preview"' in preview_source
    assert 'color: node.type === "person" ? "#0f8ea8" : "#111827"' in preview_source
    assert 'className="surface-card analysis-card analysis-sidebar-table"' in table_source
    assert 'className="surface-card analysis-card analysis-upload-panel"' in upload_source
    assert 'className="surface-card analysis-card analysis-text-unit-list"' in text_unit_source
    assert ".analysis-status-card {" in styles_source
    assert ".analysis-graph-preview {" in styles_source
    assert ".analysis-sidebar-table {" in styles_source
    assert ".analysis-upload-panel .ant-upload-wrapper {" in styles_source
    assert ".analysis-text-unit-list .ant-table-wrapper {" in styles_source
```

- [ ] **Step 2: Run the scaffold test to verify it fails**

Run:

```powershell
uv run pytest tests/unit/web/test_frontend_scaffold.py -q
```

Expected: FAIL because the shared components still only use `surface-card`, the progress accent is not the new cyan, and the ECharts graph colors still use the old green/orange palette.

- [ ] **Step 3: Add shared component class hooks and update graph-preview color treatment**

Update the shared card classes in each component:

```tsx
// web/src/components/BuildStatusCard.tsx
<Card className="surface-card analysis-card analysis-status-card" title="构建状态">
```

```tsx
<Progress
  percent={status.progress_percent}
  status={progressTone(status.status)}
  strokeColor={status.status === "failed" ? "#ff4d4f" : "#0f8ea8"}
/>
```

```tsx
// web/src/components/GraphPreview.tsx
<Card className="surface-card analysis-card analysis-graph-preview" title="图谱预览">
```

```tsx
itemStyle: {
  color: node.type === "person" ? "#0f8ea8" : "#111827",
},
lineStyle: {
  color: "rgba(15, 23, 42, 0.20)",
  curveness: 0.08,
},
```

```tsx
// web/src/components/GraphTable.tsx
<Card className="surface-card analysis-card analysis-sidebar-table" title="图谱项目">
```

```tsx
// web/src/components/UploadPanel.tsx
<Card className="surface-card analysis-card analysis-upload-panel" title="源文件上传">
```

```tsx
// web/src/components/TextUnitList.tsx
<Card className="surface-card analysis-card analysis-text-unit-list" title="文本切片">
```

Add the shared surface rules to `web/src/styles.css`:

```css
.analysis-status-card {
  background:
    radial-gradient(circle at top right, rgba(39, 194, 217, 0.08), transparent 24%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.9), rgba(247, 250, 252, 0.86));
}

.analysis-graph-preview .ant-tabs-tab-active .ant-tabs-tab-btn {
  color: var(--analysis-accent) !important;
}

.analysis-graph-preview .ant-statistic {
  padding: 12px 14px;
  border: 1px solid var(--analysis-line);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.78);
}

.analysis-sidebar-table .ant-table-wrapper,
.analysis-text-unit-list .ant-table-wrapper {
  border-radius: 18px;
}

.analysis-upload-panel .ant-upload-wrapper {
  border-radius: 18px;
}
```

- [ ] **Step 4: Run the scaffold test again**

Run:

```powershell
uv run pytest tests/unit/web/test_frontend_scaffold.py -q
```

Expected: PASS for the new shared-component source assertions, with the prior shell and graph-page tests still green.

- [ ] **Step 5: Commit the shared graph-operation refresh**

Run:

```bash
git add web/src/components/BuildStatusCard.tsx web/src/components/GraphPreview.tsx web/src/components/GraphTable.tsx web/src/components/UploadPanel.tsx web/src/components/TextUnitList.tsx web/src/styles.css tests/unit/web/test_frontend_scaffold.py
git commit -m "feat: restyle graph operation surfaces"
```

### Task 4: Apply the analysis-console system to query and model-management pages

**Files:**
- Modify: `tests/unit/web/test_frontend_scaffold.py`
- Modify: `web/src/pages/ModelConfigPage.tsx`
- Modify: `web/src/pages/QueryPage.tsx`
- Modify: `web/src/components/QueryPanel.tsx`
- Modify: `web/src/components/ModelProfileForm.tsx`
- Modify: `web/src/styles.css`
- Test: `tests/unit/web/test_frontend_scaffold.py`

- [ ] **Step 1: Write the failing source assertions for the secondary pages and modal**

Add this test to `tests/unit/web/test_frontend_scaffold.py` after the shared-component visual test:

```python
def test_secondary_pages_and_forms_inherit_analysis_console_visual_language():
    model_page_source = Path("web/src/pages/ModelConfigPage.tsx").read_text(encoding="utf-8")
    query_page_source = Path("web/src/pages/QueryPage.tsx").read_text(encoding="utf-8")
    query_panel_source = Path("web/src/components/QueryPanel.tsx").read_text(encoding="utf-8")
    profile_form_source = Path("web/src/components/ModelProfileForm.tsx").read_text(encoding="utf-8")
    styles_source = Path("web/src/styles.css").read_text(encoding="utf-8")

    assert 'className="page-stack analysis-page analysis-page--models"' in model_page_source
    assert 'className="surface-card analysis-card analysis-settings-card"' in model_page_source
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
```

- [ ] **Step 2: Run the scaffold test to verify it fails**

Run:

```powershell
uv run pytest tests/unit/web/test_frontend_scaffold.py -q
```

Expected: FAIL because the model page, query page, query panel, and model-profile modal do not yet expose the new analysis-console class hooks.

- [ ] **Step 3: Add page hooks, query panel hooks, and profile-modal hooks**

Update the page wrappers:

```tsx
// web/src/pages/ModelConfigPage.tsx
return (
  <div className="page-stack analysis-page analysis-page--models">
```

```tsx
<Card className="surface-card analysis-card analysis-settings-card" title="系统路径配置" loading={loading}>
```

```tsx
<Card className="surface-card analysis-card analysis-settings-card" title="模型列表" loading={loading}>
```

```tsx
// web/src/pages/QueryPage.tsx
return (
  <div className="page-stack analysis-page analysis-page--query">
```

```tsx
<Card className="surface-card answer-card analysis-card analysis-query-result" title="查询结果">
```

```tsx
// web/src/components/QueryPanel.tsx
<Card className="surface-card analysis-card analysis-query-panel" title="发起问答">
```

Add a modal class to `web/src/components/ModelProfileForm.tsx`:

```tsx
<Modal
  open={open}
  title={mode === "create" ? "新增模型配置" : "编辑模型配置"}
  className="analysis-modal analysis-modal--profile"
  okText={mode === "create" ? "创建" : "保存"}
  cancelText="取消"
  confirmLoading={loading}
  onCancel={onCancel}
  onOk={() => void form.submit()}
  destroyOnClose
>
```

Add the secondary-page surface rules to `web/src/styles.css`:

```css
.analysis-page--models,
.analysis-page--query {
  gap: 22px;
}

.analysis-settings-card,
.analysis-query-panel,
.analysis-query-result {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.9), rgba(247, 250, 252, 0.86));
}

.analysis-query-result .ant-collapse {
  border: 1px solid var(--analysis-line);
  border-radius: 18px;
  overflow: hidden;
}

.analysis-modal--profile .ant-modal-content {
  border: 1px solid var(--analysis-line-strong);
  background: rgba(248, 251, 253, 0.94);
}
```

- [ ] **Step 4: Run the scaffold test again**

Run:

```powershell
uv run pytest tests/unit/web/test_frontend_scaffold.py -q
```

Expected: PASS for the secondary-page styling test and all prior frontend scaffold tests.

- [ ] **Step 5: Commit the secondary-page styling**

Run:

```bash
git add web/src/pages/ModelConfigPage.tsx web/src/pages/QueryPage.tsx web/src/components/QueryPanel.tsx web/src/components/ModelProfileForm.tsx web/src/styles.css tests/unit/web/test_frontend_scaffold.py
git commit -m "feat: extend analysis console styling to settings and query pages"
```

### Task 5: Run full verification and lock the visual refresh

**Files:**
- Modify: `web/src/styles.css`
- Modify: `tests/unit/web/test_frontend_scaffold.py`
- Test: `tests/unit/web/test_frontend_scaffold.py`
- Test: `web/package.json`

- [ ] **Step 1: Run the full frontend scaffold tests**

Run:

```powershell
uv run pytest tests/unit/web/test_frontend_scaffold.py -q
```

Expected: PASS with all frontend source-assertion tests green.

- [ ] **Step 2: Run the production frontend build**

Run:

```powershell
cmd /c npm.cmd run build
```

Expected: `tsc -b && vite build` exits successfully and Vite emits a production bundle with no TypeScript errors.

- [ ] **Step 3: Add the final responsive guards for the analysis hero, shell spacing, and modal radius**

Add concrete cleanup rules like these to `web/src/styles.css` rather than introducing new layout structures:

```css
@media (max-width: 1100px) {
  .analysis-hero,
  .analysis-hero-meta,
  .graph-create-layout.analysis-form-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .analysis-header,
  .app-content {
    padding-left: 16px;
    padding-right: 16px;
  }

  .analysis-card,
  .analysis-modal .ant-modal-content {
    border-radius: 18px;
  }
}
```

- [ ] **Step 4: Re-run the scaffold tests and build after the responsive polish**

Run:

```powershell
uv run pytest tests/unit/web/test_frontend_scaffold.py -q
cmd /c npm.cmd run build
```

Expected: both commands PASS after the final CSS polish.

- [ ] **Step 5: Commit the completed visual refresh**

Run:

```bash
git add web/src/App.tsx web/src/styles.css web/src/pages/GraphManagePage.tsx web/src/pages/ModelConfigPage.tsx web/src/pages/QueryPage.tsx web/src/components/BuildStatusCard.tsx web/src/components/GraphPreview.tsx web/src/components/GraphTable.tsx web/src/components/UploadPanel.tsx web/src/components/TextUnitList.tsx web/src/components/QueryPanel.tsx web/src/components/ModelProfileForm.tsx tests/unit/web/test_frontend_scaffold.py
git commit -m "feat: restyle web console as graph analysis station"
```
