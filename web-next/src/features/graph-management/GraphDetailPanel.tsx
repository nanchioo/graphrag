import { useEffect, useState } from "react";

import { useRepositories } from "../../app/providers/RepositoryProvider";
import type {
  GraphDetailPayload,
  GraphStatusPayload,
} from "../../shared/types/api";
import { Card } from "../../shared/ui/Card";
import { EmptyState } from "../../shared/ui/EmptyState";
import { BuildStatusPanel } from "./BuildStatusPanel";

function formatCount(value?: number) {
  return value?.toLocaleString("zh-CN") ?? "—";
}

export function GraphDetailPanel({ graphId }: { graphId: string | null }) {
  const { graphRepository } = useRepositories();
  const [graph, setGraph] = useState<GraphDetailPayload | null>(null);
  const [status, setStatus] = useState<GraphStatusPayload | null>(null);

  useEffect(() => {
    if (!graphId) {
      setGraph(null);
      setStatus(null);
      return;
    }

    let alive = true;

    void Promise.all([
      graphRepository.getGraph(graphId),
      graphRepository.getGraphStatus(graphId),
    ]).then(([detail, nextStatus]) => {
      if (!alive) {
        return;
      }

      setGraph(detail);
      setStatus(nextStatus);
    });

    return () => {
      alive = false;
    };
  }, [graphId, graphRepository]);

  if (!graphId) {
    return (
      <EmptyState
        title="未选择图谱"
        description="先从左侧列表中选择一个图谱，再查看详情、构建状态和图谱统计。"
      />
    );
  }

  return (
    <div className="stack-lg">
      <Card title={graph?.name ?? "图谱详情"}>
        <div className="stack-lg">
          <p className="card-description">
            {graph?.description ?? "当前图谱暂无描述。"}
          </p>
          <div className="detail-grid">
            <div className="detail-tile">
              <span>实体</span>
              <strong>{formatCount(graph?.entity_count)}</strong>
            </div>
            <div className="detail-tile">
              <span>关系</span>
              <strong>{formatCount(graph?.relation_count)}</strong>
            </div>
            <div className="detail-tile">
              <span>社区</span>
              <strong>{formatCount(graph?.community_count)}</strong>
            </div>
            <div className="detail-tile">
              <span>报告</span>
              <strong>{formatCount(graph?.report_count)}</strong>
            </div>
          </div>
          <div className="two-column-detail">
            <div className="subtle-block">
              <strong>图谱路径</strong>
              <div>{graph?.root_dir ?? "-"}</div>
            </div>
            <div className="subtle-block">
              <strong>模型配置</strong>
              <div>{graph?.model_profile_id ?? "未绑定"}</div>
            </div>
            <div className="subtle-block">
              <strong>负责人</strong>
              <div>{graph?.owner ?? "未分配"}</div>
            </div>
            <div className="subtle-block">
              <strong>最近构建</strong>
              <div>{graph?.last_build_at ?? "尚未构建"}</div>
            </div>
          </div>
        </div>
      </Card>
      <BuildStatusPanel status={status} />
    </div>
  );
}
