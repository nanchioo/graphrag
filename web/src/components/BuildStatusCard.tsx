import {
  Alert,
  Button,
  Card,
  Descriptions,
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
  const canResume = status.resumable && !busy;
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
        <Space direction="vertical" align="end" size={8}>
          <Select
            value={buildMethod}
            style={{ minWidth: 140 }}
            onChange={onBuildMethodChange}
          >
            <Select.Option value="standard">标准构建</Select.Option>
            <Select.Option value="fast">快速构建</Select.Option>
          </Select>
          <Space wrap className="status-actions">
            <Button onClick={() => void onRefresh()} loading={busy}>
              刷新
            </Button>
            <Button type="primary" onClick={() => void onStartBuild()} loading={busy}>
              开始构建
            </Button>
            <Button onClick={() => void onResumeBuild()} loading={busy} disabled={!canResume}>
              继续构建
            </Button>
            <Button onClick={() => void onFullRebuild()} loading={busy}>
              全量重建
            </Button>
            <Button danger onClick={() => void onClearArtifacts()} loading={busy}>
              清理
            </Button>
          </Space>
        </Space>
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

      <Descriptions column={2} size="small" bordered>
        <Descriptions.Item label="当前状态">
          <Tag color={statusMeta.color}>{statusMeta.label}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="当前阶段">{getGraphStageLabel(status.progress_stage)}</Descriptions.Item>
        <Descriptions.Item label="构建进度" span={2}>
          <Progress
            percent={status.progress_percent}
            status={progressStatus}
            strokeColor={progressStrokeColor}
          />
        </Descriptions.Item>
        <Descriptions.Item label="已完成文件">{status.completed_file_count}</Descriptions.Item>
        <Descriptions.Item label="失败 / 待处理">
          {status.failed_file_count} / {status.pending_file_count}
        </Descriptions.Item>
        <Descriptions.Item label="切片数量">{status.text_unit_count}</Descriptions.Item>
        <Descriptions.Item label="文档数量">{status.document_count}</Descriptions.Item>
        <Descriptions.Item label="最近构建错误" span={2}>
          {status.last_error || "暂无最近构建错误。"}
        </Descriptions.Item>
      </Descriptions>

      <Space direction="vertical" size={8} style={{ width: "100%", marginTop: 16 }}>
        <Typography.Text className="muted-text">
          当前阶段消息：{status.progress_message}
        </Typography.Text>
        {status.current_file ? (
          <Typography.Text className="muted-text">当前文件：{status.current_file}</Typography.Text>
        ) : null}
        <Typography.Text className="muted-text">
          后续阶段：embedding_generation → reports_generation
        </Typography.Text>
        {status.resumable ? <Tag color="blue">可继续</Tag> : <Tag>暂不可继续</Tag>}
      </Space>
    </Card>
  );
}
