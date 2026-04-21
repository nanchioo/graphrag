import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import { useRepositories } from "../../app/providers/RepositoryProvider";
import {
  graphVizCommunities,
  graphVizEdges,
  graphVizEntityFilterOptions,
  graphVizNodes,
  type VizEntityType,
  type VizNode,
} from "../../mocks/fixtures/graphVisualization";
import type { GraphDetailPayload } from "../../shared/types/api";

type ViewMode = "force" | "community";
type ColorMode = "community" | "entity";
type LevelMode = "Level 1" | "Level 2" | "Level 3";
type EntityFilter = "all" | VizEntityType;

const defaultGraphStatsLabel = "39 节点 · 54 边";

function ZoomInIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="7" cy="7" r="4.5" />
      <path d="M10.5 10.5 14 14M7 5v4M5 7h4" />
    </svg>
  );
}

function ZoomOutIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="7" cy="7" r="4.5" />
      <path d="M10.5 10.5 14 14M5 7h4" />
    </svg>
  );
}

function FitIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M6 2.5H2.5V6M10 2.5h3.5V6M2.5 10V13.5H6M10 13.5h3.5V10" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M8 2.5v7M5.5 7.5 8 10l2.5-2.5M3 12.5h10" />
    </svg>
  );
}

function ForceIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="4" cy="4" r="1.5" />
      <circle cx="12" cy="5" r="1.5" />
      <circle cx="8" cy="12" r="1.5" />
      <path d="M5.2 4.4 10.8 4.8M4.8 5.2l2.4 5.4M11.2 6.2 8.8 10.8" />
    </svg>
  );
}

function CommunityIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <rect x="2" y="3" width="4.5" height="4.5" rx="0.8" />
      <rect x="9.5" y="3" width="4.5" height="4.5" rx="0.8" />
      <rect x="2" y="9" width="4.5" height="4.5" rx="0.8" />
      <rect x="9.5" y="9" width="4.5" height="4.5" rx="0.8" />
    </svg>
  );
}

function colorForEntityType(entityType: VizEntityType) {
  switch (entityType) {
    case "person":
      return "#8b5cf6";
    case "concept":
      return "#0ea5e9";
    case "product":
      return "#f97316";
    default:
      return "#2563eb";
  }
}

function buildDegreeMap() {
  const degree = new Map<string, number>();

  for (const edge of graphVizEdges) {
    degree.set(edge.source, (degree.get(edge.source) ?? 0) + 1);
    degree.set(edge.target, (degree.get(edge.target) ?? 0) + 1);
  }

  return degree;
}

function nodePosition(node: VizNode, viewMode: ViewMode) {
  return viewMode === "community" ? node.community : node.force;
}

