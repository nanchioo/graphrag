import { Card, Col, Empty, List, Row, Space, Spin, Statistic, Tabs, Tag, Typography } from "antd";
import * as echarts from "echarts";
import { useEffect, useRef } from "react";

import type { GraphPreviewPayload, GraphReportsPayload } from "../types";

interface GraphPreviewProps {
  preview: GraphPreviewPayload | null;
  reports: GraphReportsPayload | null;
  loading?: boolean;
}

export function GraphPreview({ preview, reports, loading = false }: GraphPreviewProps) {
  const chartRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!chartRef.current || !preview) {
      return;
    }

    const chart = echarts.init(chartRef.current);
    chart.setOption({
      tooltip: {},
      series: [
        {
          type: "graph",
          layout: "force",
          roam: true,
          draggable: true,
          emphasis: {
            focus: "adjacency",
          },
          force: {
            repulsion: 240,
            edgeLength: [90, 180],
          },
          label: {
            show: true,
            color: "#203040",
          },
          lineStyle: {
            color: "rgba(15, 23, 42, 0.20)",
            curveness: 0.08,
          },
          data: preview.nodes.map((node) => ({
            id: node.id,
            name: node.label,
            value: node.rank ?? 1,
            category: node.type ?? "unknown",
            symbolSize: Math.max(26, (node.rank ?? 1) * 6),
            itemStyle: {
              color: node.type === "person" ? "#0f8ea8" : "#111827",
            },
          })),
          links: preview.edges.map((edge) => ({
            source: edge.source,
            target: edge.target,
            value: edge.label ?? edge.id,
            lineStyle: {
              width: edge.weight ? Math.max(1, edge.weight) : 1,
            },
          })),
        },
      ],
    });

    function resizeChart() {
      chart.resize();
    }

    window.addEventListener("resize", resizeChart);
    return () => {
      window.removeEventListener("resize", resizeChart);
      chart.dispose();
    };
  }, [preview]);

  return (
    <Card className="surface-card analysis-card analysis-graph-preview" title="图谱预览">
      <Spin spinning={loading}>
        {!preview ? (
          <Empty description="构建完成后可查看节点关系预览" />
        ) : (
          <div className="graph-preview-shell">
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
                              {report.rank ? <Tag color="blue">Rank {report.rank}</Tag> : null}
                            </Space>
                          </List.Item>
                        )}
                      />
                    ) : (
                      <Empty description="暂无社区报告" />
                    ),
                },
              ]}
            />
          </div>
        )}
      </Spin>
    </Card>
  );
}
