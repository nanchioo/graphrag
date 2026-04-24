import {
  Button,
  Card,
  Col,
  Empty,
  List,
  Row,
  Space,
  Spin,
  Statistic,
  Tabs,
  Tag,
  Typography,
} from "antd";
import * as echarts from "echarts";
import { useEffect, useRef, useState } from "react";

import type { GraphPreviewNode, GraphPreviewPayload, GraphReportsPayload } from "../types";

const GRAPH_INITIAL_ZOOM = 1;
const GRAPH_MIN_ZOOM = 0.35;
const GRAPH_MAX_ZOOM = 4;
const GRAPH_ZOOM_STEP = 1.25;
const PREVIEW_GRAPH_SERIES_ID = "graph-preview-series";

type KnowledgeGraphNodeStyle = {
  label: string;
  color: string;
  borderColor: string;
  shadowColor: string;
  symbol: "circle" | "roundRect" | "pin" | "diamond" | "triangle" | "rect";
};

const KNOWLEDGE_GRAPH_PALETTE = {
  person: "#5b7cfa",
  organization: "#1aa987",
  location: "#d6a13a",
  event: "#e07a5f",
  concept: "#8b73d9",
  document: "#6b7b90",
  entity: "#55708f",
} as const;

const KNOWLEDGE_GRAPH_NODE_STYLES: Record<string, KnowledgeGraphNodeStyle> = {
  person: {
    label: "人物",
    color: KNOWLEDGE_GRAPH_PALETTE.person,
    borderColor: "#ffffff",
    shadowColor: "rgba(91, 124, 250, 0.22)",
    symbol: "circle",
  },
  organization: {
    label: "组织",
    color: KNOWLEDGE_GRAPH_PALETTE.organization,
    borderColor: "#ffffff",
    shadowColor: "rgba(26, 169, 135, 0.22)",
    symbol: "roundRect",
  },
  location: {
    label: "地点",
    color: KNOWLEDGE_GRAPH_PALETTE.location,
    borderColor: "#ffffff",
    shadowColor: "rgba(214, 161, 58, 0.22)",
    symbol: "pin",
  },
  event: {
    label: "事件",
    color: KNOWLEDGE_GRAPH_PALETTE.event,
    borderColor: "#ffffff",
    shadowColor: "rgba(224, 122, 95, 0.2)",
    symbol: "diamond",
  },
  concept: {
    label: "概念",
    color: KNOWLEDGE_GRAPH_PALETTE.concept,
    borderColor: "#ffffff",
    shadowColor: "rgba(139, 115, 217, 0.2)",
    symbol: "triangle",
  },
  document: {
    label: "文档",
    color: KNOWLEDGE_GRAPH_PALETTE.document,
    borderColor: "#ffffff",
    shadowColor: "rgba(107, 123, 144, 0.18)",
    symbol: "rect",
  },
  entity: {
    label: "实体",
    color: KNOWLEDGE_GRAPH_PALETTE.entity,
    borderColor: "#ffffff",
    shadowColor: "rgba(85, 112, 143, 0.18)",
    symbol: "circle",
  },
};

interface GraphPreviewProps {
  preview: GraphPreviewPayload | null;
  reports: GraphReportsPayload | null;
  loading?: boolean;
}

function clampGraphZoom(value: number) {
  return Math.min(GRAPH_MAX_ZOOM, Math.max(GRAPH_MIN_ZOOM, value));
}