export function GraphVisualizationPage() {
  const { graphId = "demo-001" } = useParams();
  const { graphRepository } = useRepositories();

  const [graph, setGraph] = useState<GraphDetailPayload | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("force");
  const [level, setLevel] = useState<LevelMode>("Level 1");
  const [colorMode, setColorMode] = useState<ColorMode>("community");
  const [entityFilter, setEntityFilter] = useState<EntityFilter>("all");
  const [minDegree, setMinDegree] = useState(1);
  const [hideCrossCommunityEdges, setHideCrossCommunityEdges] = useState(false);
  const [showLabels, setShowLabels] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    void graphRepository.getGraph(graphId).then((detail) => {
      if (!alive) {
        return;
      }

      setGraph(detail);
    });

    return () => {
      alive = false;
    };
  }, [graphId, graphRepository]);

  const degreeByNode = useMemo(() => buildDegreeMap(), []);

  const visibleNodes = useMemo(() => {
    return graphVizNodes.filter((node) => {
      const matchesEntity =
        entityFilter === "all" ? true : node.entityType === entityFilter;
      const degree = degreeByNode.get(node.id) ?? 0;
      return matchesEntity && degree >= minDegree;
    });
  }, [degreeByNode, entityFilter, minDegree]);

  const visibleNodeIds = useMemo(
    () => new Set(visibleNodes.map((node) => node.id)),
    [visibleNodes],
  );

  const visibleEdges = useMemo(() => {
    return graphVizEdges.filter((edge) => {
      if (!visibleNodeIds.has(edge.source) || !visibleNodeIds.has(edge.target)) {
        return false;
      }

      if (!hideCrossCommunityEdges) {
        return true;
      }

      const source = graphVizNodes.find((node) => node.id === edge.source);
      const target = graphVizNodes.find((node) => node.id === edge.target);

      return source?.communityId === target?.communityId;
    });
  }, [hideCrossCommunityEdges, visibleNodeIds]);

  const selectedNode =
    visibleNodes.find((node) => node.id === selectedNodeId) ?? null;

  const visibleEdgeLabel =
    visibleNodes.length === 39 && visibleEdges.length === 54
      ? defaultGraphStatsLabel
      : `${visibleNodes.length} 节点 · ${visibleEdges.length} 边`;

  return (
    <section className="viz-page">
      <div className="viz-workspace">
        <div className="viz-canvas-shell">
          <div className="viz-toolbar">
            <div className="viz-toolbar-left">
              <div className="viz-mode-toggle">
                <button
                  type="button"
                  className={
                    viewMode === "force"
                      ? "viz-mode-button viz-mode-button-active"
                      : "viz-mode-button"
                  }
                  onClick={() => setViewMode("force")}
                >
                  <ForceIcon />
                  <span>力导向图</span>
                </button>
                <button
                  type="button"
                  className={
                    viewMode === "community"
                      ? "viz-mode-button viz-mode-button-active"
                      : "viz-mode-button"
                  }
                  onClick={() => setViewMode("community")}
                >
                  <CommunityIcon />
                  <span>社区块状视图</span>
                </button>
              </div>

              <select
                className="viz-select"
                value={level}
                onChange={(event) => setLevel(event.target.value as LevelMode)}
              >
                <option>Level 1</option>
                <option>Level 2</option>
                <option>Level 3</option>
              </select>

              <select
                className="viz-select"
                value={colorMode}
                onChange={(event) => setColorMode(event.target.value as ColorMode)}
              >
                <option value="community">按社区着色</option>
                <option value="entity">按实体类型着色</option>
              </select>

              <span className="viz-toolbar-stat">{visibleEdgeLabel}</span>
            </div>

            <div className="viz-toolbar-right">
              <button
                type="button"
                className="viz-action-button"
                aria-label="放大图谱"
                onClick={() => setZoom((value) => Math.min(value + 0.08, 1.4))}
              >
                <ZoomInIcon />
              </button>
              <button
                type="button"
                className="viz-action-button"
                aria-label="缩小图谱"
                onClick={() => setZoom((value) => Math.max(value - 0.08, 0.84))}
              >
                <ZoomOutIcon />
              </button>
              <button
                type="button"
                className="viz-action-button"
                aria-label="重置视图"
                onClick={() => setZoom(1)}
              >
                <FitIcon />
              </button>
              <button type="button" className="viz-action-button" aria-label="导出图谱">
                <DownloadIcon />
              </button>
            </div>
          </div>

          <div className="viz-stage">
            <svg
              className="viz-stage-svg"
              viewBox="0 0 900 680"
              aria-label="图谱可视化画布"
            >
              <defs>
                <pattern id="viz-grid" width="52" height="52" patternUnits="userSpaceOnUse">
                  <path
                    d="M 52 0 L 0 0 0 52"
                    fill="none"
                    stroke="rgba(209, 213, 219, 0.28)"
                    strokeWidth="1"
                  />
                </pattern>
              </defs>

              <rect x="0" y="0" width="900" height="680" fill="url(#viz-grid)" />

              {viewMode === "community"
                ? graphVizCommunities.map((community) => (
                    <g key={community.id}>
                      <rect
                        x={community.block.x}
                        y={community.block.y}
                        width={community.block.width}
                        height={community.block.height}
                        rx="18"
                        fill={`${community.color}14`}
                        stroke={`${community.color}33`}
                        strokeDasharray="5 5"
                      />
                      <text
                        x={community.block.x + 16}
                        y={community.block.y + 26}
                        className="viz-block-label"
                      >
                        {community.label}
                      </text>
                    </g>
                  ))
                : null}

              <g transform={`translate(450 340) scale(${zoom}) translate(-450 -340)`}>
                {visibleEdges.map((edge) => {
                  const source = visibleNodes.find((node) => node.id === edge.source);
                  const target = visibleNodes.find((node) => node.id === edge.target);

                  if (!source || !target) {
                    return null;
                  }

                  const [sourceX, sourceY] = nodePosition(source, viewMode);
                  const [targetX, targetY] = nodePosition(target, viewMode);
                  const crossCommunity = source.communityId !== target.communityId;

                  return (
                    <line
                      key={edge.id}
                      x1={sourceX}
                      y1={sourceY}
                      x2={targetX}
                      y2={targetY}
                      className={crossCommunity ? "viz-edge viz-edge-cross" : "viz-edge"}
                    />
                  );
                })}

                {visibleNodes.map((node) => {
                  const [x, y] = nodePosition(node, viewMode);
                  const community = graphVizCommunities.find(
                    (item) => item.id === node.communityId,
                  );
                  const fillColor =
                    colorMode === "community"
                      ? community?.color ?? "#2563eb"
                      : colorForEntityType(node.entityType);
                  const selected = node.id === selectedNode?.id;

                  return (
                    <g
                      key={node.id}
                      className={selected ? "viz-node viz-node-selected" : "viz-node"}
                      onClick={() => setSelectedNodeId(node.id)}
                    >
                      <circle
                        cx={x}
                        cy={y}
                        r={node.radius}
                        fill={fillColor}
                        stroke="#ffffff"
                        strokeWidth={selected ? 4 : 2.5}
                      />
                      {showLabels && (node.featured || selected) ? (
                        <text x={x} y={y - node.radius - 10} className="viz-node-label">
                          {node.label}
                        </text>
                      ) : null}
                    </g>
                  );
                })}
              </g>
            </svg>

            <div className="viz-legend">
              <strong>社区</strong>
              {graphVizCommunities.map((community) => (
                <div key={community.id} className="viz-legend-item">
                  <span
                    className="viz-legend-swatch"
                    style={{ backgroundColor: community.color }}
                  />
                  <span>{community.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside className="viz-inspector">
          <div className="viz-inspector-header">
            <h2>{selectedNode?.label ?? graph?.name ?? "金融年报 2024"}</h2>
            <p>{selectedNode ? "当前选中节点详情" : "点击节点查看详情"}</p>
          </div>

          {selectedNode ? (
            <article className="viz-selected-card">
              <div className="viz-selected-row">
                <span>实体类型</span>
                <strong>{selectedNode.entityType}</strong>
              </div>
              <div className="viz-selected-row">
                <span>社区</span>
                <strong>
                  {
                    graphVizCommunities.find(
                      (community) => community.id === selectedNode.communityId,
                    )?.label
                  }
                </strong>
              </div>
              <div className="viz-selected-row">
                <span>度数</span>
                <strong>{degreeByNode.get(selectedNode.id) ?? 0}</strong>
              </div>
            </article>
          ) : null}

          <section className="viz-panel-block">
            <h3>图谱统计</h3>
            <div className="viz-stat-grid">
              <article className="viz-stat-card">
                <span>实体</span>
                <strong>{(graph?.entity_count ?? 48291).toLocaleString("zh-CN")}</strong>
              </article>
              <article className="viz-stat-card">
                <span>关系</span>
                <strong>{(graph?.relation_count ?? 132904).toLocaleString("zh-CN")}</strong>
              </article>
              <article className="viz-stat-card">
                <span>社区 · L0</span>
                <strong>{(graph?.community_count ?? 142).toLocaleString("zh-CN")}</strong>
              </article>
              <article className="viz-stat-card">
                <span>报告</span>
                <strong>{(graph?.report_count ?? 38).toLocaleString("zh-CN")}</strong>
              </article>
            </div>
          </section>

          <section className="viz-panel-block">
            <h3>筛选</h3>
            <div className="viz-filter-group">
              <label className="viz-filter-label" htmlFor="entity-filter">
                实体类型
              </label>
              <select
                id="entity-filter"
                className="viz-select viz-select-full"
                value={entityFilter}
                onChange={(event) => setEntityFilter(event.target.value as EntityFilter)}
              >
                {graphVizEntityFilterOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="viz-filter-group">
              <div className="viz-filter-heading">
                <label htmlFor="min-degree">最小度数</label>
                <span>{minDegree}</span>
              </div>
              <input
                id="min-degree"
                className="viz-range"
                type="range"
                min={1}
                max={6}
                value={minDegree}
                onChange={(event) => setMinDegree(Number(event.target.value))}
              />
            </div>

            <div className="viz-switch-row">
              <span>隐藏跨社区桥边</span>
              <button
                type="button"
                className={
                  hideCrossCommunityEdges
                    ? "viz-switch viz-switch-on"
                    : "viz-switch"
                }
                aria-pressed={hideCrossCommunityEdges}
                onClick={() => setHideCrossCommunityEdges((value) => !value)}
              >
                <span className="viz-switch-thumb" />
              </button>
            </div>

            <div className="viz-switch-row">
              <span>显示节点标签</span>
              <button
                type="button"
                className={showLabels ? "viz-switch viz-switch-on" : "viz-switch"}
                aria-pressed={showLabels}
                onClick={() => setShowLabels((value) => !value)}
              >
                <span className="viz-switch-thumb" />
              </button>
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}
