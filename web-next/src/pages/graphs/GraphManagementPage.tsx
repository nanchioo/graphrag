import { useEffect, useState } from "react";

import { useRepositories } from "../../app/providers/RepositoryProvider";
import { GraphDetailPanel } from "../../features/graph-management/GraphDetailPanel";
import { GraphListPanel } from "../../features/graph-management/GraphListPanel";
import type { GraphCreateRequest, GraphSummary } from "../../shared/types/api";
import { PageHeader } from "../../shared/ui/PageHeader";

export function GraphManagementPage() {
  const { graphRepository } = useRepositories();
  const [graphs, setGraphs] = useState<GraphSummary[]>([]);
  const [selectedGraphId, setSelectedGraphId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let alive = true;

    async function loadGraphs() {
      try {
        const items = await graphRepository.listGraphs();

        if (!alive) {
          return;
        }

        setGraphs(items);
        setLoadError(null);
        setSelectedGraphId((current) => {
          if (items.length === 0) {
            return null;
          }

          if (current && items.some((item) => item.id === current)) {
            return current;
          }

          return items[0].id;
        });
      } catch (error) {
        if (!alive) {
          return;
        }

        setGraphs([]);
        setSelectedGraphId(null);
        setLoadError(error instanceof Error ? error.message : "图谱列表加载失败。");
      }
    }

    void loadGraphs();

    return () => {
      alive = false;
    };
  }, [graphRepository, refreshToken]);

  async function handleCreateGraph(payload: GraphCreateRequest) {
    const created = await graphRepository.createGraph(payload);
    setSelectedGraphId(created.id);
    setRefreshToken((current) => current + 1);
  }

  function handleGraphUpdated(preferredGraphId: string | null = selectedGraphId) {
    if (preferredGraphId) {
      setSelectedGraphId(preferredGraphId);
    }

    setRefreshToken((current) => current + 1);
  }

  function handleGraphDeleted(graphId: string) {
    setSelectedGraphId((current) => (current === graphId ? null : current));
    setRefreshToken((current) => current + 1);
  }

  return (
    <div className="stack-lg">
      <PageHeader
        title="图谱管理"
        description="围绕当前后端能力完成创建、上传、构建和查询交接，让主流程可以直接联调。"
      />

      {loadError ? <div className="status-note failed">{loadError}</div> : null}

      <section className="two-column-layout graph-management-layout">
        <GraphListPanel
          graphs={graphs}
          selectedGraphId={selectedGraphId}
          onSelectGraph={setSelectedGraphId}
          onCreateGraph={handleCreateGraph}
        />
        <GraphDetailPanel
          graphId={selectedGraphId}
          onGraphDeleted={handleGraphDeleted}
          onGraphUpdated={handleGraphUpdated}
        />
      </section>
    </div>
  );
}
