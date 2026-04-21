import type { GraphStatusPayload } from "../../shared/types/api";
import { Badge } from "../../shared/ui/Badge";
import { Card } from "../../shared/ui/Card";

function getStatusTone(status: string) {
  if (status === "ready") {
    return "success";
  }

  if (status === "failed") {
    return "failed";
  }

  return "running";
}

export function BuildStatusPanel({
  status,
}: {
  status: GraphStatusPayload | null;
}) {
  if (!status) {
    return (
      <Card title="构建状态">
        <div className="stack-sm">
          <div>等待选择图谱后展示索引进度与产物状态。</div>
        </div>
      </Card>
    );
  }

  return (
    <Card title="构建状态">
      <div className="stack-lg">
        <div className="metric-inline">
          <Badge>当前阶段</Badge>
          <span>{status.progress_stage}</span>
          <span className={`status-chip ${getStatusTone(status.status)}`}>
            {status.status}
          </span>
        </div>
        <div className="progress-block">
          <div className="metric-inline">
            <strong>进度</strong>
            <span>{status.progress_percent}%</span>
          </div>
          <div className="progress-track">
            <div
              className="progress-fill"
              style={{ width: `${status.progress_percent}%` }}
            />
          </div>
        </div>
        <div className="detail-grid">
          <div className="detail-tile">
            <span>Text Units</span>
            <strong>{status.text_unit_count.toLocaleString("zh-CN")}</strong>
          </div>
          <div className="detail-tile">
            <span>Token</span>
            <strong>{(status.token_count ?? 0).toLocaleString("zh-CN")}</strong>
          </div>
          <div className="detail-tile">
            <span>产物</span>
            <strong>{status.has_artifacts ? "已生成" : "生成中"}</strong>
          </div>
          <div className="detail-tile">
            <span>队列</span>
            <strong>{status.queue_position ?? "—"}</strong>
          </div>
        </div>
        <div className="subtle-block">{status.progress_message}</div>
        {status.error_message ? (
          <div className="status-note failed">{status.error_message}</div>
        ) : null}
      </div>
    </Card>
  );
}
