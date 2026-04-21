import { useState } from "react";

import type {
  GraphCreateRequest,
  GraphSummary,
} from "../../shared/types/api";
import { EmptyState } from "../../shared/ui/EmptyState";
import { PageHeader } from "../../shared/ui/PageHeader";
import { CreateGraphWizard } from "./CreateGraphWizard";

type GraphListPanelProps = {
  graphs: GraphSummary[];
  selectedGraphId: string | null;
  onSelectGraph: (graphId: string) => void;
  onCreateGraph: (payload: GraphCreateRequest) => Promise<void>;
};

type ViewMode = "list" | "grid";
type StatusFilter = "all" | "ready" | "building" | "failed";
type MethodFilter = "all" | "Standard" | "FastGraphRAG";

function SearchIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="7" cy="7" r="4.5" />
      <path d="M10.5 10.5 14 14" />
    </svg>
  );
}

function GraphIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="4" cy="8" r="1.5" />
      <circle cx="12" cy="4" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <path d="M5.2 7.2 10.8 4.8M5.2 8.8l5.6 2.4" />
    </svg>
  );
}

function ImportIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M8 2.5v7" />
      <path d="M5.5 7.5 8 10l2.5-2.5" />
      <path d="M3 12.5h10" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M5 4h8M5 8h8M5 12h8" />
      <circle cx="2.5" cy="4" r="0.7" fill="currentColor" stroke="none" />
      <circle cx="2.5" cy="8" r="0.7" fill="currentColor" stroke="none" />
      <circle cx="2.5" cy="12" r="0.7" fill="currentColor" stroke="none" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <rect x="2" y="2" width="4.5" height="4.5" rx="0.8" />
      <rect x="9.5" y="2" width="4.5" height="4.5" rx="0.8" />
      <rect x="2" y="9.5" width="4.5" height="4.5" rx="0.8" />
      <rect x="9.5" y="9.5" width="4.5" height="4.5" rx="0.8" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M1.5 8s2.3-4 6.5-4 6.5 4 6.5 4-2.3 4-6.5 4-6.5-4-6.5-4Z" />
      <circle cx="8" cy="8" r="1.8" />
    </svg>
  );
}

function SlidersIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3 4h10M3 12h10M6 4v6M10 6v6" />
      <circle cx="6" cy="11" r="1.2" />
      <circle cx="10" cy="5" r="1.2" />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="3" cy="8" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="8" cy="8" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="13" cy="8" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function statusClassName(status: string) {
  if (status === "failed") {
    return "failed";
  }

  if (status === "building") {
    return "running";
  }

  if (status === "awaiting_upload" || status === "awaiting_build") {
    return "pending";
  }

  return "success";
}

function methodClassName(method?: string | null) {
  return method === "FastGraphRAG" ? "fast" : "standard";
}

function ownerToneClass(index: number) {
  return index % 3 === 1 ? "green" : index % 3 === 2 ? "violet" : "blue";
}

function formatCount(value?: number) {
  return (value ?? 0).toLocaleString("zh-CN");
}

