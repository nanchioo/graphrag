import { useEffect, useState } from "react";

import { useRepositories } from "../../app/providers/RepositoryProvider";
import { GraphListPanel } from "../../features/graph-management/GraphListPanel";
import type { GraphSummary } from "../../shared/types/api";

export function GraphManagementPage() {
  const { graphRepository } = useRepositories();
  const [graphs, setGraphs] = useState<GraphSummary[]>([]);

  useEffect(() => {
    let alive = true;

    void graphRepository.listGraphs().then((items) => {
      if (!alive) {
        return;
      }

      setGraphs(items);
    });

    return () => {
      alive = false;
    };
  }, [graphRepository]);

  // 图谱管理页当前对齐为参考稿中的全宽知识图谱控制台。
  return <GraphListPanel graphs={graphs} />;
}