function getKnowledgeGraphNodeStyle(type?: string | null) {
  const normalizedType = (type ?? "").trim().toLowerCase();
  if (
    normalizedType.includes("person") ||
    normalizedType.includes("people") ||
    normalizedType.includes("human") ||
    normalizedType.includes("人物") ||
    normalizedType.includes("人员")
  ) {
    return KNOWLEDGE_GRAPH_NODE_STYLES.person;
  }

  if (
    normalizedType.includes("organization") ||
    normalizedType.includes("org") ||
    normalizedType.includes("company") ||
    normalizedType.includes("department") ||
    normalizedType.includes("组织") ||
    normalizedType.includes("机构") ||
    normalizedType.includes("公司") ||
    normalizedType.includes("部门")
  ) {
    return KNOWLEDGE_GRAPH_NODE_STYLES.organization;
  }

  if (
    normalizedType.includes("location") ||
    normalizedType.includes("geo") ||
    normalizedType.includes("place") ||
    normalizedType.includes("地点") ||
    normalizedType.includes("位置")
  ) {
    return KNOWLEDGE_GRAPH_NODE_STYLES.location;
  }

  if (
    normalizedType.includes("event") ||
    normalizedType.includes("activity") ||
    normalizedType.includes("事件") ||
    normalizedType.includes("流程")
  ) {
    return KNOWLEDGE_GRAPH_NODE_STYLES.event;
  }

  if (
    normalizedType.includes("concept") ||
    normalizedType.includes("topic") ||
    normalizedType.includes("keyword") ||
    normalizedType.includes("概念") ||
    normalizedType.includes("主题")
  ) {
    return KNOWLEDGE_GRAPH_NODE_STYLES.concept;
  }

  if (
    normalizedType.includes("document") ||
    normalizedType.includes("file") ||
    normalizedType.includes("文档") ||
    normalizedType.includes("文件")
  ) {
    return KNOWLEDGE_GRAPH_NODE_STYLES.document;
  }

  return KNOWLEDGE_GRAPH_NODE_STYLES.entity;
}

function getKnowledgeGraphNodeCategory(type?: string | null) {
  return getKnowledgeGraphNodeStyle(type).label;
}

function getKnowledgeGraphNodeSymbol(type?: string | null) {
  return getKnowledgeGraphNodeStyle(type).symbol;
}

function getKnowledgeGraphNodeSize(rank?: number | null) {
  const safeRank = Math.max(1, rank ?? 1);
  return Math.min(58, 24 + Math.sqrt(safeRank) * 5);
}

function getKnowledgeGraphCategories(nodes: GraphPreviewNode[]) {
  const categoryNames = new Set(nodes.map((node) => getKnowledgeGraphNodeCategory(node.type)));
  return Object.values(KNOWLEDGE_GRAPH_NODE_STYLES)
    .filter((style) => categoryNames.has(style.label))
    .map((style) => ({
      name: style.label,
      itemStyle: {
        color: style.color,
      },
    }));
}

function formatKnowledgeGraphTooltip(params: unknown) {
  const item = params as {
    dataType?: string;
    name?: string;
    value?: number | string;
    data?: {
      category?: string;
      rawType?: string | null;
      rank?: number | null;
      communityIds?: string[];
    };
  };

  if (item.dataType === "edge") {
    return `${item.name || "关系"}<br/>权重：${item.value ?? 1}`;
  }

  return [
    `<strong>${item.name || "实体"}</strong>`,
    `类型：${item.data?.rawType || item.data?.category || "实体"}`,
    `Rank：${item.data?.rank ?? 1}`,
    `社区：${item.data?.communityIds?.join(", ") || "暂无"}`,
  ].join("<br/>");
}

function buildGraphPreviewOption(
  preview: GraphPreviewPayload,
  zoom: number,
): echarts.EChartsOption {
  return {
    color: Object.values(KNOWLEDGE_GRAPH_NODE_STYLES).map((style) => style.color),
    legend: {
      top: 10,
      right: 12,
      type: "scroll",
      orient: "horizontal",
      icon: "circle",
      textStyle: {
        color: "#475569",
        fontSize: 12,
      },
    },
    tooltip: {
      trigger: "item",
      formatter: formatKnowledgeGraphTooltip,
      backgroundColor: "rgba(15, 23, 42, 0.92)",
      borderWidth: 0,
      textStyle: {
        color: "#f8fafc",
        fontSize: 12,
      },
    },
    series: [
      {
        id: PREVIEW_GRAPH_SERIES_ID,
        type: "graph",
        name: "知识图谱",
        layout: "force",
        roam: true,
        draggable: true,
        zoom,
        nodeScaleRatio: 0.6,
        scaleLimit: {
          min: GRAPH_MIN_ZOOM,
          max: GRAPH_MAX_ZOOM,
        },
        categories: getKnowledgeGraphCategories(preview.nodes),
        edgeSymbol: ["none", "arrow"],
        edgeSymbolSize: [0, 7],
        emphasis: {
          focus: "adjacency",
          lineStyle: {
            width: 2.4,
            opacity: 0.82,
          },
        },
        force: {
          repulsion: 310,
          edgeLength: [95, 170],
          friction: 0.18,
        },
        label: {
          show: true,
          position: "right",
          distance: 8,
          color: "#1e293b",
          fontSize: 12,
          fontWeight: 600,
          backgroundColor: "rgba(248, 250, 252, 0.78)",
          borderColor: "rgba(148, 163, 184, 0.26)",
          borderWidth: 1,
          borderRadius: 4,
          padding: [2, 5],
        },
        lineStyle: {
          color: "rgba(100, 116, 139, 0.38)",
          curveness: 0.12,
          opacity: 0.62,
        },
        data: preview.nodes.map((node) => {
          const nodeStyle = getKnowledgeGraphNodeStyle(node.type);
          return {
            id: node.id,
            name: node.label,
            value: node.rank ?? 1,
            category: getKnowledgeGraphNodeCategory(node.type),
            rawType: node.type,
            rank: node.rank,
            communityIds: node.community_ids,
            symbol: getKnowledgeGraphNodeSymbol(node.type),
            symbolSize: getKnowledgeGraphNodeSize(node.rank),
            itemStyle: {
              color: nodeStyle.color,
              borderColor: "#ffffff",
              borderWidth: 2,
              shadowBlur: 12,
              shadowColor: nodeStyle.shadowColor,
            },
          };
        }),
        links: preview.edges.map((edge) => ({
          source: edge.source,
          target: edge.target,
          name: edge.label ?? edge.id,
          value: edge.weight ?? 1,
          lineStyle: {
            width: Math.min(3, Math.max(0.8, edge.weight ?? 1)),
          },
        })),
      },
    ],
  };
}

