import {
  Button,
  Card,
  Descriptions,
  Empty,
  Form,
  Input,
  InputNumber,
  List,
  Modal,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
  message,
} from "antd";
import { useEffect, useRef, useState } from "react";

import {
  buildGraph,
  clearGraphArtifacts,
  createGraph,
  deleteGraph,
  deleteGraphTextUnit,
  getGraph,
  getGraphFiles,
  getGraphPreview,
  getGraphReports,
  getGraphs,
  getSystemConfig,
  getGraphStatus,
  getGraphTextUnits,
  listModelProfiles,
} from "../api/client";
import { BuildStatusCard } from "../components/BuildStatusCard";
import { GraphPreview } from "../components/GraphPreview";
import { GraphTable } from "../components/GraphTable";
import { TextUnitList } from "../components/TextUnitList";
import { UploadPanel } from "../components/UploadPanel";
import type {
  GraphBuildAction,
  GraphBuildMethod,
  GraphCreateRequest,
  GraphDetailPayload,
  GraphPreviewPayload,
  GraphReportsPayload,
  GraphStatusPayload,
  GraphSummary,
  SystemConfigPayload,
  GraphTextUnitItem,
  GraphTextUnitListPayload,
  ModelProfileResponse,
  SourceFileListPayload,
} from "../types";

type HydrateGraphOptions = {
  showSpinner?: boolean;
};

const DEFAULT_CHUNKING_CONFIG = {
  type: "tokens" as const,
  size: 1200,
  overlap: 100,
  encoding_model: "o200k_base",
};
const DEFAULT_EMBED_BATCH_SIZE = 16;

const DEFAULT_PROJECTS_ROOT = "data/projects";

function getSourceFileBuildStatusLabel(status?: string | null) {
  switch (status) {
    case "pending":
      return "待处理";
    case "building":
      return "构建中";
    case "succeeded":
      return "已完成";
    case "failed":
      return "失败";
    case "skipped":
      return "已跳过";
    default:
      return status ?? "-";
  }
}

