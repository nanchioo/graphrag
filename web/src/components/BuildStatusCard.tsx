import {
  Button,
  Card,
  Descriptions,
  Empty,
  Progress,
  Space,
  Tag,
  Typography,
} from "antd";

import type { GraphStatusPayload } from "../types";

interface BuildStatusCardProps {
  status: GraphStatusPayload | null;
  actionError?: string | null;
  busy?: boolean;
  onStartBuild: () => Promise<void> | void;
  onResumeBuild: () => Promise<void> | void;
  onFullRebuild: () => Promise<void> | void;
  onRefresh: () => Promise<void> | void;
  onClearArtifacts: () => Promise<void> | void;
}

function statusMeta(status: string) {
  switch (status) {
    case "awaiting_upload":
      return { color: "default", label: "待上传" };
    case "awaiting_build":
      return { color: "gold", label: "待构建" };
    case "ready":
      return { color: "green", label: "可查询" };
    case "building":
      return { color: "processing", label: "构建中" };
    case "failed":
      return { color: "red", label: "构建失败" };
    case "artifacts_deleted":
      return { color: "orange", label: "待构建" };
    case "initialized":
      return { color: "default", label: "待上传" };
    default:
      return { color: "default", label: status };
  }
}

function progressTone(status: string): "active" | "exception" | "success" | "normal" {
  switch (status) {
    case "building":
      return "active";
    case "failed":
      return "exception";
    case "ready":
      return "success";
    default:
      return "normal";
  }
}

function progressStageLabel(stage: string) {
  switch (stage) {
    case "awaiting_upload":
      return "等待上传";
    case "awaiting_build":
      return "等待构建";
    case "build_started":
      return "启动构建";
    case "documents_indexed":
      return "文档整理";
    case "text_units_created":
      return "文本切片";
    case "reports_generation":
      return "社区报告生成";
    case "embedding_generation":
      return "向量生成";
    case "completed":
      return "构建完成";
    default:
      return stage;
  }
}

export function BuildStatusCard({
  status,
  actionError = null,
  busy = false,
  onStartBuild,
  onResumeBuild,
  onFullRebuild,
  onRefresh,
  onClearArtifacts,
}: BuildStatusCardProps) {
  const currentStatus = status ? statusMeta(status.status) : null;

  if (!status) {
    return (
      <Card className="surface-card" title="构建状态">
        <Empty description="选择图谱后查看构建状态" />
      </Card>
    );
  }

  return (
    <Card
      className="surface-card"
      title="构建状态"
      extra={
        <Space className="status-actions">
          <Button size="small" onClick={() => void onRefresh()}>
            刷新
          </Button>
          <Button
            type="primary"
            size="small"
            loading={busy}
            onClick={() => void onStartBuild()}
          >
            开始构建
          </Button>
          {status.resumable ? (
            <Button size="small" loading={busy} onClick={() => void onResumeBuild()}>
              继续构建
            </Button>
          ) : null}
          <Button size="small" danger loading={busy} onClick={() => void onFullRebuild()}>
            全量重建
          </Button>
          <Button size="small" danger loading={busy} onClick={() => void onClearArtifacts()}>
            清理产物
          </Button>
        </Space>
      }
    >
      <div style={{ marginBottom: 20 }}>
        <Progress
          percent={status.progress_percent}
          status={progressTone(status.status)}
          strokeColor={status.status === "failed" ? "#ff4d4f" : undefined}
        />
        <Typography.Text className="muted-text">{status.progress_message}</Typography.Text>
      </div>

      <Descriptions size="small" column={1}>
        <Descriptions.Item label="当前文件">
          {status.current_file ?? "无"}
        </Descriptions.Item>
        <Descriptions.Item label="已完成文件">
          {status.completed_file_count}
        </Descriptions.Item>
        <Descriptions.Item label="失败文件">
          {status.failed_file_count}
        </Descriptions.Item>
        <Descriptions.Item label="待处理文件">
          {status.pending_file_count}
        </Descriptions.Item>
        <Descriptions.Item label="当前状态">
          {currentStatus ? <Tag color={currentStatus.color}>{currentStatus.label}</Tag> : null}
        </Descriptions.Item>
        <Descriptions.Item label="当前阶段">
          {progressStageLabel(status.progress_stage)}
        </Descriptions.Item>
        <Descriptions.Item label="最近构建">
          {status.last_build_at ?? "尚未构建"}
        </Descriptions.Item>
        <Descriptions.Item label="源文件数量">
          {status.source_file_count}
        </Descriptions.Item>
        <Descriptions.Item label="文档数量">
          {status.document_count}
        </Descriptions.Item>
        <Descriptions.Item label="切片数量">
          {status.text_unit_count}
        </Descriptions.Item>
        <Descriptions.Item label="产物路径">
          {status.artifact_paths.length > 0
            ? status.artifact_paths.join(", ")
            : "当前没有构建产物"}
        </Descriptions.Item>
        {actionError ? (
          <Descriptions.Item label="本次预检查">
            <Typography.Text type="warning">{actionError}</Typography.Text>
          </Descriptions.Item>
        ) : null}
        {status.last_error ? (
          <Descriptions.Item label="最近构建错误">
            <Typography.Text type="danger">{status.last_error}</Typography.Text>
          </Descriptions.Item>
        ) : null}
      </Descriptions>
    </Card>
  );
}
