import {
  Button,
  Card,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Spin,
  Tabs,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  buildGraph,
  clearGraphArtifacts,
  createGraph,
  deleteGraph,
  deleteGraphSourceFile,
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
import { getGraphStatusMeta } from "../content/workbench";
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
  SourceFileItem,
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

function formatFileSize(sizeBytes: number) {
  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }

  if (sizeBytes < 1024 * 1024) {
    return `${(sizeBytes / 1024).toFixed(1)} KB`;
  }

  return `${(sizeBytes / 1024 / 1024).toFixed(1)} MB`;
}

export function GraphManagePage() {
  const navigate = useNavigate();
  const { graphId: routeGraphId } = useParams<{ graphId?: string }>();
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
  const isDetailView = Boolean(routeGraphId);

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

  function openGraphManagement(graph: GraphSummary) {
    navigate(`/graphs/${graph.id}`);
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
      if (
        selectedGraphIdRef.current &&
        !payload.items.some((item) => item.id === selectedGraphIdRef.current)
      ) {
        switchGraph(undefined);
        navigate("/graphs", { replace: true });
      }
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
      navigate(`/graphs/${createdGraph.id}`);
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

    if (!hasSourceFiles) {
      messageApi.warning("请先上传源文件，再开始构建。");
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

  async function handleDeleteSourceFile(sourceFile: SourceFileItem) {
    if (!selectedGraphId) {
      return;
    }

    try {
      setActionLoading(true);
      setBuildAttemptError(null);
      await deleteGraphSourceFile(selectedGraphId, sourceFile.relative_path);
      messageApi.success("源文件已删除。");
      await hydrateGraph(selectedGraphId);
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "源文件删除失败。");
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
        navigate("/graphs", { replace: true });
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
    switchGraph(routeGraphId);
  }, [routeGraphId]);

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

  const selectedStatusMeta = graphStatus ? getGraphStatusMeta(graphStatus.status) : null;
  const sourceFileCount = graphFiles?.total ?? graphStatus?.source_file_count ?? 0;
  const hasSourceFiles = sourceFileCount > 0 || graphStatus?.has_source_files === true;
  const waitingGraphCount = graphs.filter((graph) =>
    ["awaiting_upload", "awaiting_build", "artifacts_deleted", "initialized"].includes(
      graph.status,
    ),
  ).length;
  const buildingGraphCount = graphs.filter((graph) => graph.status === "building").length;
  const readyGraphCount = graphs.filter((graph) => graph.status === "ready").length;
  const boundModelGraphCount = graphs.filter((graph) => graph.model_profile_id).length;
  const graphOverviewStats = [
    { label: "图谱总数", value: graphs.length },
    { label: "待处理", value: waitingGraphCount },
    { label: "构建中", value: buildingGraphCount },
    { label: "可查询", value: readyGraphCount },
    { label: "已绑定模型", value: boundModelGraphCount },
  ];

  return (
    <div className="page-stack analysis-page analysis-page--graphs">
      {contextHolder}
      <div className="page-hero analysis-hero">
        <div>
          <Typography.Title level={3}>图谱管理</Typography.Title>
          <Typography.Paragraph className="muted-text">
            {isDetailView
              ? "上传源文件、触发构建，并查看构建产物与切片结果。"
              : "查看图谱统计，创建图谱，并进入单个图谱的管理工作台。"}
          </Typography.Paragraph>
        </div>
        {isDetailView ? (
          <Button onClick={() => navigate("/graphs")}>返回列表</Button>
        ) : null}
      </div>

      {isDetailView ? (
        <Spin spinning={detailLoading} wrapperClassName="graph-workspace-spin">
          {graphDetail ? (
            <div className="graph-workspace graph-workspace--detail">
              <Card
                className="surface-card analysis-card analysis-card--spotlight graph-detail-summary"
              >
                <div className="graph-detail-summary-head">
                  <div>
                    <Typography.Title level={4}>{graphDetail.name}</Typography.Title>
                    <Typography.Text className="muted-text">{graphDetail.id}</Typography.Text>
                    <Typography.Text className="graph-detail-path">
                      保存位置：{graphDetail.root_dir}
                    </Typography.Text>
                  </div>
                  {selectedStatusMeta ? (
                    <Tag color={selectedStatusMeta.color}>{selectedStatusMeta.label}</Tag>
                  ) : null}
                </div>
                <div className="graph-summary-grid">
                  <div className="graph-summary-item">
                    <span>模型配置</span>
                    <strong>{graphDetail.model_profile_id || "未绑定"}</strong>
                  </div>
                  <div className="graph-summary-item">
                    <span>源文件</span>
                    <strong>{sourceFileCount}</strong>
                  </div>
                  <div className="graph-summary-item">
                    <span>文本切片</span>
                    <strong>{graphStatus?.text_unit_count ?? graphTextUnits?.total ?? 0}</strong>
                  </div>
                  <div className="graph-summary-item">
                    <span>最近构建</span>
                    <strong>{graphDetail.last_build_at || "暂无"}</strong>
                  </div>
                  <div className="graph-summary-item">
                    <span>创建时间</span>
                    <strong>{graphDetail.created_at}</strong>
                  </div>
                </div>
              </Card>

              <Tabs
                className="graph-workspace-tabs"
                defaultActiveKey="workbench"
                items={[
                  {
                    key: "workbench",
                    label: "构建工作台",
                    children: (
                      <div className="build-workbench-shell">
                        <div className="build-workbench-assets">
                          <UploadPanel
                            graphId={selectedGraphId}
                            loading={detailLoading}
                            existingFileNames={graphFiles?.items.map((item) => item.name) ?? []}
                            onUploaded={async () => {
                              if (selectedGraphId) {
                                await hydrateGraph(selectedGraphId);
                              }
                            }}
                          />
                          <Card
                            className="analysis-card source-file-card"
                            title="源文件列表"
                            extra={
                              <Typography.Text className="source-file-count">
                                {graphFiles?.total ?? 0} 个文件
                              </Typography.Text>
                            }
                          >
                            {graphFiles && graphFiles.items.length > 0 ? (
                              <Table<SourceFileItem>
                                className="source-file-table"
                                size="small"
                                rowKey={(item) => item.relative_path || item.name}
                                dataSource={graphFiles.items}
                                pagination={false}
                                scroll={{ y: 260, x: 760 }}
                                columns={[
                                  {
                                    title: "文件",
                                    dataIndex: "name",
                                    key: "name",
                                    ellipsis: true,
                                    render: (_, item) => (
                                      <Space direction="vertical" size={2} className="source-file-name">
                                        <Typography.Text strong ellipsis={{ tooltip: item.name }}>
                                          {item.name}
                                        </Typography.Text>
                                        {item.last_build_error ? (
                                          <Typography.Text type="danger" ellipsis={{ tooltip: item.last_build_error }}>
                                            {item.last_build_error}
                                          </Typography.Text>
                                        ) : null}
                                      </Space>
                                    ),
                                  },
                                  {
                                    title: "状态",
                                    key: "status",
                                    width: 120,
                                    render: (_, item) => (
                                      <Space size={4} wrap>
                                        <Tag color={buildFileStatusTagColor(item.build_status)}>
                                          {getSourceFileBuildStatusLabel(item.build_status)}
                                        </Tag>
                                        {item.is_current ? <Tag color="processing">当前</Tag> : null}
                                      </Space>
                                    ),
                                  },
                                  {
                                    title: "大小",
                                    dataIndex: "size_bytes",
                                    key: "size",
                                    width: 100,
                                    render: (sizeBytes: number) => formatFileSize(sizeBytes),
                                  },
                                  {
                                    title: "文档/切片",
                                    key: "units",
                                    width: 110,
                                    render: (_, item) =>
                                      `${item.document_count ?? 0} / ${item.text_unit_count ?? 0}`,
                                  },
                                  {
                                    title: "尝试",
                                    dataIndex: "attempt_count",
                                    key: "attempts",
                                    width: 76,
                                    render: (attemptCount?: number | null) => attemptCount ?? 0,
                                  },
                                  {
                                    title: "操作",
                                    key: "actions",
                                    width: 92,
                                    fixed: "right",
                                    render: (_, item) => (
                                      <Popconfirm
                                        title="确认删除这个源文件?"
                                        description="删除后需要重新构建图谱。"
                                        okText="删除"
                                        cancelText="取消"
                                        okButtonProps={{ danger: true }}
                                        onConfirm={() => void handleDeleteSourceFile(item)}
                                      >
                                        <Button
                                          danger
                                          size="small"
                                          loading={actionLoading}
                                          disabled={graphStatus?.status === "building"}
                                        >
                                          删除
                                        </Button>
                                      </Popconfirm>
                                    ),
                                  },
                                ]}
                              />
                            ) : (
                              <Empty description="暂无已上传的源文件。" />
                            )}
                          </Card>
                        </div>
                        <BuildStatusCard
                          status={graphStatus}
                          actionError={buildAttemptError}
                          busy={actionLoading}
                          buildMethod={buildMethod}
                          sourceFileCount={sourceFileCount}
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
                      </div>
                    ),
                  },
                  {
                    key: "preview",
                    label: "图谱预览",
                    children: (
                      <GraphPreview
                        preview={graphPreview}
                        reports={graphReports}
                        loading={detailLoading}
                      />
                    ),
                  },
                  {
                    key: "text-units",
                    label: "文本切片",
                    children: (
                      <TextUnitList
                        items={graphTextUnits?.items ?? []}
                        loading={detailLoading}
                        busy={actionLoading}
                        onDelete={(textUnit) => void handleDeleteTextUnit(textUnit)}
                      />
                    ),
                  },
                ]}
              />
            </div>
          ) : (
            <section className="page-section graph-detail-empty">
              <Empty description="未找到这个图谱，或图谱详情暂不可用。">
                <Button onClick={() => navigate("/graphs")}>返回图谱列表</Button>
              </Empty>
            </section>
          )}
        </Spin>
      ) : (
        <div className="graph-overview">
          <div className="graph-overview-stats">
            {graphOverviewStats.map((stat) => (
              <div className="graph-overview-stat" key={stat.label}>
                <span>{stat.label}</span>
                <strong>{stat.value}</strong>
              </div>
            ))}
          </div>

          <Card
            className="surface-card analysis-card graph-overview-list-card"
            title="图谱项目列表"
            extra={
              <Space className="graph-pane-actions">
                <Button onClick={() => void loadGraphs()}>刷新</Button>
                <Button type="primary" onClick={openCreateModal}>
                  新建图谱
                </Button>
              </Space>
            }
          >
            <GraphTable
              graphs={graphs}
              loading={listLoading}
              selectedGraphId={selectedGraphId}
              onRefresh={() => void loadGraphs()}
              onSelect={openGraphManagement}
              onDelete={(graph) => void handleDeleteGraph(graph)}
            />
          </Card>
        </div>
      )}

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
        destroyOnHidden
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