export function GraphManagePage() {
  const [messageApi, contextHolder] = message.useMessage();
  const [graphs, setGraphs] = useState<GraphSummary[]>([]);
  const [profiles, setProfiles] = useState<ModelProfileResponse[]>([]);
  const [systemConfig, setSystemConfig] = useState<SystemConfigPayload | null>(null);
  const [selectedGraphId, setSelectedGraphId] = useState<string>();
  const [graphDetail, setGraphDetail] = useState<GraphDetailPayload | null>(null);
  const [graphStatus, setGraphStatus] = useState<GraphStatusPayload | null>(null);
  const [graphFiles, setGraphFiles] = useState<SourceFileListPayload | null>(null);
  const [graphTextUnits, setGraphTextUnits] = useState<GraphTextUnitListPayload | null>(null);
  const [graphPreview, setGraphPreview] = useState<GraphPreviewPayload | null>(null);
  const [graphReports, setGraphReports] = useState<GraphReportsPayload | null>(null);
  const [buildAttemptError, setBuildAttemptError] = useState<string | null>(null);
  const [listLoading, setListLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [buildMethod, setBuildMethod] = useState<GraphBuildMethod>("standard");
  const [createForm] = Form.useForm<GraphCreateRequest>();
  const hydrateRequestRef = useRef(0);
  const selectedGraphIdRef = useRef<string>();

  function updateGraphSummaryStatus(graphId: string, status: string) {
    setGraphs((current) =>
      current.map((graph) => (graph.id === graphId ? { ...graph, status } : graph)),
    );
  }

  function clearGraphArtifactsView() {
    setGraphTextUnits(null);
    setGraphPreview(null);
    setGraphReports(null);
  }

  function clearPrimaryGraphState() {
    setGraphDetail(null);
    setGraphStatus(null);
    setGraphFiles(null);
    clearGraphArtifactsView();
  }

  function switchGraph(graphId?: string) {
    if (selectedGraphIdRef.current === graphId) {
      return;
    }

    hydrateRequestRef.current += 1;
    setBuildAttemptError(null);
    clearPrimaryGraphState();
    setSelectedGraphId(graphId);
  }

  function buildFileStatusTagColor(status?: string | null) {
    switch (status) {
      case "succeeded":
        return "green";
      case "failed":
        return "red";
      case "building":
        return "processing";
      case "pending":
        return "gold";
      case "skipped":
        return "default";
      default:
        return "default";
    }
  }

  function openCreateModal() {
    createForm.resetFields();
    createForm.setFieldsValue({
      projects_root: systemConfig?.projects_root ?? DEFAULT_PROJECTS_ROOT,
      chunking: DEFAULT_CHUNKING_CONFIG,
      embed_batch_size: DEFAULT_EMBED_BATCH_SIZE,
    });
    setCreateOpen(true);
  }

  function closeCreateModal() {
    setCreateOpen(false);
    createForm.resetFields();
  }

  async function loadGraphs() {
    try {
      setListLoading(true);
      const payload = await getGraphs();
      setGraphs(payload.items);
      const nextSelectedGraphId =
        selectedGraphIdRef.current &&
        payload.items.some((item) => item.id === selectedGraphIdRef.current)
          ? selectedGraphIdRef.current
          : payload.items[0]?.id;
      switchGraph(nextSelectedGraphId);
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "图谱列表加载失败。");
    } finally {
      setListLoading(false);
    }
  }

  async function loadProfiles() {
    try {
      const payload = await listModelProfiles();
      setProfiles(payload.items);
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "模型列表加载失败。");
    }
  }

  async function loadSystemConfig() {
    try {
      const payload = await getSystemConfig();
      setSystemConfig(payload);
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "系统配置加载失败。");
    }
  }

  async function hydrateGraphArtifacts(
    graphId: string,
    requestId: number,
    statusPayload: GraphStatusPayload | null,
  ) {
    const [textUnitsResult, previewResult, reportsResult] = await Promise.allSettled([
      getGraphTextUnits(graphId),
      statusPayload?.has_artifacts
        ? getGraphPreview(graphId)
        : Promise.resolve<GraphPreviewPayload | null>(null),
      statusPayload?.has_artifacts
        ? getGraphReports(graphId)
        : Promise.resolve<GraphReportsPayload | null>(null),
    ]);

    if (
      hydrateRequestRef.current !== requestId ||
      selectedGraphIdRef.current !== graphId
    ) {
      return;
    }

    if (textUnitsResult.status === "fulfilled") {
      setGraphTextUnits(textUnitsResult.value);
    } else {
      setGraphTextUnits({ items: [], total: 0 });
    }

    if (
      statusPayload?.has_artifacts &&
      previewResult.status === "fulfilled" &&
      reportsResult.status === "fulfilled"
    ) {
      setGraphPreview(previewResult.value);
      setGraphReports(reportsResult.value);
      return;
    }

    setGraphPreview(null);
    setGraphReports(null);
  }

  async function hydrateGraph(graphId: string, options: HydrateGraphOptions = {}) {
    const { showSpinner = true } = options;
    const requestId = hydrateRequestRef.current + 1;
    hydrateRequestRef.current = requestId;
    const isGraphSwitch = graphDetail?.id !== graphId;

    try {
      if (showSpinner) {
        setDetailLoading(true);
      }

      if (isGraphSwitch) {
        clearPrimaryGraphState();
      }

      const [detailResult, statusResult, filesResult] = await Promise.allSettled([
        getGraph(graphId),
        getGraphStatus(graphId),
        getGraphFiles(graphId),
      ]);

      if (
        hydrateRequestRef.current !== requestId ||
        selectedGraphIdRef.current !== graphId
      ) {
        return;
      }

      const firstRejected =
        [detailResult, statusResult, filesResult].find(
          (result): result is PromiseRejectedResult => result.status === "rejected",
        ) ?? null;

      let hasPrimaryData = false;
      const statusPayload =
        statusResult.status === "fulfilled" ? statusResult.value : null;

      if (detailResult.status === "fulfilled") {
        setGraphDetail(detailResult.value);
        hasPrimaryData = true;
      }

      if (statusPayload) {
        setGraphStatus(statusPayload);
        updateGraphSummaryStatus(graphId, statusPayload.status);
        hasPrimaryData = true;
      }

      if (filesResult.status === "fulfilled") {
        setGraphFiles(filesResult.value);
        hasPrimaryData = true;
      }

      if (!hasPrimaryData && firstRejected) {
        throw firstRejected.reason;
      }

      if (statusPayload?.status !== "building") {
        void hydrateGraphArtifacts(graphId, requestId, statusPayload);
      }
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("Graph project") &&
        error.message.includes("was not found")
      ) {
        await loadGraphs();
      }
      messageApi.error(error instanceof Error ? error.message : "图谱详情加载失败。");
    } finally {
      if (showSpinner && hydrateRequestRef.current === requestId) {
        setDetailLoading(false);
      }
    }
  }

  async function handleCreateGraph(values: GraphCreateRequest) {
    try {
      setCreateLoading(true);
      const createdGraph = await createGraph(values);
      messageApi.success("图谱项目已创建。");
      setCreateOpen(false);
      createForm.resetFields();
      await loadGraphs();
      switchGraph(createdGraph.id);
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "图谱创建失败。");
    } finally {
      setCreateLoading(false);
    }
  }

  async function handleBuildAction(action: GraphBuildAction, forceRebuild: boolean) {
    if (!selectedGraphId) {
      return;
    }

    try {
      setActionLoading(true);
      setBuildAttemptError(null);
      const existingStatus = graphStatus;
      const buildPayload = await buildGraph(selectedGraphId, {
        action,
        method: buildMethod,
        force_rebuild: forceRebuild,
      });
      const isResumeBuild = action === "resume" && !forceRebuild;
      const nextCompletedFileCount = isResumeBuild
        ? existingStatus?.completed_file_count ?? 0
        : 0;
      const nextFailedFileCount = isResumeBuild
        ? existingStatus?.failed_file_count ?? 0
        : 0;
      const nextPendingFileCount = isResumeBuild
        ? existingStatus?.pending_file_count ?? graphFiles?.total ?? 0
        : graphFiles?.total ?? existingStatus?.source_file_count ?? 0;

      setGraphStatus((current) => ({
        graph_id: buildPayload.graph_id,
        status: buildPayload.status,
        last_build_at: buildPayload.last_build_at ?? current?.last_build_at ?? null,
        last_error: buildPayload.last_error ?? null,
        has_source_files: current?.has_source_files ?? (graphFiles?.total ?? 0) > 0,
        source_file_count: current?.source_file_count ?? graphFiles?.total ?? 0,
        document_count: current?.document_count ?? 0,
        text_unit_count: current?.text_unit_count ?? 0,
        has_artifacts: current?.has_artifacts ?? false,
        artifact_paths: current?.artifact_paths ?? [],
        progress_percent: 10,
        progress_stage: "build_started",
        progress_message: "构建已启动，正在读取源文件。",
        resumable: buildPayload.resumable,
        current_file: null,
        completed_file_count: nextCompletedFileCount,
        failed_file_count: nextFailedFileCount,
        pending_file_count: nextPendingFileCount,
      }));
      updateGraphSummaryStatus(selectedGraphId, buildPayload.status);

      messageApi.success("构建任务已触发。");
      void hydrateGraph(selectedGraphId);
    } catch (error) {
      setBuildAttemptError(
        error instanceof Error ? error.message : "本次预检查失败。",
      );
      messageApi.error(error instanceof Error ? error.message : "构建任务触发失败。");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleClearArtifacts() {
    if (!selectedGraphId) {
      return;
    }

    try {
      setActionLoading(true);
      setBuildAttemptError(null);
      await clearGraphArtifacts(selectedGraphId);
      setGraphStatus((current) =>
        current
          ? {
              ...current,
              status: "awaiting_build",
              last_error: null,
              document_count: 0,
              text_unit_count: 0,
              has_artifacts: false,
              artifact_paths: [],
              progress_percent: 10,
              progress_stage: "awaiting_build",
              resumable: false,
              current_file: null,
              completed_file_count: 0,
              failed_file_count: 0,
              pending_file_count: current.source_file_count,
              progress_message: "产物已清理，请上传文件后重新构建。",
            }
          : current,
      );
      setGraphTextUnits((current) => (current ? { ...current, items: [], total: 0 } : current));
      updateGraphSummaryStatus(selectedGraphId, "awaiting_build");
      setGraphPreview(null);
      setGraphReports(null);
      messageApi.success("图谱产物已清理。");
      void hydrateGraph(selectedGraphId);
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "产物清理失败。");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDeleteTextUnit(textUnit: GraphTextUnitItem) {
    if (!selectedGraphId) {
      return;
    }

    try {
      setActionLoading(true);
      setBuildAttemptError(null);
      await deleteGraphTextUnit(selectedGraphId, textUnit.id);

      setGraphTextUnits((current) =>
        current
          ? {
              items: current.items.filter((item) => item.id !== textUnit.id),
              total: Math.max(0, current.total - 1),
            }
          : current,
      );
      setGraphStatus((current) =>
        current
          ? {
              ...current,
              status: "awaiting_build",
              last_error: null,
              progress_percent: 10,
              progress_stage: "awaiting_build",
              progress_message: "切片已删除，请重新构建以刷新图谱结果。",
            }
          : current,
      );
      updateGraphSummaryStatus(selectedGraphId, "awaiting_build");
      setGraphPreview(null);
      setGraphReports(null);
      messageApi.success("切片已删除，请重新构建以刷新图谱结果。");
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "切片删除失败。");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDeleteGraph(graph: GraphSummary) {
    try {
      setActionLoading(true);
      setBuildAttemptError(null);
      const payload = await deleteGraph(graph.id);

      setGraphs((current) => current.filter((item) => item.id !== graph.id));
      if (selectedGraphId === graph.id) {
        switchGraph(undefined);
      }

      if (payload.cancelled_build) {
        messageApi.success("图谱项目已删除，且已取消正在运行的构建任务。");
      } else {
        messageApi.success("图谱项目已删除。");
      }

      await loadGraphs();
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "图谱删除失败。");
    } finally {
      setActionLoading(false);
    }
  }

  useEffect(() => {
    selectedGraphIdRef.current = selectedGraphId;
  }, [selectedGraphId]);

  useEffect(() => {
    void loadGraphs();
    void loadProfiles();
    void loadSystemConfig();
  }, []);

  useEffect(() => {
    if (!selectedGraphId) {
      hydrateRequestRef.current += 1;
      setBuildAttemptError(null);
      clearPrimaryGraphState();
      return;
    }

    setBuildAttemptError(null);
    void hydrateGraph(selectedGraphId);
  }, [selectedGraphId]);

  useEffect(() => {
    if (!selectedGraphId || graphStatus?.status !== "building") {
      return;
    }

    const timer = window.setTimeout(() => {
      void hydrateGraph(selectedGraphId, { showSpinner: false });
    }, 5000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [graphStatus?.status, selectedGraphId]);

  return (
    <div className="page-stack analysis-page analysis-page--graphs">
      {contextHolder}
      <div className="page-hero analysis-hero">
        <div>
          <Typography.Title level={3}>图谱管理</Typography.Title>
          <Typography.Paragraph className="muted-text">
            创建图谱、上传源文件、触发构建，并查看构建产物与切片结果。
          </Typography.Paragraph>
        </div>
        <div className="analysis-hero-meta">
          <span className="analysis-chip">知识图谱</span>
          <span className="analysis-chip analysis-chip--accent">分析控制台</span>
        </div>
      </div>

      <div className="page-grid analysis-layout analysis-layout--graphs">
        <aside className="analysis-sidebar">
          <div className="sidebar-column">
            <section className="page-section">
              <section className="sidebar-shell">
                <div className="sidebar-header">
                  <div>
                    <Typography.Title level={5} style={{ margin: 0 }}>
                      侧边项目
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
                  onSelect={(graph) => switchGraph(graph.id)}
                  onDelete={(graph) => void handleDeleteGraph(graph)}
                />
              </section>
            </section>
          </div>
        </aside>

        <main className="analysis-main">
          <div className="workspace-column">
            <Spin spinning={detailLoading}>
              {graphDetail ? (
                <>
                  <section className="page-section">
                    <div className="analysis-card--overview">
                      <Card
                        className="surface-card analysis-card analysis-card--spotlight"
                        title={graphDetail.name}
                      >
                        <Descriptions column={2} size="small">
                          <Descriptions.Item label="图谱ID">{graphDetail.id}</Descriptions.Item>
                          <Descriptions.Item label="模型配置">
                            {graphDetail.model_profile_id || "未绑定"}
                          </Descriptions.Item>
                          <Descriptions.Item label="描述" span={2}>
                            {graphDetail.description || "暂无描述"}
                          </Descriptions.Item>
                          <Descriptions.Item label="保存位置" span={2}>
                            {graphDetail.root_dir}
                          </Descriptions.Item>
                          <Descriptions.Item label="创建时间">
                            {graphDetail.created_at}
                          </Descriptions.Item>
                          <Descriptions.Item label="最近构建时间">
                            {graphDetail.last_build_at || "暂无"}
                          </Descriptions.Item>
                        </Descriptions>
                      </Card>
                    </div>
                  </section>

                  <section className="page-section">
                    <UploadPanel
                      graphId={selectedGraphId}
                      loading={detailLoading}
                      onUploaded={async () => {
                        if (selectedGraphId) {
                          await hydrateGraph(selectedGraphId);
                        }
                      }}
                    />
                  </section>

                  <section className="page-section">
                    <BuildStatusCard
                      status={graphStatus}
                      actionError={buildAttemptError}
                      busy={actionLoading}
                      buildMethod={buildMethod}
                      onBuildMethodChange={setBuildMethod}
                      onStartBuild={async () => handleBuildAction("start", false)}
                      onResumeBuild={async () => handleBuildAction("resume", false)}
                      onFullRebuild={async () => handleBuildAction("start", true)}
                      onRefresh={async () => {
                        if (selectedGraphId) {
                          await hydrateGraph(selectedGraphId);
                        }
                      }}
                      onClearArtifacts={async () => handleClearArtifacts()}
                    />
                  </section>

                  <section className="page-section">
                    <Typography.Paragraph className="muted-text" style={{ marginBottom: 12 }}>
                      这里汇总源文件、文本切片、图谱预览和社区报告。
                    </Typography.Paragraph>
                    <div className="analysis-result-stack">
                      <Card className="analysis-card" title="源文件列表">
                        {graphFiles && graphFiles.items.length > 0 ? (
                          <List
                            size="small"
                            dataSource={graphFiles.items}
                            renderItem={(item) => (
                              <List.Item>
                                <Space direction="vertical" size={2} style={{ width: "100%" }}>
                                  <Space>
                                    <Typography.Text strong>{item.name}</Typography.Text>
                                    {item.build_status ? (
                                      <Tag color={buildFileStatusTagColor(item.build_status)}>
                                        {getSourceFileBuildStatusLabel(item.build_status)}
                                      </Tag>
                                    ) : null}
                                    {item.is_current ? <Tag color="processing">当前</Tag> : null}
                                  </Space>
                                  <Typography.Text className="muted-text">
                                    {item.extension} · {item.size_bytes} 字节
                                  </Typography.Text>
                                  <Typography.Text className="muted-text">
                                    尝试次数 {item.attempt_count ?? 0}
                                  </Typography.Text>
                                  {item.last_built_at ? (
                                    <Typography.Text className="muted-text">
                                      上次构建 {item.last_built_at}
                                    </Typography.Text>
                                  ) : null}
                                  {item.last_build_error ? (
                                    <Typography.Text type="danger">{item.last_build_error}</Typography.Text>
                                  ) : null}
                                  <Typography.Text className="muted-text">
                                    文档数 {item.document_count ?? 0} | 切片数 {item.text_unit_count ?? 0}
                                  </Typography.Text>
                                </Space>
                              </List.Item>
                            )}
                          />
                        ) : (
                          <Empty description="暂无已上传的源文件。" />
                        )}
                      </Card>

                      <GraphPreview
                        preview={graphPreview}
                        reports={graphReports}
                        loading={detailLoading}
                      />

                      <TextUnitList
                        items={graphTextUnits?.items ?? []}
                        loading={detailLoading}
                        busy={actionLoading}
                        onDelete={(textUnit) => void handleDeleteTextUnit(textUnit)}
                      />
                    </div>
                  </section>
                </>
              ) : (
                <section className="page-section">
                  <Card className="surface-card analysis-card analysis-card--empty">
                    <Empty description="请选择左侧图谱，或新建一个图谱。" />
                  </Card>
                </section>
              )}
            </Spin>
          </div>
        </main>
      </div>

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
        <Form
          form={createForm}
          layout="vertical"
          className="graph-create-form"
          initialValues={{
            projects_root: DEFAULT_PROJECTS_ROOT,
            chunking: DEFAULT_CHUNKING_CONFIG,
            embed_batch_size: DEFAULT_EMBED_BATCH_SIZE,
          }}
          onFinish={(values) => void handleCreateGraph(values)}
        >
          <Form.Item<GraphCreateRequest>
            name={["chunking", "type"]}
            initialValue={DEFAULT_CHUNKING_CONFIG.type}
            hidden
          >
            <Input />
          </Form.Item>
          <div className="graph-create-layout analysis-form-grid">
            <section className="graph-create-section">
              <div className="graph-create-section-header">
                <Typography.Text className="graph-create-section-kicker">基础信息</Typography.Text>
                <Typography.Paragraph className="muted-text graph-create-section-note">
                  配置图谱名称、描述、绑定模型和保存位置。
                </Typography.Paragraph>
              </div>
              <div className="graph-create-grid">
                <Form.Item<GraphCreateRequest> label="名称" name="name" rules={[{ required: true }]}>
                  <Input placeholder="例如：customer-service-kg" />
                </Form.Item>
                <Form.Item<GraphCreateRequest> label="绑定模型配置" name="model_profile_id">
                  <Select
                    allowClear
                    placeholder="留空则使用默认模型配置"
                    options={profiles.map((profile) => ({
                      label: `${profile.name} (${profile.provider})`,
                      value: profile.id,
                    }))}
                  />
                </Form.Item>
                <Form.Item<GraphCreateRequest>
                  className="graph-create-field-span-full"
                  label="描述"
                  name="description"
                >
                  <Input.TextArea rows={3} placeholder="可选说明" />
                </Form.Item>
                <Form.Item<GraphCreateRequest>
                  className="graph-create-field-span-full"
                  label="保存位置"
                  name="projects_root"
                  rules={[{ required: true, whitespace: true }]}
                  extra="最终目录将自动生成为 <保存位置>/<图谱ID>"
                >
                  <Input placeholder="例如：data/projects" />
                </Form.Item>
              </div>
            </section>

            <section className="graph-create-section">
              <div className="graph-create-section-header">
                <Typography.Text className="graph-create-section-kicker">切片配置</Typography.Text>
                <Typography.Paragraph className="muted-text graph-create-section-note">
                  当前仅支持 tokens 切片方式。
                </Typography.Paragraph>
              </div>
              <div className="graph-create-grid">
                <Form.Item<GraphCreateRequest> label="切片方式">
                  <Space direction="vertical" size={4} style={{ width: "100%" }}>
                    <Input value={DEFAULT_CHUNKING_CONFIG.type} disabled />
                    <Typography.Text type="secondary">
                      当前仅支持 tokens 切片方式。
                    </Typography.Text>
                  </Space>
                </Form.Item>
                <Form.Item<GraphCreateRequest>
                  label="编码模型"
                  name={["chunking", "encoding_model"]}
                  initialValue={DEFAULT_CHUNKING_CONFIG.encoding_model}
                  rules={[{ required: true, whitespace: true }]}
                >
                  <Input placeholder="例如：o200k_base" />
                </Form.Item>
                <Form.Item<GraphCreateRequest>
                  label="切片大小"
                  name={["chunking", "size"]}
                  initialValue={DEFAULT_CHUNKING_CONFIG.size}
                  rules={[{ required: true, type: "number", min: 1 }]}
                >
                  <InputNumber min={1} style={{ width: "100%" }} />
                </Form.Item>
                <Form.Item<GraphCreateRequest>
                  label="重叠大小"
                  name={["chunking", "overlap"]}
                  initialValue={DEFAULT_CHUNKING_CONFIG.overlap}
                  dependencies={[["chunking", "size"]]}
                  rules={[
                    { required: true, type: "number", min: 0 },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        const size = getFieldValue(["chunking", "size"]);
                        if (
                          typeof value !== "number" ||
                          typeof size !== "number" ||
                          value < size
                        ) {
                          return Promise.resolve();
                        }

                        return Promise.reject(
                          new Error("切片重叠大小必须小于切片大小。"),
                        );
                      },
                    }),
                  ]}
                >
                  <InputNumber min={0} style={{ width: "100%" }} />
                </Form.Item>
                <Form.Item<GraphCreateRequest>
                  label="向量批大小"
                  name="embed_batch_size"
                  initialValue={DEFAULT_EMBED_BATCH_SIZE}
                  rules={[{ required: true, type: "number", min: 1 }]}
                  extra="更大的批次可以提升吞吐，但部分服务会自动降速。"
                >
                  <InputNumber min={1} style={{ width: "100%" }} />
                </Form.Item>
              </div>
            </section>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