export function GraphListPanel({
  graphs,
  selectedGraphId,
  onSelectGraph,
  onCreateGraph,
}: GraphListPanelProps) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [methodFilter, setMethodFilter] = useState<MethodFilter>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [wizardOpen, setWizardOpen] = useState(false);

  const filteredGraphs = graphs.filter((graph) => {
    const matchesQuery =
      query.trim() === "" ||
      graph.name.toLowerCase().includes(query.trim().toLowerCase()) ||
      (graph.description ?? "").toLowerCase().includes(query.trim().toLowerCase());
    const matchesStatus =
      statusFilter === "all" ? true : graph.status === statusFilter;
    const matchesMethod =
      methodFilter === "all" ? true : graph.indexing_method === methodFilter;

    return matchesQuery && matchesStatus && matchesMethod;
  });

  return (
    <section className="graph-page-shell">
      <div className="graph-page-header">
        <PageHeader
          title="知识图谱"
          description={`共 ${graphs.length} 个图谱。创建新图谱或选择已有图谱进行管理。`}
        />

        <div className="graph-page-actions">
          <button
            type="button"
            className="graph-header-button"
            onClick={() => selectedGraphId && onSelectGraph(selectedGraphId)}
            disabled={!selectedGraphId}
          >
            <ImportIcon />
            <span>导入</span>
          </button>
          <button
            type="button"
            className="toolbar-primary-button"
            onClick={() => setWizardOpen(true)}
          >
            <span className="toolbar-plus">+</span>
            <span>新建图谱</span>
          </button>
        </div>
      </div>

      <div className="graph-toolbar">
        <div className="graph-toolbar-filters">
          <label className="graph-filter-search">
            <span className="graph-filter-search-icon">
              <SearchIcon />
            </span>
            <input
              className="ui-input graph-filter-input"
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="按名称或描述筛选..."
            />
          </label>

          <select
            className="graph-filter-select"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
          >
            <option value="all">全部状态</option>
            <option value="ready">就绪</option>
            <option value="building">构建中</option>
            <option value="failed">失败</option>
          </select>

          <select
            className="graph-filter-select"
            value={methodFilter}
            onChange={(event) => setMethodFilter(event.target.value as MethodFilter)}
          >
            <option value="all">所有索引方法</option>
            <option value="Standard">Standard</option>
            <option value="FastGraphRAG">FastGraphRAG</option>
          </select>
        </div>

        <div className="graph-view-toggle" role="tablist" aria-label="视图切换">
          <button
            type="button"
            className={
              viewMode === "list"
                ? "graph-view-button graph-view-button-active"
                : "graph-view-button"
            }
            onClick={() => setViewMode("list")}
            aria-label="列表视图"
          >
            <ListIcon />
          </button>
          <button
            type="button"
            className={
              viewMode === "grid"
                ? "graph-view-button graph-view-button-active"
                : "graph-view-button"
            }
            onClick={() => setViewMode("grid")}
            aria-label="网格视图"
          >
            <GridIcon />
          </button>
        </div>
      </div>

      {filteredGraphs.length === 0 ? (
        <EmptyState
          title="没有匹配的图谱"
          description="调整筛选条件，或者先新建一个图谱开始上传和构建。"
        />
      ) : viewMode === "list" ? (
        <section className="graph-table-shell">
          <table className="graph-table">
            <thead>
              <tr>
                <th>名称</th>
                <th>实体 / 关系</th>
                <th>文档</th>
                <th>索引方法</th>
                <th>状态</th>
                <th>负责人</th>
                <th>更新</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredGraphs.map((graph, index) => {
                const isSelected = graph.id === selectedGraphId;

                return (
                  <tr
                    key={graph.id}
                    className={isSelected ? "graph-table-row-selected" : undefined}
                    onClick={() => onSelectGraph(graph.id)}
                  >
                    <td>
                      <div className="graph-name-cell">
                        <span className="graph-icon-tile">
                          <GraphIcon />
                        </span>
                        <div className="graph-name-copy">
                          <strong>{graph.name}</strong>
                          <span>{graph.description ?? "暂无描述"}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="graph-metric-cell">
                        <strong>{formatCount(graph.entity_count)}</strong>
                        <span>{formatCount(graph.relation_count)} 关系</span>
                      </div>
                    </td>
                    <td>
                      <div className="graph-metric-cell">
                        <strong>{formatCount(graph.document_count)}</strong>
                        <span>{graph.storage_size ?? "-"}</span>
                      </div>
                    </td>
                    <td>
                      <span
                        className={`graph-method-badge ${methodClassName(graph.indexing_method)}`}
                      >
                        {graph.indexing_method ?? "-"}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`status-pill ${statusClassName(graph.status)} graph-status-pill`}
                      >
                        <span className="status-dot" />
                        <span>{graph.status_label ?? graph.status}</span>
                      </span>
                    </td>
                    <td>
                      <div className="graph-owner-cell">
                        <span className={`graph-owner-avatar ${ownerToneClass(index)}`}>
                          {graph.owner_initials ?? "?"}
                        </span>
                        <span>{graph.owner ?? "未分配"}</span>
                      </div>
                    </td>
                    <td>{graph.updated_at ?? "-"}</td>
                    <td>
                      <div className="graph-row-actions">
                        <button
                          type="button"
                          className="graph-action-button"
                          aria-label={`查看 ${graph.name}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            onSelectGraph(graph.id);
                          }}
                        >
                          <EyeIcon />
                        </button>
                        <button
                          type="button"
                          className="graph-action-button"
                          aria-label={`配置 ${graph.name}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            onSelectGraph(graph.id);
                          }}
                        >
                          <SlidersIcon />
                        </button>
                        <button
                          type="button"
                          className="graph-action-button"
                          aria-label={`更多 ${graph.name}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            onSelectGraph(graph.id);
                          }}
                        >
                          <MoreIcon />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      ) : (
        <section className="graph-grid-shell">
          {filteredGraphs.map((graph, index) => {
            const isSelected = graph.id === selectedGraphId;

            return (
              <article
                key={graph.id}
                className={
                  isSelected ? "graph-grid-card graph-grid-card-selected" : "graph-grid-card"
                }
                onClick={() => onSelectGraph(graph.id)}
              >
                <div className="graph-grid-card-header">
                  <span className="graph-icon-tile">
                    <GraphIcon />
                  </span>
                  <div className="graph-name-copy">
                    <strong>{graph.name}</strong>
                    <span>{graph.description ?? "暂无描述"}</span>
                  </div>
                </div>

                <div className="graph-grid-stats">
                  <div className="graph-metric-cell">
                    <strong>{formatCount(graph.entity_count)}</strong>
                    <span>{formatCount(graph.relation_count)} 关系</span>
                  </div>
                  <div className="graph-metric-cell">
                    <strong>{formatCount(graph.document_count)}</strong>
                    <span>{graph.storage_size ?? "-"}</span>
                  </div>
                </div>

                <div className="graph-grid-meta">
                  <span
                    className={`graph-method-badge ${methodClassName(graph.indexing_method)}`}
                  >
                    {graph.indexing_method ?? "-"}
                  </span>
                  <span
                    className={`status-pill ${statusClassName(graph.status)} graph-status-pill`}
                  >
                    <span className="status-dot" />
                    <span>{graph.status_label ?? graph.status}</span>
                  </span>
                </div>

                <div className="graph-grid-footer">
                  <div className="graph-owner-cell">
                    <span className={`graph-owner-avatar ${ownerToneClass(index)}`}>
                      {graph.owner_initials ?? "?"}
                    </span>
                    <span>{graph.owner ?? "未分配"}</span>
                  </div>
                  <div className="graph-row-actions">
                    <button
                      type="button"
                      className="graph-action-button"
                      aria-label={`查看 ${graph.name}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        onSelectGraph(graph.id);
                      }}
                    >
                      <EyeIcon />
                    </button>
                    <button
                      type="button"
                      className="graph-action-button"
                      aria-label={`更多 ${graph.name}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        onSelectGraph(graph.id);
                      }}
                    >
                      <MoreIcon />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}

      <div className="graph-page-footer">
        <span>
          显示 {filteredGraphs.length} / {graphs.length} 条
        </span>
        <div className="graph-pagination">
          <button type="button" className="graph-page-link">
            上一页
          </button>
          <button type="button" className="graph-page-link graph-page-link-active">
            1
          </button>
          <button type="button" className="graph-page-link">
            下一页
          </button>
        </div>
      </div>

      <CreateGraphWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onCreateGraph={onCreateGraph}
      />
    </section>
  );
}