function readGraphZoom(chart: echarts.ECharts) {
  const option = chart.getOption() as { series?: Array<{ id?: string; zoom?: number }> };
  const graphSeries =
    option.series?.find((series) => series.id === PREVIEW_GRAPH_SERIES_ID) ??
    option.series?.[0];

  return typeof graphSeries?.zoom === "number"
    ? clampGraphZoom(graphSeries.zoom)
    : GRAPH_INITIAL_ZOOM;
}

export function GraphPreview({ preview, reports, loading = false }: GraphPreviewProps) {
  const chartRef = useRef<HTMLDivElement | null>(null);
  const chartInstanceRef = useRef<echarts.ECharts | null>(null);
  const graphFullscreenRef = useRef<HTMLDivElement | null>(null);
  const latestPreviewRef = useRef<GraphPreviewPayload | null>(null);
  const graphZoomRef = useRef(GRAPH_INITIAL_ZOOM);
  const [graphZoom, setGraphZoom] = useState(GRAPH_INITIAL_ZOOM);
  const [isGraphFullscreen, setIsGraphFullscreen] = useState(false);
  const fullscreenAvailable =
    typeof document !== "undefined" && document.fullscreenEnabled !== false;

  function syncGraphZoom(chart: echarts.ECharts) {
    const nextZoom = readGraphZoom(chart);
    graphZoomRef.current = nextZoom;
    setGraphZoom(nextZoom);
  }

  function zoomGraph(multiplier: number) {
    const chart = chartInstanceRef.current;
    if (!chart) {
      return;
    }

    chart.dispatchAction({
      type: "graphRoam",
      seriesId: PREVIEW_GRAPH_SERIES_ID,
      zoom: multiplier,
      originX: chart.getWidth() / 2,
      originY: chart.getHeight() / 2,
    });
    syncGraphZoom(chart);
  }

  function resetGraphView() {
    const chart = chartInstanceRef.current;
    const latestPreview = latestPreviewRef.current;
    if (!chart || !latestPreview) {
      return;
    }

    graphZoomRef.current = GRAPH_INITIAL_ZOOM;
    setGraphZoom(GRAPH_INITIAL_ZOOM);
    chart.setOption(buildGraphPreviewOption(latestPreview, GRAPH_INITIAL_ZOOM), true);
  }

  function resizeGraphSoon(delay = 80) {
    window.setTimeout(() => {
      chartInstanceRef.current?.resize();
    }, delay);
  }

  function resizeGraphAfterFullscreenChange() {
    resizeGraphSoon();
    resizeGraphSoon(260);
  }

  async function toggleGraphFullscreen() {
    const fullscreenTarget = graphFullscreenRef.current;
    if (!fullscreenTarget || !fullscreenAvailable) {
      return;
    }

    if (document.fullscreenElement === fullscreenTarget) {
      await document.exitFullscreen();
    } else {
      await fullscreenTarget.requestFullscreen();
    }
    resizeGraphAfterFullscreenChange();
  }

  useEffect(() => {
    function handleFullscreenChange() {
      setIsGraphFullscreen(document.fullscreenElement === graphFullscreenRef.current);
      resizeGraphAfterFullscreenChange();
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    latestPreviewRef.current = preview;
    if (!chartRef.current || !preview) {
      return;
    }

    graphZoomRef.current = GRAPH_INITIAL_ZOOM;
    setGraphZoom(GRAPH_INITIAL_ZOOM);
    const chart = echarts.init(chartRef.current);
    chartInstanceRef.current = chart;
    chart.setOption(buildGraphPreviewOption(preview, GRAPH_INITIAL_ZOOM));
    chart.on("graphRoam", () => syncGraphZoom(chart));

    function resizeChart() {
      chart.resize();
    }

    window.addEventListener("resize", resizeChart);
    return () => {
      window.removeEventListener("resize", resizeChart);
      chart.off("graphRoam");
      if (chartInstanceRef.current === chart) {
        chartInstanceRef.current = null;
      }
      chart.dispose();
    };
  }, [preview]);

  return (
    <Card className="surface-card analysis-card analysis-graph-preview" title="图谱预览">
      <Spin spinning={loading}>
        {!preview ? (
          <Empty description="构建完成后可查看图谱预览。" />
        ) : (
          <div className="graph-preview-shell">
            <div className="analysis-preview-summary">
              <Row gutter={[12, 12]}>
                <Col span={12}>
                  <Statistic title="预览节点" value={preview.summary.preview_nodes} />
                </Col>
                <Col span={12}>
                  <Statistic title="预览关系" value={preview.summary.preview_edges} />
                </Col>
                <Col span={12}>
                  <Statistic title="社区数量" value={preview.summary.total_communities} />
                </Col>
                <Col span={12}>
                  <Statistic title="报告数量" value={preview.summary.total_reports} />
                </Col>
              </Row>
            </div>
            <div
              ref={graphFullscreenRef}
              className={`graph-preview-interactive${
                isGraphFullscreen ? " graph-preview-interactive--fullscreen" : ""
              }`}
            >
              <div className="graph-preview-toolbar">
                <Typography.Text className="muted-text">
                  滚轮缩放，拖拽平移；也可以使用右侧按钮调整视图。
                </Typography.Text>
                <Space size={8} wrap>
                  <Button
                    size="small"
                    onClick={() => zoomGraph(1 / GRAPH_ZOOM_STEP)}
                    disabled={graphZoom <= GRAPH_MIN_ZOOM + 0.01}
                  >
                    缩小
                  </Button>
                  <Typography.Text className="graph-preview-zoom">
                    {Math.round(graphZoom * 100)}%
                  </Typography.Text>
                  <Button
                    size="small"
                    onClick={() => zoomGraph(GRAPH_ZOOM_STEP)}
                    disabled={graphZoom >= GRAPH_MAX_ZOOM - 0.01}
                  >
                    放大
                  </Button>
                  <Button size="small" onClick={resetGraphView}>
                    重置视图
                  </Button>
                  <Button
                    size="small"
                    onClick={() => void toggleGraphFullscreen()}
                    disabled={!fullscreenAvailable}
                  >
                    {isGraphFullscreen ? "退出全屏" : "全屏"}
                  </Button>
                </Space>
              </div>
              <Tabs
                items={[
                  {
                    key: "graph",
                    label: "关系图",
                    children: <div ref={chartRef} className="graph-preview-chart" />,
                  },
                  {
                    key: "reports",
                    label: "社区报告",
                    children:
                      reports && reports.items.length > 0 ? (
                        <List
                          dataSource={reports.items}
                          renderItem={(report) => (
                            <List.Item>
                              <Space direction="vertical" size={4}>
                                <Typography.Text strong>{report.title}</Typography.Text>
                                <Typography.Text className="muted-text">
                                  社区 {report.community_id}
                                </Typography.Text>
                                <Typography.Paragraph style={{ marginBottom: 0 }}>
                                  {report.summary}
                                </Typography.Paragraph>
                                {report.rank ? <Tag color="blue">排名 {report.rank}</Tag> : null}
                              </Space>
                            </List.Item>
                          )}
                        />
                      ) : (
                        <Empty description="暂无社区报告。" />
                      ),
                  },
                ]}
              />
            </div>
          </div>
        )}
      </Spin>
    </Card>
  );
}
