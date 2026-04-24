import {
  Alert,
  Button,
  Card,
  Empty,
  Progress,
  Select,
  Space,
  Tag,
  Typography,
} from "antd";

import { getGraphStageLabel, getGraphStatusMeta } from "../content/workbench";
import type { GraphBuildMethod, GraphStatusPayload } from "../types";

interface BuildStatusCardProps {
  status: GraphStatusPayload | null;
  actionError?: string | null;
  busy?: boolean;
  buildMethod: GraphBuildMethod;
  sourceFileCount?: number;
  onBuildMethodChange: (method: GraphBuildMethod) => void;
  onStartBuild: () => Promise<void> | void;
  onResumeBuild: () => Promise<void> | void;
  onFullRebuild: () => Promise<void> | void;
  onRefresh: () => Promise<void> | void;
  onClearArtifacts: () => Promise<void> | void;
}

export function BuildStatusCard({
  status,
  actionError = null,
  busy = false,
  buildMethod,
  sourceFileCount = 0,
  onBuildMethodChange,
  onStartBuild,
  onResumeBuild,
  onFullRebuild,
  onRefresh,
  onClearArtifacts,
}: BuildStatusCardProps) {
  if (!status) {
    return (
      <Card className="surface-card analysis-card analysis-status-card" title="构建状态">
        <Empty description="请选择一个图谱查看构建进度。" />
      </Card>
    );
  }

  const statusMeta = getGraphStatusMeta(status.status);
  const hasSourceFiles =
    sourceFileCount > 0 || status.source_file_count > 0 || status.has_source_files;
  const canStartBuild = hasSourceFiles && !busy;
  const canResume = status.resumable && hasSourceFiles && !busy;
  const progressStatus =
    status.status === "failed"
      ? "exception"
      : status.status === "building"
        ? "active"
        : status.status === "ready"
          ? "success"
          : "normal";
  const progressStrokeColor =
    status.status === "failed"
      ? "#ef4444"
      : status.status === "ready"
        ? "#16a34a"
        : status.status === "building"
          ? "#1e40af"
          : "#64748b";

  return (
    <Card className="surface-card analysis-card analysis-status-card" title="构建状态">
      <div className="analysis-status-header">
        <div>
          <Typography.Title level={5} style={{ margin: 0 }}>
            构建控制台
          </Typography.Title>
          <Typography.Paragraph className="muted-text" style={{ marginBottom: 0 }}>
            开始构建增量处理新增文件、继续构建恢复失败或中断的任务、全量重建重新计算整个图谱。
          </Typography.Paragraph>
        </div>
        <div className="build-status-actions">
          <Select
            value={buildMethod}
            className="build-method-select"
            onChange={onBuildMethodChange}
          >
            <Select.Option value="standard">标准构建</Select.Option>
            <Select.Option value="fast">快速构建</Select.Option>
          </Select>
          <Space wrap className="status-actions" size={8}>
            <Button onClick={() => void onRefresh()} loading={busy}>
              刷新
            </Button>
            <Button
              type="primary"
              onClick={() => void onStartBuild()}
              loading={busy}
              disabled={!canStartBuild}
            >
              开始构建
            </Button>
            <Button onClick={() => void onResumeBuild()} loading={busy} disabled={!canResume}>
              继续构建
            </Button>
            <Button
              onClick={() => void onFullRebuild()}
              loading={busy}
              disabled={!canStartBuild}
            >
              全量重建
            </Button>
            <Button danger onClick={() => void onClearArtifacts()} loading={busy}>
              清理
            </Button>
          </Space>
        </div>
      </div>

      {actionError ? (
        <Alert
          style={{ marginBottom: 16 }}
          type="error"
          showIcon
          message="本次预检查"
          description={actionError}
        />
      ) : null}

      {!hasSourceFiles ? (
        <Alert
          style={{ marginBottom: 16 }}
          type="warning"
          showIcon
          message="请先上传源文件"
          description="当前图谱还没有可构建的源文件，上传成功后再开始构建。"
        />
      ) : null}

      <div className="build-status-body">
        <div className="build-status-progress">
          <div className="build-status-progress-head">
            <div>
              <span>构建进度</span>
              <strong>{status.progress_percent}%</strong>
            </div>
            <Tag color={statusMeta.color}>{statusMeta.label}</Tag>
          </div>
          <Progress
            percent={status.progress_percent}
            status={progressStatus}
            strokeColor={progressStrokeColor}
            showInfo={false}
          />
        </div>

        <div className="build-status-metrics">
          <div className="build-status-metric">
            <span>当前阶段</span>
            <strong>{getGraphStageLabel(status.progress_stage)}</strong>
          </div>
          <div className="build-status-metric">
            <span>已完成文件</span>
            <strong>{status.completed_file_count}</strong>
          </div>
          <div className="build-status-metric">
            <span>失败 / 待处理</span>
            <strong>
              {status.failed_file_count} / {status.pending_file_count}
            </strong>
          </div>
          <div className="build-status-metric">
            <span>文档 / 切片</span>
            <strong>
              {status.document_count} / {status.text_unit_count}
            </strong>
          </div>
        </div>

        <div className="build-status-message">
          <Typography.Text className="muted-text">
            当前阶段消息：{status.progress_message}
          </Typography.Text>
          {status.current_file ? (
            <Typography.Text className="muted-text">
              当前文件：{status.current_file}
            </Typography.Text>
          ) : null}
          <Typography.Text className="muted-text">
            后续阶段：embedding_generation → reports_generation
          </Typography.Text>
          <div>{status.resumable ? <Tag color="blue">可继续</Tag> : <Tag>暂不可继续</Tag>}</div>
          {status.last_error ? (
            <Typography.Text type="danger">最近构建错误：{status.last_error}</Typography.Text>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
