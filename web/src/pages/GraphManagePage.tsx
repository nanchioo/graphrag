import {
  Button,
  Card,
  Descriptions,
  Divider,
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
  GraphCreateRequest,
  GraphDetailPayload,
  GraphPreviewPayload,
  GraphReportsPayload,
  GraphStatusPayload,
  GraphSummary,
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

export function GraphManagePage() {
  const [messageApi, contextHolder] = message.useMessage();
  const [graphs, setGraphs] = useState<GraphSummary[]>([]);
  const [profiles, setProfiles] = useState<ModelProfileResponse[]>([]);
  const [selectedGraphId, setSelectedGraphId] = useState<string>();
  const [graphDetail, setGraphDetail] = useState<GraphDetailPayload | null>(null);
  const [graphStatus, setGraphStatus] = useState<GraphStatusPayload | null>(null);
  const [graphFiles, setGraphFiles] = useState<SourceFileListPayload | null>(null);
  const [graphTextUnits, setGraphTextUnits] = useState<GraphTextUnitListPayload | null>(
    null,
  );
  const [graphPreview, setGraphPreview] = useState<GraphPreviewPayload | null>(null);
  const [graphReports, setGraphReports] = useState<GraphReportsPayload | null>(null);
  const [buildAttemptError, setBuildAttemptError] = useState<string | null>(null);
  const [listLoading, setListLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
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
      chunking: DEFAULT_CHUNKING_CONFIG,
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
      setSelectedGraphId((current) => {
        if (current && payload.items.some((item) => item.id === current)) {
          return current;
        }
        return payload.items[0]?.id;
      });
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "图谱列表加载失败");
    } finally {
      setListLoading(false);
    }
  }

  async function loadProfiles() {
    try {
      const payload = await listModelProfiles();
      setProfiles(payload.items);
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "模型列表加载失败");
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

  async function hydrateGraph(
    graphId: string,
    options: HydrateGraphOptions = {},
  ) {
    const { showSpinner = true } = options;
    const requestId = hydrateRequestRef.current + 1;
    hydrateRequestRef.current = requestId;
    const isGraphSwitch = graphDetail?.id !== graphId;

    try {
      if (showSpinner) {
        setDetailLoading(true);
      }

      if (isGraphSwitch) {
        clearGraphArtifactsView();
      }

      const [detailResult, statusResult, filesResult] =
        await Promise.allSettled([
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
      messageApi.error(error instanceof Error ? error.message : "图谱详情加载失败");
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
      messageApi.success("图谱项目已创建");
      setCreateOpen(false);
      createForm.resetFields();
      await loadGraphs();
      setSelectedGraphId(createdGraph.id);
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "图谱创建失败");
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
      const buildPayload = await buildGraph(selectedGraphId, {
        action,
        method: "standard",
        force_rebuild: forceRebuild,
      });

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
        progress_percent: current?.progress_percent ?? 20,
        progress_stage: current?.progress_stage ?? "build_started",
        progress_message: current?.progress_message ?? "已启动构建，正在读取源文件。",
        resumable: buildPayload.resumable,
        current_file: null,
        completed_file_count: forceRebuild ? 0 : current?.completed_file_count ?? 0,
        failed_file_count: 0,
        pending_file_count: graphFiles?.total ?? current?.pending_file_count ?? 0,
      }));
      updateGraphSummaryStatus(selectedGraphId, buildPayload.status);

      messageApi.success("构建任务已触发");
      void hydrateGraph(selectedGraphId);
    } catch (error) {
      setBuildAttemptError(
        error instanceof Error ? error.message : "本次构建预检查失败",
      );
      messageApi.error(error instanceof Error ? error.message : "构建任务触发失败");
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
              progress_message: "已上传源文件，等待开始构建。",
            }
          : current,
      );
      setGraphTextUnits((current) => (current ? { ...current, items: [], total: 0 } : current));
      updateGraphSummaryStatus(selectedGraphId, "awaiting_build");
      setGraphPreview(null);
      setGraphReports(null);
      messageApi.success("构建产物已清理");
      void hydrateGraph(selectedGraphId);
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "构建产物清理失败");
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
              progress_message: "已修改文本切片，请重新构建以刷新图谱结果。",
            }
          : current,
      );
      updateGraphSummaryStatus(selectedGraphId, "awaiting_build");
      setGraphPreview(null);
      setGraphReports(null);
      messageApi.success("切片已删除，请重新构建以刷新图谱结果");
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "切片删除失败");
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
        setSelectedGraphId(undefined);
        setGraphDetail(null);
        setGraphStatus(null);
        setGraphFiles(null);
        setGraphTextUnits(null);
        setGraphPreview(null);
        setGraphReports(null);
      }

      if (payload.cancelled_build) {
        messageApi.success("图谱项目已删除，并已取消正在运行的构建任务");
      } else {
        messageApi.success("图谱项目已删除");
      }

      await loadGraphs();
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "图谱删除失败");
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
  }, []);

  useEffect(() => {
    if (!selectedGraphId) {
      hydrateRequestRef.current += 1;
      setBuildAttemptError(null);
      setGraphDetail(null);
      setGraphStatus(null);
      setGraphFiles(null);
      clearGraphArtifactsView();
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
    <div className="page-stack">
      {contextHolder}
      <div className="page-hero">
        <div>
          <Typography.Title level={3}>图谱管理</Typography.Title>
          <Typography.Paragraph className="muted-text">
            创建图谱项目，上传源文件，触发 GraphRAG 构建，并查看节点关系、社区报告和文本切片。
          </Typography.Paragraph>
        </div>
      </div>

      <div className="page-grid">
        <div className="sidebar-column">
          <div className="sidebar-shell">
            <div className="sidebar-header">
              <div>
                <Typography.Title level={5} style={{ margin: 0 }}>
                  侧边项目
                </Typography.Title>
                <Typography.Paragraph className="muted-text" style={{ margin: "8px 0 0" }}>
                  选择一个图谱继续工作，或新建项目开始构建。
                </Typography.Paragraph>
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
        </div>

        <div className="workspace-column">
          <Spin spinning={detailLoading}>
          {graphDetail ? (
            <div className="page-stack">
              <Card className="surface-card" title={graphDetail.name}>
                <Descriptions column={1} size="small">
                  <Descriptions.Item label="图谱 ID">{graphDetail.id}</Descriptions.Item>
                  <Descriptions.Item label="描述">
                    {graphDetail.description || "暂无描述"}
                  </Descriptions.Item>
                  <Descriptions.Item label="工作目录">
                    {graphDetail.root_dir}
                  </Descriptions.Item>
                  <Descriptions.Item label="模型配置">
                    {graphDetail.model_profile_id || "未绑定"}
                  </Descriptions.Item>
                </Descriptions>
              </Card>

              <UploadPanel
                graphId={selectedGraphId}
                loading={detailLoading}
                onUploaded={async () => {
                  if (selectedGraphId) {
                    await hydrateGraph(selectedGraphId);
                  }
                }}
              />

              <BuildStatusCard
                status={graphStatus}
                actionError={buildAttemptError}
                busy={actionLoading}
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

              <Card className="surface-card" title="源文件列表">
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
                                {item.build_status}
                              </Tag>
                            ) : null}
                            {item.is_current ? <Tag color="processing">当前</Tag> : null}
                          </Space>
                          <Typography.Text className="muted-text">
                            {item.extension} 路 {item.size_bytes} bytes
                          </Typography.Text>
                          <Typography.Text className="muted-text">
                            重试次数 {item.attempt_count ?? 0}
                          </Typography.Text>
                          {item.last_built_at ? (
                            <Typography.Text className="muted-text">
                              最近构建 {item.last_built_at}
                            </Typography.Text>
                          ) : null}
                          {item.last_build_error ? (
                            <Typography.Text type="danger">{item.last_build_error}</Typography.Text>
                          ) : null}
                          <Typography.Text className="muted-text">
                            文档 {item.document_count ?? 0} | 切片 {item.text_unit_count ?? 0}
                          </Typography.Text>
                        </Space>
                      </List.Item>
                    )}
                  />
                ) : (
                  <Empty description="当前图谱还没有源文件" />
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
          ) : (
            <Card className="surface-card">
              <Empty description="请选择左侧图谱，或先创建一个新图谱" />
            </Card>
          )}
          </Spin>
        </div>
      </div>

      <Modal
        open={createOpen}
        title="新建图谱"
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
          initialValues={{
            chunking: DEFAULT_CHUNKING_CONFIG,
          }}
          onFinish={(values) => void handleCreateGraph(values)}
        >
          <Form.Item<GraphCreateRequest> label="名称" name="name" rules={[{ required: true }]}>
            <Input placeholder="例如: customer-service-kg" />
          </Form.Item>
          <Form.Item<GraphCreateRequest> label="描述" name="description">
            <Input.TextArea rows={3} placeholder="可选描述" />
          </Form.Item>
          <Form.Item<GraphCreateRequest> label="绑定模型配置" name="model_profile_id">
            <Select
              allowClear
              placeholder="不选则使用默认模型配置"
              options={profiles.map((profile) => ({
                label: `${profile.name} (${profile.provider})`,
                value: profile.id,
              }))}
            />
          </Form.Item>
          <Divider>切片配置</Divider>
          <Form.Item<GraphCreateRequest>
            name={["chunking", "type"]}
            initialValue={DEFAULT_CHUNKING_CONFIG.type}
            hidden
          >
            <Input />
          </Form.Item>
          <Form.Item<GraphCreateRequest>
            label="切片方式"
          >
            <Space direction="vertical" size={4} style={{ width: "100%" }}>
              <Input value={DEFAULT_CHUNKING_CONFIG.type} disabled />
              <Typography.Text type="secondary">
                当前仅支持 tokens 切片方式。
              </Typography.Text>
            </Space>
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
                    new Error("Chunk overlap must be smaller than chunk size."),
                  );
                },
              }),
            ]}
          >
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item<GraphCreateRequest>
            label="编码模型"
            name={["chunking", "encoding_model"]}
            initialValue={DEFAULT_CHUNKING_CONFIG.encoding_model}
            rules={[{ required: true, whitespace: true }]}
          >
            <Input placeholder="例如: o200k_base" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
